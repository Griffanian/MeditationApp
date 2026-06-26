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

export default function Player() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [practice, setPractice] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);
  const [completedDays, setCompletedDays] = useState({});

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

  const audioRef = useRef(null);
  const droneRef = useRef(null);
  const nextAudioRef = useRef(null);
  const timerRef = useRef(null);
  const stopRef = useRef(false);
  const gapTimerRef = useRef(null);
  const playIdxRef = useRef(-1);
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
    if (urlParamsRef.current.autoplay) autoplayPending.current = true;
    window.history.replaceState({}, '', window.location.pathname);
  }

  useEffect(() => {
    const hasUrlPos = urlParamsRef.current.week !== null || urlParamsRef.current.day !== null;
    fetchPractice(name).then(p => {
      p.items = migrateToWeeks(p.items);
      setPractice(p);
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

  // Stop playback when switching week/day
  useEffect(() => {
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
    } else if (autoplayStageRef.current != null && handlePlaySingleRef.current) {
      handlePlaySingleRef.current(autoplayStageRef.current);
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
    if (Object.keys(item.variables || {}).length > 0) {
      await saveStageVariables(item.meditation, item.stage_id, item.variables);
    }
    const data = await assembleStage(item.meditation, item.stage_id);
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
      if (!single) markDayCompleted();
      setStatus('idle');
      setPlayIdx(-1);
      setSingleMode(false);
      stopTimer();
      stopDrone();
      timelineRef.current = null;
      setActiveEntry(null);
      setActiveWordIdx(-1);
      setCountdown('');
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
      if (!stopRef.current) {
        if (single) {
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
      markDayCompleted();
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

  return (
    <div className="player">
      <nav className="breadcrumb">
        <Link to="/practices" className="breadcrumb-link">Programmes</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to={`/practice/${name}`} className="breadcrumb-link">{practice.display_name}</Link>
      </nav>

      <div className="player-card">
        <div className="player-card-header">
          <h1 className="player-title">{practice.display_name}</h1>
          {isDayCompleted && <span className="player-completed-tick" title="Completed">✓</span>}
        </div>

        <div className="player-meta">
          <span className="player-meta-day">{week?.label} — {day?.label}</span>
          <span className="player-meta-sep">·</span>
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



        {error && (
          <div className="player-bar-error">
            <span className="player-bar-error-msg">{items[error.idx]?.meditation_display}: {error.message}</span>
            <div className="player-bar-error-actions">
              <button className="player-bar-error-btn" onClick={() => setError(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Script display — always visible */}
        <div className="ep-script-box">
          {isActive && activeEntry ? (
            <>
              {contextLabel && <div className="ep-script-context">{contextLabel}</div>}

              {activeEntry.type === 'speech' && (
                <div className="ep-script-words">
                  {activeEntry.words.map((w, i) => (
                    <span key={i} className={`ep-word${i === activeWordIdx ? ' active' : ''}`}>{w} </span>
                  ))}
                </div>
              )}

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
            const isDone = playIdx >= 0 && idx < playIdx;
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
