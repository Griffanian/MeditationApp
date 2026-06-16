import { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { stopPlayback, registerExternalStop, unregisterExternalStop } from '../playback';
import { BASE, apiFetch } from '../api';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 === 0 ? '' : '-' + ONES[n % 10]);
  return String(n);
}

function substituteText(text, variables) {
  return text.replace(/\{(\w+)\}/g, (match, varName) => {
    if (varName in variables) {
      const v = variables[varName];
      const val = typeof v === 'object' ? v.value : v;
      return numberToWords(Number(val));
    }
    return match;
  });
}

export default function RecordingModal({ seg, meditationName, stageId, hasAudio, audioStatus, variables = {}, onUpdateVariable, onClose, onDone }) {
  const [recording, setRecording] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(null);
  const [trimMode, setTrimMode] = useState(false);
  const [trimStart, setTrimStart] = useState(null);
  const [trimEnd, setTrimEnd] = useState(null);
  const [savedTrim, setSavedTrim] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsRef = useRef(null);

  const isSpeech = seg.type === 'speech';
  const segId = seg.id || seg.file;
  const hasVars = isSpeech && /\{\w+\}/.test(seg.text);
  const substitutedText = hasVars ? substituteText(seg.text, variables) : seg.text;

  // Find which variables this segment uses
  const usedVars = {};
  if (hasVars) {
    const matches = seg.text.matchAll(/\{(\w+)\}/g);
    for (const m of matches) {
      if (m[1] in variables) {
        const v = variables[m[1]];
        usedVars[m[1]] = typeof v === 'object' ? v.value : v;
      }
    }
  }

  const audioUrl = hasAudio
    ? (seg.type === 'asset'
      ? `${BASE}/audio/asset/${seg.file}`
      : stageId
        ? `${BASE}/audio/meditation/${meditationName}/stage/${stageId}/component/${seg.id}.mp3`
        : `${BASE}/audio/meditation/${meditationName}/component/${seg.id}.mp3`)
    : null;

  // Register WaveSurfer stop so other audio sources can stop us
  useEffect(() => {
    const stopWs = () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.pause();
      }
    };
    registerExternalStop(stopWs);
    return () => unregisterExternalStop(stopWs);
  }, []);

  // Load existing trim metadata
  useEffect(() => {
    if (!hasAudio) return;
    const endpoint = seg.type === 'asset'
      ? `/api/trim-meta/asset/${seg.file}`
      : `/api/meditations/${meditationName}/stages/${stageId}/trim-meta/${seg.id}`;
    fetch(endpoint).then(r => r.json()).then(data => {
      if (data && data.start != null) {
        setSavedTrim(data);
        setTrimStart(data.start);
        setTrimEnd(data.end);
      }
    }).catch(() => {});
  }, [hasAudio]);

  // Initialize wavesurfer
  useEffect(() => {
    if (!hasAudio || !audioUrl || !waveformRef.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4a6fa5',
      progressColor: '#a0c4ff',
      cursorColor: '#e0e0e0',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      url: audioUrl + `?t=${Date.now()}`,
      plugins: [regions],
    });

    ws.on('ready', () => setDuration(ws.getDuration()));
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));

    ws.on('click', (relativeX) => {
      if (!trimMode) return;
      const time = relativeX * ws.getDuration();
      handleTrimClick(time);
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      regionsRef.current = null;
    };
  }, [hasAudio, audioUrl]);

  useEffect(() => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.un('click');
    wavesurferRef.current.on('click', (relativeX) => {
      if (!trimMode) return;
      const time = relativeX * wavesurferRef.current.getDuration();
      handleTrimClick(time);
    });
  }, [trimMode, trimStart]);

  function handleTrimClick(time) {
    if (trimStart === null || trimEnd !== null) {
      setTrimStart(time);
      setTrimEnd(null);
      if (regionsRef.current) {
        regionsRef.current.clearRegions();
        regionsRef.current.addRegion({
          start: time, end: time + 0.05,
          color: 'rgba(160, 196, 255, 0.4)', drag: false, resize: false,
        });
      }
    } else {
      const start = Math.min(trimStart, time);
      const end = Math.max(trimStart, time);
      setTrimStart(start);
      setTrimEnd(end);
      if (regionsRef.current) {
        regionsRef.current.clearRegions();
        regionsRef.current.addRegion({
          start, end,
          color: 'rgba(160, 196, 255, 0.2)', drag: false, resize: false,
        });
      }
    }
  }

  function togglePlay() {
    if (!wavesurferRef.current) return;
    if (playing) {
      wavesurferRef.current.pause();
    } else {
      stopPlayback(); // stop timeline, assembled audio, and any other sources
      if (savedTrim && !trimMode) {
        wavesurferRef.current.play(savedTrim.start, savedTrim.end);
      } else {
        wavesurferRef.current.play();
      }
    }
  }

  async function saveTrimPoints() {
    if (trimStart === null || trimEnd === null) return;
    const trimData = { start: trimStart, end: trimEnd };
    const endpoint = seg.type === 'asset'
      ? `/api/trim-meta/asset/${seg.file}`
      : `/api/meditations/${meditationName}/stages/${stageId}/trim-meta/${seg.id}`;
    await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trimData),
    });
    setSavedTrim(trimData);
    setTrimMode(false);
  }

  async function undoTrim() {
    const endpoint = seg.type === 'asset'
      ? `/api/trim-meta/asset/${seg.file}`
      : `/api/meditations/${meditationName}/stages/${stageId}/trim-meta/${seg.id}`;
    await fetch(endpoint, { method: 'DELETE' });
    setSavedTrim(null);
    setTrimStart(null);
    setTrimEnd(null);
    if (regionsRef.current) regionsRef.current.clearRegions();
  }

  function enterTrimMode() {
    setTrimMode(true);
    setTrimStart(null);
    setTrimEnd(null);
    if (regionsRef.current) regionsRef.current.clearRegions();
  }

  function cancelTrim() {
    setTrimMode(false);
    setTrimStart(null);
    setTrimEnd(null);
    if (regionsRef.current) {
      regionsRef.current.clearRegions();
      if (savedTrim) {
        regionsRef.current.addRegion({
          start: savedTrim.start, end: savedTrim.end,
          color: 'rgba(160, 196, 255, 0.2)', drag: false, resize: false,
        });
      }
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/generate-audio/${seg.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: seg.text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Generation failed: ' + (data.error || res.statusText));
      } else {
        onDone();
      }
    } catch (err) {
      alert('Generation failed: ' + err.message);
    }
    setGenerating(false);
  }

  async function handleUpload(file) {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const endpoint = seg.type === 'asset'
        ? `/api/upload-asset/${seg.file}`
        : `/api/meditations/${meditationName}/stages/${stageId}/upload-component/${seg.id}`;
      await fetch(endpoint, { method: 'POST', body: formData });
      onDone();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/mp3' });
        const file = new File([blob], `${segId}.mp3`, { type: 'audio/mp3' });
        await handleUpload(file);
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      alert('Could not access microphone: ' + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Recording</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Template text */}
          {isSpeech && (
            <div className="modal-section">
              <p className="modal-section-label">Template</p>
              <p className="modal-section-text">
                {seg.text.split(/(\{\w+\})/).map((part, i) =>
                  /\{\w+\}/.test(part)
                    ? <span key={i} className="modal-var-ref">{part}</span>
                    : part
                )}
              </p>
            </div>
          )}

          {/* Variables editor (only for variable text) */}
          {hasVars && (
            <div className="modal-section">
              <p className="modal-section-label">Variables</p>
              <div className="modal-vars">
                {Object.entries(usedVars).map(([varName, value]) => (
                  <span key={varName} className="modal-var-tag">
                    <span className="variable-name">{varName}</span>
                    <span className="variable-eq">=</span>
                    <input
                      className={`variable-input${value === '' || isNaN(Number(value)) ? ' variable-input-error' : ''}`}
                      type="text"
                      value={value}
                      onChange={e => {
                        if (onUpdateVariable) onUpdateVariable(varName, e.target.value);
                      }}
                    />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Substituted preview */}
          {hasVars && (
            <div className="modal-section">
              <p className="modal-section-label">Will say</p>
              <p className="modal-section-text modal-substituted">"{substitutedText}"</p>
            </div>
          )}

          {/* Status indicator */}
          {isSpeech && hasVars && (
            <div className={`modal-status modal-status-${audioStatus}`}>
              {audioStatus === 'current' && '✓ Audio matches current variables'}
              {audioStatus === 'stale' && '⚠ Audio was generated for different variable values'}
              {audioStatus === 'missing' && 'No audio generated yet'}
            </div>
          )}

          {/* Waveform player */}
          {hasAudio && (
            <div className="modal-section">
              <p className="modal-section-label">
                Current recording
                {duration && <span className="modal-duration"> ({duration.toFixed(1)}s)</span>}
                {savedTrim && !trimMode && (
                  <span className="modal-trim-info"> — trimmed to {savedTrim.start.toFixed(1)}s–{savedTrim.end.toFixed(1)}s</span>
                )}
              </p>
              <div ref={waveformRef} className="waveform-container" />

              {trimMode && (
                <p className="trim-instructions">
                  {trimStart === null
                    ? 'Click on the waveform to set the start point'
                    : trimEnd === null
                    ? 'Click again to set the end point'
                    : `Trim: ${trimStart.toFixed(1)}s – ${trimEnd.toFixed(1)}s`}
                </p>
              )}

              <div className="waveform-controls">
                <button className="modal-btn-sm" onClick={togglePlay}>
                  {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                {!trimMode ? (
                  <>
                    <button className="modal-btn-sm" onClick={enterTrimMode}>✂ Trim</button>
                    {savedTrim && (
                      <button className="modal-btn-sm modal-btn-undo" onClick={undoTrim}>↩ Undo trim</button>
                    )}
                    <button className="modal-btn-sm modal-btn-delete" onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete this recording?')) return;
                      await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/delete-component/${seg.id}`, { method: 'DELETE' });
                      onDone();
                    }}>🗑 Delete</button>
                  </>
                ) : (
                  <>
                    {trimEnd !== null && (
                      <button className="modal-btn-sm modal-btn-trim" onClick={saveTrimPoints}>✓ Save trim</button>
                    )}
                    <button className="modal-btn-sm" onClick={cancelTrim}>✕ Cancel</button>
                  </>
                )}
              </div>
            </div>
          )}

          {!hasAudio && (
            <div className="modal-section">
              <p className="modal-no-audio">No recording yet</p>
            </div>
          )}

          <div className="modal-divider" />

          {/* Actions */}
          {isSpeech && (
            <button
              className="modal-btn modal-btn-primary"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'Generating...' : hasVars ? `🤖 Generate for current variables` : '🤖 Generate with AI'}
            </button>
          )}

          <button
            className="modal-btn"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '📁 Upload MP3'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) handleUpload(e.target.files[0]); }}
          />

          <button
            className={`modal-btn ${recording ? 'modal-btn-recording' : ''}`}
            onClick={recording ? stopRecording : startRecording}
            disabled={uploading || generating}
          >
            {recording ? '⏹ Stop Recording' : '🎙 Record'}
          </button>

        </div>
      </div>
    </div>
  );
}
