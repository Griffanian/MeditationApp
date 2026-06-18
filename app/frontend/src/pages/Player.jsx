import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPractice, saveStageVariables, assembleStage, computeDurations, BASE } from '../api';
import { useLocalState } from '../utils';

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

export default function Player() {
  const { name } = useParams();
  const [practice, setPractice] = useState(null);
  const [currentWeek, setCurrentWeek] = useLocalState(`player:${name}:week`, 0);
  const [currentDay, setCurrentDay] = useLocalState(`player:${name}:day`, 0);
  const [completedDays, setCompletedDays] = useLocalState(`player:${name}:completed`, {});

  // Playback state
  const [playIdx, setPlayIdx] = useState(-1);
  const [status, setStatus] = useState('idle'); // idle, assembling, playing, paused
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [itemDurations, setItemDurations] = useState({});
  const [singleMode, setSingleMode] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState('idle'); // idle, preparing, ready
  const [bgVolume, setBgVolume] = useLocalState(`player:bgVolume`, 0.3);
  const [bgMuted, setBgMuted] = useState(false);
  const audioRef = useRef(null);
  const bgAudioRef = useRef(null); // looping background ambient
  const nextAudioRef = useRef(null); // preloaded next stage
  const timerRef = useRef(null);
  const stopRef = useRef(false);
  const gapTimerRef = useRef(null);
  const playIdxRef = useRef(-1);
  const preparedUrls = useRef({}); // idx -> audio URL

  useEffect(() => {
    fetchPractice(name).then(p => {
      p.items = migrateToWeeks(p.items);
      setPractice(p);
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
    };
  }, []);

  // Stop playback and clear cache when switching week/day
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (bgAudioRef.current) { bgAudioRef.current.pause(); bgAudioRef.current = null; }
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
  }, [currentWeek, currentDay]);

  // Keep bg volume/mute in sync — stop audio entirely when volume is 0
  useEffect(() => {
    if (bgVolume === 0 || bgMuted) {
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
        bgAudioRef.current = null;
      }
    } else if (bgAudioRef.current) {
      bgAudioRef.current.volume = bgVolume;
    } else if (status === 'playing') {
      startBgAudio();
    }
  }, [bgVolume, bgMuted, status]);

  if (!practice) return <div className="loading-page"><div className="loading-spinner" />Loading player...</div>;

  const weeks = practice.items || [];
  if (weeks.length === 0) return <div className="player-empty">This programme has no content yet.</div>;

  const week = weeks[currentWeek] || weeks[0];
  const days = week?.days || [];
  const day = days[currentDay] || days[0];
  const items = day?.items || [];
  const dayKey = `${currentWeek}-${currentDay}`;
  const isDayCompleted = !!completedDays[dayKey];

  function markDayCompleted() {
    setCompletedDays(prev => ({ ...prev, [dayKey]: true }));
    // Log to backend
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

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        setElapsed(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
    }, 250);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startBgAudio() {
    if (bgAudioRef.current) return;
    if (bgVolume === 0) return;
    const bg = new Audio(`${BASE}/audio/asset/ambient_default.mp3`);
    bg.loop = true;
    bg.volume = bgMuted ? 0 : bgVolume;
    bg.play().catch(() => {});
    bgAudioRef.current = bg;
  }

  function stopBgAudio() {
    if (bgAudioRef.current) {
      bgAudioRef.current.pause();
      bgAudioRef.current = null;
    }
  }

  // Assemble a single stage and cache its URL
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

  // Pre-assemble ALL stages for this day in background
  async function prepareAll() {
    setPrepareStatus('preparing');
    for (let i = 0; i < items.length; i++) {
      if (stopRef.current) return;
      try { await prepareOne(i); } catch {}
    }
    setPrepareStatus('ready');
  }

  // Preload an Audio element for the next stage so it's buffered and ready
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

  // Play stage at idx — use preloaded audio if available
  function playFromUrl(idx, single = false) {
    if (idx >= items.length || (single && idx !== playIdxRef.current)) {
      if (!single) markDayCompleted();
      setStatus('idle');
      setPlayIdx(-1);
      setSingleMode(false);
      stopTimer();
      stopBgAudio();
      return;
    }
    if (stopRef.current) return;

    playIdxRef.current = idx;
    setPlayIdx(idx);
    setElapsed(0);
    setDuration(0);
    setStatus('playing');
    startBgAudio();

    // Use preloaded audio if we have it for this idx
    let audio;
    if (nextAudioRef.current && nextAudioRef.current.idx === idx) {
      audio = nextAudioRef.current.audio;
      nextAudioRef.current = null;
    } else {
      audio = new Audio(preparedUrls.current[idx]);
    }

    audioRef.current = audio;
    startTimer();

    // Preload the one after this
    preloadNext(idx);

    const onFinish = () => {
      audioRef.current = null;
      if (!stopRef.current) {
        if (single) {
          setStatus('idle');
          setPlayIdx(-1);
          setSingleMode(false);
          stopTimer();
          stopBgAudio();
        } else {
          // Brief pause between stages so transitions aren't jarring
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
      if (bgAudioRef.current) bgAudioRef.current.play();
      setStatus('playing');
      startTimer();
      return;
    }
    handleStop();
    stopRef.current = false;
    setSingleMode(false);

    // Prepare first stage, start playing, then prepare rest in background
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

    // Prepare all remaining stages in background
    prepareAll();
  }

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

  function handlePause() {
    if (audioRef.current && status === 'playing') {
      audioRef.current.pause();
      if (bgAudioRef.current) bgAudioRef.current.pause();
      setStatus('paused');
      stopTimer();
    }
  }

  function handleStop() {
    stopRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (nextAudioRef.current) { nextAudioRef.current = null; }
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    stopBgAudio();
    stopTimer();
    setStatus('idle');
    setPlayIdx(-1);
    playIdxRef.current = -1;
    setSingleMode(false);
    setElapsed(0);
    setDuration(0);
    setError(null);
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

  return (
    <div className="player">
      <nav className="breadcrumb">
        <Link to="/practices" className="breadcrumb-link">Programmes</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{practice.display_name}</span>
      </nav>

      <div className="player-card">
        <div className="player-card-header">
          <h1 className="player-title">{practice.display_name}</h1>
          {isDayCompleted && <span className="player-completed-tick" title="Completed">✓</span>}
        </div>

        {/* Week/Day selector */}
        <div className="player-nav">
          <div className="player-nav-labels">
            <span className="player-nav-label">Week</span>
          </div>
          <div className="player-week-nav">
            <button className="player-nav-arrow" onClick={() => { setCurrentWeek(Math.max(0, currentWeek - 1)); setCurrentDay(0); }} disabled={currentWeek === 0}>‹</button>
            <div className="player-week-dots">
              {weeks.map((w, i) => (
                <button
                  key={i}
                  className={`player-week-dot${i === currentWeek ? ' active' : ''}`}
                  onClick={() => { setCurrentWeek(i); setCurrentDay(0); }}
                  title={w.label}
                >{i + 1}</button>
              ))}
            </div>
            <button className="player-nav-arrow" onClick={() => { setCurrentWeek(Math.min(weeks.length - 1, currentWeek + 1)); setCurrentDay(0); }} disabled={currentWeek === weeks.length - 1}>›</button>
          </div>
          <div className="player-day-nav">
            {days.map((d, i) => (
              <button
                key={i}
                className={`player-day-btn${i === currentDay ? ' active' : ''}`}
                onClick={() => setCurrentDay(i)}
              >{d.label}</button>
            ))}
          </div>
        </div>

        {/* Day info */}
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
          {prepareStatus === 'preparing' && <span className="player-meta-sep">·</span>}
          {prepareStatus === 'preparing' && <span className="player-meta-preparing">Caching...</span>}
        </div>

        {/* Play bar */}
        <div className={`player-bar${error ? ' player-bar-has-error' : ''}`}>
          <div className="player-bar-controls">
            {status === 'idle' && (
              <button className="player-bar-main player-bar-play" onClick={handlePlay} disabled={items.length === 0}>▶ Start</button>
            )}
            {status === 'playing' && (
              <button className="player-bar-main player-bar-pause" onClick={handlePause}>⏸ Pause</button>
            )}
            {status === 'paused' && (
              <button className="player-bar-main player-bar-play" onClick={handlePlay}>▶ Resume</button>
            )}
            {status === 'assembling' && (
              <button className="player-bar-main player-bar-assembling" disabled>Preparing...</button>
            )}
            {status === 'between' && (
              <button className="player-bar-main player-bar-assembling" disabled>Next stage...</button>
            )}

            {isActive && (
              <div className="player-bar-secondary">
                <button className="player-bar-sm" onClick={handleSkip} title="Next stage">⏭</button>
                <button className="player-bar-sm" onClick={handleStop} title="Stop">■</button>
              </div>
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

          {(status === 'playing' || status === 'paused') && playIdx >= 0 && (
            <div className="player-bar-now">
              <span className="player-bar-now-label">{items[playIdx]?.meditation_display}</span>
              <span className="player-bar-now-time">{formatTime(elapsed)} / {formatTime(duration)}</span>
            </div>
          )}

          {isActive && (
            <div className="player-bar-progress-wrap">
              <input
                type="range"
                className="player-bar-seek"
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
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Background audio control */}
        <div className="player-bg-control">
          <button
            className={`player-bg-toggle${bgMuted ? ' muted' : ''}`}
            onClick={() => setBgMuted(!bgMuted)}
            title={bgMuted ? 'Unmute background' : 'Mute background'}
          >{bgMuted ? '🔇' : '🔊'}</button>
          <span className="player-bg-label">Background</span>
          <input
            type="range"
            className="player-bg-volume"
            min="0"
            max="1"
            step="0.05"
            value={bgMuted ? 0 : bgVolume}
            onChange={e => {
              const v = parseFloat(e.target.value);
              setBgVolume(v);
              if (v > 0 && bgMuted) setBgMuted(false);
            }}
          />
        </div>

        {/* Stage list */}
        <div className="player-stages">
          {items.map((item, idx) => {
            const isCurrent = idx === playIdx;
            const isDone = playIdx >= 0 && idx < playIdx;
            const isPrepared = !!preparedUrls.current[idx];
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
