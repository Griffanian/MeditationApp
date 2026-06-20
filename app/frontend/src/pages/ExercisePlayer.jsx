import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { fetchMeta, fetchInstructions, fetchStageScript, fetchStageComponents, fetchStageVariables, fetchStageTimestamps, BASE } from '../api';
import { flattenScript, resolvePauseDuration, computeMarkerDuration, computeFixedDuration, formatDuration, unlockAudio } from '../playback';

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
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

export default function ExercisePlayer() {
  const { name, stageId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(location.state?.displayName || '');
  const [stageName, setStageName] = useState(location.state?.stageName || '');

  const [status, setStatus] = useState('loading'); // loading, ready, playing, paused, error
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  // Script display state
  const [activeEntry, setActiveEntry] = useState(null);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [countdown, setCountdown] = useState('');

  // Refs for segment-by-segment playback
  const audioRef = useRef(null);          // current Audio element (speech/asset)
  const tickRef = useRef(null);           // display update interval
  const segTimerRef = useRef(null);       // setTimeout for pause/split segments
  const pauseStartRef = useRef(null);     // Date.now() when pause segment started
  const pauseRemainingRef = useRef(0);    // remaining ms when user pauses during a timed segment
  const segIdxRef = useRef(-1);           // current segment index
  const stoppedRef = useRef(false);
  const timelineRef = useRef([]);
  const wordTimestampsRef = useRef({});

  // Load script, components, variables on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [script, components, variables] = await Promise.all([
          fetchStageScript(name, stageId),
          fetchStageComponents(name, stageId),
          fetchStageVariables(name, stageId),
          ...(!displayName ? [fetchMeta(name).then(m => {
            if (!cancelled) setDisplayName(m.display_name || name);
          })] : []),
          ...(!stageName ? [fetchInstructions(name).then(instr => {
            if (!cancelled && instr.stages) {
              const stage = instr.stages.find(s => s.id === stageId);
              if (stage) setStageName(stage.name);
            }
          })] : []),
        ]);

        if (cancelled) return;

        const tl = buildTimeline(script, variables, components);
        timelineRef.current = tl;
        setDuration(computeFixedDuration(script, variables, components));

        // Fetch word timestamps for speech segments
        const speechIds = [...new Set(tl.filter(e => e.type === 'speech').map(e => e.segId))];
        const tsResults = await Promise.all(
          speechIds.map(segId =>
            fetchStageTimestamps(name, stageId, segId)
              .then(ts => ({ segId, ts }))
              .catch(() => ({ segId, ts: [] }))
          )
        );
        for (const { segId, ts } of tsResults) {
          wordTimestampsRef.current[segId] = ts;
        }

        if (!cancelled) setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err.message);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [name, stageId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (tickRef.current) clearInterval(tickRef.current);
      if (segTimerRef.current) clearTimeout(segTimerRef.current);
    };
  }, []);

  // --- Display updates ---

  function computeGlobalElapsed(idx, localElapsed) {
    const tl = timelineRef.current;
    if (idx < 0 || idx >= tl.length) return 0;
    return tl[idx].start + localElapsed;
  }

  function updateDisplay(idx, localElapsed) {
    const tl = timelineRef.current;
    const entry = tl[idx];
    if (!entry) return;

    const global = computeGlobalElapsed(idx, localElapsed);
    setElapsed(global);
    setActiveEntry(entry);

    if (entry.type === 'speech') {
      const ts = wordTimestampsRef.current[entry.segId] || [];
      let wordIdx = -1;
      for (let i = ts.length - 1; i >= 0; i--) {
        if (localElapsed >= ts[i].start) { wordIdx = i; break; }
      }
      setActiveWordIdx(wordIdx);
      setCountdown('');
    } else if (entry.type === 'pause' || entry.type === 'split_marker') {
      const remaining = Math.max(0, Math.ceil(entry.dur - localElapsed));
      setCountdown(formatDuration(remaining));
      setActiveWordIdx(-1);
    } else {
      setActiveWordIdx(-1);
      setCountdown('');
    }
  }

  function startTick(idx) {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const entry = timelineRef.current[idx];
      if (!entry) return;

      if (entry.type === 'speech' || entry.type === 'asset') {
        if (audioRef.current) {
          updateDisplay(idx, audioRef.current.currentTime);
        }
      } else {
        // pause / split_marker
        if (pauseStartRef.current != null) {
          const localElapsed = (Date.now() - pauseStartRef.current) / 1000;
          updateDisplay(idx, localElapsed);
        }
      }
    }, 100);
  }

  function stopTick() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  // --- Segment-by-segment playback ---

  const playSegment = useCallback((idx) => {
    const tl = timelineRef.current;
    if (stoppedRef.current || idx >= tl.length) {
      // Finished
      stoppedRef.current = true;
      stopTick();
      setStatus('ready');
      setElapsed(0);
      setActiveEntry(null);
      setActiveWordIdx(-1);
      setCountdown('');
      segIdxRef.current = -1;
      return;
    }

    const entry = tl[idx];
    segIdxRef.current = idx;
    updateDisplay(idx, 0);

    if (entry.type === 'speech' || entry.type === 'asset') {
      const url = entry.type === 'speech'
        ? `${BASE}/audio/meditation/${name}/stage/${stageId}/component/${entry.segId}.mp3`
        : `${BASE}/audio/asset/${entry.file}`;
      // Reuse a single Audio element created in handlePlay (user gesture context)
      // so it stays unlocked for iOS playback from timer callbacks
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      let ended = false;
      const advance = () => {
        if (ended) return;
        ended = true;
        playSegment(idx + 1);
      };
      audio.onended = null;
      audio.onerror = null;
      audio.src = url;
      audio.onended = advance;
      audio.onerror = advance;
      startTick(idx);
      audio.play().catch(advance);
    } else {
      // pause / split_marker — play ambient to keep Audio element active on mobile
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.onended = null;
      audio.onerror = null;
      audio.loop = true;
      audio.volume = 0;
      audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      audio.play().catch(() => {});

      pauseStartRef.current = Date.now();
      pauseRemainingRef.current = entry.dur * 1000;
      startTick(idx);
      segTimerRef.current = setTimeout(() => {
        segTimerRef.current = null;
        pauseStartRef.current = null;
        audio.loop = false;
        audio.pause();
        playSegment(idx + 1);
      }, entry.dur * 1000);
    }
  }, [name, stageId]);

  // --- Controls ---

  function handlePlay() {
    unlockAudio();
    if (status === 'paused') {
      setStatus('playing');
      const idx = segIdxRef.current;
      const entry = timelineRef.current[idx];

      if (entry && (entry.type === 'speech' || entry.type === 'asset') && audioRef.current) {
        audioRef.current.play();
        startTick(idx);
      } else if (entry && (entry.type === 'pause' || entry.type === 'split_marker')) {
        // Resume the timed segment with remaining time
        const remaining = pauseRemainingRef.current;
        pauseStartRef.current = Date.now();
        startTick(idx);
        segTimerRef.current = setTimeout(() => {
          segTimerRef.current = null;
          pauseStartRef.current = null;
          playSegment(idx + 1);
        }, remaining);
      }
      return;
    }

    // Fresh play from start — create Audio element here (user gesture context)
    // so it's unlocked for iOS and can play from timer callbacks later
    stoppedRef.current = false;
    setError(null);
    if (!audioRef.current) audioRef.current = new Audio();
    setStatus('playing');
    playSegment(0);
  }

  function handlePause() {
    if (status !== 'playing') return;
    setStatus('paused');
    stopTick();

    const idx = segIdxRef.current;
    const entry = timelineRef.current[idx];

    if (entry && (entry.type === 'speech' || entry.type === 'asset') && audioRef.current) {
      audioRef.current.pause();
    } else if (entry && (entry.type === 'pause' || entry.type === 'split_marker')) {
      // Save remaining time
      if (segTimerRef.current) { clearTimeout(segTimerRef.current); segTimerRef.current = null; }
      if (pauseStartRef.current != null) {
        const elapsedMs = Date.now() - pauseStartRef.current;
        pauseRemainingRef.current = Math.max(0, pauseRemainingRef.current - elapsedMs);
        pauseStartRef.current = null;
      }
    }
  }

  function handleBack() {
    stoppedRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (segTimerRef.current) { clearTimeout(segTimerRef.current); segTimerRef.current = null; }
    stopTick();
    navigate(-1);
  }

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  const isActive = status === 'playing' || status === 'paused';

  // Build context label
  let contextLabel = '';
  if (activeEntry) {
    if (activeEntry.loopLabel) {
      contextLabel = activeEntry.loopLabel;
      if (activeEntry.loopTotal > 1) {
        contextLabel += ` — Round ${activeEntry.loopIteration} of ${activeEntry.loopTotal}`;
      }
    } else if (activeEntry.loopTotal > 1) {
      contextLabel = `Round ${activeEntry.loopIteration} of ${activeEntry.loopTotal}`;
    }
  }

  return (
    <div className="exercise-player">
      <button className="ep-back" onClick={handleBack}>&#x2190; Back</button>

      <div className="ep-card">
        <div className="ep-title">{displayName || name}</div>
        {stageName && <div className="ep-stage">{stageName}</div>}

        <div className="ep-controls">
          {status === 'loading' && (
            <button className="ep-play-btn ep-play-btn-disabled" disabled>
              <span className="ep-play-icon ep-spin">&#x25CC;</span>
            </button>
          )}
          {(status === 'ready' || status === 'error') && (
            <button className="ep-play-btn" onClick={handlePlay}>
              <span className="ep-play-icon">&#x25B6;</span>
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
        </div>

        {error && <div className="ep-error">{error}</div>}

        {isActive && activeEntry && (
          <div className="ep-script-box">
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
          </div>
        )}

        <div className="ep-time">
          <span>{formatTime(elapsed)}</span>
          <span>{status === 'loading' ? '...' : formatTime(duration)}</span>
        </div>

        <div className="ep-progress-wrap">
          <div className="ep-progress-bar">
            <div className="ep-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
