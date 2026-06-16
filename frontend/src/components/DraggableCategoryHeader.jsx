import { useDraggable } from '@dnd-kit/core';

export default function DraggableCategoryHeader({ catName, disabled, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `section:${catName}`,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={`category-header-row${isDragging ? ' category-header-dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
