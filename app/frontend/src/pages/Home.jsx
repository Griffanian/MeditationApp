import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { fetchHistory, fetchPractices, fetchMyViewers, fetchMeditations, fetchInstructions, fetchStageScript, fetchStageComponents, fetchStageVariables, fetchStageTimestamps, BASE } from '../api';
import { flattenScript, resolvePauseDuration, computeMarkerDuration, computeFixedDuration, formatDuration as formatDur, unlockAudio } from '../playback';
import { formatDuration, formatDate } from '../components/HistoryViews';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function computeStreak(sessions) {
  if (sessions.length === 0) return 0;
  const daySet = new Set();
  for (const s of sessions) {
    const d = new Date(s.completed_at);
    d.setHours(0, 0, 0, 0);
    daySet.add(d.getTime());
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let check = new Date(today);
  // Count from today backwards
  while (daySet.has(check.getTime())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  // If nothing today, check from yesterday
  if (streak === 0) {
    check = new Date(today);
    check.setDate(check.getDate() - 1);
    while (daySet.has(check.getTime())) {
      streak++;
      check.setDate(check.getDate() - 1);
    }
  }
  return streak;
}

function getProgress(pracName, weeks) {
  try {
    const stored = localStorage.getItem(`player:${pracName}:completed`);
    if (!stored) return null;
    const completed = JSON.parse(stored);
    const completedCount = Object.keys(completed).filter(k => completed[k]).length;
    if (completedCount === 0) return null;
    const hasWeeks = weeks.length > 0 && weeks[0]?.days;
    const totalDays = hasWeeks ? weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0) : weeks.length;
    if (totalDays === 0) return null;
    return { done: completedCount, total: totalDays, pct: Math.round((completedCount / totalDays) * 100) };
  } catch { return null; }
}

function getMotivationalMessage(streak, totalSessions) {
  if (totalSessions === 0) return 'Welcome to Meditation Pro. Start your first session today.';
  if (streak > 1) return `${streak} day streak — keep it going!`;
  if (streak === 1) return 'You practised today. Nice work.';
  return 'Ready to get back on track?';
}

function formatHours(secs) {
  if (!secs) return '0m';
  const hours = Math.floor(secs / 3600);
  const mins = Math.round((secs % 3600) / 60);
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

function sessionTotalSecs(s) {
  if (s.exercises && s.exercises.length > 0) {
    const total = s.exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);
    if (total > 0) return total;
  }
  return s.duration || 0;
}

function resolveWordVars(word, variables) {
  return word.replace(/\{(\w+)\}/g, (_, varName) => {
    const v = variables[varName];
    if (v == null) return `{${varName}}`;
    return typeof v === 'object' ? (v.value ?? `{${varName}}`) : v;
  });
}

function buildDemoTimeline(script, variables, components) {
  const flat = flattenScript(script, variables, components);
  const loops = {};
  (function collect(segs) { for (const s of segs) { if (s.type === 'loop') { loops[s.id] = s; collect(s.segments); } } })(script);
  const timeline = [];
  let cursor = 0;
  for (const item of flat) {
    const { seg } = item;
    let dur = 0;
    if (seg.type === 'speech') { dur = components[seg.id]?.duration || 0; }
    else if (seg.type === 'pause') { dur = resolvePauseDuration(seg.duration_seconds, variables); }
    else if (seg.type === 'asset') { dur = components[seg.id]?.duration || 1; }
    else if (seg.type === 'split_marker') { const md = computeMarkerDuration(script, seg.id, variables, components); dur = md != null ? md * (seg.multiplier || 1) : 1; }
    if (dur > 0) {
      const loopSeg = item.loopId ? loops[item.loopId] : null;
      const rawWords = seg.type === 'speech' ? (seg.text || '').split(' ') : [];
      timeline.push({ start: cursor, end: cursor + dur, dur, type: seg.type, segId: seg.id, file: seg.file, words: rawWords.map(w => resolveWordVars(w, variables)), loopLabel: loopSeg?.label || '', loopIteration: item.loopIteration || null, loopTotal: item.loopTotal || null });
      cursor += dur;
    }
  }
  return timeline;
}

function formatTimeShort(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const DEMO_MED = 'box-breathing';

function useDemoData() {
  const [loading, setLoading] = useState(true);
  const [stageId, setStageId] = useState(null);
  const [initVars, setInitVars] = useState(null);
  const [scriptData, setScriptData] = useState(null);
  const wordTimestampsRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const instr = await fetchInstructions(DEMO_MED);
        const stage = instr.stages?.[0];
        if (!stage || cancelled) { setLoading(false); return; }
        setStageId(stage.id);
        const [script, components, vars] = await Promise.all([
          fetchStageScript(DEMO_MED, stage.id),
          fetchStageComponents(DEMO_MED, stage.id),
          fetchStageVariables(DEMO_MED, stage.id),
        ]);
        if (cancelled) return;
        const demoVars = {};
        for (const [k, v] of Object.entries(vars)) {
          demoVars[k] = typeof v === 'object' ? { ...v, value: 4 } : 4;
        }
        setInitVars(demoVars);
        setScriptData({ script, components });

        const tl = buildDemoTimeline(script, demoVars, components);
        const speechIds = [...new Set(tl.filter(e => e.type === 'speech').map(e => e.segId))];
        const tsResults = await Promise.all(speechIds.map(id =>
          fetchStageTimestamps(DEMO_MED, stage.id, id).then(ts => ({ id, ts })).catch(() => ({ id, ts: [] }))
        ));
        for (const { id, ts } of tsResults) wordTimestampsRef.current[id] = ts;
      } catch {} finally { if (!cancelled) setLoading(false); }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  return { loading, stageId, initVars, scriptData, wordTimestampsRef };
}

function BoxBreathingDemo({ onNext, demoData }) {
  const { loading, stageId, initVars, scriptData, wordTimestampsRef } = demoData;
  const [variables, setVariables] = useState(null);

  // Set variables once loaded
  useEffect(() => { if (initVars && !variables) setVariables(initVars); }, [initVars]);

  const [status, setStatus] = useState('idle'); // idle, ready, assembling, playing, paused
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeEntry, setActiveEntry] = useState(null);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [countdown, setCountdown] = useState('');

  const audioRef = useRef(null);
  const tickRef = useRef(null);
  const timelineRef = useRef([]);
  const audioUrlRef = useRef(null);

  // Rebuild timeline when variables change
  useEffect(() => {
    if (!scriptData || !stageId || !variables) return;
    const { script, components } = scriptData;
    const tl = buildDemoTimeline(script, variables, components);
    timelineRef.current = tl;
    setDuration(computeFixedDuration(script, variables, components));
    audioUrlRef.current = null; // clear cached assembly when vars change
    if (status === 'idle') setStatus('ready');
  }, [variables, scriptData]);

  // Cleanup
  useEffect(() => () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

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
      setCountdown(formatDur(Math.max(0, Math.ceil(entry.end - time))));
      setActiveWordIdx(-1);
    } else { setActiveWordIdx(-1); setCountdown(''); }
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

  function stopTick() { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } }

  function handleStop() {
    if (audioRef.current) { audioRef.current.pause(); }
    stopTick();
    setStatus('ready'); setElapsed(0); setActiveEntry(null); setActiveWordIdx(-1); setCountdown('');
  }

  async function handlePlay() {
    if (status === 'paused' && audioRef.current) {
      audioRef.current.play();
      setStatus('playing');
      startTick();
      return;
    }

    handleStop();

    // Save variables then assemble if we don't have a URL yet
    if (!audioUrlRef.current) {
      setStatus('assembling');
      try {
        const { assembleStage } = await import('../api');
        const data = await assembleStage(DEMO_MED, stageId, variables);
        audioUrlRef.current = `${BASE}/audio/meditation/${DEMO_MED}/stage/${stageId}/output/${data.filename}?t=${Date.now()}`;
      } catch (err) {
        setStatus('ready');
        return;
      }
    }

    const audio = audioRef.current || new Audio();
    audioRef.current = audio;
    audio.src = audioUrlRef.current;
    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.onended = () => { handleStop(); };
    audio.onerror = () => { handleStop(); };
    await audio.play();
    setStatus('playing');
    startTick();
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

  function updateVar(varName, value) {
    if (status === 'playing' || status === 'paused') handleStop();
    setVariables(prev => ({ ...prev, [varName]: typeof prev[varName] === 'object' ? { ...prev[varName], value } : value }));
  }

  const isActive = status === 'playing' || status === 'paused' || status === 'assembling';
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  let contextLabel = '';
  if (activeEntry) {
    if (activeEntry.loopLabel) { contextLabel = activeEntry.loopLabel; if (activeEntry.loopTotal > 1) contextLabel += ` — Round ${activeEntry.loopIteration} of ${activeEntry.loopTotal}`; }
    else if (activeEntry.loopTotal > 1) contextLabel = `Round ${activeEntry.loopIteration} of ${activeEntry.loopTotal}`;
  }

  if (loading || !scriptData || !variables) return <div className="ob-slide"><div className="ob-slide-top" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><div className="loading-spinner ob-loading-spinner" /></div></div>;

  const varEntries = Object.entries(variables);

  return (
    <div className="ob-slide ob-slide-demo">
      <div className="ob-demo-text">
        <div className="ob-eyebrow">Try it</div>
        <h2 className="ob-heading">Box Breathing</h2>
        <p className="ob-desc">Ready to see how this works? Change the variables, hit play, and hear the difference.</p>
      </div>

      <div className="ob-demo-player-card">
        <div className="ob-player">
          <button
            className={`ob-player-btn${status === 'assembling' ? ' ob-player-btn-disabled' : ''}`}
            disabled={status === 'assembling'}
            onClick={isActive ? (status === 'playing' ? handlePause : handlePlay) : handlePlay}
          >
            {status === 'assembling' ? <span className="ep-play-icon ep-spin">&#x25CC;</span>
              : status === 'playing' ? <span className="ep-pause-icon" />
              : <span>&#x25B6;</span>}
          </button>
        </div>

        <div className="ep-script-box">
          {isActive && activeEntry ? (<>
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
          </>) : (
            <div className="ep-script-pause-label">Tap play to try it</div>
          )}
        </div>

        <div className="ob-demo-bar">
          <span className="ob-demo-bar-time">{formatTimeShort(elapsed)}</span>
          <input
            type="range"
            className="ob-demo-seek"
            min="0"
            max={duration || 1}
            step="0.1"
            value={elapsed}
            style={{ flex: 1, '--progress': `${progress}%` }}
            onChange={e => handleSeek(parseFloat(e.target.value))}
          />
          <span className="ob-demo-bar-time">{formatTimeShort(duration)}</span>
        </div>
      </div>

      <div className="ob-demo-vars-card">
        <div className="ob-demo-vars-label">Variables</div>
        {[...varEntries].sort(([,a],[,b]) => {
          const uA = typeof a === 'object' ? a.unit : '';
          const uB = typeof b === 'object' ? b.unit : '';
          return uA === 'seconds' ? -1 : uB === 'seconds' ? 1 : 0;
        }).map(([varName, varData]) => {
          const val = typeof varData === 'object' ? varData.value : varData;
          const unit = typeof varData === 'object' ? varData.unit : '';
          const rawDisplay = typeof varData === 'object' && varData.displayName ? varData.displayName : varName;
          const display = rawDisplay.replace(/^Phase\s+/i, '');
          return (
            <div key={varName} className="ob-demo-field">
              <label>{display}{unit === 'seconds' ? ' (s)' : ''}</label>
              <div className="ob-demo-input-row">
                <input type="range" min="1" max="7" step="1" value={val} list={`ticks-${varName}`} onChange={e => updateVar(varName, Number(e.target.value))} />
                <datalist id={`ticks-${varName}`}>
                  {[1,2,3,4,5,6,7].map(n => <option key={n} value={n} />)}
                </datalist>
                <span className="ob-demo-value">{val}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ob-slide-bottom">
        <button className="ob-next" onClick={() => { handleStop(); onNext(); }}>Next</button>
      </div>
    </div>
  );
}

function BuilderOnboarding() {
  const [step, setStep] = useState(0);
  const total = 6;
  const demoData = useDemoData(); // preload immediately

  useEffect(() => {
    document.body.classList.add('onboarding-active');
    return () => document.body.classList.remove('onboarding-active');
  }, []);

  return (
    <div className="ob-fullscreen">
      {step === 0 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <h1 className="ob-hero">Meditation Pro</h1>
            <p className="ob-tagline">Build months of guided meditation in hours.</p>
          </div>
          <div className="ob-slide-bottom">
            <button className="ob-next" onClick={() => setStep(1)}>Get started</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <div className="ob-eyebrow">The Approach</div>
            <h2 className="ob-heading">Variables First</h2>
            <p className="ob-desc">Write your script once. Use variables for breath counts, durations, and rounds. One exercise becomes an entire progression.</p>
            <div className="ob-var-demo" style={{ marginTop: 20 }}>
              <div className="ob-var-row">
                <span className="ob-var-name">breath</span>
                <div className="ob-var-progression">
                  <span>4s</span><span className="ob-var-arrow">→</span><span>6s</span><span className="ob-var-arrow">→</span><span>8s</span>
                </div>
              </div>
              <div className="ob-var-row">
                <span className="ob-var-name">rounds</span>
                <div className="ob-var-progression">
                  <span>3</span><span className="ob-var-arrow">→</span><span>5</span><span className="ob-var-arrow">→</span><span>8</span>
                </div>
              </div>
              <div className="ob-var-row">
                <span className="ob-var-name">hold</span>
                <div className="ob-var-progression">
                  <span>2s</span><span className="ob-var-arrow">→</span><span>4s</span><span className="ob-var-arrow">→</span><span>6s</span>
                </div>
              </div>
            </div>
          </div>
          <div className="ob-slide-bottom">
            <button className="ob-next" onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <div className="ob-eyebrow">Our approach to AI</div>
            <h2 className="ob-heading">As Much or As Little As You Want</h2>
            <p className="ob-desc">Generate speech from your script, record your own voice, extract exercises from a PDF or video — or write everything from scratch. You're in control.</p>
          </div>
          <div className="ob-slide-bottom">
            <button className="ob-next" onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <div className="ob-eyebrow">Programmes</div>
            <h2 className="ob-heading">Give Students a Path</h2>
            <p className="ob-desc">Organise exercises into programmes by week and day. Your students see where they are, where they're going, and how they'll get there.</p>
            <div className="ob-prog-demo" style={{ marginTop: 20 }}>
              <div className="ob-prog-week"><span className="ob-prog-label">Week 1</span><span>4-count breathing · 3 rounds</span></div>
              <div className="ob-prog-week"><span className="ob-prog-label">Week 4</span><span>6-count breathing · 5 rounds</span></div>
              <div className="ob-prog-week"><span className="ob-prog-label">Week 8</span><span>8-count breathing · 8 rounds</span></div>
            </div>
          </div>
          <div className="ob-slide-bottom">
            <button className="ob-next" onClick={() => setStep(4)}>Next</button>
          </div>
        </div>
      )}

      {step === 4 && <BoxBreathingDemo onNext={() => setStep(5)} demoData={demoData} />}

      {step === 5 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <h2 className="ob-heading">Your turn</h2>
            <p className="ob-desc">That same approach works for any exercise — breathwork, body scans, visualisations. Create your first one, or explore what's already been built.</p>
          </div>
          <div className="ob-slide-bottom">
            <Link to="/exercises" className="ob-next">Create your first exercise</Link>
            <Link to="/exercises?filter=public" className="ob-link">Browse public exercises</Link>
          </div>
        </div>
      )}

      <div className="ob-footer">
        <div className="ob-dots">
          {Array.from({ length: total }, (_, i) => (
            <button key={i} className={`ob-dot${i === step ? ' active' : ''}${i < step ? ' done' : ''}`} onClick={() => setStep(i)} />
          ))}
        </div>
        {step > 0 && step < total - 1 && (
          <button className="ob-skip" onClick={() => setStep(total - 1)}>Skip</button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const forceOnboarding = searchParams.has('onboarding');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [practices, setPractices] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [exerciseCount, setExerciseCount] = useState(null);

  useEffect(() => {
    const promises = [
      fetchHistory().then(s => setSessions(Array.isArray(s) ? s : [])),
      fetchPractices().then(setPractices),
    ];
    if (auth.canCreate) {
      promises.push(fetchMyViewers().then(v => setViewerCount(Array.isArray(v) ? v.length : 0)));
      promises.push(fetchMeditations().then(m => setExerciseCount(Array.isArray(m) ? m.length : 0)));
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="loading-spinner" />Loading...</div>;

  const name = auth.displayName || auth.username;
  const streak = computeStreak(sessions);
  const totalSessions = sessions.length;
  const totalSeconds = sessions.reduce((sum, s) => sum + sessionTotalSecs(s), 0);
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, auth.canCreate ? 5 : 3);

  // Find the viewer's current programme (in-progress, or most recently played)
  const currentProgramme = (() => {
    if (auth.canCreate) return null;
    let best = null;
    let bestScore = -1;
    for (const p of practices) {
      const weeks = p.items || [];
      const prog = getProgress(p.name, weeks);
      if (prog && prog.pct < 100) {
        // Prefer higher progress
        if (prog.pct > bestScore) { best = { practice: p, progress: prog }; bestScore = prog.pct; }
      }
    }
    // Fallback: most recent session's programme
    if (!best && recentSessions.length > 0) {
      const recentPrac = practices.find(p => p.name === recentSessions[0].practice);
      if (recentPrac) {
        const prog = getProgress(recentPrac.name, recentPrac.items || []);
        best = { practice: recentPrac, progress: prog };
      }
    }
    // Fallback: first available programme
    if (!best && practices.length > 0) {
      best = { practice: practices[0], progress: null };
    }
    return best;
  })();

  return (
    <div className="home-page">
      {auth.canCreate && (forceOnboarding || (exerciseCount === 0 && totalSessions === 0)) ? (
        <BuilderOnboarding />

      ) : auth.canCreate ? (
        <>
          <div className="home-greeting">
            <h1 className="home-greeting-title">{getGreeting()}, {name}</h1>
            <p className="home-greeting-sub">{getMotivationalMessage(streak, totalSessions)}</p>
            {streak > 0 && <span className="home-streak-badge">{streak} day streak</span>}
          </div>
          <div className="home-stats">
            <div className="home-stat-card">
              <div className="home-stat-value">{totalSessions}</div>
              <div className="home-stat-label">Sessions</div>
            </div>
            <div className="home-stat-card">
              <div className="home-stat-value">{streak}</div>
              <div className="home-stat-label">Day Streak</div>
            </div>
            <div className="home-stat-card">
              <div className="home-stat-value">{formatHours(totalSeconds)}</div>
              <div className="home-stat-label">Total Time</div>
            </div>
          </div>

          {recentSessions.length > 0 && (
            <div className="home-section">
              <h2 className="home-section-title">Recent Activity</h2>
              <div className="home-session-list">
                {recentSessions.map(s => (
                  <div key={s.id} className="home-session-item">
                    <div>
                      <div className="home-session-name">{s.practice_display}</div>
                      <div className="home-session-detail">{s.day_label}{sessionTotalSecs(s) > 0 ? ` · ${formatDuration(sessionTotalSecs(s))}` : ''}</div>
                    </div>
                    <span className="home-session-date">{formatDate(s.completed_at)}</span>
                  </div>
                ))}
              </div>
              <Link to="/history" className="home-view-all">View all history</Link>
            </div>
          )}

          <div className="home-section">
            <h2 className="home-section-title">Quick Links</h2>
            <div className="home-quick-links">
              <Link to="/exercises" className="home-quick-link">Exercises</Link>
              <Link to="/practices" className="home-quick-link">Programmes</Link>
              <Link to="/clients" className="home-quick-link">Clients{viewerCount > 0 ? ` (${viewerCount})` : ''}</Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="home-greeting">
            <h1 className="home-greeting-title">{getGreeting()}, {name}</h1>
            <p className="home-greeting-sub">{getMotivationalMessage(streak, totalSessions)}</p>
            {streak > 0 && <span className="home-streak-badge">{streak} day streak</span>}
          </div>
          {currentProgramme && (
            <div className="home-section">
              <div className="home-programme-card">
                <div className="home-programme-name">{currentProgramme.practice.display_name}</div>
                {currentProgramme.progress && (
                  <div className="prog-card-progress">
                    <div className="prog-card-progress-bar">
                      <div className="prog-card-progress-fill" style={{ width: `${currentProgramme.progress.pct}%` }} />
                    </div>
                    <span className="prog-card-progress-label">{currentProgramme.progress.done}/{currentProgramme.progress.total} days</span>
                  </div>
                )}
                <div className="home-programme-actions">
                  <Link to={`/play/${currentProgramme.practice.name}`} className="home-programme-btn home-programme-btn-primary">Continue Practice</Link>
                  <Link to="/exercises" className="home-programme-btn home-programme-btn-secondary">Browse Exercises</Link>
                </div>
              </div>
            </div>
          )}

          {recentSessions.length > 0 && (
            <div className="home-section">
              <h2 className="home-section-title">Recent Sessions</h2>
              <div className="home-session-list">
                {recentSessions.map(s => (
                  <div key={s.id} className="home-session-item">
                    <div>
                      <div className="home-session-name">{s.practice_display}</div>
                      <div className="home-session-detail">{s.day_label}{sessionTotalSecs(s) > 0 ? ` · ${formatDuration(sessionTotalSecs(s))}` : ''}</div>
                    </div>
                    <span className="home-session-date">{formatDate(s.completed_at)}</span>
                  </div>
                ))}
              </div>
              <Link to="/history" className="home-view-all">View all history</Link>
            </div>
          )}

          {!currentProgramme && recentSessions.length === 0 && (
            <div className="home-section">
              <div className="home-empty">
                <p>No sessions yet. Browse the exercise bank to get started.</p>
                <Link to="/exercises" className="home-programme-btn home-programme-btn-primary">Browse Exercises</Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
