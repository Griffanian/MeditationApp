import { useState, useRef, useEffect } from 'react';
import { getClipboard, setClipboard } from '../clipboard';
import { generateId, cloneWithNewIds } from '../segmentIds';

const COLOR_SWATCHES = [
  { key: 'green',  color: '#7ecba1' },
  { key: 'blue',   color: '#a0c4ff' },
  { key: 'red',    color: '#ff8a8a' },
  { key: 'orange', color: '#ffb366' },
  { key: 'yellow', color: '#ffd966' },
  { key: 'purple', color: '#c4a0ff' },
  { key: 'pink',   color: '#ff99cc' },
  { key: 'teal',   color: '#66cccc' },
];

const SEGMENT_TYPES = [
  { type: 'speech', icon: '🤖', label: 'Speech', default: { type: 'speech', text: 'New spoken segment.' } },
  { type: 'pause', icon: '⏸', label: 'Pause', default: { type: 'pause', duration_seconds: 5 } },
  { type: 'asset', icon: '🔊', label: 'Asset', default: { type: 'asset', file: 'and_out.mp3' } },
  { type: 'loop', icon: '↻', label: 'Loop', default: { type: 'loop', repeat: 3, segments: [] } },
  { type: 'section', icon: '▼', label: 'Section', default: { type: 'loop', repeat: 1, label: 'New Section', segments: [] } },
  { type: 'split_marker', icon: '◆', label: 'Split Marker', default: { type: 'split_marker' } },
];

function SubmenuItems({ position, onInsert }) {
  return (
    <div className="kebab-flyout">
      {SEGMENT_TYPES.map((t, i) => (
        <div key={t.type}>
          <div className="kebab-item" onClick={e => { e.stopPropagation(); onInsert(position, t.type); }}>
            <span className="menu-icon">{t.icon}</span>{t.label}
          </div>
          {i < SEGMENT_TYPES.length - 1 && <div className="kebab-divider" />}
        </div>
      ))}
    </div>
  );
}

export default function KebabMenu({ seg, onDelete, onInsert, onManageRecording, onColor }) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState(null);
  const [flipDown, setFlipDown] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const leaveTimer = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setSubmenu(null);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleInsert(position, segType) {
    const template = SEGMENT_TYPES.find(t => t.type === segType);
    if (!template) return;
    const newSeg = JSON.parse(JSON.stringify(template.default));
    newSeg.id = generateId();
    onInsert(position, newSeg);
    setOpen(false);
    setSubmenu(null);
  }

  function handleCopy(e) {
    e.stopPropagation();
    setClipboard([JSON.parse(JSON.stringify(seg))]);
    setOpen(false);
    setSubmenu(null);
  }

  function handlePaste(position) {
    const cb = getClipboard();
    if (!cb || cb.length === 0) return;
    const segs = cloneWithNewIds(cb);
    if (position === 'above') {
      for (let i = segs.length - 1; i >= 0; i--) onInsert(position, segs[i]);
    } else {
      segs.forEach(s => onInsert(position, s));
    }
    setOpen(false);
    setSubmenu(null);
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (confirm('Delete this segment?')) {
      onDelete();
      setOpen(false);
    }
  }

  return (
    <div className="kebab-wrapper" ref={menuRef}>
      <button
        ref={btnRef}
        className="kebab-btn"
        onClick={e => {
          e.stopPropagation();
          if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setFlipDown(rect.top < 250);
          }
          setOpen(!open);
          setSubmenu(null);
        }}
      >
        ⋮
      </button>
      {open && (
        <div className={`kebab-dropdown ${flipDown ? '' : 'flip-up'}`}>
          <div
            className="kebab-item-with-flyout"
            onMouseEnter={() => { clearTimeout(leaveTimer.current); setSubmenu('above'); }}
            onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(s => s === 'above' ? null : s), 200); }}
          >
            <div className="kebab-item">‹ Add above</div>
          </div>
          <div className="kebab-divider" />
          <div
            className="kebab-item-with-flyout"
            onMouseEnter={() => { clearTimeout(leaveTimer.current); setSubmenu('below'); }}
            onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(s => s === 'below' ? null : s), 200); }}
          >
            <div className="kebab-item">‹ Add below</div>
          </div>
          {submenu && submenu !== 'paste' && (
            <div
              onMouseEnter={() => clearTimeout(leaveTimer.current)}
              onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(null), 200); }}
            >
              <SubmenuItems position={submenu} onInsert={handleInsert} />
            </div>
          )}
          <div className="kebab-divider" />
          <div className="kebab-item" onMouseEnter={() => setSubmenu(null)} onClick={handleCopy}>
            Copy
          </div>
          <div className="kebab-divider" />
          <div
            className="kebab-item-with-flyout"
            style={{ position: 'relative' }}
            onMouseEnter={() => { clearTimeout(leaveTimer.current); setSubmenu('paste'); }}
            onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(s => s === 'paste' ? null : s), 200); }}
          >
            <div className={`kebab-item${!getClipboard() ? ' kebab-disabled' : ''}`}>‹ Paste</div>
            {submenu === 'paste' && getClipboard() && (
              <div
                className="kebab-flyout"
                style={{ top: 0 }}
                onMouseEnter={() => clearTimeout(leaveTimer.current)}
                onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(null), 200); }}
              >
                <div className="kebab-item" onClick={e => { e.stopPropagation(); handlePaste('above'); }}>Above</div>
                <div className="kebab-divider" />
                <div className="kebab-item" onClick={e => { e.stopPropagation(); handlePaste('below'); }}>Below</div>
              </div>
            )}
          </div>
          {onManageRecording && (
            <>
              <div className="kebab-divider" />
              <div className="kebab-item" onMouseEnter={() => setSubmenu(null)} onClick={e => { e.stopPropagation(); onManageRecording(); setOpen(false); }}>
                Manage recording
              </div>
            </>
          )}
          {onColor && (
            <>
              <div className="kebab-divider" />
              <div className="color-picker-row" onMouseEnter={() => setSubmenu(null)}>
                {COLOR_SWATCHES.map(c => (
                  <div
                    key={c.key}
                    className={`color-swatch${(seg.color || (seg.label ? 'green' : 'blue')) === c.key ? ' active' : ''}`}
                    style={{ background: c.color }}
                    onClick={e => { e.stopPropagation(); onColor(c.key); setOpen(false); }}
                  />
                ))}
              </div>
            </>
          )}
          <div className="kebab-divider" />
          <div className="kebab-item kebab-delete" onMouseEnter={() => setSubmenu(null)} onClick={handleDelete}>
            Delete
          </div>
        </div>
      )}
    </div>
  );
}
