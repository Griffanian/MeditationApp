import { useState } from 'react';
import KebabMenu from './KebabMenu';
import Timeline from './Timeline';

export default function Section({ title, segments, pathOffset, playingPath, isPaused, onPlay, onPlaySection, playingParent, onWordClick, onDelete, onUpdate, onInsert, components, meditationName, onRefreshComponents, onUpdateVariable, variables }) {
  const [collapsed, setCollapsed] = useState(false);

  const isSectionPlaying = playingParent === `section-${pathOffset}`;

  return (
    <div className="section">
      <div className="section-header" onClick={() => setCollapsed(!collapsed)}>
        <span className={`chevron ${collapsed ? 'collapsed' : ''}`}>▼</span>
        <span>{title}</span>
        <span className="seg-count">{segments.length} segments</span>
        <span style={{ marginLeft: 'auto' }} className="seg-actions" onClick={e => e.stopPropagation()}>
          <button onClick={() => onPlaySection(pathOffset, pathOffset + segments.length)}>
            {isSectionPlaying && !isPaused ? '⏸' : '▶'}
          </button>
          <KebabMenu
            onDelete={null}
            onInsert={(position, newSeg) => {
              const refPath = position === 'above' ? `${pathOffset}` : `${pathOffset + segments.length - 1}`;
              onInsert(refPath, position, newSeg);
            }}
          />
        </span>
      </div>
      {!collapsed && (
        <div className="section-body">
          <Timeline
            segments={segments}
            pathPrefix=""
            pathOffset={pathOffset}
            playingPath={playingPath}
            isPaused={isPaused}
            onPlay={onPlay}
            onWordClick={onWordClick}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onInsert={onInsert}
            components={components}
            meditationName={meditationName}
            onRefreshComponents={onRefreshComponents}
            playingParent={playingParent}
            onUpdateVariable={onUpdateVariable}
            variables={variables}
          />
        </div>
      )}
    </div>
  );
}
