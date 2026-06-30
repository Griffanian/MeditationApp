import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchPractice, saveStageVariables, assembleStage, computeDurations, savePracticeProgress, fetchStageScript, fetchStageComponents, fetchStageVariables, fetchStageTimestamps, BASE } from '../api';
import { flattenScript, resolvePauseDuration, computeMarkerDuration, computeFixedDuration, formatDuration, unlockAudio } from '../playback';

function migrateToWeeks(items) {
  if (!items || items.length === 0) return [];
  if (items[0] && items[0].days) return items;
  return [{ label: 'Week 1', days: [{ label: 'Day 1', items }] }];
}

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function varSummary(variables) {
  if (!variables) return null;
  const entries = Object.entries(variables);
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => {
    const val = typeof v === 'object' ? v.value : v;
    const unit = typeof v === 'object' && v.unit ? ` ${v.unit}` : '';
    const display = typeof v === 'object' && v.displayName ? v.displayName : k;
    return `${display}: ${val}${unit}`;
  }).join(', ');
}

function itemDurationMinutes(item) {
  for (const v of Object.values(item.variables || {})) {
    if (typeof v === 'object' && v.unit === 'minutes' && v.value != null) return Number(v.value);
  }
  return null;
}

function collectLoops(segments, map = {}) {
  for (const seg of segments) {
    if (seg.type === 'loop') {
      map[seg.id] = seg;
      collectLoops(seg.segments, map);
    }
  }
  return map;
}

function resolveWordVars(word, variables) {
  return word.replace(/\{(\w+)\}/g, (_, varName) => {
    const v = variables[varName];
    if (v == null) return `{${varName}}`;
    return typeof v === 'object' ? (v.value ?? `{${varName}}`) : v;
  });
}

function buildTimeline(script, variables, components) {
  const flat = flattenScript(script, variables, components);
  const loops = collectLoops(script);
  const timeline = [];
  let cursor = 0;

  for (const item of flat) {
    const { seg } = item;
    let dur = 0;

    if (seg.type === 'speech') {
      const comp = components[seg.id];
      dur = comp?.duration || 0;
    } else if (seg.type === 'pause') {
      dur = resolvePauseDuration(seg.duration_seconds, variables);
    } else if (seg.type === 'asset') {
      const comp = components[seg.id];
      dur = comp?.duration || 1;
    } else if (seg.type === 'split_marker') {
      const markerDur = computeMarkerDuration(script, seg.id, variables, components);
      dur = markerDur != null ? markerDur * (seg.multiplier || 1) : 1;
    }

    if (dur > 0) {
      const loopSeg = item.loopId ? loops[item.loopId] : null;
      const rawWords = seg.type === 'speech' ? (seg.text || '').split(' ') : [];
      timeline.push({
        start: cursor,
        end: cursor + dur,
        dur,
        type: seg.type,
        segId: seg.id,
        file: seg.file,
        words: rawWords.map(w => resolveWordVars(w, variables)),
        loopLabel: loopSeg?.label || '',
        loopIteration: item.loopIteration || null,
        loopTotal: item.loopTotal || null,
      });
      cursor += dur;
    }
  }

  return timeline;
}

