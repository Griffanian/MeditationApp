import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { fetchPractice, saveStageVariables, assembleStage, BASE } from '../api';

function migrateToWeeks(items) {
  if (!items || items.length === 0) return [];
  if (items[0] && items[0].days) return items;
  return [{ label: 'Week 1', days: [{ label: 'Day 1', items }] }];
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlaySession() {
  const { name } = useParams();
  const [searchParams] = useSearchParams();
  const weekIdx = parseInt(searchParams.get('week') || '0');
  const dayIdx = parseInt(searchParams.get('day') || '0');
  const navigate = useNavigate();

  const [practice, setPractice] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(-1); // -1 = not started
  const [status, setStatus] = useState('idle'); // idle, assembling, playing, paused, done
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const stopRef = useRef(false);

  useEffect(() => {
    fetchPractice(name).then(p => {
      p.items = migrateToWeeks(p.items);
      setPractice(p);
    });
  }, [name]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!practice) return <div className="loading-page"><div className="loading-spinner" />Loading session...</div>;

  const weeks = practice.items || [];
  const week = weeks[weekIdx];
  const day = week?.days?.[dayIdx];
  const items = day?.items || [];
  const dayLabel = `${week?.label || `Week ${weekIdx + 1}`} — ${day?.label || `Day ${dayIdx + 1}`}`;

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

  async function playItem(idx) {
    if (idx >= items.length) {
      setStatus('done');
      setCurrentIdx(-1);
      stopTimer();
      return;
    }
    if (stopRef.current) return;

    const item = items[idx];
    setCurrentIdx(idx);
    setElapsed(0);
    setDuration(0);

    // Save variables
    if (Object.keys(item.variables || {}).length > 0) {
      await saveStageVariables(item.meditation, item.stage_id, item.variables);
    }

    // Assemble
    setStatus('assembling');
    let data;
    try {
      data = await assembleStage(item.meditation, item.stage_id);
    } catch (err) {
      console.error('Assembly failed:', err);
      playItem(idx + 1);
      return;
    }
    if (stopRef.current) return;

    // Play
    setStatus('playing');
    const audio = new Audio(
      `${BASE}/audio/meditation/${item.meditation}/stage/${item.stage_id}/output/${data.filename}?t=${Date.now()}`
    );
    audioRef.current = audio;
    startTimer();

    audio.onended = () => {
      audioRef.current = null;
      if (!stopRef.current) playItem(idx + 1);
    };
    audio.onerror = () => {
      audioRef.current = null;
      if (!stopRef.current) playItem(idx + 1);
    };
    audio.play().catch(() => {
      if (!stopRef.current) playItem(idx + 1);
    });
  }

  function handleStart() {
    stopRef.current = false;
    playItem(0);
  }

  function handlePause() {
    if (audioRef.current && status === 'playing') {
      audioRef.current.pause();
      setStatus('paused');
      stopTimer();
    }
  }

  function handleResume() {
    if (audioRef.current && status === 'paused') {
      audioRef.current.play();
      setStatus('playing');
      startTimer();
    }
  }

  function handleStop() {
    stopRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    stopTimer();
    setStatus('idle');
    setCurrentIdx(-1);
    setElapsed(0);
    setDuration(0);
  }

  function handleSkip() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    stopTimer();
    if (currentIdx >= 0 && currentIdx < items.length - 1) {
      playItem(currentIdx + 1);
    } else {
      setStatus('done');
      setCurrentIdx(-1);
    }
  }

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  return (
    <div className="session">
      <div className="session-header">
        <button className="session-back" onClick={() => navigate(`/play/${name}`)}>← Back</button>
        <div className="session-info">
          <h1 className="session-title">{practice.display_name}</h1>
          <h2 className="session-subtitle">{dayLabel}</h2>
        </div>
      </div>

      {/* Stage list */}
      <div className="session-stages">
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className={`session-stage${idx === currentIdx ? ` session-stage-${status}` : ''}${status === 'done' || (currentIdx >= 0 && idx < currentIdx) ? ' session-stage-done' : ''}`}
          >
            <span className="session-stage-num">{idx + 1}</span>
            <div className="session-stage-info">
              <span className="session-stage-name">{item.meditation_display}</span>
              <span className="session-stage-detail">{item.stage_name}</span>
            </div>
            {idx === currentIdx && status === 'playing' && (
              <span className="session-stage-indicator">♪</span>
            )}
            {idx === currentIdx && status === 'assembling' && (
              <span className="session-stage-indicator">...</span>
            )}
            {(status === 'done' || (currentIdx >= 0 && idx < currentIdx)) && (
              <span className="session-stage-check">✓</span>
            )}
          </div>
        ))}
      </div>

      {/* Now playing bar */}
      {currentIdx >= 0 && status !== 'idle' && (
        <div className="session-now-playing">
          <div className="session-now-label">
            {status === 'assembling' ? 'Preparing...' : items[currentIdx]?.meditation_display}
          </div>
          <div className="session-progress-bar">
            <div className="session-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="session-time">
            {formatTime(elapsed)} / {formatTime(duration)}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="session-controls">
        {status === 'idle' && (
          <button className="session-btn session-btn-play" onClick={handleStart}>
            ▶ Start
          </button>
        )}
        {status === 'playing' && (
          <>
            <button className="session-btn session-btn-pause" onClick={handlePause}>⏸ Pause</button>
            <button className="session-btn session-btn-skip" onClick={handleSkip}>⏭ Skip</button>
            <button className="session-btn session-btn-stop" onClick={handleStop}>■ Stop</button>
          </>
        )}
        {status === 'paused' && (
          <>
            <button className="session-btn session-btn-play" onClick={handleResume}>▶ Resume</button>
            <button className="session-btn session-btn-skip" onClick={handleSkip}>⏭ Skip</button>
            <button className="session-btn session-btn-stop" onClick={handleStop}>■ Stop</button>
          </>
        )}
        {status === 'assembling' && (
          <button className="session-btn session-btn-stop" onClick={handleStop}>■ Cancel</button>
        )}
        {status === 'done' && (
          <div className="session-done">
            <span className="session-done-text">Practice complete</span>
            <button className="session-btn session-btn-play" onClick={() => navigate(`/play/${name}`)}>
              ← Back to Programme
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
