export default function DragHandle({ listeners, attributes }) {
  return (
    <span
      className="drag-handle"
      {...listeners}
      {...attributes}
      style={{ touchAction: 'none' }}
    >
      ⁞⁞
    </span>
  );
}
