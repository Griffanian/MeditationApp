import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { fetchMeta, fetchInstructions, fetchStageScript, fetchStageVariables, fetchBeforeYouBeginBlocks, logSession, validatePrompt, fetchPlaybackClips, BASE } from '../api';
import ReactMarkdown from 'react-markdown';
import { computeFixedDuration, formatDuration } from '../playback';
import { buildTimeline, buildComponentsMap, loadClipBuffers, scheduleTimeline } from '../clipEngine';
import PlaybackCard from '../components/PlaybackCard';

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
  const [bufferProgress, setBufferProgress] = useState(null); // { loaded, total }

  const [activeEntry, setActiveEntry] = useState(null);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [countdown, setCountdown] = useState('');
  const [bybBlocks, setBybBlocks] = useState([]);
  const [bybStep, setBybStep] = useState(0);
  const [bybResponses, setBybResponses] = useState({});
  const [bybVarDefs, setBybVarDefs] = useState({});
  const [bybValidation, setBybValidation] = useState({});
  const [bybValidating, setBybValidating] = useState(false);
  const bybValidationTimer = useRef(null);
  const [showByb, setShowByb] = useState(false);

  const tickRef = useRef(null);
  const timelineRef = useRef([]);
  const wordTimestampsRef = useRef({});

  // AudioContext-based playback refs
  const audioCtxRef = useRef(null);
  const clipBuffersRef = useRef({});   // segId → { buffer, trimStart, trimEnd }
  const assetBuffersRef = useRef({});  // filename → { buffer, trimStart, trimEnd }
  const scheduledRef = useRef([]);     // currently scheduled AudioBufferSourceNodes
  const playOriginRef = useRef({ ctxTime: 0, offset: 0 });
  const keepAliveRef = useRef(null);   // silent Audio element to keep mobile session alive

  // Load script, clips, variables on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const results = await Promise.all([
          fetchStageScript(name, stageId),
          fetchStageVariables(name, stageId),
          fetchBeforeYouBeginBlocks(name, stageId).catch(() => []),
          fetchPlaybackClips(name, stageId),
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

        const script = results[0];
        const variables = results[1];
        const blocks = results[2];
        const clipData = results[3];

        // Set up BYB wizard if blocks exist
        if (blocks.length > 0) {
          const varDefs = {};
          for (const [k, v] of Object.entries(variables || {})) {
            if (k !== '_conditions' && k !== 'computed_min') varDefs[k] = v;
          }
          const defaults = {};
          for (const b of blocks) {
            if (b.type === 'prompt' && b.variable && varDefs[b.variable]) {
              const def = varDefs[b.variable];
              defaults[b.variable] = def.value ?? def.options?.[0] ?? '';
            }
          }
          setBybBlocks(blocks);
          setBybStep(0);
          setBybVarDefs(varDefs);
          setBybResponses(defaults);
          setShowByb(true);
        }

        // Build components map from clip data (for timeline building)
        const components = buildComponentsMap(script, clipData);

        // Store timestamps from clip data (replaces N individual timestamp fetches)
        for (const [segId, clip] of Object.entries(clipData.clips || {})) {
          if (clip.timestamps) {
            wordTimestampsRef.current[segId] = clip.timestamps;
          }
        }

        const tl = buildTimeline(script, variables, components);
        timelineRef.current = tl;
        setDuration(computeFixedDuration(script, variables, components));

        // Create AudioContext and pre-fetch all clip audio
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;

        const { clipBuffers, assetBuffers } = await loadClipBuffers(ctx, clipData,
          (loaded, total) => { if (!cancelled) setBufferProgress({ loaded, total }); });

        if (cancelled) { ctx.close(); return; }

        clipBuffersRef.current = clipBuffers;
        assetBuffersRef.current = assetBuffers;

        console.log(`[playback] loaded ${Object.keys(clipBuffersRef.current).length} clips, ${Object.keys(assetBuffersRef.current).length} assets`);

        if (!cancelled) { setBufferProgress(null); setStatus('ready'); }
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
      stopAllSources();
      audioCtxRef.current?.close();
      if (tickRef.current) clearInterval(tickRef.current);
      if (keepAliveRef.current) { keepAliveRef.current.pause(); keepAliveRef.current = null; }
    };
  }, []);

  // --- AudioContext scheduling ---

  function stopAllSources() {
    for (const s of scheduledRef.current) {
      try { s.stop(); } catch {}
    }
    scheduledRef.current = [];
  }

  function scheduleClips(fromTime) {
    stopAllSources();

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    playOriginRef.current = { ctxTime: ctx.currentTime, offset: fromTime };
    scheduledRef.current = scheduleTimeline(
      ctx, timelineRef.current, clipBuffersRef.current, assetBuffersRef.current, fromTime,
    );
  }

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

  function getCurrentTime() {
    const ctx = audioCtxRef.current;
    if (!ctx) return 0;
    const origin = playOriginRef.current;
    return origin.offset + (ctx.currentTime - origin.ctxTime);
  }

  function startTick() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'running') {
        const t = getCurrentTime();
        setElapsed(t);
        updateScriptDisplay(t);
        if (t >= duration && duration > 0) {
          handleComplete();
        }
      }
    }, 100);
  }

  function stopTick() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  function handleStop() {
    stopAllSources();
    if (audioCtxRef.current?.state === 'running') {
      audioCtxRef.current.suspend();
    }
    if (keepAliveRef.current) keepAliveRef.current.pause();
    stopTick();
    setStatus('ready');
    setElapsed(0);
    setActiveEntry(null);
    setActiveWordIdx(-1);
    setCountdown('');
  }

  function handleComplete() {
    const dur = duration;
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
    if (status === 'paused' && audioCtxRef.current) {
      audioCtxRef.current.resume();
      if (keepAliveRef.current) keepAliveRef.current.play().catch(() => {});
      setStatus('playing');
      startTick();
      return;
    }

    handleStop();

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Resume AudioContext (required for user gesture on iOS/mobile)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Keep audio session alive on mobile with a silent loop
    if (!keepAliveRef.current) {
      keepAliveRef.current = new Audio();
      keepAliveRef.current.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      keepAliveRef.current.loop = true;
      keepAliveRef.current.volume = 0;
    }
    keepAliveRef.current.play().catch(() => {});

    scheduleClips(0);
    setStatus('playing');
    startTick();
  }

  function handlePause() {
    if (status !== 'playing') return;
    audioCtxRef.current?.suspend();
    if (keepAliveRef.current) keepAliveRef.current.pause();
    setStatus('paused');
    stopTick();
  }

  function handleSeek(time) {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const wasPlaying = status === 'playing';

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        scheduleClips(time);
        setElapsed(time);
        updateScriptDisplay(time);
        if (!wasPlaying) ctx.suspend();
      });
    } else {
      scheduleClips(time);
      setElapsed(time);
      updateScriptDisplay(time);
    }
  }

  function handleBack() {
    stopAllSources();
    audioCtxRef.current?.suspend();
    if (keepAliveRef.current) { keepAliveRef.current.pause(); keepAliveRef.current = null; }
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
      {showByb && (() => {
        const block = bybBlocks[bybStep];
        const isLast = bybStep >= bybBlocks.length - 1;
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
                <button className="byb-modal-ready" onClick={() => setShowByb(false)} disabled={!canAdvance}>Ready</button>
              ) : (
                <button className="byb-modal-ready" onClick={() => setBybStep(s => s + 1)} disabled={!canAdvance}>Next</button>
              )}
            </div>
          </div>
        </div>
        );
      })()}
      <button className="ep-back" onClick={handleBack}>&#x2190; Back</button>

      <div className="player-card">
        <div className="player-card-header">
          <h1 className="player-title">{displayName || name}</h1>
        </div>
        {stageName && <div className="player-meta"><span>{stageName}</span></div>}

        <PlaybackCard
          status={status}
          bufferProgress={status === 'loading' ? bufferProgress : null}
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
