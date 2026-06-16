import { useDraggable } from '@dnd-kit/core';

export default function DashCard({ med, isAdmin, isDragging, children }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `med:${med.name}`,
    disabled: !isAdmin,
  });

  return (
    <div
      ref={setNodeRef}
      className={`med-card${isDragging ? ' med-card-dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
