import { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, closestCenter, pointerWithin, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { fetchStageScript, saveStageScript, fetchStageComponents, fetchStageVariables, saveStageVariables, assembleStage, generateAllAudio } from '../api';
import { flattenScript, playSeg, playSegFromWord, stopPlayback, setMeditation, setScriptAndComponents, computeMarkerDuration, registerExternalStop, unregisterExternalStop, resolveVar } from '../playback';
import { getClipboard, setClipboard } from '../clipboard';
import { generateId, ensureIds, findById, findByIdWithContext, allIds, cloneWithNewIds, isDescendantOf } from '../segmentIds';
import { useLocalState } from '../utils';
import Timeline from './Timeline';
import AddMenu from './AddMenu';
import ContextMenu from './ContextMenu';
import DragOverlayContent from './DragOverlayContent';

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
  const [timelineCollapsed, setTimelineCollapsed] = useLocalState(`collapse:${meditationName}:${stageId}:timeline`, true);
  const scriptRef = useRef(script);
  const playAllModeRef = useRef(false);
  const lastClickedRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const assembledAudioRef = useRef(null);
  const assembledPlayingRef = useRef(false);

  useEffect(() => { scriptRef.current = script; }, [script]);
  useEffect(() => { setScriptAndComponents(script, components); }, [script, components]);

  const [variables, setVariables] = useState({});
  const [loopCounters, setLoopCounters] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectionAnchor = useRef(null);

  function handleSelect(id, shiftKey) {
    if (!shiftKey) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(prev => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        if (selectionAnchor.current === id) selectionAnchor.current = null;
        return next;
      }
      if (selectionAnchor.current !== null) {
        const flat = allIds(scriptRef.current);
        const anchorIdx = flat.indexOf(selectionAnchor.current);
        const currentIdx = flat.indexOf(id);
        if (anchorIdx !== -1 && currentIdx !== -1) {
          const from = Math.min(anchorIdx, currentIdx);
          const to = Math.max(anchorIdx, currentIdx);
          const next = new Set(prev);
          for (const p of flat.slice(from, to + 1)) next.add(p);
          return next;
        }
      }
      selectionAnchor.current = id;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
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
    const SEGMENT_DEFAULTS = {
      speech: { type: 'speech', id: generateId(), text: 'New spoken segment.' },
      pause: { type: 'pause', id: generateId(), duration_seconds: 5 },
      asset: { type: 'asset', id: generateId(), file: 'and_out.mp3' },
      loop: { type: 'loop', id: generateId(), repeat: 3, segments: [] },
      section: { type: 'loop', id: generateId(), repeat: 1, label: 'New Section', segments: [] },
      split_marker: { type: 'split_marker', id: generateId() },
    };
    const sorted = sortedSelectedIds();
    const anchorId = position === 'above' ? sorted[0] : sorted[sorted.length - 1];
    const newSeg = SEGMENT_DEFAULTS[segType];
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
  const [activeDragSeg, setActiveDragSeg] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Prefer inner/smaller droppables over their parent containers
  function collisionDetection(args) {
    const pw = pointerWithin(args);
    if (pw.length > 0) return pw;
    return closestCenter(args);
  }

  function handleDragStart(event) {
    const seg = findById(scriptRef.current, event.active.id);
    setActiveDragSeg(seg);
  }

  function handleDragEnd(event) {
    setActiveDragSeg(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromId = String(active.id);
    const overId = String(over.id);

    const newScript = JSON.parse(JSON.stringify(scriptRef.current));

    // Prevent dropping into self or descendants
    const targetId = overId.startsWith('dropzone:') ? overId.slice('dropzone:'.length)
      : overId.startsWith('after:') ? overId.slice('after:'.length)
      : overId;
    if (targetId === fromId || isDescendantOf(newScript, fromId, targetId)) return;

    const fromCtx = findByIdWithContext(newScript, fromId);
    if (!fromCtx) return;

    if (overId.startsWith('after:')) {
      const afterId = overId.slice('after:'.length);
      const afterCtx = findByIdWithContext(newScript, afterId);
      if (!afterCtx) return;
      fromCtx.parent.splice(fromCtx.index, 1);
      const updatedCtx = findByIdWithContext(newScript, afterId);
      if (!updatedCtx) return;
      updatedCtx.parent.splice(updatedCtx.index + 1, 0, fromCtx.seg);
    } else if (overId.startsWith('dropzone:')) {
      const containerId = overId.slice('dropzone:'.length);
      const container = findById(newScript, containerId);
      if (!container) return;
      fromCtx.parent.splice(fromCtx.index, 1);
      container.segments.push(fromCtx.seg);
    } else {
      const toCtx = findByIdWithContext(newScript, overId);
      if (!toCtx) return;
      fromCtx.parent.splice(fromCtx.index, 1);
      if (toCtx.seg.type === 'loop' && toCtx.seg.segments) {
        // Dropping onto a section/loop: insert into it
        toCtx.seg.segments.push(fromCtx.seg);
      } else {
        toCtx.parent.splice(toCtx.index, 0, fromCtx.seg);
      }
    }
    save(newScript);
  }

  // Register callbacks so external audio sources (RecordingModal, etc.) can
  // stop the assembled output and reset timeline playback state.
  useEffect(() => {
    const stopAssembled = () => {
      if (!assembledPlayingRef.current && assembledAudioRef.current) {
        assembledAudioRef.current.pause();
      }
    };
    const resetState = () => {
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
    fetchStageScript(meditationName, stageId).then(loaded => {
      ensureIds(loaded);
      setScript(loaded);
      if (!readOnly) saveStageScript(meditationName, stageId, loaded);
    });
    fetchStageComponents(meditationName, stageId).then(setComponents);
    fetchStageVariables(meditationName, stageId).then(setVariables);
  }, [meditationName, stageId]);

  const save = useCallback(async (newScript) => {
    undoStack.current.push(JSON.parse(JSON.stringify(scriptRef.current)));
    redoStack.current = [];
    setScript(newScript);
    await saveStageScript(meditationName, stageId, newScript);
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
    function handleKeyUp(e) {
      if (e.key === 'Shift') selectionAnchor.current = null;
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [meditationName, stageId]);

  // --- Variables ---
  function saveVars(updated) {
    setVariables(updated);
    saveStageVariables(meditationName, stageId, updated);
  }

  function updateVariable(varName, newValue) {
    const updated = { ...variables, [varName]: { ...variables[varName], value: newValue } };
    saveVars(updated);
  }

  function updateDisplayName(varName, newDisplayName) {
    const updated = { ...variables, [varName]: { ...variables[varName], displayName: newDisplayName } };
    saveVars(updated);
  }

  function updateUnit(varName, unit) {
    const updated = { ...variables, [varName]: { ...variables[varName], unit: unit || undefined } };
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
    const ctx = findByIdWithContext(newScript, anchorId);
    if (!ctx) {
      // No anchor, append to root
      newScript.push(newSeg);
    } else {
      ctx.parent.splice(position === 'above' ? ctx.index : ctx.index + 1, 0, newSeg);
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
    lastClickedRef.current = id;
    setMeditation(meditationName, stageId);

    // Stop if clicking the currently playing segment or parent section
    if ((playingId === id || (isLoop && playingParentId === id)) && !isPaused) {
      stopPlayback();
      setPlayingId(null);
      setPlayingParentId(null);
      setIsPaused(false);
      playAllModeRef.current = false; setIsPlayAll(false);
      return;
    }

    stopPlayback();
    setIsPaused(false);
    playAllModeRef.current = false; setIsPlayAll(false);

    if (isLoop) {
      setPlayingParentId(id);
      const seg = findById(scriptRef.current, id);
      const varName = seg.variable;
      const repeat = (varName && variables[varName] != null)
        ? resolveVar(variables[varName]) || 1
        : (seg.repeat || 1);
      const loopFlat = [];
      for (let r = 0; r < repeat; r++) {
        seg.segments.forEach(s => {
          loopFlat.push({ seg: s, loopId: seg.id, loopIteration: r + 1, loopTotal: Number(repeat) });
        });
      }
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
    setMeditation(meditationName, stageId);
    if (playingId && !isPaused) {
      stopPlayback();
      setPlayingId(null);
      setPlayingParentId(null);
      setLoopCounters({});
      setIsPaused(false);
      playAllModeRef.current = false; setIsPlayAll(false);
      return;
    }
    stopPlayback();
    setIsPaused(false);
    setPlayingParentId(null);
    playAllModeRef.current = true; setIsPlayAll(true);
    const flat = flattenScript(scriptRef.current, variables);
    playSequence(flat, 0);
  }

  function playSequence(flat, index) {
    if (index >= flat.length) {
      setPlayingId(null);
      setPlayingParentId(null);
      setLoopCounters({});
      playAllModeRef.current = false; setIsPlayAll(false);
      return;
    }
    const { seg, loopId, loopIteration, loopTotal } = flat[index];
    if (loopId && loopIteration) {
      setLoopCounters(prev => ({ ...prev, [loopId]: { current: loopIteration, total: loopTotal } }));
    }
    setPlayingId(seg.id);
    playSeg(seg, () => playSequence(flat, index + 1), variables, { script: scriptRef.current, components });
  }

  function handleStop() {
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
          {!readOnly && <button className="btn-add" onClick={addVariable}>+ Add</button>}
        </div>
        {!varsCollapsed && (Object.keys(variables).length > 0 ? (
          <table className="variables-table">
            <thead>
              <tr>
                <th>Value</th>
                <th>Unit</th>
                <th>Variable Name</th>
                <th>Display Name</th>
                {!readOnly && <th></th>}
              </tr>
            </thead>
            <tbody>
              {Object.entries(variables).map(([varName, { value, displayName, unit }]) => (
                <tr key={varName}>
                  <td>
                    <input
                      className={`variable-input${value === '' || isNaN(Number(value)) ? ' variable-input-error' : ''}`}
                      type="text"
                      value={value}
                      readOnly={readOnly}
                      onChange={readOnly ? undefined : e => updateVariable(varName, e.target.value)}
                    />
                  </td>
                  <td>
                    {readOnly ? (
                      <span className="variable-unit-select" style={{ border: 'none' }}>{unit === 'seconds' ? 'sec' : unit === 'minutes' ? 'min' : '—'}</span>
                    ) : (
                      <select
                        className="variable-unit-select"
                        value={unit || ''}
                        onChange={e => updateUnit(varName, e.target.value)}
                      >
                        <option value="">—</option>
                        <option value="seconds">sec</option>
                        <option value="minutes">min</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <span className="variable-name-input" style={{ borderBottom: 'none', cursor: 'default' }}>{varName}</span>
                  </td>
                  <td>
                    <span className="variable-name-input" style={{ borderBottom: 'none', cursor: 'default' }}>{displayName || varName}</span>
                  </td>
                  {!readOnly && <td className="var-delete-cell">
                    <button className="var-delete-btn" onClick={() => deleteVariable(varName)}>✕</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-hint">No variables defined.</p>
        ))}
      </div>

      <div className="stage-subsection">
        <div className="editor-section-label collapsible" onClick={() => setTimelineCollapsed(!timelineCollapsed)}>
          <span className={`chevron ${timelineCollapsed ? 'collapsed' : ''}`}>▼</span> Timeline
        </div>
        {!timelineCollapsed && <>
          <div className="controls">
            <button className="btn-play" onClick={playAll}>
              {isPlayAll && playingId ? '⏸ Pause' : '▶ Play All'}
            </button>
            <button className="btn-stop" onClick={handleStop}>■ Stop</button>
            {!readOnly && <button className="btn-assemble" onClick={handleGenerateAll}>Generate All</button>}
            <span className="status">{status}</span>
            {!readOnly && <AddMenu onAdd={handleAddFromToolbar} />}
          </div>
          {readOnly ? (
            <Timeline
              segments={script}
              playingId={playingId}
              isPaused={isPaused}
              onPlay={handlePlay}
              onWordClick={handleWordClick}
              onDelete={() => {}}
              onUpdate={() => {}}
              onInsert={() => {}}
              components={components}
              meditationName={meditationName}
              stageId={stageId}
              onRefreshComponents={() => {}}
              playingParentId={playingParentId}
              variables={variables}
              loopCounters={loopCounters}
              onUpdateVariable={() => {}}
              selectedIds={selectedIds}
              onSelect={() => {}}
              onContextMenu={() => {}}
              fullScript={script}
              readOnly
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <Timeline
                segments={script}
                playingId={playingId}
                isPaused={isPaused}
                onPlay={handlePlay}
                onWordClick={handleWordClick}
                onDelete={deleteById}
                onUpdate={updateById}
                onInsert={insertNear}
                components={components}
                meditationName={meditationName}
                stageId={stageId}
                onRefreshComponents={() => fetchStageComponents(meditationName, stageId).then(setComponents)}
                playingParentId={playingParentId}
                variables={variables}
                loopCounters={loopCounters}
                onUpdateVariable={updateVariable}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
                fullScript={script}
              />
              <DragOverlay dropAnimation={null}>
                {activeDragSeg ? <DragOverlayContent seg={activeDragSeg} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </>}
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
    </div>
  );
}
