import { fetchStageTimestamps, BASE } from './api';

const UNIT_MULTIPLIERS = { seconds: 1, minutes: 60, hours: 3600 };

/**
 * Resolve a variable reference to a numeric value, applying unit conversion.
 * Returns the value in seconds (or unitless for rounds etc).
 */
export function resolveVar(varObj) {
  if (varObj == null) return null;
  const raw = Number(typeof varObj === 'object' ? varObj.value : varObj) || 0;
  const unit = typeof varObj === 'object' ? varObj.unit : undefined;
  return raw * (UNIT_MULTIPLIERS[unit] || 1);
}

/**
 * Format a duration in seconds for display.
 * Returns "H:MM:SS", "M:SS", or "Ns" depending on magnitude.
 */
export function formatDuration(seconds) {
  seconds = Math.round(seconds);
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${Math.max(0, seconds)}s`;
}

/**
 * Resolve a pause segment's duration_seconds to a numeric value in seconds.
 */
export function resolvePauseDuration(durationSeconds, variables) {
  if (typeof durationSeconds === 'string') {
    const m = durationSeconds.match(/^\{(\w+)\}$/);
    if (m && variables[m[1]] != null) {
      return resolveVar(variables[m[1]]);
    }
    return Number(durationSeconds) || 0;
  }
  return Number(durationSeconds) || 0;
}

/**
 * Resolve a loop's effective repeat count.
 * Handles duration-based loops, variable references, and plain numbers.
 */
export function resolveRepeat(seg, variables, components) {
  if (!seg.label && seg.targetDuration != null) {
    return computeDurationRepeat(seg, variables, components);
  }
  const varName = seg.variable;
  if (varName && variables[varName] != null) {
    return resolveVar(variables[varName]) || 1;
  }
  return seg.repeat || 1;
}

let currentAudio = null;
let unlockedAudio = null; // persistent Audio element unlocked by user gesture
let wordTimers = [];
let countdownInterval = null;
let timestampCache = {};
let currentMeditation = null;
let currentStage = null;
let onEndCalled = false;

const externalStopCallbacks = new Set();

export function registerExternalStop(cb) {
  externalStopCallbacks.add(cb);
}

export function unregisterExternalStop(cb) {
  externalStopCallbacks.delete(cb);
}

export function setMeditation(name, stageId) {
  currentMeditation = name;
  currentStage = stageId;
}

export function clearTimestampCache(segId) {
  if (segId) {
    delete timestampCache[segId];
  } else {
    timestampCache = {};
  }
}

/**
 * Unlock the audio element for iOS/mobile playback.
 * Must be called from a user gesture (click/tap handler).
 * After this, the element can play from any context (timers, callbacks, etc).
 */
export function unlockAudio() {
  if (unlockedAudio) return;
  unlockedAudio = new Audio();
  // Play a tiny silent WAV to activate the element on iOS
  unlockedAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  unlockedAudio.play().then(() => {
    unlockedAudio.pause();
  }).catch(() => {});
}

function getAudio() {
  // Return the unlocked element if available, otherwise create a new one
  if (unlockedAudio) return unlockedAudio;
  return new Audio();
}

function guardedOnEnd(onEnd) {
  return () => {
    if (onEndCalled) return;
    onEndCalled = true;
    onEnd();
  };
}

export function stopPlayback() {
  onEndCalled = true;
  clearWordHighlights();
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (currentAudio) {
    if (currentAudio instanceof Audio) {
      currentAudio.pause();
      currentAudio.onended = null;
      currentAudio.onerror = null;
    } else if (currentAudio.pause) {
      currentAudio.pause();
    }
    currentAudio = null;
  }
  for (const cb of externalStopCallbacks) {
    cb();
  }
}

function clearWordHighlights() {
  wordTimers.forEach(t => clearTimeout(t));
  wordTimers = [];
  document.querySelectorAll('.word.active').forEach(el => el.classList.remove('active'));
}

let currentScript = null;
let currentComponents = {};

export function setScriptAndComponents(script, components) {
  currentScript = script;
  currentComponents = components;
}

function debugLog(msg) {
  console.warn('[playSeg]', msg);
  // Show on screen for mobile debugging
  let el = document.getElementById('playback-debug');
  if (!el) {
    el = document.createElement('div');
    el.id = 'playback-debug';
    el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:30vh;overflow-y:auto;background:rgba(0,0,0,0.85);color:#0f0;font:11px monospace;padding:6px;z-index:99999;pointer-events:none;';
    document.body.appendChild(el);
  }
  const line = document.createElement('div');
  line.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  // Keep last 30 lines
  while (el.children.length > 30) el.removeChild(el.firstChild);
}

export function playSeg(seg, onEnd, variables = {}, { script, components } = {}) {
  const _script = script || currentScript;
  const _components = components || currentComponents;
  onEndCalled = false;
  const safeEnd = guardedOnEnd(onEnd);

  if (seg.type === 'speech') {
    const segId = seg.id;
    debugLog(`speech "${segId}" — loading`);
    const tsPromise = timestampCache[segId]
      ? Promise.resolve(timestampCache[segId])
      : fetchStageTimestamps(currentMeditation, currentStage, segId)
          .then(ts => { timestampCache[segId] = ts; return ts; })
          .catch(() => { timestampCache[segId] = []; return []; });
    const audio = getAudio();
    audio.onended = null;
    audio.onerror = null;
    audio.loop = false;
    audio.volume = 1;
    audio.src = `${BASE}/audio/meditation/${currentMeditation}/stage/${currentStage}/component/${segId}.mp3`;
    currentAudio = audio;
    audio.onended = () => { debugLog(`speech "${segId}" — ended`); safeEnd(); };
    audio.onerror = (e) => { debugLog(`speech "${segId}" — ERROR: ${audio.error?.message || e?.type || 'unknown'}`); safeEnd(); };
    const playingPromise = new Promise(resolve => {
      audio.addEventListener('playing', () => { debugLog(`speech "${segId}" — playing`); resolve(); }, { once: true });
    });
    audio.play().catch((err) => { debugLog(`speech "${segId}" — play() REJECTED: ${err.message}`); safeEnd(); });
    Promise.all([tsPromise, playingPromise]).then(([words]) => {
      if (onEndCalled) return;
      clearWordHighlights();
      const wordEls = document.querySelectorAll(`.word[data-seg-id="${segId}"]`);
      const elapsed = audio.currentTime * 1000;
      words.forEach((w, i) => {
        if (i < wordEls.length) {
          const delay = Math.max(0, w.start * 1000 - elapsed);
          const timer = setTimeout(() => {
            document.querySelectorAll(`.word[data-seg-id="${segId}"]`).forEach(el => el.classList.remove('active'));
            wordEls[i].classList.add('active');
          }, delay);
          wordTimers.push(timer);
        }
      });
    });
  } else if (seg.type === 'pause' || seg.type === 'split_marker') {
    const duration = seg.type === 'pause'
      ? resolvePauseDuration(seg.duration_seconds, variables)
      : (() => {
          const markerDur = _script ? computeMarkerDuration(_script, seg.id, variables, _components) : null;
          return markerDur != null ? markerDur * (seg.multiplier || 1) : 1;
        })();
    debugLog(`${seg.type} ${duration}s — playing ambient`);

    // Play ambient audio on the same Audio element to keep it active on mobile
    const audio = getAudio();
    audio.onended = null;
    audio.onerror = null;
    audio.loop = true;
    audio.volume = 0;
    // Short silent WAV on loop — keeps Audio element active on mobile without audible output
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    audio.play().catch(() => {});

    let remaining = Math.round(duration);
    const cdEl = document.querySelector(`.countdown[data-seg-id="${seg.id}"]`);
    if (cdEl) cdEl.textContent = formatDuration(remaining);
    countdownInterval = setInterval(() => {
      remaining--;
      const el = document.querySelector(`.countdown[data-seg-id="${seg.id}"]`);
      if (el) el.textContent = formatDuration(remaining);
    }, 1000);

    currentAudio = {
      _timer: setTimeout(() => {
        clearInterval(countdownInterval);
        audio.loop = false;
        audio.pause();
        debugLog(`${seg.type} ${duration}s — ended`);
        safeEnd();
      }, duration * 1000),
      pause() {
        clearTimeout(this._timer);
        clearInterval(countdownInterval);
        audio.pause();
      },
    };
  } else if (seg.type === 'asset') {
    debugLog(`asset "${seg.file}" — loading`);
    const audio = getAudio();
    audio.onended = null;
    audio.onerror = null;
    audio.loop = false;
    audio.volume = 1;
    audio.src = `${BASE}/audio/asset/${seg.file}`;
    currentAudio = audio;
    audio.onended = () => { debugLog(`asset "${seg.file}" — ended`); safeEnd(); };
    audio.onerror = (e) => { debugLog(`asset "${seg.file}" — ERROR: ${audio.error?.message || 'unknown'}`); safeEnd(); };
    audio.play().catch((err) => { debugLog(`asset "${seg.file}" — play() REJECTED: ${err.message}`); safeEnd(); });
  }
}

export async function playSegFromWord(seg, wordIndex, onEnd) {
  if (seg.type !== 'speech') return;
  const segId = seg.id;

  if (!timestampCache[segId]) {
    timestampCache[segId] = await fetchStageTimestamps(currentMeditation, currentStage, segId);
  }
  const words = timestampCache[segId];
  const startTime = wordIndex < words.length ? words[wordIndex].start : 0;

  const audio = getAudio();
  audio.onended = null;
  audio.onerror = null;
  audio.src = `${BASE}/audio/meditation/${currentMeditation}/stage/${currentStage}/component/${segId}.mp3`;
  currentAudio = audio;
  audio.currentTime = startTime;
  audio.onended = onEnd;
  audio.play();

  setTimeout(() => {
    clearWordHighlights();
    const wordEls = document.querySelectorAll(`.word[data-seg-id="${segId}"]`);
    words.forEach((w, i) => {
      if (i < wordIndex || i >= wordEls.length) return;
      const delay = (w.start - startTime) * 1000;
      const timer = setTimeout(() => {
        document.querySelectorAll(`.word[data-seg-id="${segId}"]`).forEach(el => el.classList.remove('active'));
        wordEls[i].classList.add('active');
      }, Math.max(0, delay));
      wordTimers.push(timer);
    });
  }, 50);
}

export function pauseCurrentAudio() {
  if (currentAudio instanceof Audio) {
    currentAudio.pause();
    return { type: 'audio' };
  } else if (currentAudio && currentAudio._timer) {
    clearTimeout(currentAudio._timer);
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    return { type: 'timer' };
  }
  return null;
}

export function resumeCurrentAudio(seg) {
  if (currentAudio instanceof Audio) {
    currentAudio.play();
  }
}

/**
 * Compute the fixed duration of segments, excluding split markers.
 */
export function computeFixedDuration(segments, variables, components) {
  let total = 0;
  for (const seg of segments) {
    if (seg.type === 'speech') {
      const comp = components[seg.id];
      if (comp && comp.duration != null) total += comp.duration;
    } else if (seg.type === 'pause') {
      total += resolvePauseDuration(seg.duration_seconds, variables);
    } else if (seg.type === 'asset') {
      const comp = components[seg.id];
      total += (comp && comp.duration != null) ? comp.duration : 1;
    } else if (seg.type === 'loop') {
      if (!seg.label && seg.targetDuration != null) {
        total += resolveTargetDuration(seg, variables);
      } else {
        total += resolveRepeat(seg, variables, components) * computeFixedDuration(seg.segments, variables, components);
      }
    }
    // split_marker: excluded from fixed duration
  }
  return total;
}

/**
 * Count effective split markers in a segment list, accounting for loop repeats and multipliers.
 */
function countMarkers(segments, variables, components = {}) {
  let count = 0;
  for (const seg of segments) {
    if (seg.type === 'split_marker') {
      count += seg.multiplier || 1;
    } else if (seg.type === 'loop') {
      count += resolveRepeat(seg, variables, components) * countMarkers(seg.segments, variables, components);
    }
  }
  return count;
}

/**
 * Find the nearest ancestor section with a targetDuration for a given segment id.
 * Returns the section segment, or null.
 */
function findParentSection(segments, targetId, parent = null) {
  for (const seg of segments) {
    if (seg.id === targetId) return parent;
    if (seg.type === 'loop' && seg.segments) {
      const section = seg.targetDuration != null ? seg : parent;
      const found = findParentSection(seg.segments, targetId, section);
      if (found !== undefined) return found;
    }
  }
  return undefined; // not found in this branch
}

/**
 * Compute the per-marker duration for a split marker segment.
 * Returns the duration in seconds, or null if not computable.
 */
export function computeMarkerDuration(script, markerId, variables, components) {
  const section = findParentSection(script, markerId);
  if (!section || section.targetDuration == null) return null;
  const target = resolveTargetDuration(section, variables);
  const fixed = computeFixedDuration(section.segments, variables, components);
  const markers = countMarkers(section.segments, variables, components);
  if (markers === 0) return null;
  const remaining = target - fixed;
  return remaining > 0 ? remaining / markers : 0;
}

/**
 * Resolve a loop's targetDuration to seconds.
 * If the value is a variable reference, the variable's own unit applies.
 * Otherwise, the segment's targetDurationUnit is used as the multiplier.
 */
function resolveTargetDuration(seg, variables) {
  const val = seg.targetDuration;
  const s = String(val);
  const m = s.match(/^\{(\w+)\}$/);
  if (m && variables[m[1]] != null) {
    return resolveVar(variables[m[1]]);
  }
  const raw = Number(s) || 0;
  const unit = seg.targetDurationUnit || 'seconds';
  return raw * (UNIT_MULTIPLIERS[unit] || 1);
}

/**
 * Compute the repeat count for a duration-based loop.
 * Rounds up so the loop always fills (and slightly exceeds) the target duration.
 */
export function computeDurationRepeat(seg, variables, components) {
  const target = resolveTargetDuration(seg, variables);
  const iterDuration = computeFixedDuration(seg.segments, variables, components);
  return iterDuration > 0 ? Math.max(1, Math.ceil(target / iterDuration)) : 1;
}

export function flattenScript(segments, variables = {}, components = {}) {
  const flat = [];
  for (const seg of segments) {
    if (seg.type === 'loop') {
      const repeat = resolveRepeat(seg, variables, components);
      const iterDuration = computeFixedDuration(seg.segments, variables, components);
      for (let r = 0; r < repeat; r++) {
        flattenScript(seg.segments, variables, components).forEach(f => {
          flat.push({ ...f, loopId: seg.id, loopIteration: r + 1, loopTotal: Number(repeat), loopIterDuration: iterDuration });
        });
      }
    } else {
      flat.push({ seg });
    }
  }
  return flat;
}
