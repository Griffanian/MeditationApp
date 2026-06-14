import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPractice, saveStageVariables, assembleStage, fetchStageDurations, BASE } from '../api';
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

export default function Player() {
  const { name } = useParams();
  const [practice, setPractice] = useState(null);
  const [currentWeek, setCurrentWeek] = useLocalState(`player:${name}:week`, 0);
  const [currentDay, setCurrentDay] = useLocalState(`player:${name}:day`, 0);

  // Playback state
  const [playIdx, setPlayIdx] = useState(-1);
  const [status, setStatus] = useState('idle'); // idle, assembling, playing, paused, done
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null); // { idx, message }
  const [stageDurations, setStageDurations] = useState({}); // "med/stage" -> seconds
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const stopRef = useRef(false);

  useEffect(() => {
    fetchPractice(name).then(p => {
      p.items = migrateToWeeks(p.items);
      setPractice(p);
      // Collect all unique stages across all weeks/days and fetch durations
      const allItems = [];
      const seen = new Set();
      for (const week of (p.items || [])) {
        for (const day of (week.days || [])) {
          for (const item of (day.items || [])) {
            const key = `${item.meditation}/${item.stage_id}`;
            if (!seen.has(key)) {
              seen.add(key);
              allItems.push({ meditation: item.meditation, stage_id: item.stage_id });
            }
          }
        }
      }
      if (allItems.length > 0) {
        fetchStageDurations(allItems).then(setStageDurations);
      }
    });
  }, [name]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Stop playback when switching week/day
  useEffect(() => {
    handleStop();
  }, [currentWeek, currentDay]);

  if (!practice) return <div className="player-loading">Loading...</div>;

  const weeks = practice.items || [];
  if (weeks.length === 0) return <div className="player-empty">This programme has no content yet.</div>;

  const week = weeks[currentWeek] || weeks[0];
  const days = week?.days || [];
  const day = days[currentDay] || days[0];
  const items = day?.items || [];

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

  async function playFrom(idx) {
    if (idx >= items.length) {
      setStatus('done');
      setPlayIdx(-1);
      stopTimer();
      return;
    }
    if (stopRef.current) return;

    const item = items[idx];
    setPlayIdx(idx);
    setElapsed(0);
    setDuration(0);

    if (Object.keys(item.variables || {}).length > 0) {
      await saveStageVariables(item.meditation, item.stage_id, item.variables);
    }

    setStatus('assembling');
    setError(null);
    let data;
    try {
      data = await assembleStage(item.meditation, item.stage_id);
    } catch (err) {
      setError({ idx, message: err.message });
      setStatus('error');
      return;
    }
    if (stopRef.current) return;

    setStatus('playing');
    const audio = new Audio(
      `${BASE}/audio/meditation/${item.meditation}/stage/${item.stage_id}/output/${data.filename}?t=${Date.now()}`
    );
    audioRef.current = audio;
    startTimer();

    audio.onended = () => {
      audioRef.current = null;
      if (!stopRef.current) playFrom(idx + 1);
    };
    audio.onerror = () => {
      audioRef.current = null;
      if (!stopRef.current) playFrom(idx + 1);
    };
    audio.play().catch(() => {
      if (!stopRef.current) playFrom(idx + 1);
    });
  }

  function handlePlay() {
    if (status === 'paused' && audioRef.current) {
      audioRef.current.play();
      setStatus('playing');
      startTimer();
      return;
    }
    stopRef.current = false;
    playFrom(0);
  }

  function handlePause() {
    if (audioRef.current && status === 'playing') {
      audioRef.current.pause();
      setStatus('paused');
      stopTimer();
    }
  }

  function handleStop() {
    stopRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    stopTimer();
    setStatus('idle');
    setPlayIdx(-1);
    setElapsed(0);
    setDuration(0);
    setError(null);
  }

  function handleSkipError() {
    setError(null);
    if (playIdx >= 0 && playIdx < items.length - 1) {
      playFrom(playIdx + 1);
    } else {
      setStatus('done');
      setPlayIdx(-1);
    }
  }

  function handleSkip() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    stopTimer();
    if (playIdx >= 0 && playIdx < items.length - 1) {
      playFrom(playIdx + 1);
    } else {
      setStatus('done');
      setPlayIdx(-1);
    }
  }

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  const isActive = status !== 'idle' && status !== 'done' && status !== 'error';

  return (
    <div className="player">
      {/* Header */}
      <Link to="/practices" className="player-back">← Programmes</Link>
      <div className="player-hero">
        <h1 className="player-title">{practice.display_name}</h1>
        <div className="player-meta">
          <span className="player-meta-day">{week?.label} — {day?.label}</span>
          <span className="player-meta-sep">·</span>
          <span className="player-meta-count">{items.length} stage{items.length !== 1 ? 's' : ''}</span>
          {(() => {
            const totalSecs = items.reduce((sum, item) => {
              const dur = stageDurations[`${item.meditation}/${item.stage_id}`];
              return sum + (dur || 0);
            }, 0);
            return totalSecs > 0 ? (
              <><span className="player-meta-sep">·</span><span className="player-meta-duration">{formatTime(totalSecs)}</span></>
            ) : null;
          })()}
        </div>
      </div>

      {/* Play bar */}
      <div className={`player-bar${status === 'error' ? ' player-bar-has-error' : ''}`}>
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
          {status === 'done' && (
            <button className="player-bar-main player-bar-play" onClick={handlePlay}>↻ Replay</button>
          )}
          {status === 'error' && (
            <button className="player-bar-main player-bar-error-main" disabled>Error</button>
          )}

          {isActive && (
            <div className="player-bar-secondary">
              <button className="player-bar-sm" onClick={handleSkip} title="Skip">⏭</button>
              <button className="player-bar-sm" onClick={handleStop} title="Stop">■</button>
            </div>
          )}
        </div>

        {status === 'error' && error && (
          <div className="player-bar-error">
            <span className="player-bar-error-msg">{items[error.idx]?.meditation_display}: {error.message}</span>
            <div className="player-bar-error-actions">
              <button className="player-bar-error-btn" onClick={handleSkipError}>Skip</button>
              <button className="player-bar-error-btn" onClick={handleStop}>Stop</button>
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

        {status === 'done' && <span className="player-bar-done">Practice complete</span>}
      </div>

      {/* Stage list */}
      <div className="player-stages">
        {items.map((item, idx) => {
          const isCurrent = idx === playIdx;
          const isDone = playIdx >= 0 && idx < playIdx;
          return (
            <div
              key={item.id || idx}
              className={`player-stage${isCurrent ? ` player-stage-${status}` : ''}${isDone || status === 'done' ? ' player-stage-done' : ''}`}
            >
              <span className="player-stage-num">
                {isDone || status === 'done' ? '✓' : idx + 1}
              </span>
              <Link to={`/edit/${item.meditation}?stage=${item.stage_id}`} className="player-stage-body" onClick={() => {
                if (Object.keys(item.variables || {}).length > 0) {
                  saveStageVariables(item.meditation, item.stage_id, item.variables);
                }
              }}>
                <span className="player-stage-exercise">{item.meditation_display}</span>
                <span className="player-stage-detail">{item.stage_name}</span>
              </Link>
              {(() => {
                const dur = stageDurations[`${item.meditation}/${item.stage_id}`];
                return dur ? <span className="player-stage-duration">{formatTime(dur)}</span> : null;
              })()}
              {isCurrent && status === 'playing' && <span className="player-stage-indicator">♪</span>}
              {isCurrent && status === 'assembling' && <span className="player-stage-indicator">...</span>}
              {isCurrent && status === 'error' && <span className="player-stage-error-icon">!</span>}
            </div>
          );
        })}
      </div>

      {/* Week/Day selector at bottom */}
      <div className="player-nav">
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
    </div>
  );
}
