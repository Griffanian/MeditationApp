import { useState, useEffect, useCallback, useRef } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { fetchStageScript, saveStageScript, fetchStageComponents, fetchStageVariables, saveStageVariables, assembleStage, generateAllAudio } from '../api';
import { flattenScript, playSeg, playSegFromWord, stopPlayback, setMeditation, setScriptAndComponents, setPlaybackVariables, computeMarkerDuration, registerExternalStop, unregisterExternalStop, unlockAudio } from '../playback';
import { getClipboard, setClipboard } from '../clipboard';
import { generateId, ensureIds, findById, findByIdWithContext, allIds, cloneWithNewIds, isDescendantOf } from '../segmentIds';
import { SEGMENT_TYPES } from '../segmentDefs';
import { useLocalState } from '../utils';
import Timeline from './Timeline';
import AddMenu from './AddMenu';
import ContextMenu from './ContextMenu';
import TimelineGuide from './TimelineGuide';

export default function StageEditor({ stageName, stageId, meditationName, readOnly }) {
  const [script, setScript] = useState([]);
  const [components, setComponents] = useState({});
  const [playingId, setPlayingId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [playingParentId, setPlayingParentId] = useState(null);
  const [isPlayAll, setIsPlayAll] = useState(false);
  const [status, setStatus] = useState('');
  const [outputUrl, setOutputUrl] = useState(null);
  const [varsCollapsed, setVarsCollapsed] = useLocalState(`collapse:${meditationName}:${stageId}:vars`, true);
  const [timelineCollapsed, setTimelineCollapsed] = useLocalState(`collapse:${meditationName}:${stageId}:timeline`, false);
  const scriptRef = useRef(script);
  const playAllModeRef = useRef(false);
  const sequenceIdRef = useRef(0);
  const lastClickedRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const savePromiseRef = useRef(Promise.resolve());
  const assembledAudioRef = useRef(null);
  const assembledPlayingRef = useRef(false);

  useEffect(() => { scriptRef.current = script; }, [script]);
  useEffect(() => { setScriptAndComponents(script, components); }, [script, components]);

  const [variables, setVariables] = useState({});
  const [varRevision, setVarRevision] = useState(0);
  useEffect(() => { setPlaybackVariables(variables); }, [variables]);

  // Variable error detection — derived from variables state
  const UNIT_MULTS = { seconds: 1, minutes: 60, hours: 3600 };
  const varErrors = {}; // { varName: { minBelowFloor, valueBelowFloor, valueBelowMin, computed_min, messages[] } }
  for (const [varName, varData] of Object.entries(variables)) {
    if (!varData || typeof varData !== 'object') continue;
    const mult = UNIT_MULTS[varData.unit] || 1;
    const val = Number(varData.value);
    const userMin = varData.min != null ? Number(varData.min) : null;
    const errors = { minBelowFloor: false, valueBelowFloor: false, valueBelowMin: false, computed_min: varData.computed_min, messages: [] };

    // Check user-set min against computed floor
    if (varData.computed_min && userMin != null && userMin * mult < varData.computed_min.min_seconds) {
      errors.minBelowFloor = true;
      const unitLabel = varData.unit === 'seconds' ? 'sec' : varData.unit === 'minutes' ? 'min' : varData.unit === 'hours' ? 'hr' : '';
      const cm = varData.computed_min;
      errors.messages.push(`Minimum (${userMin} ${unitLabel}) is below the target set by "${cm.section_label}" — fixed content is ${cm.fixed_duration}, needs at least ${cm.min_value_ceiled} ${unitLabel}`);
    }
    // Check current value against computed floor
    if (varData.computed_min && !isNaN(val) && val * mult < varData.computed_min.min_seconds) {
      errors.valueBelowFloor = true;
      const unitLabel = varData.unit === 'seconds' ? 'sec' : varData.unit === 'minutes' ? 'min' : varData.unit === 'hours' ? 'hr' : '';
      const cm = varData.computed_min;
      errors.messages.push(`Current value (${val} ${unitLabel}) is below the target set by "${cm.section_label}" — fixed content is ${cm.fixed_duration}, needs at least ${cm.min_value_ceiled} ${unitLabel}`);
    }

    if (errors.messages.length > 0) varErrors[varName] = errors;
  }
  const hasErrors = Object.keys(varErrors).length > 0;

  const [loadingVars, setLoadingVars] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [loopCounters, setLoopCounters] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showGuide, setShowGuide] = useState(null);

  // Selection functions aligned with Atlassian's multi-drag pattern
  function toggleSelection(id) {
    setSelectedIds(prev => {
      if (!prev.has(id)) return new Set([id]);
      if (prev.size > 1) return new Set([id]);
      return new Set();
    });
  }

  function toggleSelectionInGroup(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function multiSelectTo(id) {
    if (selectedIds.size === 0) {
      setSelectedIds(new Set([id]));
      return;
    }
    const flat = allIds(scriptRef.current);
    const lastSelected = [...selectedIds].pop();
    const anchorIdx = flat.indexOf(lastSelected);
    const currentIdx = flat.indexOf(id);
    if (anchorIdx === -1 || currentIdx === -1) return;
    const from = Math.min(anchorIdx, currentIdx);
    const to = Math.max(anchorIdx, currentIdx);
    const next = new Set(selectedIds);
    for (const p of flat.slice(from, to + 1)) next.add(p);
    setSelectedIds(next);
  }

  const [contextMenu, setContextMenu] = useState(null);

  function handleContextMenu(e, id) {
    e.preventDefault();
    if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]));
    }
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  }

  function sortedSelectedIds() {
    const flat = allIds(scriptRef.current);
    return [...selectedIds].sort((a, b) => flat.indexOf(a) - flat.indexOf(b));
  }

  function handleContextCopy() {
    const sorted = sortedSelectedIds();
    const segs = sorted.map(id => JSON.parse(JSON.stringify(findById(scriptRef.current, id))));
    setClipboard(segs);
  }

  function handleContextPaste(position) {
    const cb = getClipboard();
    if (!cb || cb.length === 0) return;
    const sorted = sortedSelectedIds();
    const anchorId = position === 'above' ? sorted[0] : sorted[sorted.length - 1];
    const newScript = JSON.parse(JSON.stringify(scriptRef.current));
    const ctx = findByIdWithContext(newScript, anchorId);
    if (!ctx) return;
    const insertIdx = position === 'above' ? ctx.index : ctx.index + 1;
    const cloned = cloneWithNewIds(cb);
    ctx.parent.splice(insertIdx, 0, ...cloned);
    save(newScript);
    setSelectedIds(new Set());
  }

  function handleContextAdd(position, segType) {
    const template = SEGMENT_TYPES.find(t => t.type === segType);
    if (!template) return;
    const newSeg = JSON.parse(JSON.stringify(template.default));
    newSeg.id = generateId();
    const sorted = sortedSelectedIds();
    const anchorId = position === 'above' ? sorted[0] : sorted[sorted.length - 1];
    insertNear(anchorId, position === 'above' ? 'above' : 'below', newSeg);
  }

  function handleContextDelete() {
    if (!confirm(`Delete ${selectedIds.size} segment${selectedIds.size > 1 ? 's' : ''}?`)) return;
    const newScript = JSON.parse(JSON.stringify(scriptRef.current));
    const sorted = sortedSelectedIds().reverse();
    for (const id of sorted) {
      const ctx = findByIdWithContext(newScript, id);
      if (ctx) ctx.parent.splice(ctx.index, 1);
    }
    save(newScript);
    setSelectedIds(new Set());
  }

  function handleGroupIntoSection() {
    const sorted = sortedSelectedIds();
    if (sorted.length < 1) return;
    const newScript = JSON.parse(JSON.stringify(scriptRef.current));
    const firstCtx = findByIdWithContext(newScript, sorted[0]);
    const lastCtx = findByIdWithContext(newScript, sorted[sorted.length - 1]);
    if (!firstCtx || !lastCtx || firstCtx.parent !== lastCtx.parent) return;
    const count = lastCtx.index - firstCtx.index + 1;
    const collected = firstCtx.parent.splice(firstCtx.index, count);
    const section = { type: 'loop', id: generateId(), repeat: 1, label: 'New Section', segments: collected };
    firstCtx.parent.splice(firstCtx.index, 0, section);
    save(newScript);
    setSelectedIds(new Set());
  }

  // --- Drag and drop ---
  const [activeDragIds, setActiveDragIds] = useState(null);

  useEffect(() => {
    if (readOnly) return;

    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === 'timeline-segment',
      onDragStart: ({ source }) => {
        const dragId = source.data.id;
        if (!selectedIds.has(dragId)) {
          // Dragging an unselected item — clear selection, drag just this one
          setSelectedIds(new Set());
          setActiveDragIds(new Set([dragId]));
        } else {
          // Dragging a selected item — drag all selected
          setActiveDragIds(new Set(selectedIds));
        }
      },
      onDrop: ({ source, location }) => {
        const dragIds = activeDragIds || new Set([source.data.id]);
        setActiveDragIds(null);

        const target = location.current.dropTargets[0];
        if (!target) return;

        const targetData = target.data;
        const targetId = targetData.id;

        // Determine insertion mode from target type
        let insertMode; // 'before' | 'after' | 'inside' | 'append'
        if (targetData.type === 'add-zone') {
          insertMode = 'append';
        } else if (targetData.type === 'section') {
          const instruction = extractInstruction(targetData);
          if (!instruction) return;
          if (instruction.type === 'reorder-above') insertMode = 'before';
          else if (instruction.type === 'reorder-below') insertMode = 'after';
          else if (instruction.type === 'make-child') insertMode = 'inside';
          else return;
        } else {
          // Segment — use closest edge
          const edge = extractClosestEdge(targetData);
          if (!edge) return;
          insertMode = edge === 'top' ? 'before' : 'after';
        }

        const newScript = JSON.parse(JSON.stringify(scriptRef.current));

        // Remove all dragged segments (in reverse document order for index stability)
        const flat = allIds(newScript);
        const sortedDragIds = [...dragIds].sort((a, b) => flat.indexOf(b) - flat.indexOf(a));
        const collected = [];
        for (const id of sortedDragIds) {
          const ctx = findByIdWithContext(newScript, id);
          if (!ctx) return;
          ctx.parent.splice(ctx.index, 1);
          collected.unshift(ctx.seg);
        }

        // Insert collected segments at the target
        if (insertMode === 'before') {
          const ctx = findByIdWithContext(newScript, targetId);
          if (!ctx) return;
          ctx.parent.splice(ctx.index, 0, ...collected);
        } else if (insertMode === 'after') {
          const ctx = findByIdWithContext(newScript, targetId);
          if (!ctx) return;
          ctx.parent.splice(ctx.index + 1, 0, ...collected);
        } else if (insertMode === 'inside') {
          const container = findById(newScript, targetId);
          if (!container || !container.segments) return;
          container.segments.push(...collected);
        } else if (insertMode === 'append') {
          const containerId = targetData.containerId;
          if (containerId === 'root') {
            newScript.push(...collected);
          } else {
            const container = findById(newScript, containerId);
            if (!container) return;
            container.segments.push(...collected);
          }
        }

        save(newScript);
        setSelectedIds(new Set());
      },
    });
  }, [readOnly, selectedIds, activeDragIds]);

  // Register callbacks so external audio sources (RecordingModal, etc.) can
  // stop the assembled output and reset timeline playback state.
  useEffect(() => {
    const stopAssembled = () => {
      if (!assembledPlayingRef.current && assembledAudioRef.current) {
        assembledAudioRef.current.pause();
      }
    };
    const resetState = () => {
      sequenceIdRef.current++;
      setPlayingId(null);
      setPlayingParentId(null);
      setLoopCounters({});
      setIsPaused(false);
      playAllModeRef.current = false;
      setIsPlayAll(false);
    };
    registerExternalStop(stopAssembled);
    registerExternalStop(resetState);
    return () => {
      unregisterExternalStop(stopAssembled);
      unregisterExternalStop(resetState);
    };
  }, []);

  useEffect(() => {
    setLoadingVars(true);
    setLoadingTimeline(true);
    fetchStageScript(meditationName, stageId).then(loaded => {
      ensureIds(loaded);
      setScript(loaded);
      if (!readOnly) saveStageScript(meditationName, stageId, loaded);
    }).finally(() => setLoadingTimeline(false));
    fetchStageComponents(meditationName, stageId).then(setComponents);
    fetchStageVariables(meditationName, stageId).then(setVariables).finally(() => setLoadingVars(false));
  }, [meditationName, stageId]);

  const save = useCallback(async (newScript) => {
    undoStack.current.push(JSON.parse(JSON.stringify(scriptRef.current)));
    redoStack.current = [];
    setScript(newScript);
    const p = saveStageScript(meditationName, stageId, newScript);
    savePromiseRef.current = p;
    await p;
    fetchStageComponents(meditationName, stageId).then(setComponents);
  }, [meditationName, stageId]);

  function undo() {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    redoStack.current.push(JSON.parse(JSON.stringify(scriptRef.current)));
    setScript(prev);
    saveStageScript(meditationName, stageId, prev);
  }

  function redo() {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop();
    undoStack.current.push(JSON.parse(JSON.stringify(scriptRef.current)));
    setScript(next);
    saveStageScript(meditationName, stageId, next);
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [meditationName, stageId]);

  // --- Variables ---
  function saveVars(updated) {
    setVariables(updated);
    setVarRevision(r => r + 1);
    return saveStageVariables(meditationName, stageId, updated);
  }

  async function updateVariable(varName, newValue) {
    const varData = variables[varName];
    if (varData && typeof varData === 'object' && varData.min != null) {
      if (Number(newValue) < Number(varData.min)) {
        alert(`Value cannot be less than the minimum (${varData.min}).`);
        return;
      }
    }
    const updated = { ...variables, [varName]: { ...variables[varName], value: newValue } };
    await saveVars(updated);
    // Re-fetch to get fresh computed_min (conditions may have changed which segments are included)
    fetchStageVariables(meditationName, stageId).then(setVariables);
  }

  function updateDisplayName(varName, newDisplayName) {
    const updated = { ...variables, [varName]: { ...variables[varName], displayName: newDisplayName } };
    saveVars(updated);
  }

  async function updateUnit(varName, unit) {
    const updated = { ...variables, [varName]: { ...variables[varName], unit: unit || undefined } };
    await saveVars(updated);
    // Re-fetch to get fresh computed_min for the new unit
    fetchStageVariables(meditationName, stageId).then(setVariables);
  }

  function updateVarMin(varName, val) {
    const updated = { ...variables, [varName]: { ...variables[varName], min: val === '' ? undefined : Number(val) } };
    saveVars(updated);
  }

  function updateVarMax(varName, val) {
    const varData = variables[varName];
    let v = val === '' ? undefined : Number(val);
    if (v != null && varData && typeof varData === 'object' && varData.min != null && v < Number(varData.min)) {
      alert(`The maximum cannot be less than the minimum, which is ${varData.min}.`);
      v = Number(varData.min);
    }
    const updated = { ...variables, [varName]: { ...variables[varName], max: v } };
    saveVars(updated);
  }

  function addVariable() {
    let name = 'newVar';
    let i = 1;
    while (name in variables) name = `newVar${i++}`;
    saveVars({ ...variables, [name]: { value: 1, displayName: name } });
  }

  function renameVariable(oldName, newName) {
    if (!newName || newName === oldName) return;
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(newName)) {
      alert('Variable names must start with a letter and contain only letters and numbers.');
      return;
    }
    if (newName in variables) {
      alert(`A variable named "${newName}" already exists.`);
      return;
    }
    const updated = {};
    for (const [k, v] of Object.entries(variables)) {
      updated[k === oldName ? newName : k] = v;
    }
    saveVars(updated);
  }

  function deleteVariable(varName) {
    if (!confirm(`Delete variable "${varName}"?`)) return;
    const updated = { ...variables };
    delete updated[varName];
    saveVars(updated);
  }

  // --- Conditions ---
  const conditions = variables._conditions || {};
  const varNames = Object.keys(variables).filter(k => k !== '_conditions' && k !== 'computed_min');

  function addCondition() {
    let name = 'condition1';
    let i = 2;
    while (name in conditions) name = `condition${i++}`;
    const updated = { ...variables, _conditions: { ...conditions, [name]: { variable: varNames[0] || '', operator: '>=', value: 1 } } };
    saveVars(updated);
  }

  function updateCondition(condName, field, val) {
    const updated = { ...variables, _conditions: { ...conditions, [condName]: { ...conditions[condName], [field]: val } } };
    saveVars(updated);
  }

  function deleteCondition(condName) {
    if (!confirm(`Delete condition "${conditions[condName]?.displayName || condName}"?`)) return;
    const newConds = { ...conditions };
    delete newConds[condName];
    const updated = { ...variables, _conditions: newConds };
    saveVars(updated);
  }

  // --- Mutations ---
  function updateById(id, updates) {
    const newScript = JSON.parse(JSON.stringify(scriptRef.current));
    const seg = findById(newScript, id);
    if (!seg) return;
    Object.assign(seg, updates);
    save(newScript);
  }

  function deleteById(id) {
    const newScript = JSON.parse(JSON.stringify(scriptRef.current));
    const ctx = findByIdWithContext(newScript, id);
    if (!ctx) return;
    ctx.parent.splice(ctx.index, 1);
    save(newScript);
  }

  function insertNear(anchorId, position, newSeg) {
    if (!newSeg.id) newSeg.id = generateId();
    const newScript = JSON.parse(JSON.stringify(scriptRef.current));
    if (position === 'append') {
      // Append to a loop/section's segments, or to root
      if (anchorId) {
        const loop = findById(newScript, anchorId);
        if (loop && loop.segments) loop.segments.push(newSeg);
      } else {
        newScript.push(newSeg);
      }
    } else {
      const ctx = findByIdWithContext(newScript, anchorId);
      if (!ctx) {
        newScript.push(newSeg);
      } else {
        ctx.parent.splice(position === 'above' ? ctx.index : ctx.index + 1, 0, newSeg);
      }
    }
    save(newScript);
  }

  function handleAddFromToolbar(newSeg) {
    if (!newSeg.id) newSeg.id = generateId();
    if (lastClickedRef.current) {
      insertNear(lastClickedRef.current, 'below', newSeg);
    } else {
      save([...JSON.parse(JSON.stringify(scriptRef.current)), newSeg]);
    }
  }

  // --- Playback ---
  function handlePlay(id, isLoop = false) {
    unlockAudio();
    lastClickedRef.current = id;
    setMeditation(meditationName, stageId);

    // Stop if clicking the currently playing segment or parent section
    if ((playingId === id || (isLoop && playingParentId === id)) && !isPaused) {
      sequenceIdRef.current++;
      stopPlayback();
      setPlayingId(null);
      setPlayingParentId(null);
      setLoopCounters({});
      setIsPaused(false);
      playAllModeRef.current = false; setIsPlayAll(false);
      return;
    }

    sequenceIdRef.current++;
    stopPlayback();
    setIsPaused(false);
    setLoopCounters({});
    playAllModeRef.current = false; setIsPlayAll(false);

    if (isLoop) {
      setPlayingParentId(id);
      const seg = findById(scriptRef.current, id);
      const loopFlat = flattenScript([seg], variables, components);
      playSequence(loopFlat, 0);
      return;
    }

    setPlayingParentId(null);
    const seg = findById(scriptRef.current, id);
    setPlayingId(id);
    playSeg(seg, () => setPlayingId(null), variables, { script: scriptRef.current, components });
  }

  function handleWordClick(id, wordIndex) {
    lastClickedRef.current = id;
    setMeditation(meditationName, stageId);
    stopPlayback();
    setIsPaused(false);
    const seg = findById(scriptRef.current, id);
    if (seg.type !== 'speech') return;
    setPlayingId(id);
    playSegFromWord(seg, wordIndex, () => setPlayingId(null));
  }

  function playAll() {
    unlockAudio();
    setMeditation(meditationName, stageId);
    if (playingId && !isPaused) {
      sequenceIdRef.current++;
      stopPlayback();
      setPlayingId(null);
      setPlayingParentId(null);
      setLoopCounters({});
      setIsPaused(false);
      playAllModeRef.current = false; setIsPlayAll(false);
      return;
    }
    sequenceIdRef.current++;
    stopPlayback();
    setIsPaused(false);
    setPlayingParentId(null);
    playAllModeRef.current = true; setIsPlayAll(true);
    const flat = flattenScript(scriptRef.current, variables, components);
    playSequence(flat, 0);
  }

  function playSequence(flat, index, seqId) {
    if (seqId == null) seqId = sequenceIdRef.current;
    if (seqId !== sequenceIdRef.current) return; // cancelled
    if (index >= flat.length) {
      setPlayingId(null);
      setPlayingParentId(null);
      setLoopCounters({});
      playAllModeRef.current = false; setIsPlayAll(false);
      return;
    }
    const { seg, loopId, loopIteration, loopTotal, loopIterDuration } = flat[index];
    if (loopId && loopIteration) {
      setLoopCounters(prev => {
        const existing = prev[loopId];
        return {
          ...prev,
          [loopId]: {
            current: loopIteration,
            total: loopTotal,
            iterDuration: loopIterDuration,
            startTime: (!existing || existing.current !== loopIteration) ? Date.now() : existing.startTime,
            loopStartTime: existing?.loopStartTime || Date.now(),
          },
        };
      });
    }
    setPlayingId(seg.id);
    playSeg(seg, () => playSequence(flat, index + 1, seqId), variables, { script: scriptRef.current, components });
  }

  function handleStop() {
    sequenceIdRef.current++;
    stopPlayback();
    setPlayingId(null);
    setPlayingParentId(null);
    setLoopCounters({});
    setIsPaused(false);
    playAllModeRef.current = false; setIsPlayAll(false);
  }

  async function handleGenerateAll() {
    setStatus('Generating all audio...');
    try {
      // Ensure the latest script is saved before generating
      await saveStageScript(meditationName, stageId, scriptRef.current);
      await generateAllAudio(meditationName, stageId);
      setStatus('All audio generated!');
      // Reload everything so the timeline reflects the new audio
      const [loadedScript, comps, vars] = await Promise.all([
        fetchStageScript(meditationName, stageId),
        fetchStageComponents(meditationName, stageId),
        fetchStageVariables(meditationName, stageId),
      ]);
      ensureIds(loadedScript);
      setScript(loadedScript);
      setComponents(comps);
      setVariables(vars);
    } catch (err) {
      setStatus(`Generation failed: ${err.message}`);
    }
  }

  return (
    <div className="stage-editor" onClick={e => {
      if (!e.target.closest('.segment') && !e.target.closest('.loop-header') && !e.target.closest('.section-header') && !e.target.closest('.context-menu')) {
        setSelectedIds(new Set());
      }
    }}>
      <div className="stage-subsection">
        <div className="section-header-row">
          <div className="editor-section-label collapsible" onClick={() => setVarsCollapsed(!varsCollapsed)}>
            <span className={`chevron ${varsCollapsed ? 'collapsed' : ''}`}>▼</span> Variables
          </div>
          <span className="guide-link-inline" onClick={() => setShowGuide(4)}>?</span>
          {!readOnly && <button className="btn-add" onClick={addVariable}>+ Add</button>}
        </div>
        {!varsCollapsed && (loadingVars ? (
          <div className="loading-page" style={{ minHeight: 40 }}><div className="loading-spinner" /><span>Loading variables...</span></div>
        ) : varNames.length > 0 ? (<>
          <table className="variables-table">
            <thead>
              <tr>
                <th>Min</th>
                <th>Current</th>
                <th>Max</th>
                <th>Unit</th>
                <th>Variable Name</th>
                <th>Display Name</th>
                {!readOnly && <th></th>}
              </tr>
            </thead>
            <tbody>
              {Object.entries(variables).filter(([k]) => k !== '_conditions').map(([varName, { value, displayName, unit, min, max, computed_min }]) => {
                const numVal = Number(value) || 1;
                const err = varErrors[varName];
                const hasErr = !!err;
                return (
                  <tr key={varName} className={hasErr ? 'variable-mismatch' : ''}>
                    <td>
                      <input className={`variable-input${err?.minBelowFloor ? ' variable-input-error' : ''}`}
                        type="number" key={`min-${varName}-${varRevision}`} defaultValue={min != null ? min : ''}
                        placeholder="—" readOnly={readOnly}
                        onBlur={e => {
                          const v = e.target.value === '' ? undefined : Number(e.target.value);
                          updateVarMin(varName, v != null ? v : '');
                          if (v != null && numVal < v) updateVariable(varName, v);
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
                    </td>
                    <td>
                      <input className={`variable-input${err?.valueBelowFloor ? ' variable-input-error' : ''}`}
                        type="number" step="1" value={value}
                        readOnly={readOnly}
                        onChange={readOnly ? undefined : e => updateVariable(varName, e.target.value)} />
                    </td>
                    <td>
                      <input className="variable-input" type="number"
                        key={`max-${varName}-${varRevision}`} defaultValue={max != null ? max : ''}
                        placeholder="—" readOnly={readOnly}
                        onBlur={e => {
                          const v = e.target.value === '' ? undefined : Number(e.target.value);
                          updateVarMax(varName, v != null ? v : '');
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
                    </td>
                    <td>
                      {readOnly ? (
                        <span className="variable-unit-select" style={{ border: 'none' }}>{unit === 'seconds' ? 'sec' : unit === 'minutes' ? 'min' : unit === 'hours' ? 'hr' : 'times'}</span>
                      ) : (
                        <select className="variable-unit-select" value={unit || ''} onChange={e => updateUnit(varName, e.target.value)}>
                          <option value="">times</option>
                          <option value="seconds">sec</option>
                          <option value="minutes">min</option>
                          <option value="hours">hr</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <span className="variable-name-input" style={{ borderBottom: 'none', cursor: 'default' }}>{varName}</span>
                      ) : (
                        <input className="variable-name-input" type="text" defaultValue={varName}
                          onBlur={e => renameVariable(varName, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <span className="variable-name-input" style={{ borderBottom: 'none', cursor: 'default' }}>{displayName || varName}</span>
                      ) : (
                        <input className="variable-name-input" type="text" defaultValue={displayName || varName}
                          onBlur={e => updateDisplayName(varName, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
                      )}
                    </td>
                    {!readOnly && <td className="var-delete-cell">
                      <button className="var-delete-btn" onClick={() => deleteVariable(varName)}>✕</button>
                    </td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {hasErrors && (
            <div className="variable-mismatch-banner">
              {Object.entries(varErrors).map(([varName, err]) => (
                err.messages.map((msg, i) => (
                  <div key={`${varName}-${i}`} className="variable-mismatch-msg">
                    <strong>{variables[varName]?.displayName || varName}:</strong> {msg}
                  </div>
                ))
              ))}
            </div>
          )}
        </>) : (
          <p className="empty-hint">No variables yet. {!readOnly && <><span className="empty-hint-link" onClick={addVariable}>Add one</span> or </>}<span className="empty-hint-link" onClick={() => setShowGuide(4)}>see our guide</span>.</p>
        ))}
      </div>

      {varNames.length > 0 && (
      <div className="stage-subsection">
        <div className="section-header-row">
          <div className="editor-section-label">Conditions</div>
          {!readOnly && <button className="btn-add" onClick={addCondition}>+ Add</button>}
        </div>
        {Object.keys(conditions).length > 0 ? (
          <table className="variables-table">
            <thead>
              <tr>
                <th>Include if</th>
                <th></th>
                <th></th>
                {!readOnly && <th></th>}
              </tr>
            </thead>
            <tbody>
              {Object.entries(conditions).map(([condName, cond]) => (
                <tr key={condName}>
                  <td>
                    {readOnly ? (
                      <span>{variables[cond.variable]?.displayName || cond.variable}</span>
                    ) : (
                      <select className="variable-unit-select" value={cond.variable || ''}
                        onChange={e => updateCondition(condName, 'variable', e.target.value)}>
                        <option value="">—</option>
                        {varNames.map(v => <option key={v} value={v}>{variables[v]?.displayName || v}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {readOnly ? (
                      <span>{cond.operator}</span>
                    ) : (
                      <select className="variable-unit-select" value={cond.operator || '>='}
                        onChange={e => updateCondition(condName, 'operator', e.target.value)}>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value=">=">{'\u2265'}</option>
                        <option value="<=">{'\u2264'}</option>
                        <option value="==">=</option>
                        <option value="!=">{'\u2260'}</option>
                        <option value="between">between</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      <span>{cond.value}{cond.operator === 'between' && ` – ${cond.value2}`}</span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input className="variable-input" type="number"
                          key={`cond-val-${condName}-${varRevision}`}
                          defaultValue={cond.value}
                          onBlur={e => updateCondition(condName, 'value', Number(e.target.value))}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
                        {cond.operator === 'between' && <>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>–</span>
                          <input className="variable-input" type="number"
                            key={`cond-val2-${condName}-${varRevision}`}
                            defaultValue={cond.value2}
                            onBlur={e => updateCondition(condName, 'value2', Number(e.target.value))}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
                        </>}
                      </span>
                    )}
                  </td>
                  {!readOnly && <td className="var-delete-cell">
                    <button className="var-delete-btn" onClick={() => deleteCondition(condName)}>✕</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-hint">No conditions yet. {!readOnly && <span className="empty-hint-link" onClick={addCondition}>Add one</span>} to conditionally include segments.</p>
        )}
      </div>
      )}

      <div className="stage-subsection">
        <div className="section-header-row">
          <div className="editor-section-label collapsible" onClick={() => setTimelineCollapsed(!timelineCollapsed)}>
            <span className={`chevron ${timelineCollapsed ? 'collapsed' : ''}`}>▼</span> Timeline
          </div>
          <span className="guide-link-inline" onClick={() => setShowGuide(1)}>?</span>
        </div>
        {!timelineCollapsed && (loadingTimeline ? (
          <div className="loading-page" style={{ minHeight: 60 }}><div className="loading-spinner" /><span>Loading timeline...</span></div>
        ) : <>
          <div className="controls">
            <button className="btn-play" onClick={playAll}>
              {isPlayAll && playingId ? '⏸ Pause' : '▶ Play All'}
            </button>
            <button className="btn-stop" onClick={handleStop}>■ Stop</button>
            {!readOnly && <button className="btn-assemble" onClick={handleGenerateAll}>Generate All</button>}
            <span className="status">{status}</span>
            {!readOnly && <AddMenu onAdd={handleAddFromToolbar} />}
          </div>
          {script.length === 0 && (
            <p className="empty-hint">No segments yet. Use the + to add segments, or <span className="empty-hint-link" onClick={() => setShowGuide(0)}>see our guide to timelines</span>.</p>
          )}
          <Timeline
            segments={script}
            playingId={playingId}
            isPaused={isPaused}
            onPlay={readOnly ? handlePlay : handlePlay}
            onWordClick={readOnly ? handleWordClick : handleWordClick}
            onDelete={readOnly ? () => { } : deleteById}
            onUpdate={readOnly ? () => { } : updateById}
            onInsert={readOnly ? () => { } : insertNear}
            components={components}
            meditationName={meditationName}
            stageId={stageId}
            onRefreshComponents={readOnly ? () => { } : () => {
              fetchStageComponents(meditationName, stageId).then(setComponents);
              fetchStageVariables(meditationName, stageId).then(setVariables);
            }}
            onFlushSave={readOnly ? undefined : () => savePromiseRef.current}
            playingParentId={playingParentId}
            variables={variables}
            loopCounters={loopCounters}
            onUpdateVariable={readOnly ? () => { } : updateVariable}
            selectedIds={selectedIds}
            toggleSelection={readOnly ? () => { } : toggleSelection}
            toggleSelectionInGroup={readOnly ? () => { } : toggleSelectionInGroup}
            multiSelectTo={readOnly ? () => { } : multiSelectTo}
            containerId={null}
            onContextMenu={readOnly ? () => { } : handleContextMenu}
            fullScript={script}
            readOnly={readOnly}
            activeDragIds={activeDragIds}
          />
        </>)}
      </div>
      {!readOnly && contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedCount={selectedIds.size}
          onAddAbove={type => handleContextAdd('above', type)}
          onAddBelow={type => handleContextAdd('below', type)}
          onCopy={handleContextCopy}
          onPaste={handleContextPaste}
          onGroup={handleGroupIntoSection}
          onDelete={handleContextDelete}
          onClose={() => setContextMenu(null)}
        />
      )}

      {outputUrl && (
        <div className="full-player">
          <audio
            ref={assembledAudioRef}
            controls
            src={outputUrl}
            onPlay={() => {
              assembledPlayingRef.current = true;
              stopPlayback();
              assembledPlayingRef.current = false;
            }}
          />
        </div>
      )}
      {showGuide != null && <TimelineGuide startStep={showGuide} onClose={() => setShowGuide(null)} />}
    </div>
  );
}
