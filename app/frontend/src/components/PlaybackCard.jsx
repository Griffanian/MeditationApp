import { useState, useRef, useEffect } from 'react';

const AMBIENT_VOLUME = 0.3;
const AMBIENT_SRC = '/ambient/fire-crackle-loop.wav';

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlaybackCard({
  status, elapsed, duration,
  activeEntry, activeWordIdx, countdown, contextLabel,
  error, errorLabel,
  onPlay, onPause, onSeek, onDismissError,
  children,
}) {
  const [wordsPerPage, setWordsPerPage] = useState(50);
  const wordsRef = useRef(null);
  const measuredRef = useRef(false);
  const ambientRef = useRef(null); // { ctx, gainNode, source }

  function startAmbient() {
    const amb = ambientRef.current;
    if (amb) {
      if (amb.ctx.state === 'suspended') amb.ctx.resume();
      amb.gainNode.gain.setTargetAtTime(AMBIENT_VOLUME, amb.ctx.currentTime, 0.1);
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = ctx.createGain();
    gainNode.gain.value = AMBIENT_VOLUME;
    gainNode.connect(ctx.destination);
    fetch(AMBIENT_SRC)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(audioBuffer => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        source.connect(gainNode);
        source.start();
        ambientRef.current = { ctx, gainNode, source };
        console.log('[ambient] started, duration:', audioBuffer.duration.toFixed(1) + 's');
      })
      .catch(err => console.warn('[ambient] failed to start:', err));
  }

  // Start ambient automatically when playback begins (handles all play paths)
  useEffect(() => {
    const shouldPlay = status === 'playing' || status === 'assembling' || status === 'between';
    if (shouldPlay && !ambientRef.current) {
      startAmbient();
    } else if (ambientRef.current) {
      const target = shouldPlay ? AMBIENT_VOLUME : 0;
      ambientRef.current.gainNode.gain.setTargetAtTime(target, ambientRef.current.ctx.currentTime, 0.3);
    }
  }, [status]);

  // Cleanup on unmount
  useEffect(() => () => {
    const amb = ambientRef.current;
    if (amb) {
      amb.source.stop();
      amb.ctx.close();
      ambientRef.current = null;
    }
  }, []);

  // Measure how many words fit in the box
  useEffect(() => {
    const container = wordsRef.current;
    if (!container || measuredRef.current) return;
    const boxHeight = container.clientHeight;
    if (boxHeight <= 0 || container.children.length === 0) return;
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

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  const isActive = status === 'playing' || status === 'paused' || status === 'assembling' || status === 'between';

  return (
    <>
      {/* Play controls */}
      <div className="ep-controls">
        {(status === 'idle' || status === 'ready') && (
          <button className="ep-play-btn" onClick={() => { startAmbient(); onPlay(); }}>
            <span className="ep-play-icon">&#x25B6;</span>
          </button>
        )}
        {(status === 'loading' || status === 'assembling' || status === 'between') && (
          <button className="ep-play-btn ep-play-btn-disabled" disabled>
            <span className="ep-play-icon ep-spin">&#x25CC;</span>
          </button>
        )}
        {status === 'playing' && (
          <button className="ep-play-btn" onClick={onPause}>
            <span className="ep-play-icon ep-pause-icon" />
          </button>
        )}
        {status === 'paused' && (
          <button className="ep-play-btn" onClick={() => { startAmbient(); onPlay(); }}>
            <span className="ep-play-icon">&#x25B6;</span>
          </button>
        )}
      </div>

      {children}

      {/* Error */}
      {error && (
        <div className="player-bar-error">
          <span className="player-bar-error-msg">{errorLabel ? `${errorLabel}: ` : ''}{typeof error === 'string' ? error : error.message}</span>
          <div className="player-bar-error-actions">
            <button className="player-bar-error-btn" onClick={onDismissError}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Script display */}
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
            onChange={e => onSeek(parseFloat(e.target.value))}
          />
          <span className="ep-seek-time">{formatTime(duration)}</span>
        </div>
      )}
    </>
  );
}
