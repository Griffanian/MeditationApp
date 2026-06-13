import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragHandle from './DragHandle';
import KebabMenu from './KebabMenu';
import Timeline from './Timeline';

const COLOR_THEMES = {
  green:  { bg: '#1e3a2f', hover: '#264a3a', accent: '#7ecba1' },
  blue:   { bg: '#2a2a4a', hover: '#333355', accent: '#a0c4ff' },
  red:    { bg: '#3a1e1e', hover: '#4a2626', accent: '#ff8a8a' },
  orange: { bg: '#3a2e1e', hover: '#4a3826', accent: '#ffb366' },
  yellow: { bg: '#3a361e', hover: '#4a4426', accent: '#ffd966' },
  purple: { bg: '#2e1e3a', hover: '#382646', accent: '#c4a0ff' },
  pink:   { bg: '#3a1e2e', hover: '#4a2638', accent: '#ff99cc' },
  teal:   { bg: '#1e3a3a', hover: '#264a4a', accent: '#66cccc' },
};

function EmptyDropZone({ id, forceHighlight }) {
  const { setNodeRef, isOver } = useDroppable({ id: `dropzone:${id}` });
  return (
    <div
      ref={setNodeRef}
      className={`empty-drop-zone${isOver || forceHighlight ? ' drop-over' : ''}`}
    >
      Drop segments here
    </div>
  );
}

function BottomDropZone({ id, forceHighlight }) {
  const { setNodeRef, isOver } = useDroppable({ id: `dropzone:${id}` });
  return (
    <div
      ref={setNodeRef}
      className={`after-drop-zone${isOver || forceHighlight ? ' drop-over' : ''}`}
    />
  );
}

export default function Loop({ seg, playingId, isPaused, onPlay, onWordClick, onDelete, onInsert, onUpdate, components, meditationName, stageId, onRefreshComponents, playingParentId, variables = {}, loopCounters = {}, onUpdateVariable, selectedIds = new Set(), onSelect, onContextMenu }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editLabel, setEditLabel] = useState(seg.label || '');
  const [editRepeat, setEditRepeat] = useState(seg.variable ? `{${seg.variable}}` : seg.repeat);

  // Sync local state when segment data changes
  useEffect(() => { setEditLabel(seg.label || ''); }, [seg.label]);
  useEffect(() => { setEditRepeat(seg.variable ? `{${seg.variable}}` : seg.repeat); }, [seg.variable, seg.repeat]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: seg.id });

  const isPlaying = playingId && playingId === seg.id;
  const isPlayingParent = playingParentId === seg.id;
  const isSection = !!seg.label;

  const defaultColor = isSection ? 'green' : 'blue';
  const theme = COLOR_THEMES[seg.color || defaultColor] || COLOR_THEMES[defaultColor];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'none',
    opacity: isDragging ? 0.3 : 1,
    '--loop-bg': theme.bg,
    '--loop-hover': theme.hover,
    '--loop-accent': theme.accent,
  };

  const dropHighlight = isOver && !isDragging;

  return (
    <div ref={setNodeRef} style={style} className={isSection ? 'section-container' : 'loop-container'}>
      <div className={isSection ? 'section-header' : 'loop-header'}>
        <DragHandle listeners={listeners} attributes={attributes} />
        <span
          className={`chevron ${collapsed ? 'collapsed' : ''}`}
          onClick={() => setCollapsed(!collapsed)}
        >
          ▼
        </span>
        {isSection ? (
          <span>
            <input
              className="section-label-input"
              type="text"
              value={editLabel}
              onClick={e => e.stopPropagation()}
              onChange={e => setEditLabel(e.target.value)}
              onBlur={() => { if (editLabel !== seg.label) onUpdate(seg.id, { label: editLabel }); }}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
            />
          </span>
        ) : (
          <span>
            ↻ Loops{' '}
            <input
              className={`pause-input${(() => {
                const v = String(editRepeat);
                const isVar = /\{\w+\}/.test(v);
                const isValid = isVar || (v !== '' && !isNaN(Number(v)));
                return (!isValid ? ' pause-input-error' : '') + (isVar ? ' pause-input-var' : '');
              })()}`}
              type="text"
              value={editRepeat}
              onClick={e => e.stopPropagation()}
              onChange={e => setEditRepeat(e.target.value)}
              onBlur={() => {
                const v = String(editRepeat);
                const varMatch = v.match(/^\{(\w+)\}$/);
                if (varMatch) {
                  onUpdate(seg.id, { variable: varMatch[1], repeat: undefined });
                } else {
                  onUpdate(seg.id, { variable: undefined, repeat: v });
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
            />
            {' '}times
          </span>
        )}
        <span className="seg-count">{seg.segments.length} segments</span>
        <span style={{ marginLeft: 'auto' }} className="seg-actions">
          {!isSection && (
            <span className="loop-counter">
              {loopCounters[seg.id]
                ? loopCounters[seg.id].total - loopCounters[seg.id].current
                : (() => {
                    const varName = seg.variable;
                    const val = varName && variables[varName] != null
                      ? (typeof variables[varName] === 'object' ? variables[varName].value : variables[varName])
                      : seg.repeat;
                    return Number(val) || 0;
                  })()
              }
            </span>
          )}
          <button onClick={e => { e.stopPropagation(); onPlay(seg.id, true); }}>
            {isPlayingParent && !isPaused ? '⏸' : '▶'}
          </button>
          <KebabMenu
            seg={seg}
            onDelete={() => onDelete(seg.id)}
            onInsert={(position, newSeg) => onInsert(seg.id, position, newSeg)}
            onColor={color => onUpdate(seg.id, { color })}
          />
        </span>
      </div>
      {collapsed && dropHighlight && (
        <div className="after-drop-zone drop-over" />
      )}
      {!collapsed && (
        <div className="loop-bracket">
          {seg.segments.length === 0 ? (
            <EmptyDropZone id={seg.id} forceHighlight={dropHighlight} />
          ) : (
            <>
              <Timeline
                segments={seg.segments}
                playingId={playingId}
                isPaused={isPaused}
                onPlay={onPlay}
                onWordClick={onWordClick}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onInsert={onInsert}
                components={components}
                meditationName={meditationName}
                stageId={stageId}
                onRefreshComponents={onRefreshComponents}
                playingParentId={playingParentId}
                variables={variables}
                loopCounters={loopCounters}
                onUpdateVariable={onUpdateVariable}
                selectedIds={selectedIds}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
              />
              <BottomDropZone id={seg.id} forceHighlight={dropHighlight} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
