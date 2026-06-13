import { useDroppable } from '@dnd-kit/core';
import SortableList from './SortableList';
import Segment from './Segment';
import Loop from './Loop';

function AfterDropZone({ id }) {
  const { setNodeRef, isOver } = useDroppable({ id: `after:${id}` });
  return (
    <div
      ref={setNodeRef}
      className={`after-drop-zone${isOver ? ' drop-over' : ''}`}
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
  onUpdateVariable,
  selectedIds = new Set(),
  onSelect,
  onContextMenu,
}) {
  const ids = segments.map(seg => seg.id);

  return (
    <div className="timeline">
      <SortableList ids={ids}>
        {segments.map(seg => {
          if (seg.type === 'loop') {
            return (
              <div key={seg.id}>
                <Loop
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
                />
                <AfterDropZone id={seg.id} />
              </div>
            );
          }

          return (
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
              audioStatus={seg.type === 'asset' ? 'current' : (components[seg.id] || 'missing')}
              meditationName={meditationName}
              stageId={stageId}
              onRefreshComponents={onRefreshComponents}
              insidePlayingParent={false}
              variables={variables}
              onUpdateVariable={onUpdateVariable}
              selected={selectedIds.has(seg.id)}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          );
        })}
      </SortableList>
    </div>
  );
}
