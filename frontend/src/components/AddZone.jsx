import { useState, useRef, useEffect } from 'react';
import { generateId } from '../segmentIds';

const SEGMENT_TYPES = [
  { type: 'speech', icon: '🤖', label: 'Speech', default: { type: 'speech', text: 'New spoken segment.' } },
  { type: 'pause', icon: '⏸', label: 'Pause', default: { type: 'pause', duration_seconds: 5 } },
  { type: 'asset', icon: '🔊', label: 'Asset', default: { type: 'asset', file: 'and_out.mp3' } },
  { type: 'loop', icon: '↻', label: 'Loop', default: { type: 'loop', repeat: 3, segments: [] } },
  { type: 'section', icon: '▼', label: 'Section', default: { type: 'loop', repeat: 1, label: 'New Section', segments: [] } },
  { type: 'split_marker', icon: '◆', label: 'Split Marker', default: { type: 'split_marker' } },
];

export default function AddZone({ onAdd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
    <div className="add-zone" ref={ref}>
      <div className="add-zone-bar" onClick={() => setOpen(!open)}>+</div>
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
