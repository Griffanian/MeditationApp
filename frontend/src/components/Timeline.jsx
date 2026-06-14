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
  insidePlayingParent = false,
  onUpdateVariable,
  selectedIds = new Set(),
  onSelect,
  onContextMenu,
  fullScript,
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
                  fullScript={fullScript}
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
            />
          );
        })}
      </SortableList>
    </div>
  );
}
