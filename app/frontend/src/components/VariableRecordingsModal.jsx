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

export default function VariableRecordingsModal({ seg, meditationName, stageId, variables = {}, onFlushSave, onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [recording, setRecording] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(null);
  const [trimMode, setTrimMode] = useState(false);
  const [trimStart, setTrimStart] = useState(null);
  const [trimEnd, setTrimEnd] = useState(null);
  const [savedTrim, setSavedTrim] = useState(null);
  const [newValue, setNewValue] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const uploadRowRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsRef = useRef(null);

  // Find which variables this segment uses
  const usedVarNames = [];
  const matches = seg.text.matchAll(/\{(\w+)\}/g);
  for (const m of matches) {
    if (m[1] in variables && !usedVarNames.includes(m[1])) {
      usedVarNames.push(m[1]);
    }
  }

  const primaryVar = usedVarNames[0];
  const currentValue = primaryVar && variables[primaryVar]
    ? (typeof variables[primaryVar] === 'object' ? variables[primaryVar].value : variables[primaryVar])
    : '';

  // Register stop handler so other audio sources can stop us
  useEffect(() => {
    const stopWs = () => {
      if (wavesurferRef.current) wavesurferRef.current.pause();
    };
    registerExternalStop(stopWs);
    return () => unregisterExternalStop(stopWs);
  }, []);

  // Load existing recordings status and auto-select first row with audio
  useEffect(() => {
    loadRecordings();
  }, []);

  function parseRows(data) {
    if (!data.recordings) return [];
    return data.recordings.map(r => ({
      value: r.variables[primaryVar],
      text: r.text,
      status: r.status,
      source: r.source,
      segId: r.seg_id || null,
    }));
  }

  async function loadRecordings() {
    setLoading(true);
    const valueSets = currentValue !== '' ? [{ [primaryVar]: currentValue }] : [];
    if (valueSets.length === 0) { setLoading(false); return; }

    try {
      const res = await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: valueSets }),
      });
      const data = await res.json();
      const parsed = parseRows(data);
      setRows(parsed);
      // Auto-select first row that has audio
      const firstWithAudio = parsed.findIndex(r => r.status === 'has_audio');
      if (firstWithAudio !== -1) setSelectedRow(firstWithAudio);
    } catch (err) {
      console.error('Failed to load variable recordings:', err);
    }
    setLoading(false);
  }

  async function refreshRows(newRows) {
    const valueSets = newRows.map(r => ({ [primaryVar]: r.value }));
    if (valueSets.length === 0) return;

    try {
      const res = await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/variable-recordings/${seg.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: valueSets }),
      });
      const data = await res.json();
      setRows(parseRows(data));
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  }

  function audioUrlForRow(row) {
    if (!row.segId) return null;
    return `${BASE}/audio/meditation/${meditationName}/stage/${stageId}/component/${row.segId}.mp3`;
  }

  // Create/recreate WaveSurfer when selectedRow changes and the container is mounted
  useEffect(() => {
    if (selectedRow === null || !rows[selectedRow] || rows[selectedRow].status !== 'has_audio') return;
    if (!waveformRef.current) return;

    const row = rows[selectedRow];
    const url = audioUrlForRow(row);
    if (!url) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setPlaying(false);
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

    ws.on('ready', () => setDuration(ws.getDuration()));
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));

    wavesurferRef.current = ws;

    // Load saved trim for this component
    if (row.segId) {
      apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/trim-meta/${row.segId}`)
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
    const row = rows[selectedRow];
    if (!row.segId) return;
    const trimData = { start: trimStart, end: trimEnd };
    await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/trim-meta/${row.segId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trimData),
    });
    setSavedTrim(trimData);
    setTrimMode(false);
  }

  async function undoTrim() {
    if (selectedRow === null) return;
    const row = rows[selectedRow];
    if (!row.segId) return;
    await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/trim-meta/${row.segId}`, { method: 'DELETE' });
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
    if (!row.segId || !window.confirm('Delete this recording?')) return;
    await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/delete-component/${row.segId}`, { method: 'DELETE' });
    setSelectedRow(null);
    await refreshRows(rows);
    if (onDone) onDone();
  }

  function handleRowClick(index) {
    const row = rows[index];
    if (row.status !== 'has_audio') return;
    setSelectedRow(index);
  }

  function togglePlay() {
    if (!wavesurferRef.current) return;
    if (playing) {
      wavesurferRef.current.pause();
    } else {
      stopPlayback();
      if (savedTrim && !trimMode) {
        wavesurferRef.current.play(savedTrim.start, savedTrim.end);
      } else {
        wavesurferRef.current.play();
      }
    }
  }

  function addRow() {
    const val = newValue.trim();
    if (!val) return;
    if (rows.some(r => String(r.value) === val)) {
      setNewValue('');
      return;
    }
    const varObj = variables[primaryVar];
    const merged = { ...variables, [primaryVar]: { ...(typeof varObj === 'object' ? varObj : { value: varObj }), value: val } };
    const text = substituteText(seg.text, merged);
    const newRows = [...rows, { value: val, text, status: 'missing', source: null, segId: null }];
    setRows(newRows);
    setNewValue('');
    refreshRows(newRows);
  }

  async function removeRow(index) {
    const row = rows[index];
    // If it has audio, confirm and delete the component record from the backend
    if (row.status === 'has_audio') {
      if (!window.confirm(`Delete the recording for value ${row.value}?`)) return;
      if (row.segId) {
        await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/delete-component/${row.segId}`, { method: 'DELETE' });
        if (onDone) onDone();
      }
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
    if (row.status === 'has_audio') {
      if (!window.confirm(`This will replace the existing ${row.source === 'uploaded' ? 'recorded' : 'AI-generated'} audio for value ${row.value}. Continue?`)) return;
    }
    setGenerating(index);
    try {
      if (onFlushSave) await onFlushSave();
      const res = await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/generate-variable-audio/${seg.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: { [primaryVar]: row.value } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Generation failed: ' + (data.error || res.statusText));
      } else {
        await refreshRows(rows);
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
    if (row.status === 'has_audio') {
      if (!window.confirm(`This will replace the existing ${row.source === 'uploaded' ? 'recorded' : 'AI-generated'} audio for value ${row.value}. Continue?`)) return;
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
    if (row.status === 'has_audio') {
      if (!window.confirm(`This will replace the existing ${row.source === 'uploaded' ? 'recorded' : 'AI-generated'} audio for value ${row.value}. Continue?`)) return;
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
    formData.append(`var_${primaryVar}`, row.value);

    try {
      const res = await apiFetch(`/api/meditations/${meditationName}/stages/${stageId}/upload-variable-audio/${seg.id}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Upload failed: ' + (data.error || res.statusText));
      } else {
        await refreshRows(rows);
        if (onDone) onDone();
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  }

  const selectedHasAudio = selectedRow !== null && rows[selectedRow]?.status === 'has_audio';

  return (
    <div className="modal-overlay" onClick={onClose} onContextMenu={e => e.stopPropagation()}>
      <div className="modal variable-recordings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Variable Recordings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
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
                Current recording — value: {rows[selectedRow].value}
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

          {/* Add value */}
          <div className="modal-section">
            <p className="modal-section-label">Add a value for <strong>{primaryVar}</strong> only needed if your recorded your own audios.</p>
            <div className="var-rec-add-row">
              <input
                type="text"
                className="var-rec-input"
                placeholder={`e.g. ${Number(currentValue) + 1 || '5'}`}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addRow(); }}
              />
              <button className="modal-btn-sm" onClick={addRow}>+ Add</button>
            </div>
          </div>

          {/* Recordings table */}
          {rows.length > 0 && (
            <div className="modal-section">
              <p className="modal-section-label">Recordings <span className="modal-section-hint">— click a row to preview its audio</span></p>
              <table className="var-rec-table">
                <thead>
                  <tr>
                    <th>Value</th>
                    <th>Source</th>
                    <th>Actions</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`${row.status === 'has_audio' ? 'has-audio' : 'no-audio'}${selectedRow === i ? ' selected' : ''}${row.status === 'has_audio' ? ' clickable' : ''}`}
                      onClick={() => handleRowClick(i)}
                    >
                      <td className="var-rec-col-value"><strong>{row.value}</strong></td>
                      <td className="var-rec-col-source">
                        {row.status === 'has_audio' ? (
                          row.source === 'uploaded'
                            ? <span className="var-rec-badge var-rec-badge-recorded">🎙 Recorded</span>
                            : row.source === 'generated'
                              ? <span className="var-rec-badge var-rec-badge-ai">🤖 AI</span>
                              : <span className="var-rec-badge var-rec-badge-done">✓ Done</span>
                        ) : (
                          <span className="var-rec-badge var-rec-badge-missing">Missing</span>
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
                              title={row.status === 'has_audio' ? 'Regenerate with AI' : 'Generate with AI'}
                            >
                              {generating === i ? '...' : row.status === 'has_audio' ? '🤖 Regenerate' : '🤖 Generate'}
                            </button>
                            <button
                              className="modal-btn-sm"
                              onClick={() => handleRecord(i)}
                              disabled={generating !== null || recording !== null}
                              title={row.status === 'has_audio' ? 'Re-record with microphone' : 'Record with microphone'}
                            >
                              {row.status === 'has_audio' ? '🎙 Re-record' : '🎙 Record'}
                            </button>
                            <button
                              className="modal-btn-sm"
                              onClick={() => handleUploadClick(i)}
                              disabled={generating !== null || recording !== null}
                              title={row.status === 'has_audio' ? 'Replace with uploaded MP3' : 'Upload MP3'}
                            >
                              {row.status === 'has_audio' ? '📁 Replace' : '📁 Upload'}
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
          )}

          {loading && <p className="modal-section" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p>}

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
