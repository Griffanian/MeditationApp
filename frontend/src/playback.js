import { fetchStageTimestamps } from './api';

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

export function playSeg(seg, onEnd, variables = {}) {
  if (seg.type === 'speech') {
    const segId = seg.id;
    const tsPromise = timestampCache[segId]
      ? Promise.resolve(timestampCache[segId])
      : fetchStageTimestamps(currentMeditation, currentStage, segId)
          .then(ts => { timestampCache[segId] = ts; return ts; })
          .catch(() => { timestampCache[segId] = []; return []; });
    currentAudio = new Audio(`/audio/meditation/${currentMeditation}/stage/${currentStage}/component/${segId}.mp3`);
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
    let duration = seg.duration_seconds;
    if (typeof duration === 'string') {
      const varMatch = duration.match(/^\{(\w+)\}$/);
      if (varMatch && variables[varMatch[1]] != null) {
        const v = variables[varMatch[1]];
        duration = Number(typeof v === 'object' ? v.value : v) || 0;
      } else {
        duration = Number(duration) || 0;
      }
    }
    let remaining = duration;
    const cdEl = document.querySelector(`.countdown[data-seg-id="${seg.id}"]`);
    if (cdEl) cdEl.textContent = remaining;
    countdownInterval = setInterval(() => {
      remaining--;
      const el = document.querySelector(`.countdown[data-seg-id="${seg.id}"]`);
      if (el) el.textContent = Math.max(0, remaining);
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
    currentAudio = new Audio(`/audio/asset/${seg.file}`);
    currentAudio.onended = onEnd;
    currentAudio.onerror = () => { onEnd(); };
    currentAudio.play().catch(() => { onEnd(); });
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

  currentAudio = new Audio(`/audio/meditation/${currentMeditation}/stage/${currentStage}/component/${segId}.mp3`);
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

export function flattenScript(segments, variables = {}) {
  const flat = [];
  for (const seg of segments) {
    if (seg.type === 'loop') {
      const varName = seg.variable;
      const repeat = (varName && variables[varName] != null)
        ? (typeof variables[varName] === 'object' ? variables[varName].value : variables[varName])
        : (seg.repeat || 1);
      for (let r = 0; r < repeat; r++) {
        flattenScript(seg.segments, variables).forEach(f => {
          flat.push({ ...f, loopId: seg.id, loopIteration: r + 1, loopTotal: Number(repeat) });
        });
      }
    } else {
      flat.push({ seg });
    }
  }
  return flat;
}
