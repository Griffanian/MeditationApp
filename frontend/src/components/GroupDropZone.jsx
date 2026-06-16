import { useDroppable } from '@dnd-kit/core';

export default function GroupDropZone({ groupName, active, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${groupName}` });
  // Only highlight when dragging a category section, not a med card
  const highlight = isOver && active && String(active).startsWith('section:');

  return (
    <div ref={setNodeRef} className={highlight ? 'group-drop-active' : ''}>
      {children}
    </div>
  );
}
