import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { generateId } from '../segmentIds';
import { SEGMENT_TYPES } from '../segmentDefs';

export default function AddZone({ onAdd, containerId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { setNodeRef, isOver } = useDroppable({ id: `dropzone:${containerId}`, disabled: !containerId });

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleSelect(template) {
    const newSeg = JSON.parse(JSON.stringify(template.default));
    newSeg.id = generateId();
    onAdd(newSeg);
    setOpen(false);
  }

  return (
    <div className="add-zone" ref={el => { ref.current = el; setNodeRef(el); }}>
      <div className={`add-zone-bar${isOver ? ' drop-over' : ''}`} onClick={() => setOpen(!open)}>+</div>
      {open && (
        <div className="add-zone-menu">
          {SEGMENT_TYPES.map(t => (
            <div key={t.type} className="add-zone-item" onClick={() => handleSelect(t)}>
              <span className="menu-icon">{t.icon}</span>{t.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
