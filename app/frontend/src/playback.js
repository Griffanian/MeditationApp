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
let wordTimers = [];
let countdownInterval = null;
let timestampCache = {};
let currentMeditation = null;
let currentStage = null;

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

export function stopPlayback() {
  clearWordHighlights();
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (currentAudio) {
    if (currentAudio instanceof Audio) {
      currentAudio.pause();
      currentAudio.src = '';
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

export function playSeg(seg, onEnd, variables = {}, { script, components } = {}) {
  const _script = script || currentScript;
  const _components = components || currentComponents;
  if (seg.type === 'speech') {
    const segId = seg.id;
    const tsPromise = timestampCache[segId]
      ? Promise.resolve(timestampCache[segId])
      : fetchStageTimestamps(currentMeditation, currentStage, segId)
          .then(ts => { timestampCache[segId] = ts; return ts; })
          .catch(() => { timestampCache[segId] = []; return []; });
    currentAudio = new Audio(`${BASE}/audio/meditation/${currentMeditation}/stage/${currentStage}/component/${segId}.mp3`);
    currentAudio.onended = onEnd;
    currentAudio.onerror = () => { onEnd(); };
    const playingPromise = new Promise(resolve => {
      currentAudio.addEventListener('playing', resolve, { once: true });
    });
    currentAudio.play().catch(() => { onEnd(); });
    Promise.all([tsPromise, playingPromise]).then(([words]) => {
      clearWordHighlights();
      const wordEls = document.querySelectorAll(`.word[data-seg-id="${segId}"]`);
      const elapsed = currentAudio.currentTime * 1000;
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
  } else if (seg.type === 'pause') {
    const duration = resolvePauseDuration(seg.duration_seconds, variables);
    let remaining = duration;
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
        onEnd();
      }, duration * 1000),
      pause() {
        clearTimeout(this._timer);
        clearInterval(countdownInterval);
      },
    };
  } else if (seg.type === 'asset') {
    currentAudio = new Audio(`${BASE}/audio/asset/${seg.file}`);
    currentAudio.onended = onEnd;
    currentAudio.onerror = () => { onEnd(); };
    currentAudio.play().catch(() => { onEnd(); });
  } else if (seg.type === 'split_marker') {
    const markerDur = _script
      ? computeMarkerDuration(_script, seg.id, variables, _components)
      : null;
    const mult = seg.multiplier || 1;
    const duration = markerDur != null ? markerDur * mult : 1;
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
        onEnd();
      }, duration * 1000),
      pause() {
        clearTimeout(this._timer);
        clearInterval(countdownInterval);
      },
    };
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

  currentAudio = new Audio(`${BASE}/audio/meditation/${currentMeditation}/stage/${currentStage}/component/${segId}.mp3`);
  currentAudio.currentTime = startTime;
  currentAudio.onended = onEnd;
  currentAudio.play();

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
