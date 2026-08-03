import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchPractice, saveStageVariables, computeDurations, savePracticeProgress, fetchStageScript, fetchStageVariables, fetchStageInfoBatch, fetchPlaybackClips, validatePrompt } from '../api';
import ReactMarkdown from 'react-markdown';
import { formatDuration } from '../playback';
import { buildTimeline, buildComponentsMap, loadClipBuffers, scheduleTimeline } from '../clipEngine';
import PlaybackCard from '../components/PlaybackCard';

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
  const entries = Object.entries(variables).filter(([k]) => !k.startsWith('_'));
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

  // Only days with content count — empty padding slots are just "Rest" fillers
  const allDays = [];
  for (let wi = 0; wi < weeks.length; wi++) {
    const wDays = weeks[wi]?.days || [];
    for (let di = 0; di < wDays.length; di++) {
      if ((wDays[di]?.items || []).length > 0) allDays.push({ wi, di });
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
  const [bybBlocks, setBybBlocks] = useState([]);      // [{type, content, variable, label}]
  const [bybStep, setBybStep] = useState(0);
  const [bybResponses, setBybResponses] = useState({}); // {variable: value}
  const [bybVarDefs, setBybVarDefs] = useState({});    // {varName: {type, options, allowCustom, ...}}
  const [bybValidation, setBybValidation] = useState({}); // {variable: {status, message, suggestion}}
  const [bybValidating, setBybValidating] = useState(false);
  const [showByb, setShowByb] = useState(false);
  const [bybLoading, setBybLoading] = useState(true);
  const bybValidationTimer = useRef(null);

  // Playback state
  const [playIdx, setPlayIdx] = useState(-1);
  const [status, setStatus] = useState('idle'); // idle, assembling, playing, paused, between
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [itemDurations, setItemDurations] = useState({});
  const [bufferProgress, setBufferProgress] = useState(null); // { idx, loaded, total }

  // Script display state (ExercisePlayer-style)
  const [activeEntry, setActiveEntry] = useState(null);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [countdown, setCountdown] = useState('');
  const pendingStageRef = useRef(null);

  const timerRef = useRef(null);
  const stopRef = useRef(false);
  const gapTimerRef = useRef(null);
  const playIdxRef = useRef(-1);
  const singleRef = useRef(false);
  const playedStagesRef = useRef(new Set());
  const sessionStartRef = useRef(null);
  const cumulativeDurationRef = useRef(0);
  const autoplayPending = useRef(false);
  const handlePlayRef = useRef(null);

  // Client-side clip playback (AudioContext) — same engine as ExercisePlayer
  const audioCtxRef = useRef(null);
  const keepAliveRef = useRef(null);   // silent Audio element keeps the mobile session alive
  const scheduledRef = useRef([]);     // scheduled AudioBufferSourceNodes for the current stage
  const playOriginRef = useRef({ ctxTime: 0, offset: 0 });
  const currentDurRef = useRef(0);     // duration of the currently playing stage
  const stageDataRef = useRef({});     // idx → { timeline, duration, clipBuffers, assetBuffers, wordTs }
  const stageLoadRef = useRef({});     // idx → in-flight load promise

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
    // Cancel guard: StrictMode double-mounts in dev — without this, two fetches
    // produce two `practice` identities and the day-setup effect (BYB wizard) runs twice.
    let cancelled = false;
    const hasUrlPos = urlParamsRef.current.week !== null || urlParamsRef.current.day !== null;
    fetchPractice(name).then(p => {
      if (cancelled) return;
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
        computeDurations(allItems).then(durs => { if (!cancelled) setItemDurations(durs); });
      }
    });
    return () => { cancelled = true; };
  }, [name]);

  useEffect(() => {
    return () => {
      for (const s of scheduledRef.current) { try { s.stop(); } catch {} }
      scheduledRef.current = [];
      audioCtxRef.current?.close();
      if (keepAliveRef.current) { keepAliveRef.current.pause(); keepAliveRef.current = null; }
      if (timerRef.current) clearInterval(timerRef.current);
      if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    };
  }, []);

  // Stop playback when switching week/day; auto-start if autoplay is on
  const autoplayRef = useRef(false);
  autoplayRef.current = autoplay;
  useEffect(() => {
    playedStagesRef.current = new Set();
    for (const s of scheduledRef.current) { try { s.stop(); } catch {} }
    scheduledRef.current = [];
    if (audioCtxRef.current?.state === 'running') audioCtxRef.current.suspend();
    if (keepAliveRef.current) keepAliveRef.current.pause();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    stopRef.current = true;
    setStatus('idle');
    setPlayIdx(-1);
    playIdxRef.current = -1;
    singleRef.current = false;
    setElapsed(0);
    setDuration(0);
    setError(null);
    stageDataRef.current = {};
    stageLoadRef.current = {};
    currentDurRef.current = 0;
    timelineRef.current = null;
    setActiveEntry(null);
    setActiveWordIdx(-1);
    setCountdown('');
    setBybLoading(true);
    const stageToPlay = pendingStageRef.current;
    pendingStageRef.current = null;
    if (practice) {
      const week = (practice.items || [])[currentWeek];
      const dayData = week?.days?.[currentDay];
      const dayItems = dayData?.items || [];
      // Prefetch the first stage's clips immediately (overlaps with the BYB wizard)
      // so pressing Play doesn't wait on downloads
      if (dayItems.length > 0) {
        loadStage(0).catch(() => {});
      }
      const uniqueStages = [...new Set(dayItems.map(i => `${i.meditation}/${i.stage_id}`))];
      // One batched request for BYB blocks + variables (instead of two per stage)
      fetchStageInfoBatch(uniqueStages.map(key => {
        const [med, sid] = key.split('/');
        return { meditation: med, stage_id: sid };
      })).then(info => {
        const blockResults = uniqueStages.map(key => info[key]?.blocks || []);
        const varResults = uniqueStages.map(key => info[key]?.variables || {});
        // Build a merged variable definitions map across all stages
        const varDefs = {};
        for (const vars of varResults) {
          for (const [k, v] of Object.entries(vars || {})) {
            if (k !== '_conditions' && k !== 'computed_min') varDefs[k] = v;
          }
        }

        // Combine all stage blocks into one sequence
        const allBlocks = [];
        for (const blocks of blockResults) {
          if (blocks.length > 0) allBlocks.push(...blocks);
        }
        setBybBlocks(allBlocks);
        setBybStep(0);
        setBybVarDefs(varDefs);

        // Set defaults for prompt blocks from variable definitions
        const defaults = {};
        for (const b of allBlocks) {
          if (b.type === 'prompt' && b.variable && varDefs[b.variable]) {
            const def = varDefs[b.variable];
            defaults[b.variable] = def.value ?? def.options?.[0] ?? '';
          }
        }
        setBybResponses(defaults);

        if (allBlocks.length > 0) {
          // Store play intent so Ready button triggers playback
          if (autoplayPending.current) {
            pendingStageRef.current = autoplayFromRef.current ?? autoplayStageRef.current ?? 0;
            autoplayPending.current = false;
          } else if (stageToPlay != null) {
            pendingStageRef.current = stageToPlay;
          }
          setShowByb(true);
          setBybLoading(false);
        } else {
          setBybLoading(false);
          if (stageToPlay != null) {
            setTimeout(() => { if (handlePlayFromRef.current) handlePlayFromRef.current(stageToPlay); }, 0);
          }
        }
      }).catch(() => setBybLoading(false));
    } else if (practice) {
      // No stages in this day — nothing to check
      setBybLoading(false);
      if (stageToPlay != null) {
        setTimeout(() => { if (handlePlayFromRef.current) handlePlayFromRef.current(stageToPlay); }, 0);
      }
    }
    // When practice is null (still loading), keep bybLoading=true
  }, [practice, currentWeek, currentDay]);

  // Autoplay (optionally from a specific stage index)
  const autoplayStageRef = useRef(urlParamsRef.current.stage != null ? parseInt(urlParamsRef.current.stage, 10) : null);
  const autoplayFromRef = useRef(urlParamsRef.current.from != null ? parseInt(urlParamsRef.current.from, 10) : null);
  const handlePlaySingleRef = useRef(null);
  const handlePlayFromRef = useRef(null);
  useEffect(() => {
    if (!practice || !autoplayPending.current || bybLoading) return;
    if (showByb) return; // Wait for user to dismiss BYB modal first
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
  }, [practice, bybLoading, showByb]);

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
    logPartialSession();
  }

  function logPartialSession(currentElapsed = 0) {
    if (!sessionStartRef.current) return;
    const totalDuration = cumulativeDurationRef.current + currentElapsed;
    if (totalDuration <= 0) return;
    const endedAt = new Date().toISOString();
    import('../api').then(({ logSession }) => {
      logSession({
        practice: name,
        practice_display: practice?.display_name || name,
        week: currentWeek,
        day: currentDay,
        day_label: day?.label || `Day ${currentDay + 1}`,
        duration: totalDuration,
        started_at: sessionStartRef.current,
        ended_at: endedAt,
      });
    });
    // Session logged — reset so we don't double-log
    sessionStartRef.current = null;
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

  // --- Client-side clip playback (AudioContext) ---
  // Same engine as ExercisePlayer: fetch each stage's clips, decode to AudioBuffers,
  // schedule them at their timeline offsets. No server-side assembly.

  function ensureCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }

  function stopAllSources() {
    for (const s of scheduledRef.current) {
      try { s.stop(); } catch {}
    }
    scheduledRef.current = [];
  }

  function getCurrentTime() {
    const ctx = audioCtxRef.current;
    if (!ctx) return 0;
    const origin = playOriginRef.current;
    return origin.offset + (ctx.currentTime - origin.ctxTime);
  }

  // Fetch script + clips for a stage and decode into AudioBuffers.
  // Cached per idx with in-flight dedupe so prefetch and play never double-load.
  function loadStage(idx) {
    if (stageDataRef.current[idx]) return Promise.resolve(stageDataRef.current[idx]);
    if (stageLoadRef.current[idx]) return stageLoadRef.current[idx];
    const item = items[idx];
    if (!item) return Promise.resolve(null);
    const ctx = ensureCtx();
    const t0 = performance.now();
    const promise = (async () => {
      const hasVars = Object.keys(item.variables || {}).length > 0;
      const [script, stageVars, clipData] = await Promise.all([
        fetchStageScript(item.meditation, item.stage_id),
        fetchStageVariables(item.meditation, item.stage_id),
        fetchPlaybackClips(item.meditation, item.stage_id, hasVars ? item.variables : undefined),
      ]);
      const variables = { ...stageVars, ...(item.variables || {}) };
      const components = buildComponentsMap(script, clipData);
      const timeline = buildTimeline(script, variables, components);
      const wordTs = {};
      for (const [segId, clip] of Object.entries(clipData.clips || {})) {
        if (clip.timestamps) wordTs[segId] = clip.timestamps;
      }
      const { clipBuffers, assetBuffers } = await loadClipBuffers(ctx, clipData,
        (loaded, total) => setBufferProgress({ idx, loaded, total }));
      const data = {
        timeline,
        duration: timeline.length ? timeline[timeline.length - 1].end : 0,
        clipBuffers,
        assetBuffers,
        wordTs,
      };
      stageDataRef.current[idx] = data;
      delete stageLoadRef.current[idx];
      console.log(`[playback] loadStage(${idx}): ${Object.keys(clipBuffers).length} clips in ${Math.round(performance.now() - t0)}ms`);
      return data;
    })();
    promise.catch(() => { delete stageLoadRef.current[idx]; });
    stageLoadRef.current[idx] = promise;
    return promise;
  }

  function scheduleStage(idx, fromTime) {
    stopAllSources();
    const ctx = audioCtxRef.current;
    const data = stageDataRef.current[idx];
    if (!ctx || !data) return;
    playOriginRef.current = { ctxTime: ctx.currentTime, offset: fromTime };
    scheduledRef.current = scheduleTimeline(ctx, data.timeline, data.clipBuffers, data.assetBuffers, fromTime);
  }

  // --- Timer ---

  function startTick() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state !== 'running') return;
      const t = getCurrentTime();
      setElapsed(t);
      updateScriptDisplay(t);
      const dur = currentDurRef.current;
      if (dur > 0 && t >= dur) onStageEnd();
    }, 100);
  }

  function stopTick() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  // --- Session flow ---

  function endSession() {
    stopTick();
    stopAllSources();
    logPartialSession();
    if (audioCtxRef.current?.state === 'running') audioCtxRef.current.suspend();
    if (keepAliveRef.current) keepAliveRef.current.pause();
    setStatus('idle');
    setPlayIdx(-1);
    playIdxRef.current = -1;
    singleRef.current = false;
    setElapsed(0);
    setDuration(0);
    timelineRef.current = null;
    setActiveEntry(null);
    setActiveWordIdx(-1);
    setCountdown('');
  }

  function onStageEnd() {
    stopTick();
    stopAllSources();
    const idx = playIdxRef.current;
    cumulativeDurationRef.current += currentDurRef.current;
    playedStagesRef.current.add(idx);
    if (playedStagesRef.current.size >= items.length) {
      markDayCompleted();
    }
    if (stopRef.current) return;
    const lastStage = idx + 1 >= items.length;
    if (lastStage || (singleRef.current && !autoplayRef.current)) {
      endSession();
      return;
    }
    // Gap between stages — the ambient bed keeps playing so the session audibly continues
    setStatus('between');
    setActiveEntry(null);
    setActiveWordIdx(-1);
    setCountdown('');
    gapTimerRef.current = setTimeout(() => {
      gapTimerRef.current = null;
      if (!stopRef.current) playStage(idx + 1);
    }, 2000);
  }

  async function playStage(idx) {
    playIdxRef.current = idx;
    setPlayIdx(idx);
    setElapsed(0);
    let data = stageDataRef.current[idx];
    if (!data) {
      setStatus('assembling');
      try {
        data = await loadStage(idx);
      } catch (err) {
        console.warn(`[playback] Failed to load stage ${idx}:`, err);
        if (stopRef.current) return;
        // Skip to the next stage rather than stalling the session
        if (idx + 1 < items.length && !(singleRef.current && !autoplayRef.current)) {
          setStatus('between');
          gapTimerRef.current = setTimeout(() => {
            gapTimerRef.current = null;
            if (!stopRef.current) playStage(idx + 1);
          }, 2000);
        } else {
          setError({ idx, message: err.message });
          endSession();
        }
        return;
      }
      if (stopRef.current) return;
    }
    if (!data) return;

    currentDurRef.current = data.duration;
    setDuration(data.duration);
    timelineRef.current = { idx, timeline: data.timeline };
    wordTimestampsRef.current = data.wordTs;

    scheduleStage(idx, 0);
    setBufferProgress(null);
    setStatus('playing');
    startTick();

    // Prefetch the next stage's clips while this one plays
    if (idx + 1 < items.length && !(singleRef.current && !autoplayRef.current)) {
      loadStage(idx + 1).catch(() => {});
    }
  }

  async function startSession(startIdx, single) {
    handleStop();
    stopRef.current = false;
    singleRef.current = single;
    setError(null);
    if (!sessionStartRef.current) {
      sessionStartRef.current = new Date().toISOString();
      cumulativeDurationRef.current = 0;
      playedStagesRef.current = new Set();
    }

    // Resume AudioContext inside the user gesture (required on iOS/mobile)
    const ctx = ensureCtx();
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }

    // Silent looping <audio> keeps the mobile audio session alive
    if (!keepAliveRef.current) {
      keepAliveRef.current = new Audio();
      keepAliveRef.current.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      keepAliveRef.current.loop = true;
      keepAliveRef.current.volume = 0;
    }
    keepAliveRef.current.play().catch(() => {});

    playStage(startIdx);
  }

  async function handlePlay() {
    if (bybLoading || showByb) return; // no playback until Before You Begin is done
    if (status === 'paused') {
      audioCtxRef.current?.resume();
      if (keepAliveRef.current) keepAliveRef.current.play().catch(() => {});
      setStatus('playing');
      startTick();
      return;
    }
    startSession(0, false);
  }
  handlePlayRef.current = handlePlay;

  async function handlePlayFrom(startIdx) {
    if (bybLoading || showByb) return;
    startSession(startIdx, false);
  }
  handlePlayFromRef.current = handlePlayFrom;

  async function handlePlaySingle(idx) {
    if (bybLoading || showByb) return;
    if (playIdx === idx && (status === 'playing' || status === 'assembling' || status === 'paused')) {
      handleStop();
      return;
    }
    startSession(idx, true);
  }
  handlePlaySingleRef.current = handlePlaySingle;

  function handlePause() {
    if (status === 'playing') {
      audioCtxRef.current?.suspend();
      if (keepAliveRef.current) keepAliveRef.current.pause();
      setStatus('paused');
      stopTick();
    }
  }

  function handleStop() {
    // Log partial session if any stages were played
    const midStage = (status === 'playing' || status === 'paused') && playIdxRef.current >= 0
      ? Math.max(0, Math.min(getCurrentTime(), currentDurRef.current || 0))
      : 0;
    if (playedStagesRef.current.size > 0 || midStage > 0) {
      logPartialSession(midStage);
    }
    stopRef.current = true;
    stopAllSources();
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    stopTick();
    if (audioCtxRef.current?.state === 'running') audioCtxRef.current.suspend();
    if (keepAliveRef.current) keepAliveRef.current.pause();
    setStatus('idle');
    setPlayIdx(-1);
    playIdxRef.current = -1;
    singleRef.current = false;
    setElapsed(0);
    setDuration(0);
    setError(null);
    timelineRef.current = null;
    setActiveEntry(null);
    setActiveWordIdx(-1);
    setCountdown('');
  }

  function handleSkip() {
    stopAllSources();
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    stopTick();
    if (playIdx >= 0 && playIdx < items.length - 1) {
      playStage(playIdx + 1);
    } else {
      endSession();
    }
  }


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

  // Flat list of days WITH content for prev/next navigation — empty padding
  // days (trailing "Rest" slots) are not navigable
  const allDays = [];
  for (let wi = 0; wi < weeks.length; wi++) {
    const wDays = weeks[wi]?.days || [];
    for (let di = 0; di < wDays.length; di++) {
      if ((wDays[di]?.items || []).length > 0) allDays.push({ wi, di });
    }
  }
  // Order comparison instead of index equality so navigation still works if the
  // current position somehow sits on an empty day
  const dayOrd = (wi, di) => wi * 1000 + di;
  const curOrd = dayOrd(currentWeek, currentDay);
  const prevContentDays = allDays.filter(d => dayOrd(d.wi, d.di) < curOrd);
  const nextContentDays = allDays.filter(d => dayOrd(d.wi, d.di) > curOrd);
  const hasPrevDay = prevContentDays.length > 0;
  const hasNextDay = nextContentDays.length > 0;

  function goToDay(wi, di) {
    setCurrentWeek(wi);
    setCurrentDay(di);
    savePosition(wi, di, completedDays);
  }

  function goPrevDay() {
    if (!hasPrevDay) return;
    const prev = prevContentDays[prevContentDays.length - 1];
    goToDay(prev.wi, prev.di);
  }

  function goNextDay() {
    if (!hasNextDay) return;
    const next = nextContentDays[0];
    goToDay(next.wi, next.di);
  }

  return (
    <div className="player">
      {showByb && (() => {
        const block = bybBlocks[bybStep];
        const isLast = bybStep >= bybBlocks.length - 1;
        const hasChoiceBlocks = bybBlocks.some(b => b.type === 'choice' || b.type === 'text_input');

        function handleBybFinish() {
          setShowByb(false);
          // Apply prompt responses as variable overrides on the day items
          for (const b of bybBlocks) {
            if (!b.variable) continue;
            const val = bybResponses[b.variable];
            if (val == null) continue;
            for (const item of items) {
              if (!item.variables) item.variables = {};
              item.variables[b.variable] = { ...item.variables[b.variable], value: val };
            }
          }
          // Clear cached stage data since variables may have changed, then re-prefetch
          if (hasChoiceBlocks) {
            stageDataRef.current = {};
            stageLoadRef.current = {};
            loadStage(pendingStageRef.current ?? 0).catch(() => {});
          }
          const stageToPlay = pendingStageRef.current;
          pendingStageRef.current = null;
          if (stageToPlay != null) {
            setTimeout(() => { if (handlePlayFromRef.current) handlePlayFromRef.current(stageToPlay); }, 0);
          }
        }

        // Can advance from choice blocks only if a response is selected
        const canAdvance = !block || block.type === 'text' || (
          block.variable && bybResponses[block.variable] != null && bybResponses[block.variable] !== ''
        );

        return (
        <div className="modal-overlay">
          <div className="modal byb-modal byb-wizard" onClick={e => e.stopPropagation()}>
            {bybBlocks.length > 1 && (
              <div className="byb-wizard-progress">
                {bybBlocks.map((_, i) => (
                  <div key={i} className={`byb-progress-dot${i === bybStep ? ' active' : i < bybStep ? ' done' : ''}`} />
                ))}
              </div>
            )}

            <div className="byb-wizard-content">
              {block?.type === 'text' && (
                <div className="byb-wizard-text">
                  <ReactMarkdown>{block.content || ''}</ReactMarkdown>
                </div>
              )}
              {block?.type === 'prompt' && (() => {
                const varDef = bybVarDefs[block.variable] || {};
                const val = bybResponses[block.variable] ?? '';
                const options = varDef.options || [];
                const isCustom = varDef.allowCustom && !options.includes(val);
                const label = block.label || varDef.displayName || block.variable;
                const validation = bybValidation[block.variable];

                function handleCustomChange(newVal) {
                  setBybResponses(r => ({ ...r, [block.variable]: newVal }));
                  setBybValidation(v => ({ ...v, [block.variable]: null }));
                  // Debounce validation
                  if (bybValidationTimer.current) clearTimeout(bybValidationTimer.current);
                  if (newVal.trim().length > 1) {
                    bybValidationTimer.current = setTimeout(() => {
                      setBybValidating(true);
                      validatePrompt({
                        text: newVal,
                        label,
                        options,
                        context: varDef.displayName || '',
                      }).then(result => {
                        setBybValidation(v => ({ ...v, [block.variable]: result }));
                      }).finally(() => setBybValidating(false));
                    }, 800);
                  }
                }

                function applySuggestion() {
                  if (validation?.suggestion) {
                    setBybResponses(r => ({ ...r, [block.variable]: validation.suggestion }));
                    setBybValidation(v => ({ ...v, [block.variable]: { status: 'ok' } }));
                  }
                }

                return (
                  <div className="byb-wizard-choice">
                    <h3 className="byb-wizard-label">{label}</h3>
                    {options.length > 0 ? (
                      <div className="byb-prompt-options">
                        {options.map(opt => (
                          <button key={opt}
                            className={`byb-option${val === opt ? ' byb-option-selected' : ''}`}
                            onClick={() => {
                              setBybResponses(r => ({ ...r, [block.variable]: opt }));
                              setBybValidation(v => ({ ...v, [block.variable]: null }));
                            }}>
                            {opt}
                          </button>
                        ))}
                        {varDef.allowCustom && (
                          <>
                            <button
                              className={`byb-option${isCustom ? ' byb-option-selected' : ''}`}
                              onClick={() => {
                                setBybResponses(r => ({ ...r, [block.variable]: '' }));
                                setBybValidation(v => ({ ...v, [block.variable]: null }));
                              }}>
                              Choose your own
                            </button>
                            {isCustom && (
                              <input type="text" className="byb-custom-input"
                                placeholder="Type your own..."
                                value={val}
                                autoFocus
                                onChange={e => handleCustomChange(e.target.value)} />
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <input type="text" className="byb-text-input"
                        placeholder="Type here..."
                        value={val}
                        onChange={e => handleCustomChange(e.target.value)} />
                    )}
                    {bybValidating && isCustom && (
                      <div className="byb-validation byb-validation-checking">Checking...</div>
                    )}
                    {validation && validation.status === 'spelling' && (
                      <div className="byb-validation byb-validation-spelling">
                        {validation.message}
                        {validation.suggestion && (
                          <button className="byb-validation-fix" onClick={applySuggestion}>
                            Use "{validation.suggestion}"
                          </button>
                        )}
                      </div>
                    )}
                    {validation && validation.status === 'inappropriate' && (
                      <div className="byb-validation byb-validation-warning">
                        {validation.message}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="byb-wizard-nav">
              {bybStep > 0 && (
                <button className="byb-wizard-back" onClick={() => setBybStep(s => s - 1)}>Back</button>
              )}
              <div className="byb-wizard-spacer" />
              {isLast ? (
                <button className="byb-modal-ready" onClick={handleBybFinish} disabled={!canAdvance}>Ready</button>
              ) : (
                <button className="byb-modal-ready" onClick={() => setBybStep(s => s + 1)} disabled={!canAdvance}>Next</button>
              )}
            </div>
          </div>
        </div>
        );
      })()}
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

        <PlaybackCard
          status={(bybLoading || showByb) && status === 'idle' ? 'loading' : status}
          bufferProgress={status === 'assembling' && bufferProgress && bufferProgress.idx === playIdx ? bufferProgress : null}
          elapsed={elapsed}
          duration={duration}
          activeEntry={activeEntry}
          activeWordIdx={activeWordIdx}
          countdown={countdown}
          contextLabel={contextLabel}
          error={error ? error.message : null}
          errorLabel={error ? items[error.idx]?.meditation_display : null}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={t => {
            if (playIdxRef.current >= 0 && stageDataRef.current[playIdxRef.current]) {
              scheduleStage(playIdxRef.current, t);
              setElapsed(t);
              updateScriptDisplay(t);
            }
          }}
          onDismissError={() => setError(null)}
        >
          <button
            className={`player-autoplay-toggle${autoplay ? ' active' : ''}`}
            onClick={() => setAutoplay(a => !a)}
            title={autoplay ? 'Autoplay on' : 'Autoplay off'}
          >
            Autoplay {autoplay ? 'on' : 'off'}
          </button>
        </PlaybackCard>

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
                <button
                  className={`player-stage-play${isCurrent && (status === 'playing' || status === 'assembling') ? ' playing' : ''}`}
                  onClick={e => { e.stopPropagation(); handlePlaySingle(idx); }}
                  disabled={(isCurrent && status === 'assembling') || bybLoading || showByb}
                  style={bybLoading || showByb ? { visibility: 'hidden' } : undefined}
                >
                  {isCurrent && status === 'assembling'
                    ? <span className="player-stage-spinner">&#x25CC;</span>
                    : isCurrent && (status === 'playing' || status === 'paused') ? '■' : '▶'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
