import { useState, useRef, useEffect } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import DragHandle from './DragHandle';
import KebabMenu from './KebabMenu';
import RecordingModal from './RecordingModal';
import VariableRecordingsModal from './VariableRecordingsModal';
import { clearTimestampCache, computeMarkerDuration, evaluateCondition } from '../playback';

const OP_SYMBOLS = { '>': '>', '<': '<', '>=': '\u2265', '<=': '\u2264', '==': '=', '!=': '\u2260' };

function conditionLabel(condName, conditions, variables) {
  const c = conditions?.[condName];
  if (!c) return condName;
  const varLabel = variables[c.variable]?.displayName || c.variable || '?';
  if (c.operator === 'between') return `${c.value ?? '?'} \u2264 ${varLabel} \u2264 ${c.value2 ?? '?'}`;
  return `${varLabel} ${OP_SYMBOLS[c.operator] || c.operator || '?'} ${c.value ?? '?'}`;
}

export default function Segment({ seg, playingId, isPaused, onPlay, onWordClick, onDelete, onInsert, onUpdate, audioStatus = 'missing', meditationName, stageId, onRefreshComponents, insidePlayingParent, variables = {}, onUpdateVariable, selected, toggleSelection, toggleSelectionInGroup, multiSelectTo, onContextMenu, fullScript, components = {}, readOnly, onFlushSave, activeDragIds }) {
  const hasAudio = audioStatus === 'current';
  const isStale = audioStatus === 'stale';
  const [editing, setEditing] = useState(seg.type === 'speech' && seg.text === 'New spoken segment.');
  const [editText, setEditText] = useState(seg.text || '');
  const [editDirection, setEditDirection] = useState(seg.direction || '');
  const [showModal, setShowModal] = useState(false);
  const [editPause, setEditPause] = useState(seg.duration_seconds);
  const inputRef = useRef(null);
  const pauseRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  const countdownRef = useRef(null);

  // Restore countdown text when this segment stops playing
  useEffect(() => {
    if (playingId === seg.id) return;
    const el = countdownRef.current;
    if (!el) return;
    if (seg.type === 'pause') {
      const strVal = String(seg.duration_seconds);
      const varMatch = strVal.match(/^\{(\w+)\}$/);
      if (varMatch && variables[varMatch[1]] != null) {
        const varObj = variables[varMatch[1]];
        const rawVal = typeof varObj === 'object' ? varObj.value : varObj;
        const unit = typeof varObj === 'object' ? varObj.unit : undefined;
        el.textContent = unit === 'minutes' ? `${rawVal} min` : String(rawVal);
      } else {
        el.textContent = strVal;
      }
    } else if (seg.type === 'split_marker') {
      const dur = computeMarkerDuration(fullScript, seg.id, variables, components);
      if (dur != null) {
        const mult = seg.multiplier || 1;
        const totalDur = dur * mult;
        if (totalDur >= 60) {
          el.textContent = `${(totalDur / 60).toFixed(1).replace(/\.0$/, '')} min`;
        } else {
          el.textContent = String(Math.round(totalDur));
        }
      }
    }
  }, [playingId]);

  // --- Pragmatic DnD ---
  const elementRef = useRef(null);
  const handleRef = useRef(null);
  const [closestEdge, setClosestEdge] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || readOnly) return;

    return combine(
      draggable({
        element: el,
        dragHandle: selected ? undefined : (handleRef.current ?? undefined),
        getInitialData: () => ({ type: 'timeline-segment', id: seg.id }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => source.data.type === 'timeline-segment' && source.data.id !== seg.id,
        getData: ({ input, element }) => {
          return attachClosestEdge({ type: 'segment', id: seg.id }, {
            element,
            input,
            allowedEdges: ['top', 'bottom'],
          });
        },
        onDragEnter: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
        onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      }),
    );
  }, [seg.id, readOnly, selected]);

  const isBeingDragged = isDragging || (activeDragIds && activeDragIds.has(seg.id));

  const style = {
    opacity: isBeingDragged ? 0.3 : 1,
  };

  const isPlaying = seg.id === playingId && !isPaused;

  let icon, label, duration;

  if (seg.type === 'speech') {
    icon = '🤖';
    const hasVars = /\{\w+\}/.test(seg.text);
    if (editing) {
      label = (
        <textarea
          ref={inputRef}
          className="speech-text-input"
          value={editText}
          spellCheck={true}
          rows={Math.max(2, editText.split('\n').length)}
          onClick={e => e.stopPropagation()}
          onChange={e => setEditText(e.target.value)}
          onBlur={() => { setEditing(false); if (editText !== seg.text) onUpdate(seg.id, { text: editText }); }}
          onKeyDown={e => { if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) e.target.blur(); }}
        />
      );
    } else {
      const words = seg.text.split(' ').map((w, wi) => {
        const isVar = /\{\w+\}/.test(w);
        const parts = w.split('\n');
        return (
          <span
            key={wi}
            className={`word ${isVar ? 'var-ref' : ''}`}
            data-seg-id={seg.id}
            data-word={wi}
            onClick={e => { e.stopPropagation(); if (e.shiftKey) { multiSelectTo(seg.id); return; } if (e.metaKey || e.ctrlKey) { toggleSelectionInGroup(seg.id); return; } onWordClick(seg.id, wi); }}
            style={{ cursor: 'pointer' }}
          >{parts.length > 1 ? parts.map((p, pi) => <span key={pi}>{pi > 0 && <br />}{p}</span>) : w}{' '}</span>
        );
      });
      label = (
        <span className="text">
          {words}
          <span className="speech-edit-btn" onClick={e => { e.stopPropagation(); setEditText(seg.text); setEditing(true); }}>✎</span>
          <input
            className="direction-input"
            placeholder="Direction (e.g. slow, breathy, calm)"
            value={editDirection}
            onClick={e => e.stopPropagation()}
            onChange={e => setEditDirection(e.target.value)}
            onBlur={() => { if (editDirection !== (seg.direction || '')) onUpdate(seg.id, { direction: editDirection }); }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
          />
        </span>
      );
    }
    duration = null;
  } else if (seg.type === 'pause') {
    icon = '⏸';
    const strVal = String(editPause);
    const isVar = /\{\w+\}/.test(strVal);
    const isValid = isVar || (strVal !== '' && !isNaN(Number(strVal)));
    label = (
      <span>
        Pause:{' '}
        <input
          ref={pauseRef}
          className={`pause-input${!isValid ? ' pause-input-error' : ''}${isVar ? ' pause-input-var' : ''}`}
          type="text"
          value={editPause}
          onClick={e => e.stopPropagation()}
          onChange={e => setEditPause(e.target.value)}
          onBlur={() => { if (editPause !== seg.duration_seconds) onUpdate(seg.id, { duration_seconds: editPause }); }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        />
        {(() => {
          if (isVar) {
            const varName = strVal.match(/\{(\w+)\}/)[1];
            const varObj = variables[varName];
            if (varObj?.unit === 'minutes') return ' min';
          }
          return ' s';
        })()}
      </span>
    );
    if (isVar) {
      const varName = strVal.match(/\{(\w+)\}/)[1];
      const varObj = variables[varName];
      const rawVal = varObj?.value ?? varObj;
      const unit = varObj?.unit;
      if (unit === 'minutes') {
        duration = <span ref={countdownRef} className="countdown" data-seg-id={seg.id}>{rawVal} min</span>;
      } else {
        duration = <span ref={countdownRef} className="countdown" data-seg-id={seg.id}>{rawVal}</span>;
      }
    } else {
      duration = <span ref={countdownRef} className="countdown" data-seg-id={seg.id}>{strVal}</span>;
    }
  } else if (seg.type === 'asset') {
    icon = '🔊';
    const raw = seg.label || seg.file.replace(/[-_]/g, ' ').replace(/\.mp3$/, '');
    const displayName = raw.charAt(0).toUpperCase() + raw.slice(1) + '.';
    label = <span className="text">"{displayName}"</span>;
    duration = null;
  } else if (seg.type === 'split_marker') {
    icon = '◆';
    const mult = seg.multiplier || 1;
    label = (
      <span>
        Split Marker
        {' '}×{' '}
        <input
          className="split-mult-input"
          type="text"
          value={mult}
          onClick={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value;
            const n = Number(v);
            if (v === '' || (!isNaN(n) && n >= 1)) {
              onUpdate(seg.id, { multiplier: v === '' ? 1 : n });
            }
          }}
        />
      </span>
    );
    const perMarker = fullScript ? computeMarkerDuration(fullScript, seg.id, variables, components) : null;
    const totalDur = perMarker != null ? perMarker * mult : null;
    if (perMarker != null && perMarker < 0) {
      duration = <span className="split-marker-error">mismatch</span>;
    } else if (totalDur != null) {
      if (totalDur >= 60) {
        const mins = (totalDur / 60).toFixed(1).replace(/\.0$/, '');
        duration = <span ref={countdownRef} className="countdown" data-seg-id={seg.id}>{mins} min</span>;
      } else {
        duration = <span ref={countdownRef} className="countdown" data-seg-id={seg.id}>{Math.round(totalDur)}</span>;
      }
    } else {
      duration = <span className="split-auto-label">--</span>;
    }
  }

  // Read-only labels — show text without edit controls
  let readOnlyLabel;
  if (seg.type === 'speech') {
    const words = seg.text.split(' ').map((w, wi) => {
      const isVar = /\{\w+\}/.test(w);
      const parts = w.split('\n');
      return <span key={wi} className={`word ${isVar ? 'var-ref' : ''}`}>{parts.length > 1 ? parts.map((p, pi) => <span key={pi}>{pi > 0 && <br />}{p}</span>) : w}{' '}</span>;
    });
    readOnlyLabel = <span className="text">{words}</span>;
  } else if (seg.type === 'pause') {
    const strVal = String(seg.duration_seconds);
    const isVar = /\{\w+\}/.test(strVal);
    const unit = isVar ? (() => { const m = strVal.match(/\{(\w+)\}/); return m && variables[m[1]]?.unit === 'minutes' ? ' min' : ' s'; })() : ' s';
    readOnlyLabel = <span>Pause: {strVal}{unit}</span>;
  } else if (seg.type === 'split_marker') {
    readOnlyLabel = <span>Split Marker ×{seg.multiplier || 1}</span>;
  } else {
    readOnlyLabel = label;
  }

  return (
    <div
      ref={elementRef}
      style={style}
      className={`segment ${seg.type.replace('_', '-')}${isPlaying ? ' playing' : ''}${selected ? ' selected' : ''}${seg.type === 'speech' && !hasAudio ? ' no-audio' : ''}${isStale ? ' stale' : ''}${seg.type === 'speech' && /\{\w+\}/.test(seg.text) ? ' has-variables' : ''}${seg.condition && !evaluateCondition(seg.condition, variables) ? ' condition-excluded' : ''}`}
      onContextMenu={readOnly ? undefined : e => onContextMenu(e, seg.id)}
      onClick={e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('.kebab-wrapper')) return;
        if (e.shiftKey) { multiSelectTo(seg.id); return; }
        if (e.metaKey || e.ctrlKey) { toggleSelectionInGroup(seg.id); return; }
        toggleSelection(seg.id);
        if (seg.type === 'speech' && !hasAudio) return;
        if (seg.type === 'split_marker' && fullScript && computeMarkerDuration(fullScript, seg.id, variables, components) < 0) {
          alert('Cannot play — variable mismatch. The fixed content in this section exceeds the target duration. Increase the variable or remove segments.');
          return;
        }
        onPlay(seg.id);
      }}
    >
      {closestEdge && <DropIndicator edge={closestEdge} gap="3px" />}
      {!readOnly && <DragHandle ref={handleRef} />}
      <span className="seg-icon">{icon}</span>
      <span className="seg-label">{readOnly ? readOnlyLabel : label}</span>
      <span className="seg-duration">{duration}</span>
      {!readOnly && variables._conditions && Object.keys(variables._conditions).length > 0 && (
        <select className="seg-condition-select" value={seg.condition || ''}
          onClick={e => e.stopPropagation()}
          onChange={e => onUpdate(seg.id, { condition: e.target.value || undefined })}>
          <option value="">Always</option>
          {Object.entries(variables._conditions).map(([k]) => (
            <option key={k} value={k}>if {conditionLabel(k, variables._conditions, variables)}</option>
          ))}
        </select>
      )}
      <span className="seg-actions">
        {!insidePlayingParent && !(seg.type === 'speech' && !hasAudio) && (
          <button onClick={e => {
            e.stopPropagation();
            if (seg.type === 'split_marker' && fullScript && computeMarkerDuration(fullScript, seg.id, variables, components) < 0) {
              alert('Cannot play — variable mismatch. The fixed content in this section exceeds the target duration. Increase the variable or remove segments.');
              return;
            }
            onPlay(seg.id);
          }}>
            {isPlaying ? '⏸' : '▶'}
          </button>
        )}
        {!readOnly && <KebabMenu
          seg={seg}
          onDelete={onDelete}
          onInsert={(position, newSeg) => onInsert(seg.id, position, newSeg)}
          onManageRecording={(seg.type === 'speech' || seg.type === 'asset') ? () => setShowModal(true) : undefined}
        />}
      </span>
      {!readOnly && showModal && (
        seg.type === 'speech' && /\{\w+\}/.test(seg.text) ? (
          <VariableRecordingsModal
            seg={seg}
            meditationName={meditationName}
            stageId={stageId}
            variables={variables}
            onFlushSave={onFlushSave}
            onClose={() => setShowModal(false)}
            onDone={() => { clearTimestampCache(seg.id); if (onRefreshComponents) onRefreshComponents(); }}
          />
        ) : (
          <RecordingModal
            seg={seg}
            meditationName={meditationName}
            stageId={stageId}
            hasAudio={audioStatus !== 'missing'}
            audioStatus={audioStatus}
            variables={variables}
            onUpdateVariable={onUpdateVariable}
            onFlushSave={onFlushSave}
            onClose={() => setShowModal(false)}
            onDone={() => { clearTimestampCache(seg.id); if (onRefreshComponents) onRefreshComponents(); }}
          />
        )
      )}
    </div>
  );
}
