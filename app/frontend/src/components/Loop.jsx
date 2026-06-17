import { useState, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLocalState } from '../utils';
import { computeDurationRepeat, computeFixedDuration } from '../playback';
import DragHandle from './DragHandle';
import KebabMenu from './KebabMenu';
import Timeline from './Timeline';
import AddZone from './AddZone';

function formatDuration(seconds) {
  seconds = Math.round(seconds);
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

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

export default function Loop({ seg, playingId, isPaused, onPlay, onWordClick, onDelete, onInsert, onUpdate, components, meditationName, stageId, onRefreshComponents, playingParentId, variables = {}, loopCounters = {}, onUpdateVariable, selectedIds = new Set(), onSelect, onContextMenu, fullScript, readOnly }) {
  const [collapsed, setCollapsed] = useLocalState(`collapse:loop:${seg.id}`, true);
  const [editLabel, setEditLabel] = useState(seg.label || '');
  const [editRepeat, setEditRepeat] = useState(seg.variable ? `{${seg.variable}}` : seg.repeat);
  const [editTargetDuration, setEditTargetDuration] = useState(seg.targetDuration ?? '');

  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);

  // Sync local state when segment data changes
  useEffect(() => { setEditLabel(seg.label || ''); }, [seg.label]);
  useEffect(() => { setEditRepeat(seg.variable ? `{${seg.variable}}` : seg.repeat); }, [seg.variable, seg.repeat]);
  useEffect(() => { setEditTargetDuration(seg.targetDuration ?? ''); }, [seg.targetDuration]);

  const lc = loopCounters[seg.id];
  const isDurationLoop = seg.targetDuration != null && !seg.label;
  const isLoopPlaying = lc && lc.iterDuration != null && playingParentId === seg.id;

  // Tick every second while a loop is playing
  useEffect(() => {
    if (isLoopPlaying) {
      tickRef.current = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(tickRef.current);
    }
    if (tickRef.current) clearInterval(tickRef.current);
  }, [isLoopPlaying]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: seg.id });

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
        {!readOnly && <DragHandle listeners={listeners} attributes={attributes} />}
        <span
          className={`chevron ${collapsed ? 'collapsed' : ''}`}
          onClick={() => setCollapsed(!collapsed)}
        >
          ▼
        </span>
        {isSection ? (
          <span className="section-header-fields">
            {readOnly ? (
              <span className="section-label-input" style={{ cursor: 'default' }}>{seg.label}</span>
            ) : (
              <input
                className="section-label-input"
                type="text"
                value={editLabel}
                onClick={e => e.stopPropagation()}
                onChange={e => setEditLabel(e.target.value)}
                onBlur={() => { if (editLabel !== seg.label) onUpdate(seg.id, { label: editLabel }); }}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
              />
            )}
            {!readOnly && seg.targetDuration != null && (
              <span className="target-duration-field">
                <span className="target-duration-label">Target:</span>
                <input
                  className={`target-duration-input${(() => {
                    const v = String(editTargetDuration);
                    const isVar = /\{\w+\}/.test(v);
                    const isValid = isVar || (v !== '' && !isNaN(Number(v)));
                    return (!isValid ? ' pause-input-error' : '') + (isVar ? ' pause-input-var' : '');
                  })()}`}
                  type="text"
                  value={editTargetDuration}
                  onClick={e => e.stopPropagation()}
                  onChange={e => setEditTargetDuration(e.target.value)}
                  onBlur={() => {
                    const v = String(editTargetDuration);
                    if (v !== String(seg.targetDuration)) {
                      onUpdate(seg.id, { targetDuration: v === '' ? undefined : v });
                    }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                />
                <span className="target-duration-unit">s</span>
                <button
                  className="target-duration-remove"
                  onClick={e => { e.stopPropagation(); onUpdate(seg.id, { targetDuration: undefined }); }}
                >✕</button>
              </span>
            )}
            {!readOnly && seg.targetDuration == null && (
              <button
                className="target-duration-add"
                onClick={e => { e.stopPropagation(); onUpdate(seg.id, { targetDuration: '300' }); }}
              >+ Target</button>
            )}
            {readOnly && seg.targetDuration != null && (
              <span className="target-duration-field">
                <span className="target-duration-label">Target:</span>
                <span className="target-duration-input" style={{ border: 'none' }}>{seg.targetDuration}</span>
                <span className="target-duration-unit">s</span>
              </span>
            )}
          </span>
        ) : (
          <span className="loop-mode-fields">
            ↻{' '}
            {readOnly ? (
              seg.targetDuration != null
                ? <span>Loops for <span style={{ fontWeight: 600 }}>{editTargetDuration}</span> {{ seconds: 's', minutes: 'min', hours: 'hr' }[seg.targetDurationUnit] || 's'}</span>
                : <span>Loops <span style={{ fontWeight: 600 }}>{editRepeat}</span> times</span>
            ) : (
              <>
                <select
                  className="loop-mode-select"
                  value={seg.targetDuration != null ? 'duration' : 'times'}
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    if (e.target.value === 'duration') {
                      onUpdate(seg.id, { targetDuration: '60' });
                    } else {
                      onUpdate(seg.id, { targetDuration: undefined, repeat: seg.repeat || 3 });
                    }
                  }}
                >
                  <option value="times">times</option>
                  <option value="duration">for duration</option>
                </select>
                {seg.targetDuration != null ? (
                  <>
                    <input
                      className={`target-duration-input${(() => {
                        const v = String(editTargetDuration);
                        const isVar = /\{\w+\}/.test(v);
                        const isValid = isVar || (v !== '' && !isNaN(Number(v)));
                        return (!isValid ? ' pause-input-error' : '') + (isVar ? ' pause-input-var' : '');
                      })()}`}
                      type="text"
                      value={editTargetDuration}
                      onClick={e => e.stopPropagation()}
                      onChange={e => setEditTargetDuration(e.target.value)}
                      onBlur={() => {
                        const v = String(editTargetDuration);
                        if (v !== String(seg.targetDuration)) {
                          onUpdate(seg.id, { targetDuration: v === '' ? undefined : v });
                        }
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                    />
                    {!/\{\w+\}/.test(String(editTargetDuration)) ? (
                      <select
                        className="loop-mode-select"
                        value={seg.targetDurationUnit || 'seconds'}
                        onClick={e => e.stopPropagation()}
                        onChange={e => onUpdate(seg.id, { targetDurationUnit: e.target.value })}
                      >
                        <option value="seconds">s</option>
                        <option value="minutes">min</option>
                        <option value="hours">hr</option>
                      </select>
                    ) : (
                      <span className="target-duration-unit">({(() => {
                        const varMatch = String(editTargetDuration).match(/^\{(\w+)\}$/);
                        const varUnit = varMatch && variables[varMatch[1]] && typeof variables[varMatch[1]] === 'object'
                          ? variables[varMatch[1]].unit : null;
                        return varUnit || 'var';
                      })()})</span>
                    )}
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </>
            )}
          </span>
        )}
        <span className="seg-count">{seg.segments.length} segments</span>
        <span style={{ marginLeft: 'auto' }} className="seg-actions">
          {!isSection && (
            <span className="loop-counter">
              {(() => {
                if (lc && lc.iterDuration != null && isPlayingParent) {
                  // Live countdown while playing
                  const { current, total, iterDuration, startTime, loopStartTime } = lc;
                  const elapsed = (now - startTime) / 1000;
                  const iterRemaining = Math.max(0, Math.round(iterDuration - elapsed));
                  const totalElapsed = (now - loopStartTime) / 1000;
                  const totalTime = total * iterDuration;
                  const totalRemaining = Math.max(0, Math.round(totalTime - totalElapsed));
                  return <>Round {current}/{total}<span className="loop-counter-sep">|</span>{formatDuration(iterRemaining)}<span className="loop-counter-sep">|</span>{formatDuration(totalRemaining)}</>;
                }
                // Static display
                const iterDur = computeFixedDuration(seg.segments, variables, components);
                if (isDurationLoop) {
                  const repeat = computeDurationRepeat(seg, variables, components);
                  return <>{repeat} rounds × {formatDuration(iterDur)}<span className="loop-counter-sep">|</span>{formatDuration(repeat * iterDur)}</>;
                }
                const varName = seg.variable;
                const repeat = varName && variables[varName] != null
                  ? (typeof variables[varName] === 'object' ? variables[varName].value : variables[varName])
                  : seg.repeat;
                const n = Number(repeat) || 0;
                if (iterDur > 0) {
                  return <>{n} rounds × {formatDuration(iterDur)}<span className="loop-counter-sep">|</span>{formatDuration(n * iterDur)}</>;
                }
                return n;
              })()}
            </span>
          )}
          <button onClick={e => { e.stopPropagation(); onPlay(seg.id, true); }}>
            {isPlayingParent && !isPaused ? '⏸' : '▶'}
          </button>
          {!readOnly && <KebabMenu
            seg={seg}
            onDelete={() => onDelete(seg.id)}
            onInsert={(position, newSeg) => onInsert(seg.id, position, newSeg)}
            onColor={color => onUpdate(seg.id, { color })}
          />}
        </span>
      </div>
      {!readOnly && collapsed && dropHighlight && (
        <div className="after-drop-zone drop-over" />
      )}
      {!collapsed && (
        <div className="loop-bracket">
          {seg.segments.length === 0 ? (
            readOnly ? null : (
              <AddZone onAdd={newSeg => onInsert(seg.id, 'append', newSeg)} />
            )
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
                insidePlayingParent={isPlayingParent}
                variables={variables}
                loopCounters={loopCounters}
                onUpdateVariable={onUpdateVariable}
                selectedIds={selectedIds}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                fullScript={fullScript}
                readOnly={readOnly}
                containerId={seg.id}
              />
              {!readOnly && <BottomDropZone id={seg.id} forceHighlight={dropHighlight} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
