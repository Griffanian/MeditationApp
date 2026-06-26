import { useState, useEffect, useRef } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachInstruction, extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item';
import { useLocalState } from '../utils';
import { resolveRepeat, computeFixedDuration, formatDuration, computeMarkerDuration } from '../playback';
import { isDescendantOf } from '../segmentIds';
import DragHandle from './DragHandle';
import KebabMenu from './KebabMenu';
import Timeline from './Timeline';
import AddZone from './AddZone';

export default function Section({ seg, playingId, isPaused, onPlay, onWordClick, onDelete, onInsert, onUpdate, components, meditationName, stageId, onRefreshComponents, playingParentId, variables = {}, loopCounters = {}, onUpdateVariable, selectedIds = new Set(), toggleSelection, toggleSelectionInGroup, multiSelectTo, onContextMenu, fullScript, readOnly, onFlushSave, activeDragIds }) {
  const [collapsed, setCollapsed] = useLocalState(`collapse:loop:${seg.id}`, false);
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
  const isLoopPlaying = lc && lc.iterDuration != null;

  // Tick every second while a loop is playing
  useEffect(() => {
    if (isLoopPlaying) {
      tickRef.current = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(tickRef.current);
    }
    if (tickRef.current) clearInterval(tickRef.current);
  }, [isLoopPlaying]);

  // --- Pragmatic DnD ---
  const elementRef = useRef(null);
  const handleRef = useRef(null);
  const [instruction, setInstruction] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || readOnly) return;

    return combine(
      draggable({
        element: el,
        dragHandle: handleRef.current ?? undefined,
        getInitialData: () => ({ type: 'timeline-segment', id: seg.id }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => {
          if (source.data.type !== 'timeline-segment') return false;
          if (source.data.id === seg.id) return false;
          // Prevent dropping a parent into its own descendant
          if (isDescendantOf(fullScript, source.data.id, seg.id)) return false;
          return true;
        },
        getData: ({ input, element }) => {
          return attachInstruction({ type: 'section', id: seg.id }, {
            element,
            input,
            currentLevel: 0,
            indentPerLevel: 24,
            mode: collapsed ? 'standard' : 'expanded',
            block: ['make-child'],
          });
        },
        onDragEnter: ({ self, location }) => {
          const [innermost] = location.current.dropTargets;
          if (innermost?.element !== self.element) { setInstruction(null); return; }
          const inst = extractInstruction(self.data);
          setInstruction(inst?.type === 'instruction-blocked' ? null : inst);
        },
        onDrag: ({ self, location }) => {
          const [innermost] = location.current.dropTargets;
          if (innermost?.element !== self.element) { setInstruction(null); return; }
          const inst = extractInstruction(self.data);
          setInstruction(inst?.type === 'instruction-blocked' ? null : inst);
        },
        onDragLeave: () => setInstruction(null),
        onDrop: () => setInstruction(null),
      }),
    );
  }, [seg.id, readOnly, collapsed, fullScript]);

  const isBeingDragged = isDragging || (activeDragIds && activeDragIds.has(seg.id));
  const instructionType = instruction?.type;

  const isPlayingParent = playingParentId === seg.id;
  const isSection = !!seg.label;

  const defaultColor = isSection ? 'green' : 'blue';
  const colorKey = seg.color || defaultColor;

  const style = {
    opacity: isBeingDragged ? 0.3 : 1,
    '--loop-bg': `var(--loop-${colorKey}-bg)`,
    '--loop-hover': `var(--loop-${colorKey}-hover)`,
    '--loop-accent': `var(--loop-${colorKey}-accent)`,
  };

  return (
    <div ref={elementRef} style={style} className={isSection ? 'section-container' : 'loop-container'}>
      {instruction && <DropIndicator instruction={instruction} />}
      <div className={isSection ? 'section-header' : 'loop-header'}>
        {!readOnly && <DragHandle ref={handleRef} />}
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
                if (isLoopPlaying) {
                  const { current, total, iterDuration, startTime, loopStartTime } = lc;
                  const elapsed = (now - startTime) / 1000;
                  const iterRemaining = Math.max(0, Math.round(iterDuration - elapsed));
                  const totalElapsed = (now - loopStartTime) / 1000;
                  const totalTime = total * iterDuration;
                  const totalRemaining = Math.max(0, Math.round(totalTime - totalElapsed));
                  return <>Round {current}/{total}<span className="loop-counter-sep">|</span>{formatDuration(iterRemaining)}<span className="loop-counter-sep">|</span>{formatDuration(totalRemaining)}</>;
                }
                const iterDur = computeFixedDuration(seg.segments, variables, components);
                const repeat = resolveRepeat(seg, variables, components);
                if (iterDur > 0) {
                  return <>{repeat} rounds × {formatDuration(iterDur)}<span className="loop-counter-sep">|</span>{formatDuration(repeat * iterDur)}</>;
                }
                return repeat;
              })()}
            </span>
          )}
          <button onClick={e => {
            e.stopPropagation();
            // Check for mismatch in any split marker in this section
            const hasMismatch = (function checkMarkers(segs) {
              for (const s of segs) {
                if (s.type === 'split_marker' && fullScript && computeMarkerDuration(fullScript, s.id, variables, components) < 0) return true;
                if (s.type === 'loop' && s.segments && checkMarkers(s.segments)) return true;
              }
              return false;
            })(seg.segments || []);
            if (hasMismatch) {
              alert('Cannot play — variable mismatch. The fixed content in this section exceeds the target duration. Increase the variable or remove segments.');
              return;
            }
            onPlay(seg.id, true);
          }}>
            {(isPlayingParent || isLoopPlaying) && !isPaused ? '⏸' : '▶'}
          </button>
          {!readOnly && <KebabMenu
            seg={seg}
            onDelete={() => onDelete(seg.id)}
            onInsert={(position, newSeg) => onInsert(seg.id, position, newSeg)}
            onColor={color => onUpdate(seg.id, { color })}
          />}
        </span>
      </div>
      {!collapsed && (
        <div className="loop-bracket">
          {seg.segments.length === 0 ? (
            readOnly ? null : (
              <AddZone onAdd={newSeg => onInsert(seg.id, 'append', newSeg)} containerId={seg.id} />
            )
          ) : (
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
              toggleSelection={toggleSelection}
              toggleSelectionInGroup={toggleSelectionInGroup}
              multiSelectTo={multiSelectTo}
              onContextMenu={onContextMenu}
              fullScript={fullScript}
              readOnly={readOnly}
              containerId={seg.id}
              onFlushSave={onFlushSave}
              activeDragIds={activeDragIds}
            />
          )}
        </div>
      )}
    </div>
  );
}
