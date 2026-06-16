import { useDroppable } from '@dnd-kit/core';

export default function DashDropZone({ id, isOver: parentIsOver, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const highlight = isOver && parentIsOver;

  return (
    <div ref={setNodeRef} className={highlight ? 'category-drop-active' : ''}>
      {children}
    </div>
  );
}
