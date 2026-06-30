import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { fetchMeta, fetchInstructions, fetchStageScript, fetchStageComponents, fetchStageVariables, fetchStageTimestamps, fetchBeforeYouBegin, assembleStage, logSession, BASE } from '../api';
import ReactMarkdown from 'react-markdown';
import { flattenScript, resolvePauseDuration, computeMarkerDuration, computeFixedDuration, formatDuration, unlockAudio } from '../playback';
import PlaybackCard from '../components/PlaybackCard';

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

  const [status, setStatus] = useState('loading'); // loading, ready, assembling, playing, paused, error
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  const [activeEntry, setActiveEntry] = useState(null);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [countdown, setCountdown] = useState('');
  const [beforeYouBegin, setBeforeYouBegin] = useState('');
  const [showByb, setShowByb] = useState(false);

  const audioRef = useRef(null);
  const tickRef = useRef(null);
  const timelineRef = useRef([]);
  const wordTimestampsRef = useRef({});
  const audioUrlRef = useRef(null);

  // Load script, components, variables on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [script, components, variables] = await Promise.all([
          fetchStageScript(name, stageId),
          fetchStageComponents(name, stageId),
          fetchStageVariables(name, stageId),
          fetchBeforeYouBegin(name, stageId).then(byb => {
            if (!cancelled && byb) { setBeforeYouBegin(byb); setShowByb(true); }
          }),
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
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // --- Display updates ---

  function updateScriptDisplay(time) {
    const tl = timelineRef.current;
    let entry = null;
    for (let i = tl.length - 1; i >= 0; i--) {
      if (time >= tl[i].start) { entry = tl[i]; break; }
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

  function startTick() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        const t = audioRef.current.currentTime;
        setElapsed(t);
        updateScriptDisplay(t);
      }
    }, 100);
  }

  function stopTick() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  function handleStop() {
    if (audioRef.current) { audioRef.current.pause(); }
    stopTick();
    setStatus('ready');
    setElapsed(0);
    setActiveEntry(null);
    setActiveWordIdx(-1);
    setCountdown('');
  }

  function handleComplete() {
    const dur = audioRef.current?.duration || 0;
    handleStop();
    logSession({
      meditation_name: name,
      meditation_display: displayName,
      stage_id: stageId,
      stage_name: stageName,
      duration: dur,
    }).catch(() => {});
  }

  async function handlePlay() {
    unlockAudio();

    if (status === 'paused' && audioRef.current) {
      audioRef.current.play();
      setStatus('playing');
      startTick();
      return;
    }

    handleStop();

    // Assemble if we don't have a URL yet
    if (!audioUrlRef.current) {
      setStatus('assembling');
      try {
        const data = await assembleStage(name, stageId);
        audioUrlRef.current = `${BASE}/audio/meditation/${name}/stage/${stageId}/output/${data.filename}?t=${Date.now()}`;
      } catch (err) {
        setStatus('error');
        setError(err.message);
        return;
      }
    }

    const audio = audioRef.current || new Audio();
    audioRef.current = audio;
    audio.src = audioUrlRef.current;
    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.onended = () => handleComplete();
    audio.onerror = () => { setStatus('error'); setError('Audio playback failed'); };
    try {
      await audio.play();
      setStatus('playing');
      startTick();
    } catch {
      setStatus('error');
      setError('Playback failed — try tapping play again');
    }
  }

  function handlePause() {
    if (status !== 'playing') return;
    if (audioRef.current) audioRef.current.pause();
    setStatus('paused');
    stopTick();
  }

  function handleSeek(time) {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setElapsed(time);
      updateScriptDisplay(time);
    }
  }

  function handleBack() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    stopTick();
    navigate(-1);
  }

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
    <div className="player">
      {showByb && (
        <div className="modal-overlay" onClick={() => setShowByb(false)}>
          <div className="modal byb-modal" onClick={e => e.stopPropagation()}>
            <div className="byb-modal-header">
              <h3>Before You Begin</h3>
              <button className="modal-close" onClick={() => setShowByb(false)}>×</button>
            </div>
            <div className="byb-modal-body">
              <ReactMarkdown>{beforeYouBegin}</ReactMarkdown>
            </div>
            <button className="byb-modal-ready" onClick={() => setShowByb(false)}>Ready</button>
          </div>
        </div>
      )}
      <button className="ep-back" onClick={handleBack}>&#x2190; Back</button>

      <div className="player-card">
        <div className="player-card-header">
          <h1 className="player-title">{displayName || name}</h1>
        </div>
        {stageName && <div className="player-meta"><span>{stageName}</span></div>}

        <PlaybackCard
          status={status}
          elapsed={elapsed}
          duration={duration}
          activeEntry={activeEntry}
          activeWordIdx={activeWordIdx}
          countdown={countdown}
          contextLabel={contextLabel}
          error={error}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          onDismissError={() => setError(null)}
        />
      </div>
    </div>
  );
}