export function ProgrammeView() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [practice, setPractice] = useState(null);
  const [completedDays, setCompletedDays] = useState({});
  const [calendarWeekPage, setCalendarWeekPage] = useState(0);

  useEffect(() => {
    fetchPractice(name).then(p => {
      p.items = migrateToWeeks(p.items);
      setPractice(p);
      if (p.progress) {
        setCalendarWeekPage(Math.floor(p.progress.current_week / 4));
      }
      if (p.progress?.completed_days) {
        setCompletedDays(p.progress.completed_days);
      }
    });
  }, [name]);

  if (!practice) return <div className="loading-page"><div className="loading-spinner" />Loading...</div>;

  const weeks = practice.items || [];
  if (weeks.length === 0) return <div className="player-empty">This programme has no content yet.</div>;

  const allDays = [];
  for (let wi = 0; wi < weeks.length; wi++) {
    const wDays = weeks[wi]?.days || [];
    for (let di = 0; di < wDays.length; di++) {
      allDays.push({ wi, di });
    }
  }

  const totalWeeks = weeks.length;
  const viewSize = 4;
  const startIdx = calendarWeekPage * viewSize;
  const endIdx = Math.min(startIdx + viewSize, totalWeeks);
  const visibleWeeks = weeks.slice(startIdx, endIdx);
  const totalDays = allDays.length;
  const completedCount = Object.keys(completedDays).length;

  function goToDay(wi, di, stageIdx) {
    const params = new URLSearchParams({ week: wi, day: di });
    if (stageIdx != null) params.set('stage', stageIdx);
    navigate(`/play/${name}?${params}`);
  }

  return (
    <div className="player player-calendar">
      <Link to="/practices" className="ep-back">&#x2190; Programmes</Link>

      <div className="player-card">
        <div className="player-card-header">
          <h1 className="player-title">{practice.display_name}</h1>
        </div>
        <div className="player-meta">
          <span>{totalWeeks} week{totalWeeks !== 1 ? 's' : ''}</span>
          <span className="player-meta-sep">·</span>
          <span>{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
          {completedCount > 0 && <>
            <span className="player-meta-sep">·</span>
            <span>{completedCount}/{totalDays} completed</span>
          </>}
        </div>

        {/* Calendar navigation */}
        <div className="prog-cal-toolbar">
          <div className="prog-cal-nav">
            <button className="prog-cal-nav-btn" disabled={calendarWeekPage === 0}
              onClick={() => setCalendarWeekPage(p => p - 1)}>&#x2039;</button>
            <span className="prog-cal-nav-label">
              Week {startIdx + 1}{endIdx > startIdx + 1 ? `\u2013${endIdx}` : ''} of {totalWeeks}
            </span>
            <button className="prog-cal-nav-btn" disabled={endIdx >= totalWeeks}
              onClick={() => setCalendarWeekPage(p => p + 1)}>&#x203A;</button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="prog-cal-grid">
          <div className="prog-cal-header">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="prog-cal-header-cell">Day {i + 1}</div>
            ))}
          </div>
          <div className="prog-cal-body">
            {visibleWeeks.map((wk, relWi) => {
              const absWi = startIdx + relWi;
              return (
                <div key={absWi} className="prog-cal-week-section">
                  <div className="prog-cal-week-label">
                    <span>{wk.label}</span>
                  </div>
                  <div className="prog-cal-week-row">
                    {wk.days.slice(0, 7).map((d, di) => {
                      const dayItems = d.items || [];
                      const isEmpty = dayItems.length === 0;
                      const dKey = `${absWi}-${di}`;
                      const isCompleted = !!completedDays[dKey];

                      return (
                        <div key={di}
                          className={`prog-cal-day-cell${isEmpty ? ' empty' : ''}${isCompleted ? ' completed' : ''}`}
                          onClick={() => { if (!isEmpty) goToDay(absWi, di); }}
                          style={isEmpty ? undefined : { cursor: 'pointer' }}>
                          <div className="prog-cal-day-cell-header">
                            <span className="prog-cal-day-count">
                              {isCompleted ? '\u2713 ' : ''}{dayItems.length > 0 ? `${dayItems.length} stage${dayItems.length !== 1 ? 's' : ''}` : ''}
                            </span>
                          </div>
                          <div className="prog-cal-day-items">
                            {dayItems.map((item, idx) => {
                              const vars = varSummary(item.variables);
                              return (
                                <div key={item.id} className="prog-cal-item"
                                  onClick={e => { e.stopPropagation(); goToDay(absWi, di, idx); }}
                                  style={{ cursor: 'pointer' }}>
                                  <div className="prog-cal-item-exercise">{item.meditation_display}</div>
                                  <div className="prog-cal-item-stage">{item.stage_name}</div>
                                  {vars && <div className="prog-cal-item-vars">{vars}</div>}
                                </div>
                              );
                            })}
                          </div>
                          {isEmpty && <div className="prog-cal-day-empty-label">Rest</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Player() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [practice, setPractice] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);
  const [completedDays, setCompletedDays] = useState({});
  const [autoplay, setAutoplay] = useState(false);

  // Playback state
  const [playIdx, setPlayIdx] = useState(-1);
  const [status, setStatus] = useState('idle'); // idle, assembling, playing, paused, between
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [itemDurations, setItemDurations] = useState({});
  const [singleMode, setSingleMode] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState('idle');

  // Script display state (ExercisePlayer-style)
  const [activeEntry, setActiveEntry] = useState(null);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [countdown, setCountdown] = useState('');
  const [wordsPerPage, setWordsPerPage] = useState(50);
  const wordsRef = useRef(null);
  const measuredRef = useRef(false);
  const pendingStageRef = useRef(null);

  const audioRef = useRef(null);
  const droneRef = useRef(null);
  const nextAudioRef = useRef(null);
  const timerRef = useRef(null);
  const stopRef = useRef(false);
  const gapTimerRef = useRef(null);
  const playIdxRef = useRef(-1);
  const playedStagesRef = useRef(new Set());
  const preparedUrls = useRef({});
  const autoplayPending = useRef(false);
  const handlePlayRef = useRef(null);

  // Per-stage timeline and word timestamps for script display
  const timelineRef = useRef(null); // { idx, timeline }
  const wordTimestampsRef = useRef({});

  // Capture URL params before they're cleared
  const urlParamsRef = useRef(null);
  if (urlParamsRef.current === null) {
    const p = new URLSearchParams(window.location.search);
    urlParamsRef.current = {
      week: p.get('week'),
      day: p.get('day'),
      autoplay: p.get('autoplay') === '1',
      stage: p.get('stage'),
      from: p.get('from'),
    };
    if (urlParamsRef.current.autoplay || urlParamsRef.current.stage != null) autoplayPending.current = true;
    window.history.replaceState({}, '', window.location.pathname);
  }

  useEffect(() => {
    const hasUrlPos = urlParamsRef.current.week !== null || urlParamsRef.current.day !== null;
    fetchPractice(name).then(p => {
      p.items = migrateToWeeks(p.items);
      setPractice(p);
      if (urlParamsRef.current.autoplay) setAutoplay(true);
      if (hasUrlPos) {
        if (urlParamsRef.current.week !== null) setCurrentWeek(parseInt(urlParamsRef.current.week, 10));
        if (urlParamsRef.current.day !== null) setCurrentDay(parseInt(urlParamsRef.current.day, 10));
      } else if (p.progress) {
        setCurrentWeek(p.progress.current_week);
        setCurrentDay(p.progress.current_day);
      }
      if (p.progress?.completed_days) {
        setCompletedDays(p.progress.completed_days);
      }
      const allItems = [];
      for (const week of (p.items || [])) {
        for (const day of (week.days || [])) {
          for (const item of (day.items || [])) {
            allItems.push({
              id: item.id,
              meditation: item.meditation,
              stage_id: item.stage_id,
              variables: item.variables,
            });
          }
        }
      }
      if (allItems.length > 0) {
        computeDurations(allItems).then(setItemDurations);
      }
    });
  }, [name]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (timerRef.current) clearInterval(timerRef.current);
      if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
      if (droneRef.current) { droneRef.current.stop(); droneRef.current = null; }
    };
  }, []);

  // Measure how many words fit in the box once, then chunk by that count
  useEffect(() => {
    const container = wordsRef.current;
    if (!container || measuredRef.current) return;
    const boxHeight = container.clientHeight;
    if (boxHeight <= 0 || container.children.length === 0) return;
    // Find how many words fit before overflowing
    let fitCount = container.children.length;
    for (let i = 0; i < container.children.length; i++) {
      if (container.children[i].offsetTop >= boxHeight) {
        fitCount = i;
        break;
      }
    }
    if (fitCount > 0 && fitCount < container.children.length) {
      setWordsPerPage(fitCount);
      measuredRef.current = true;
    }
  });

  // Stop playback when switching week/day; auto-start if autoplay is on
  const autoplayRef = useRef(false);
  autoplayRef.current = autoplay;
  useEffect(() => {
    playedStagesRef.current = new Set();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (droneRef.current) { droneRef.current.stop(); droneRef.current = null; }
    if (nextAudioRef.current) { nextAudioRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    stopRef.current = true;
    setStatus('idle');
    setPlayIdx(-1);
    playIdxRef.current = -1;
    setSingleMode(false);
    setElapsed(0);
    setDuration(0);
    setError(null);
    preparedUrls.current = {};
    setPrepareStatus('idle');
    timelineRef.current = null;
    setActiveEntry(null);
    setActiveWordIdx(-1);
    setCountdown('');
    const stageToPlay = pendingStageRef.current;
    pendingStageRef.current = null;
    if (stageToPlay != null) {
      setTimeout(() => { if (handlePlayFromRef.current) handlePlayFromRef.current(stageToPlay); }, 0);
    } else if (autoplayRef.current && practice) {
      setTimeout(() => { if (handlePlayRef.current) handlePlayRef.current(); }, 0);
    }
  }, [currentWeek, currentDay]);

  // Autoplay (optionally from a specific stage index)
  const autoplayStageRef = useRef(urlParamsRef.current.stage != null ? parseInt(urlParamsRef.current.stage, 10) : null);
  const autoplayFromRef = useRef(urlParamsRef.current.from != null ? parseInt(urlParamsRef.current.from, 10) : null);
  const handlePlaySingleRef = useRef(null);
  const handlePlayFromRef = useRef(null);
  useEffect(() => {
    if (!practice || !autoplayPending.current) return;
    autoplayPending.current = false;
    if (autoplayFromRef.current != null && handlePlayFromRef.current) {
      handlePlayFromRef.current(autoplayFromRef.current);
      autoplayFromRef.current = null;
    } else if (autoplayStageRef.current != null && handlePlayFromRef.current) {
      handlePlayFromRef.current(autoplayStageRef.current);
      autoplayStageRef.current = null;
    } else if (handlePlayRef.current) {
      handlePlayRef.current();
    }
  }, [practice]);

  if (!practice) return <div className="loading-page"><div className="loading-spinner" />Loading player...</div>;

  const weeks = practice.items || [];
  if (weeks.length === 0) return <div className="player-empty">This programme has no content yet.</div>;

  const week = weeks[currentWeek] || weeks[0];
  const days = week?.days || [];
  const day = days[currentDay] || days[0];
  const items = day?.items || [];
  const dayKey = `${currentWeek}-${currentDay}`;
  const isDayCompleted = !!completedDays[dayKey];

  function savePosition(w, d, completed) {
    savePracticeProgress(name, { current_week: w, current_day: d, completed_days: completed });
  }

  function markDayCompleted() {
    const newCompleted = { ...completedDays, [dayKey]: true };
    setCompletedDays(newCompleted);
    savePosition(currentWeek, currentDay, newCompleted);
    import('../api').then(({ logSession }) => {
      logSession({
        practice: name,
        practice_display: practice?.display_name || name,
        week: currentWeek,
        day: currentDay,
        day_label: day?.label || `Day ${currentDay + 1}`,
        duration: audioRef.current?.duration || 0,
      });
    });
  }

  // --- Script display ---

  function updateScriptDisplay(time) {
    const tl = timelineRef.current;
    if (!tl) { setActiveEntry(null); setActiveWordIdx(-1); setCountdown(''); return; }
    let entry = null;
    for (let i = tl.timeline.length - 1; i >= 0; i--) {
      if (time >= tl.timeline[i].start) { entry = tl.timeline[i]; break; }
    }
    setActiveEntry(entry);
    if (!entry) { setActiveWordIdx(-1); setCountdown(''); return; }
    if (entry.type === 'speech') {
      const segTime = time - entry.start;
      const ts = wordTimestampsRef.current[entry.segId] || [];
      let wi = -1;
      for (let i = ts.length - 1; i >= 0; i--) { if (segTime >= ts[i].start) { wi = i; break; } }
      setActiveWordIdx(wi);
      setCountdown('');
    } else if (entry.type === 'pause' || entry.type === 'split_marker') {
      setCountdown(formatDuration(Math.max(0, Math.ceil(entry.end - time))));
      setActiveWordIdx(-1);
    } else {
      setActiveWordIdx(-1);
      setCountdown('');
    }
  }

  async function loadStageTimeline(idx) {
    const item = items[idx];
    if (!item) return;
    // Don't reload if already loaded for this idx
    if (timelineRef.current && timelineRef.current.idx === idx) return;

    try {
      const [script, components, variables] = await Promise.all([
        fetchStageScript(item.meditation, item.stage_id),
        fetchStageComponents(item.meditation, item.stage_id),
        fetchStageVariables(item.meditation, item.stage_id),
      ]);

      const tl = buildTimeline(script, variables, components);
      timelineRef.current = { idx, timeline: tl };

      // Fetch word timestamps for speech segments
      const speechIds = [...new Set(tl.filter(e => e.type === 'speech').map(e => e.segId))];
      const tsResults = await Promise.all(
        speechIds.map(segId =>
          fetchStageTimestamps(item.meditation, item.stage_id, segId)
            .then(ts => ({ segId, ts }))
            .catch(() => ({ segId, ts: [] }))
        )
      );
      wordTimestampsRef.current = {};
      for (const { segId, ts } of tsResults) {
        wordTimestampsRef.current[segId] = ts;
      }
    } catch {
      timelineRef.current = null;
    }
  }

  // --- Timer ---

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        const t = audioRef.current.currentTime;
        setElapsed(t);
        setDuration(audioRef.current.duration || 0);
        updateScriptDisplay(t);
      }
    }, 100);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  // --- Background drone (barely perceptible "still playing" signal) ---

  function startDrone() {
    if (droneRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 120;
      filter.connect(master);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 55;
      osc1.connect(filter);
      osc1.start();

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 83;
      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.5;
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);
      osc2.start();

      // Fade in over 2 seconds
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);

      droneRef.current = {
        ctx, master,
        resume() {
          if (ctx.state === 'suspended') ctx.resume();
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
          master.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1);
        },
        pause() {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
          master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        },
        stop() {
          try { osc1.stop(); osc2.stop(); ctx.close(); } catch {}
        },
      };
    } catch {}
  }

  function stopDrone() {
    if (droneRef.current) {
      droneRef.current.stop();
      droneRef.current = null;
    }
  }

  // --- Prepare / play ---

  async function prepareOne(idx) {
    if (preparedUrls.current[idx]) return preparedUrls.current[idx];
    const item = items[idx];
    const vars = Object.keys(item.variables || {}).length > 0 ? item.variables : undefined;
    const data = await assembleStage(item.meditation, item.stage_id, vars);
    const url = `${BASE}/audio/meditation/${item.meditation}/stage/${item.stage_id}/output/${data.filename}?t=${Date.now()}`;
    preparedUrls.current[idx] = url;
    return url;
  }

  async function prepareAll() {
    setPrepareStatus('preparing');
    for (let i = 0; i < items.length; i++) {
      if (stopRef.current) return;
      try { await prepareOne(i); } catch {}
    }
    setPrepareStatus('ready');
  }

  function preloadNext(idx) {
    const nextIdx = idx + 1;
    if (nextIdx >= items.length) return;
    const url = preparedUrls.current[nextIdx];
    if (!url) return;
    const next = new Audio(url);
    next.preload = 'auto';
    next.load();
    nextAudioRef.current = { idx: nextIdx, audio: next };
  }

  function playFromUrl(idx, single = false) {
    if (idx >= items.length || (single && idx !== playIdxRef.current)) {
      setStatus('idle');
      setPlayIdx(-1);
      setSingleMode(false);
      stopTimer();
      stopDrone();
      timelineRef.current = null;
      setActiveEntry(null);
      setActiveWordIdx(-1);
      setCountdown('');
      // Autoplay: advance to next day
      if (!single && autoplayRef.current) {
        const flatIdx = allDays.findIndex(d => d.wi === currentWeek && d.di === currentDay);
        if (flatIdx >= 0 && flatIdx < allDays.length - 1) {
          const next = allDays[flatIdx + 1];
          setTimeout(() => goToDay(next.wi, next.di), 1000);
        }
      }
      return;
    }
    if (stopRef.current) return;

    playIdxRef.current = idx;
    setPlayIdx(idx);
    setElapsed(0);
    setDuration(0);
    setStatus('playing');
    startDrone();

    // Load script timeline for this stage
    loadStageTimeline(idx);

    let audio;
    if (nextAudioRef.current && nextAudioRef.current.idx === idx) {
      audio = nextAudioRef.current.audio;
      nextAudioRef.current = null;
    } else {
      audio = new Audio(preparedUrls.current[idx]);
    }

    audioRef.current = audio;
    startTimer();
    preloadNext(idx);

    const onFinish = () => {
      audioRef.current = null;
      playedStagesRef.current.add(idx);
      // Mark day complete once all stages have been played
      if (playedStagesRef.current.size >= items.length) {
        markDayCompleted();
      }
      if (!stopRef.current) {
        if (single && !autoplayRef.current) {
          setStatus('idle');
          setPlayIdx(-1);
          setSingleMode(false);
          stopTimer();
          stopDrone();
          timelineRef.current = null;
          setActiveEntry(null);
        } else {
          setStatus('between');
          stopTimer();
          gapTimerRef.current = setTimeout(() => {
            gapTimerRef.current = null;
            if (!stopRef.current) {
              playFromUrl(idx + 1);
            }
          }, 2000);
        }
      }
    };
    audio.onended = onFinish;
    audio.onerror = onFinish;
    audio.play().catch(onFinish);
  }

  async function handlePlay() {
    if (status === 'paused' && audioRef.current) {
      audioRef.current.play();
      if (droneRef.current) droneRef.current.resume();
      setStatus('playing');
      startTimer();
      return;
    }
    handleStop();
    stopRef.current = false;
    setSingleMode(false);
    unlockAudio();

    setStatus('assembling');
    setPlayIdx(0);
    try {
      await prepareOne(0);
    } catch (err) {
      setError({ idx: 0, message: err.message });
      setStatus('idle');
      setPlayIdx(-1);
      return;
    }
    if (stopRef.current) return;

    playFromUrl(0);
    prepareAll();
  }
  handlePlayRef.current = handlePlay;

  async function handlePlayFrom(startIdx) {
    handleStop();
    stopRef.current = false;
    setSingleMode(false);
    unlockAudio();

    setStatus('assembling');
    setPlayIdx(startIdx);
    try {
      await prepareOne(startIdx);
    } catch (err) {
      setError({ idx: startIdx, message: err.message });
      setStatus('idle');
      setPlayIdx(-1);
      return;
    }
    if (stopRef.current) return;

    playFromUrl(startIdx);
    prepareAll();
  }
  handlePlayFromRef.current = handlePlayFrom;

  async function handlePlaySingle(idx) {
    if (playIdx === idx && (status === 'playing' || status === 'assembling' || status === 'paused')) {
      handleStop();
      return;
    }
    handleStop();
    stopRef.current = false;
    setSingleMode(true);
    playIdxRef.current = idx;
    setPlayIdx(idx);
    unlockAudio();

    let url = preparedUrls.current[idx];
    if (!url) {
      setStatus('assembling');
      try {
        url = await prepareOne(idx);
      } catch (err) {
        setError({ idx, message: err.message });
        setStatus('idle');
        setPlayIdx(-1);
        return;
      }
    }
    if (stopRef.current) return;
    playFromUrl(idx, true);
  }
  handlePlaySingleRef.current = handlePlaySingle;

  function handlePause() {
    if (audioRef.current && status === 'playing') {
      audioRef.current.pause();
      if (droneRef.current) droneRef.current.pause();
      setStatus('paused');
      stopTimer();
    }
  }

  function handleStop() {
    stopRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (nextAudioRef.current) { nextAudioRef.current = null; }
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    stopDrone();
    stopTimer();
    setStatus('idle');
    setPlayIdx(-1);
    playIdxRef.current = -1;
    setSingleMode(false);
    setElapsed(0);
    setDuration(0);
    setError(null);
    timelineRef.current = null;
    setActiveEntry(null);
    setActiveWordIdx(-1);
    setCountdown('');
  }

  function handleSkip() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    stopTimer();
    if (playIdx >= 0 && playIdx < items.length - 1) {
      playFromUrl(playIdx + 1);
    } else {
      setStatus('idle');
      setPlayIdx(-1);
    }
  }

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  const isActive = status !== 'idle' && status !== 'error';

  // Build context label
  let contextLabel = '';
  if (activeEntry) {
    const stageItem = playIdx >= 0 ? items[playIdx] : null;
    const stageLabel = stageItem ? stageItem.meditation_display : '';
    if (activeEntry.loopLabel) {
      contextLabel = activeEntry.loopLabel;
      if (activeEntry.loopTotal > 1) {
        contextLabel += ` — Round ${activeEntry.loopIteration} of ${activeEntry.loopTotal}`;
      }
    } else if (activeEntry.loopTotal > 1) {
      contextLabel = `Round ${activeEntry.loopIteration} of ${activeEntry.loopTotal}`;
    }
    if (stageLabel && contextLabel) contextLabel = `${stageLabel} · ${contextLabel}`;
    else if (stageLabel) contextLabel = stageLabel;
  }

  // Compute flat list of all (weekIdx, dayIdx) pairs for prev/next navigation
  const allDays = [];
  for (let wi = 0; wi < weeks.length; wi++) {
    const wDays = weeks[wi]?.days || [];
    for (let di = 0; di < wDays.length; di++) {
      allDays.push({ wi, di });
    }
  }
  const currentFlatIdx = allDays.findIndex(d => d.wi === currentWeek && d.di === currentDay);
  const hasPrevDay = currentFlatIdx > 0;
  const hasNextDay = currentFlatIdx < allDays.length - 1;

  function goToDay(wi, di) {
    setCurrentWeek(wi);
    setCurrentDay(di);
    savePosition(wi, di, completedDays);
  }

  function goPrevDay() {
    if (!hasPrevDay) return;
    const prev = allDays[currentFlatIdx - 1];
    goToDay(prev.wi, prev.di);
  }

  function goNextDay() {
    if (!hasNextDay) return;
    const next = allDays[currentFlatIdx + 1];
    goToDay(next.wi, next.di);
  }

  return (
    <div className="player">
      <Link to={`/programme/${name}`} className="ep-back">&#x2190; {practice.display_name}</Link>

      <div className="player-card">
        <div className="player-card-header">
          <h1 className="player-title">
            <Link to={`/programme/${name}`} className="player-title-link">{practice.display_name}</Link>
          </h1>
          {isDayCompleted && <span className="player-completed-tick" title="Completed">&#x2713;</span>}
        </div>

        {/* Day navigation */}
        <div className="player-day-nav">
          <button className="player-day-nav-btn" disabled={!hasPrevDay} onClick={goPrevDay}>&#x2039;</button>
          <span className="player-day-nav-label">{week?.label} — {day?.label}</span>
          <button className="player-day-nav-btn" disabled={!hasNextDay} onClick={goNextDay}>&#x203A;</button>
        </div>

        <div className="player-meta">
          <span className="player-meta-count">{items.length} stage{items.length !== 1 ? 's' : ''}</span>
          {(() => {
            const totalMins = items.reduce((sum, item) => sum + (itemDurationMinutes(item) || 0), 0);
            const totalSecs = items.reduce((sum, item) => sum + (itemDurations[item.id] || 0), 0);
            return <>
              {totalMins > 0 && <><span className="player-meta-sep">·</span><span className="player-meta-duration">{totalMins} min</span></>}
              {totalSecs > 0 && <><span className="player-meta-sep">·</span><span className="player-meta-actual-duration">{formatTime(totalSecs)} actual</span></>}
            </>;
          })()}
        </div>

        {/* ExercisePlayer-style controls */}
        <div className="ep-controls">
          {status === 'idle' && (
            <button className="ep-play-btn" onClick={handlePlay} disabled={items.length === 0}>
              <span className="ep-play-icon">&#x25B6;</span>
            </button>
          )}
          {status === 'assembling' && (
            <button className="ep-play-btn ep-play-btn-disabled" disabled>
              <span className="ep-play-icon ep-spin">&#x25CC;</span>
            </button>
          )}
          {status === 'playing' && (
            <button className="ep-play-btn" onClick={handlePause}>
              <span className="ep-play-icon ep-pause-icon" />
            </button>
          )}
          {status === 'paused' && (
            <button className="ep-play-btn" onClick={handlePlay}>
              <span className="ep-play-icon">&#x25B6;</span>
            </button>
          )}
          {status === 'between' && (
            <button className="ep-play-btn ep-play-btn-disabled" disabled>
              <span className="ep-play-icon ep-spin">&#x25CC;</span>
            </button>
          )}
        </div>

        <button
          className={`player-autoplay-toggle${autoplay ? ' active' : ''}`}
          onClick={() => setAutoplay(a => !a)}
          title={autoplay ? 'Autoplay on' : 'Autoplay off'}
        >
          Autoplay {autoplay ? 'on' : 'off'}
        </button>

        {error && (
          <div className="player-bar-error">
            <span className="player-bar-error-msg">{items[error.idx]?.meditation_display}: {error.message}</span>
            <div className="player-bar-error-actions">
              <button className="player-bar-error-btn" onClick={() => setError(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Script display — always visible */}
        {isActive && activeEntry && activeEntry.type === 'speech' ? (
          <div className="ep-script-box">
            {contextLabel && <div className="ep-script-context">{contextLabel}</div>}
            <div className="ep-script-words" ref={wordsRef}>
              {(() => {
                const idx = activeWordIdx >= 0 ? activeWordIdx : 0;
                const page = Math.floor(idx / wordsPerPage);
                const start = page * wordsPerPage;
                const end = Math.min(start + wordsPerPage, activeEntry.words.length);
                return activeEntry.words.slice(start, end).map((w, i) => {
                  const realIdx = start + i;
                  return <span key={realIdx} className={`ep-word${realIdx === activeWordIdx ? ' active' : ''}`}>{w} </span>;
                });
              })()}
            </div>
          </div>
        ) : (
          <div className="ep-script-box">
            {isActive && activeEntry ? (
              <>
                {contextLabel && <div className="ep-script-context">{contextLabel}</div>}
                {(activeEntry.type === 'pause' || activeEntry.type === 'split_marker') && (
                  <div className="ep-script-pause">
                    <span className="ep-script-pause-label">Pause</span>
                    <span className="ep-script-countdown">{countdown}</span>
                  </div>
                )}
                {activeEntry.type === 'asset' && (
                  <div className="ep-script-pause">
                    <span className="ep-script-pause-label">&#x266B;</span>
                  </div>
                )}
              </>
            ) : (
              <div className="ep-script-idle">Press play to begin</div>
            )}
          </div>
        )}

        {/* Seek bar */}
        {isActive && (
          <div className="ep-seek-bar">
            <span className="ep-seek-time">{formatTime(elapsed)}</span>
            <input
              type="range"
              className="ep-seek"
              min="0"
              max={duration || 1}
              step="0.1"
              value={elapsed}
              style={{ '--progress': `${progress}%` }}
              onChange={e => {
                const t = parseFloat(e.target.value);
                if (audioRef.current) {
                  audioRef.current.currentTime = t;
                  setElapsed(t);
                  updateScriptDisplay(t);
                }
              }}
            />
            <span className="ep-seek-time">{formatTime(duration)}</span>
          </div>
        )}

        {/* Stage list */}
        <div className="player-stages">
          {items.map((item, idx) => {
            const isCurrent = idx === playIdx;
            const isDone = playedStagesRef.current.has(idx);
            return (
              <div
                key={item.id || idx}
                className={`player-stage${isCurrent ? ` player-stage-${status}` : ''}${isDone ? ' player-stage-done' : ''}`}
              >
                <span className="player-stage-num">
                  {isDone ? '✓' : idx + 1}
                </span>
                <Link to={`/edit/${item.meditation}?stage=${item.stage_id}`} className="player-stage-body" onClick={() => {
                  if (Object.keys(item.variables || {}).length > 0) {
                    saveStageVariables(item.meditation, item.stage_id, item.variables);
                  }
                }}>
                  <span className="player-stage-exercise">{item.meditation_display}</span>
                  <span className="player-stage-detail">{item.stage_name}</span>
                </Link>
                <span className="player-stage-durations">
                  {(() => {
                    const varMins = itemDurationMinutes(item);
                    return varMins != null ? <span className="player-stage-exercise-dur">{varMins} min</span> : null;
                  })()}
                  {(() => {
                    const dur = itemDurations[item.id];
                    return dur ? <span className="player-stage-actual-dur">{formatTime(dur)}</span> : null;
                  })()}
                </span>
                {isCurrent && status === 'assembling' && <span className="player-stage-indicator">...</span>}
                <button
                  className={`player-stage-play${isCurrent && (status === 'playing' || status === 'assembling') ? ' playing' : ''}`}
                  onClick={e => { e.stopPropagation(); handlePlaySingle(idx); }}
                  disabled={isCurrent && status === 'assembling'}
                >
                  {isCurrent && (status === 'playing' || status === 'paused') ? '■' : '▶'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
