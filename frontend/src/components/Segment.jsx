import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragHandle from './DragHandle';
import KebabMenu from './KebabMenu';
import RecordingModal from './RecordingModal';
import { clearTimestampCache } from '../playback';

export default function Segment({ seg, playingId, isPaused, onPlay, onWordClick, onDelete, onInsert, onUpdate, audioStatus = 'missing', meditationName, stageId, onRefreshComponents, insidePlayingParent, variables = {}, onUpdateVariable, selected, onSelect, onContextMenu }) {
  const hasAudio = audioStatus === 'current';
  const isStale = audioStatus === 'stale';
  const [editing, setEditing] = useState(seg.type === 'speech' && seg.text === 'New spoken segment.');
  const [editText, setEditText] = useState(seg.text || '');
  const [showModal, setShowModal] = useState(false);
  const [editPause, setEditPause] = useState(seg.duration_seconds);
  const inputRef = useRef(null);
  const pauseRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

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
        <input
          ref={inputRef}
          className="speech-text-input"
          value={editText}
          onClick={e => e.stopPropagation()}
          onChange={e => setEditText(e.target.value)}
          onBlur={() => { setEditing(false); if (editText !== seg.text) onUpdate(seg.id, { text: editText }); }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        />
      );
    } else {
      const words = seg.text.split(' ').map((w, wi) => {
        const isVar = /\{\w+\}/.test(w);
        return (
          <span
            key={wi}
            className={`word ${isVar ? 'var-ref' : ''}`}
            data-seg-id={seg.id}
            data-word={wi}
            onClick={e => { e.stopPropagation(); if (e.shiftKey) { onSelect(seg.id, true); return; } onWordClick(seg.id, wi); }}
            style={{ cursor: 'pointer' }}
          >{w} </span>
        );
      });
      label = (
        <span className="text">
          {words}
          <span className="speech-edit-btn" onClick={e => { e.stopPropagation(); setEditText(seg.text); setEditing(true); }}>✎</span>
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
        s
      </span>
    );
    let resolvedDur = strVal;
    if (isVar) {
      const varName = strVal.match(/\{(\w+)\}/)[1];
      if (variables[varName]) resolvedDur = String(variables[varName].value ?? variables[varName]);
    }
    duration = <span className="countdown" data-seg-id={seg.id}>{resolvedDur}</span>;
  } else if (seg.type === 'asset') {
    icon = '🔊';
    const raw = seg.label || seg.file.replace(/[-_]/g, ' ').replace(/\.mp3$/, '');
    const displayName = raw.charAt(0).toUpperCase() + raw.slice(1) + '.';
    label = <span className="text">"{displayName}"</span>;
    duration = null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`segment ${seg.type}${isPlaying ? ' playing' : ''}${selected ? ' selected' : ''}${isOver && !isDragging ? ' drag-over' : ''}${seg.type === 'speech' && !hasAudio ? ' no-audio' : ''}${isStale ? ' stale' : ''}${seg.type === 'speech' && /\{\w+\}/.test(seg.text) ? ' has-variables' : ''}`}
      onContextMenu={e => onContextMenu(e, seg.id)}
      onClick={e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.kebab-wrapper')) return;
        if (e.shiftKey) { onSelect(seg.id, true); return; }
        onSelect(seg.id, false);
        if (seg.type === 'speech' && !hasAudio) return;
        onPlay(seg.id);
      }}
    >
      <DragHandle listeners={listeners} attributes={attributes} />
      <span className="seg-icon">{icon}</span>
      <span className="seg-label">{label}</span>
      <span className="seg-duration">{duration}</span>
      <span className="seg-actions">
        {!insidePlayingParent && !(seg.type === 'speech' && !hasAudio) && (
          <button onClick={e => { e.stopPropagation(); onPlay(seg.id); }}>
            {isPlaying ? '⏸' : '▶'}
          </button>
        )}
        <KebabMenu
          seg={seg}
          onDelete={onDelete}
          onInsert={(position, newSeg) => onInsert(seg.id, position, newSeg)}
          onManageRecording={(seg.type === 'speech' || seg.type === 'asset') ? () => setShowModal(true) : undefined}
        />
      </span>
      {showModal && (
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
