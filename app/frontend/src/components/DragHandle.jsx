import { forwardRef } from 'react';

const DragHandle = forwardRef(function DragHandle(props, ref) {
  return (
    <span
      ref={ref}
      className="drag-handle"
      style={{ touchAction: 'none' }}
    >
      ⁞⁞
    </span>
  );
});

export default DragHandle;
