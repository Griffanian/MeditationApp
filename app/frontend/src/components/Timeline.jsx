import { useDroppable, useDndContext } from '@dnd-kit/core';
import SortableList from './SortableList';
import Segment from './Segment';
import Loop from './Loop';
import AddZone from './AddZone';

function BetweenDropZone({ id, disabled }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      className={`between-drop-zone${isOver && !disabled ? ' drop-over' : ''}`}
    />
  );
}

export default function Timeline({
  segments,
  playingId,
  isPaused,
  onPlay,
  onWordClick,
  onDelete,
  onUpdate,
  onInsert,
  components = {},
  variables = {},
  loopCounters = {},
  meditationName,
  stageId,
  onRefreshComponents,
  playingParentId,
  insidePlayingParent = false,
  onUpdateVariable,
  selectedIds = new Set(),
  onSelect,
  onContextMenu,
  fullScript,
  readOnly,
  containerId,
  onFlushSave,
}) {
  const ids = segments.map(seg => seg.id);
  const { active } = useDndContext();
  const activeId = active ? String(active.id) : null;

  return (
    <div className="timeline">
      <SortableList ids={ids}>
        {segments.map((seg, i) => {
          const isFirst = i === 0;
          const isLast = i === segments.length - 1;
          const prevId = i > 0 ? segments[i - 1].id : null;
          const nextId = i < segments.length - 1 ? segments[i + 1].id : null;
          const item = seg.type === 'loop' ? (
            <Loop
              key={seg.id}
              seg={seg}
              playingId={playingId}
              isPaused={isPaused}
              onPlay={onPlay}
              onWordClick={onWordClick}
              onDelete={onDelete}
              onInsert={onInsert}
              onUpdate={onUpdate}
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
              fullScript={fullScript}
              readOnly={readOnly}
              onFlushSave={onFlushSave}
            />
          ) : (
            <Segment
              key={seg.id}
              seg={seg}
              playingId={playingId}
              isPaused={isPaused}
              onPlay={onPlay}
              onWordClick={onWordClick}
              onDelete={() => onDelete(seg.id)}
              onInsert={onInsert}
              onUpdate={onUpdate}
              audioStatus={seg.type === 'asset' ? 'current' : (components[seg.id]?.status || components[seg.id] || 'missing')}
              meditationName={meditationName}
              stageId={stageId}
              onRefreshComponents={onRefreshComponents}
              insidePlayingParent={insidePlayingParent}
              variables={variables}
              onUpdateVariable={onUpdateVariable}
              selected={selectedIds.has(seg.id)}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              fullScript={fullScript}
              components={components}
              readOnly={readOnly}
              onFlushSave={onFlushSave}
              disableDropAbove={activeId === seg.id || activeId === prevId}
              disableDropBelow={activeId === seg.id || activeId === nextId}
            />
          );

          if (readOnly) return item;

          // before: disabled if dragging this item (can't drop above yourself)
          // after:  disabled if dragging this item or the next (no-op positions)
          const beforeDisabled = activeId === seg.id;
          const afterDisabled = activeId === seg.id || activeId === nextId;

          return (
            <div key={seg.id}>
              {isFirst && <BetweenDropZone id={`before:${seg.id}`} disabled={beforeDisabled} />}
              {item}
              {!isLast && <BetweenDropZone id={`after:${seg.id}`} disabled={afterDisabled} />}
            </div>
          );
        })}
      </SortableList>
      {!readOnly && (
        <AddZone onAdd={newSeg => onInsert(containerId, 'append', newSeg)} containerId={containerId} />
      )}
    </div>
  );
}
