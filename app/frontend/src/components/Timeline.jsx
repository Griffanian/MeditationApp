import Segment from './Segment';
import Section from './Section';
import AddZone from './AddZone';

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
  toggleSelection,
  toggleSelectionInGroup,
  multiSelectTo,
  onContextMenu,
  fullScript,
  readOnly,
  containerId,
  onFlushSave,
  activeDragIds,
}) {
  return (
    <div className="timeline">
      {segments.map((seg) => {
        return seg.type === 'loop' ? (
          <Section
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
            toggleSelection={toggleSelection}
            toggleSelectionInGroup={toggleSelectionInGroup}
            multiSelectTo={multiSelectTo}
            onContextMenu={onContextMenu}
            fullScript={fullScript}
            readOnly={readOnly}
            onFlushSave={onFlushSave}
            activeDragIds={activeDragIds}
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
            toggleSelection={toggleSelection}
            toggleSelectionInGroup={toggleSelectionInGroup}
            multiSelectTo={multiSelectTo}
            onContextMenu={onContextMenu}
            fullScript={fullScript}
            components={components}
            readOnly={readOnly}
            onFlushSave={onFlushSave}
            activeDragIds={activeDragIds}
          />
        );
      })}
      {!readOnly && (
        <AddZone onAdd={newSeg => onInsert(containerId, 'append', newSeg)} containerId={containerId} />
      )}
    </div>
  );
}
