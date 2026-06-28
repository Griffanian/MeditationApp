import { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { BASE, apiFetch } from '../api';
import { stopPlayback, registerExternalStop, unregisterExternalStop } from '../playback';

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

function makeVariableKey(variableValues) {
  return Object.entries(variableValues)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
}

export default function VariableRecordingsModal({ seg, meditationName, stageId, variables = {}, onFlushSave, onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [genDots, setGenDots] = useState('.');
  const [recording, setRecording] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const [duration, setDuration] = useState(null);
  const [trimMode, setTrimMode] = useState(false);
  const [trimStart, setTrimStart] = useState(null);
  const [trimEnd, setTrimEnd] = useState(null);
  const [savedTrim, setSavedTrim] = useState(null);
  const [newValues, setNewValues] = useState({});
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const uploadRowRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsRef = useRef(null);

  // Find which variables this segment uses (ordered)
  const usedVarNames = [];
  const matches = seg.text.matchAll(/\{(\w+)\}/g);
  for (const m of matches) {
    if (m[1] in variables && !usedVarNames.includes(m[1])) {
      usedVarNames.push(m[1]);
    }
  }

  // Register stop handler so other audio sources can stop us
  useEffect(() => {
    const stopWs = () => {
      if (wavesurferRef.current) wavesurferRef.current.pause();
    };
    registerExternalStop(stopWs);
    return () => unregisterExternalStop(stopWs);
  }, []);

  // Animate dots while generating
  useEffect(() => {
    if (generating === null) { setGenDots('.'); return; }
    const id = setInterval(() => setGenDots(d => d.length >= 3 ? '.' : d + '.'), 400);
    return () => clearInterval(id);
  }, [generating]);

  // Load existing recordings status and auto-select first row with audio
  useEffect(() => {
    loadRecordings();
  }, []);

  function parseGetRows(data) {
    if (!data.recordings) return [];
    return data.recordings.map(r => ({
      variableValues: r.variable_values,
      variableKey: r.variable_key,
      text: substituteText(seg.text, { ...variables, ...r.variable_values }),
      status: r.status,
      source: r.source,
      textHash: r.text_hash || null,
      userClipId: r.user_clip_id || null,
    }));
  }

  function parsePostRows(data) {
    if (!data.recordings) return [];
    return data.recordings.map(r => ({
      variableValues: r.variable_values,
      variableKey: r.variable_key,
      text: r.text,
      status: r.status,
      source: r.source,
      textHash: r.text_hash || null,
      userClipId: r.user_clip_id || null,
    }));
  }

  async function loadRecordings() {
    setLoading(true);
    try {
      // Load all known recordings from the DB table
      const res = await apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}`);
      const data = await res.json();
      const parsed = parseGetRows(data);

      // If no recordings in DB yet, fall back to showing just the current values for all used vars
      if (parsed.length === 0 && usedVarNames.length > 0) {
        const fallbackVarSet = {};
        for (const v of usedVarNames) {
          const vObj = variables[v];
          fallbackVarSet[v] = String(typeof vObj === 'object' ? vObj.value : vObj);
        }
        const fallback = await apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [fallbackVarSet] }),
        });
        const fallbackData = await fallback.json();
        const fallbackParsed = parsePostRows(fallbackData);
        setRows(fallbackParsed);
        const firstWithAudio = fallbackParsed.findIndex(r => r.status !== 'missing');
        if (firstWithAudio !== -1) setSelectedRow(firstWithAudio);
      } else {
        setRows(parsed);
        // Auto-select first with audio
        const firstWithAudio = parsed.findIndex(r => r.status !== 'missing');
        if (firstWithAudio !== -1) setSelectedRow(firstWithAudio);
      }
    } catch (err) {
      console.error('Failed to load variable recordings:', err);
    }
    setLoading(false);
  }

  async function refreshRows() {
    try {
      const res = await apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}`);
      const data = await res.json();
      const parsed = parseGetRows(data);
      setRows(parsed);
      return parsed;
    } catch (err) {
      console.error('Failed to refresh:', err);
      return null;
    }
  }

  function audioUrlForRow(row) {
    if (row.userClipId) return `${BASE}/audio/upload/${row.userClipId}.mp3`;
    if (row.textHash) return `${BASE}/audio/clip/${row.textHash}.mp3`;
    return null;
  }

  // Create/recreate WaveSurfer when selectedRow changes and the container is mounted
  useEffect(() => {
    if (selectedRow === null || !rows[selectedRow] || rows[selectedRow].status === 'missing') return;
    if (!waveformRef.current) return;

    const row = rows[selectedRow];
    const url = audioUrlForRow(row);
    if (!url) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setPlaying(false);
    setWaveformLoading(true);
    setDuration(null);
    setTrimMode(false);
    setTrimStart(null);
    setTrimEnd(null);
    setSavedTrim(null);

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
      url: url + `?t=${Date.now()}`,
      plugins: [regions],
    });

    ws.on('ready', () => { setWaveformLoading(false); setDuration(ws.getDuration()); });
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));

    wavesurferRef.current = ws;

    // Load saved trim for this variable recording row
    const rowKey = rows[selectedRow]?.variableKey;
    if (rowKey != null) {
      apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}/trim/${rowKey}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.start != null) {
            setSavedTrim(data);
            setTrimStart(data.start);
            setTrimEnd(data.end);
          }
        }).catch(() => { });
    }

    return () => {
      ws.destroy();
      regionsRef.current = null;
    };
  }, [selectedRow, rows]);

  // Trim click handler — needs to re-bind when trimMode/trimStart changes
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

  async function saveTrimPoints() {
    if (trimStart === null || trimEnd === null || selectedRow === null) return;
    const rowKey = rows[selectedRow]?.variableKey;
    if (rowKey == null) return;
    const trimData = { start: trimStart, end: trimEnd };
    await apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}/trim/${rowKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trimData),
    });
    setSavedTrim(trimData);
    setTrimMode(false);
  }

  async function undoTrim() {
    if (selectedRow === null) return;
    const rowKey = rows[selectedRow]?.variableKey;
    if (rowKey == null) return;
    await apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}/trim/${rowKey}`, { method: 'DELETE' });
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

  async function handleDeleteRecording() {
    if (selectedRow === null) return;
    const row = rows[selectedRow];
    if (!row.variableKey || !window.confirm('Delete this recording?')) return;
    await apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}/delete/${row.variableKey}`, { method: 'DELETE' });
    setSelectedRow(null);
    await refreshRows();
    if (onDone) onDone();
  }

  function handleRowClick(index) {
    const row = rows[index];
    if (row.status === 'missing') return;
    setSelectedRow(index);
  }

  function togglePlay() {
    if (!wavesurferRef.current) return;
    if (playing) {
      wavesurferRef.current.pause();
    } else {
      stopPlayback();
      if (isEffectiveTrim && !trimMode) {
        wavesurferRef.current.play(savedTrim.start, savedTrim.end);
      } else {
        wavesurferRef.current.play();
      }
    }
  }

  function addRow() {
    // All inputs must have values
    const filled = usedVarNames.every(v => (newValues[v] || '').trim() !== '');
    if (!filled) return;

    const normalised = {};
    for (const v of usedVarNames) {
      normalised[v] = newValues[v].trim();
    }
    const key = makeVariableKey(normalised);

    if (rows.some(r => r.variableKey === key)) {
      setNewValues({});
      return;
    }

    const text = substituteText(seg.text, { ...variables, ...normalised });
    const newRow = { variableValues: normalised, variableKey: key, text, status: 'missing', source: null };
    const newRows = [...rows, newRow];
    setRows(newRows);
    setNewValues({});

    // Check status for the newly-added combination
    apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [normalised] }),
    }).then(r => r.json()).then(data => {
      if (data.recordings?.[0]) {
        const rec = data.recordings[0];
        setRows(prev => prev.map(r =>
          r.variableKey === key
            ? { ...r, status: rec.status, source: rec.source, textHash: rec.text_hash || null, userClipId: rec.user_clip_id || null }
            : r
        ));
      }
    }).catch(() => {});
  }

  async function removeRow(index) {
    const row = rows[index];
    // If it has audio, confirm and delete the component record from the backend
    if (row.status !== 'missing') {
      if (!window.confirm(`Delete the recording for ${row.variableKey}?`)) return;
      await apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}/delete/${row.variableKey}`, { method: 'DELETE' });
      if (onDone) onDone();
    }
    if (selectedRow === index) {
      setSelectedRow(null);
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      setPlaying(false);
      setDuration(null);
    } else if (selectedRow !== null && selectedRow > index) {
      setSelectedRow(selectedRow - 1);
    }
    setRows(rows.filter((_, i) => i !== index));
  }

  async function handleGenerate(index) {
    const row = rows[index];
    if (row.status !== 'missing') {
      if (!window.confirm(`This will replace the existing ${row.source === 'uploaded' ? 'recorded' : 'AI-generated'} audio for ${row.variableKey}. Continue?`)) return;
    }
    setGenerating(index);
    try {
      if (onFlushSave) await onFlushSave();
      const res = await apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/generate-variable-audio/${seg.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: row.variableValues }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Generation failed: ' + (data.error || res.statusText));
      } else {
        const generatedKey = row.variableKey;
        const newRows = await refreshRows();
        if (newRows && generatedKey) {
          const newIndex = newRows.findIndex(r => r.variableKey === generatedKey);
          if (newIndex !== -1 && newRows[newIndex]?.status !== 'missing') {
            setSelectedRow(newIndex);
          }
        }
        if (onDone) onDone();
      }
    } catch (err) {
      alert('Generation failed: ' + err.message);
    }
    setGenerating(null);
  }

  async function handleRecord(index) {
    if (recording !== null) return;
    const row = rows[index];
    if (row.status !== 'missing') {
      if (!window.confirm(`This will replace the existing ${row.source === 'uploaded' ? 'recorded' : 'AI-generated'} audio for ${row.variableKey}. Continue?`)) return;
    }
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
        const file = new File([blob], `${seg.id}_var.mp3`, { type: 'audio/mp3' });
        await uploadForRow(index, file);
        setRecording(null);
      };
      mediaRecorder.start();
      setRecording(index);
    } catch (err) {
      alert('Could not access microphone: ' + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording !== null) {
      mediaRecorderRef.current.stop();
    }
  }

  function handleUploadClick(index) {
    const row = rows[index];
    if (row.status !== 'missing') {
      if (!window.confirm(`This will replace the existing ${row.source === 'uploaded' ? 'recorded' : 'AI-generated'} audio for ${row.variableKey}. Continue?`)) return;
    }
    uploadRowRef.current = index;
    fileInputRef.current.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const index = uploadRowRef.current;
    await uploadForRow(index, file);
    e.target.value = '';
  }

  async function uploadForRow(index, file) {
    const row = rows[index];
    const formData = new FormData();
    formData.append('file', file);
    // Append each variable as var_NAME=value
    for (const [k, v] of Object.entries(row.variableValues)) {
      formData.append(`var_${k}`, v);
    }

    try {
      const res = await apiFetch(`${BASE}/api/meditations/${meditationName}/stages/${stageId}/upload-variable-audio/${seg.id}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Upload failed: ' + (data.error || res.statusText));
      } else {
        await refreshRows();
        if (onDone) onDone();
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  }

  const selectedHasAudio = selectedRow !== null && rows[selectedRow]?.status !== 'missing';
  const canAddRow = usedVarNames.every(v => (newValues[v] || '').trim() !== '');
  const isEffectiveTrim = savedTrim && duration != null &&
    !(savedTrim.start <= 0.05 && savedTrim.end >= duration - 0.05);

  return (
    <div className="modal-overlay" onClick={onClose} onContextMenu={e => e.stopPropagation()}>
      <div className="modal variable-recordings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Variables Recording Manager</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="var-rec-loading">
              <div className="var-rec-spinner" />
              <p>Loading recordings…</p>
            </div>
          ) : (<>

          {/* Template */}
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

          {/* Waveform player */}
          {selectedHasAudio ? (
            <div className="modal-section">
              <p className="modal-section-label">
                Current recording — {rows[selectedRow].variableKey}
                {duration && <span className="modal-duration"> ({duration.toFixed(1)}s)</span>}
                {isEffectiveTrim && !trimMode && (
                  <span className="modal-trim-info"> — trimmed to {savedTrim.start.toFixed(1)}s–{savedTrim.end.toFixed(1)}s</span>
                )}
              </p>
              <div className="waveform-wrapper">
                <div ref={waveformRef} className="waveform-container" />
                {waveformLoading && (
                  <div className="waveform-buffering">
                    <div className="var-rec-spinner" />
                  </div>
                )}
              </div>

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
                <button className="modal-btn-sm" onClick={togglePlay} disabled={waveformLoading}>
                  {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                {!trimMode ? (
                  <>
                    <button className="modal-btn-sm" onClick={enterTrimMode}>✂ Trim</button>
                    {isEffectiveTrim && (
                      <button className="modal-btn-sm modal-btn-undo" onClick={undoTrim}>↩ Undo trim</button>
                    )}
                    <button className="modal-btn-sm modal-btn-delete" onClick={handleDeleteRecording}>🗑 Delete</button>
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
          ) : (
            <div className="modal-section">
              <p className="modal-no-audio">No recording selected</p>
            </div>
          )}

          <div className="modal-divider" />

          {/* Add value combination */}
          <div className="modal-section">
            <p className="modal-section-label">Add a value combination — only needed if you recorded your own audios.</p>
            <div className="var-rec-add-row">
              {usedVarNames.map(varName => (
                <input
                  key={varName}
                  type="text"
                  className="var-rec-input"
                  placeholder={varName}
                  value={newValues[varName] || ''}
                  onChange={e => setNewValues(prev => ({ ...prev, [varName]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && canAddRow) addRow(); }}
                />
              ))}
              <button className="modal-btn-sm" onClick={addRow} disabled={!canAddRow}>+ Add</button>
            </div>
          </div>

          {/* Recordings table */}
          {rows.length > 0 && (
            <div className="modal-section">
              <p className="modal-section-label">Recordings <span className="modal-section-hint">— click a row to preview its audio</span></p>
              <div className="var-rec-table-scroll">
              <table className="var-rec-table">
                <thead>
                  <tr>
                    {usedVarNames.map(varName => (
                      <th key={varName}>{varName}</th>
                    ))}
                    <th>Source</th>
                    <th>Actions</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`${row.status !== 'missing' ? 'has-audio' : 'no-audio'}${selectedRow === i ? ' selected' : ''}${row.status !== 'missing' ? ' clickable' : ''}${row.status === 'stale' ? ' stale' : ''}`}
                      onClick={() => handleRowClick(i)}
                    >
                      {usedVarNames.map(varName => (
                        <td key={varName} className="var-rec-col-value">
                          <strong>{row.variableValues[varName]}</strong>
                        </td>
                      ))}
                      <td className="var-rec-col-source">
                        {row.status === 'missing' ? (
                          <span className="var-rec-badge var-rec-badge-missing">Missing</span>
                        ) : row.status === 'stale' ? (
                          <span className="var-rec-badge var-rec-badge-stale">⚠ Stale</span>
                        ) : row.source === 'uploaded' ? (
                          <span className="var-rec-badge var-rec-badge-recorded">🎙 Recorded</span>
                        ) : row.source === 'generated' ? (
                          <span className="var-rec-badge var-rec-badge-ai">🤖 AI</span>
                        ) : (
                          <span className="var-rec-badge var-rec-badge-done">✓ Done</span>
                        )}
                      </td>
                      <td className="var-rec-col-actions" onClick={e => e.stopPropagation()}>
                        {recording === i ? (
                          <button className="modal-btn-sm modal-btn-recording" onClick={stopRecording}>
                            ⏹ Stop
                          </button>
                        ) : (
                          <>
                            <button
                              className="modal-btn-sm"
                              onClick={() => handleGenerate(i)}
                              disabled={generating !== null}
                              title={row.status !== 'missing' ? 'Regenerate with AI' : 'Generate with AI'}
                            >
                              {generating === i ? `⏳${genDots}` : row.status !== 'missing' ? '🤖 Regenerate' : '🤖 Generate'}
                            </button>
                            <button
                              className="modal-btn-sm"
                              onClick={() => handleRecord(i)}
                              disabled={generating !== null || recording !== null}
                              title={row.status !== 'missing' ? 'Re-record with microphone' : 'Record with microphone'}
                            >
                              {row.status !== 'missing' ? '🎙 Re-record' : '🎙 Record'}
                            </button>
                            <button
                              className="modal-btn-sm"
                              onClick={() => handleUploadClick(i)}
                              disabled={generating !== null || recording !== null}
                              title={row.status !== 'missing' ? 'Replace with uploaded MP3' : 'Upload MP3'}
                            >
                              {row.status !== 'missing' ? '📁 Replace' : '📁 Upload'}
                            </button>
                          </>
                        )}
                      </td>
                      <td className="var-rec-col-remove" onClick={e => e.stopPropagation()}>
                        <button
                          className="modal-btn-sm var-rec-remove"
                          onClick={() => removeRow(i)}
                          title="Remove row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          </>)}

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
        </div>
      </div>
    </div>
  );
}
