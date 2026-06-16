import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragHandle from './DragHandle';
import KebabMenu from './KebabMenu';
import RecordingModal from './RecordingModal';
import { clearTimestampCache, computeMarkerDuration, resolveVar } from '../playback';

export default function Segment({ seg, playingId, isPaused, onPlay, onWordClick, onDelete, onInsert, onUpdate, audioStatus = 'missing', meditationName, stageId, onRefreshComponents, insidePlayingParent, variables = {}, onUpdateVariable, selected, onSelect, onContextMenu, fullScript, components = {}, readOnly }) {
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

  // Restore countdown text when this segment stops playing
  useEffect(() => {
    if (playingId === seg.id) return;
    const el = document.querySelector(`.countdown[data-seg-id="${seg.id}"]`);
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

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: seg.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'none',
    opacity: isDragging ? 0.3 : 1,
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
            onClick={e => { e.stopPropagation(); if (e.shiftKey) { onSelect(seg.id, true); return; } onWordClick(seg.id, wi); }}
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
        duration = <span className="countdown" data-seg-id={seg.id}>{rawVal} min</span>;
      } else {
        duration = <span className="countdown" data-seg-id={seg.id}>{rawVal}</span>;
      }
    } else {
      duration = <span className="countdown" data-seg-id={seg.id}>{strVal}</span>;
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
    if (totalDur != null) {
      if (totalDur >= 60) {
        const mins = (totalDur / 60).toFixed(1).replace(/\.0$/, '');
        duration = <span className="countdown" data-seg-id={seg.id}>{mins} min</span>;
      } else {
        duration = <span className="countdown" data-seg-id={seg.id}>{Math.round(totalDur)}</span>;
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
      ref={setNodeRef}
      style={style}
      className={`segment ${seg.type.replace('_', '-')}${isPlaying ? ' playing' : ''}${selected ? ' selected' : ''}${isOver && !isDragging ? ' drag-over' : ''}${seg.type === 'speech' && !hasAudio ? ' no-audio' : ''}${isStale ? ' stale' : ''}${seg.type === 'speech' && /\{\w+\}/.test(seg.text) ? ' has-variables' : ''}`}
      onContextMenu={readOnly ? undefined : e => onContextMenu(e, seg.id)}
      onClick={e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('.kebab-wrapper')) return;
        if (e.shiftKey) { onSelect(seg.id, true); return; }
        onSelect(seg.id, false);
        if (seg.type === 'speech' && !hasAudio) return;
        onPlay(seg.id);
      }}
    >
      {!readOnly && <DragHandle listeners={listeners} attributes={attributes} />}
      <span className="seg-icon">{icon}</span>
      <span className="seg-label">{readOnly ? readOnlyLabel : label}</span>
      <span className="seg-duration">{duration}</span>
      <span className="seg-actions">
        {!insidePlayingParent && !(seg.type === 'speech' && !hasAudio) && (
          <button onClick={e => { e.stopPropagation(); onPlay(seg.id); }}>
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
        <RecordingModal
          seg={seg}
          meditationName={meditationName}
          stageId={stageId}
          hasAudio={audioStatus !== 'missing'}
          audioStatus={audioStatus}
          variables={variables}
          onUpdateVariable={onUpdateVariable}
          onClose={() => setShowModal(false)}
          onDone={() => { clearTimestampCache(seg.id); if (onRefreshComponents) onRefreshComponents(); }}
        />
      )}
    </div>
  );
}
