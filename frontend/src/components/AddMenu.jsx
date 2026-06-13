import { useState, useRef, useEffect } from 'react';
import { generateId } from '../segmentIds';

const SEGMENT_TYPES = [
  { type: 'speech', icon: '🤖', label: 'Speech', default: { type: 'speech', text: 'New spoken segment.' } },
  { type: 'pause', icon: '⏸', label: 'Pause', default: { type: 'pause', duration_seconds: 5 } },
  { type: 'asset', icon: '🔊', label: 'Asset', default: { type: 'asset', file: 'and_out.mp3' } },
  { type: 'loop', icon: '↻', label: 'Loop', default: { type: 'loop', repeat: 3, segments: [] } },
  { type: 'section', icon: '▼', label: 'Section', default: { type: 'loop', repeat: 1, label: 'New Section', segments: [] } },
];

export default function AddMenu({ onAdd }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleSelect(segType) {
    const template = SEGMENT_TYPES.find(t => t.type === segType);
    if (!template) return;
    const newSeg = JSON.parse(JSON.stringify(template.default));
    newSeg.id = generateId();
    onAdd(newSeg);
    setOpen(false);
  }

  return (
    <div className="add-menu-wrapper" ref={menuRef}>
      <button className="btn-add" onClick={() => setOpen(!open)}>+ Add</button>
      {open && (
        <div className="kebab-dropdown">
          {SEGMENT_TYPES.map((t, i) => (
            <div key={t.type}>
              <div className="kebab-item" onClick={() => handleSelect(t.type)}>
                <span className="menu-icon">{t.icon}</span>{t.label}
              </div>
              {i < SEGMENT_TYPES.length - 1 && <div className="kebab-divider" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
