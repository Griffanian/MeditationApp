import { useState, useRef, useEffect } from 'react';
import { getClipboard } from '../clipboard';
import { SEGMENT_TYPES } from '../segmentDefs';


export default function ContextMenu({ x, y, selectedCount, onAddAbove, onAddBelow, onCopy, onPaste, onGroup, onDelete, onClose }) {
  const [submenu, setSubmenu] = useState(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const menuRef = useRef(null);
  const leaveTimer = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const newPos = { left: x, top: y };
    if (y + rect.height > window.innerHeight) {
      newPos.top = y - rect.height;
    }
    if (x + rect.width > window.innerWidth) {
      newPos.left = x - rect.width;
    }
    setPos(newPos);
  }, [x, y]);

  const style = {
    position: 'fixed',
    left: pos.left,
    top: pos.top,
    zIndex: 1000,
  };

  const cb = getClipboard();

  return (
    <div ref={menuRef} className="context-menu" style={style}>
      <div
        className="kebab-item-with-flyout"
        onMouseEnter={() => { clearTimeout(leaveTimer.current); setSubmenu('above'); }}
        onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(s => s === 'above' ? null : s), 200); }}
      >
        <div className="kebab-item">‹ Add above</div>
        {submenu === 'above' && (
          <div
            className="context-flyout"
            onMouseEnter={() => clearTimeout(leaveTimer.current)}
            onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(null), 200); }}
          >
            {SEGMENT_TYPES.map((t, i) => (
              <div key={t.type}>
                <div className="kebab-item" onClick={() => { onAddAbove(t.type); onClose(); }}>
                  <span className="menu-icon">{t.icon}</span>{t.label}
                </div>
                {i < SEGMENT_TYPES.length - 1 && <div className="kebab-divider" />}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="kebab-divider" />
      <div
        className="kebab-item-with-flyout"
        onMouseEnter={() => { clearTimeout(leaveTimer.current); setSubmenu('below'); }}
        onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(s => s === 'below' ? null : s), 200); }}
      >
        <div className="kebab-item">‹ Add below</div>
        {submenu === 'below' && (
          <div
            className="context-flyout"
            onMouseEnter={() => clearTimeout(leaveTimer.current)}
            onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(null), 200); }}
          >
            {SEGMENT_TYPES.map((t, i) => (
              <div key={t.type}>
                <div className="kebab-item" onClick={() => { onAddBelow(t.type); onClose(); }}>
                  <span className="menu-icon">{t.icon}</span>{t.label}
                </div>
                {i < SEGMENT_TYPES.length - 1 && <div className="kebab-divider" />}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="kebab-divider" />
      <div className="kebab-item" onClick={() => { onCopy(); onClose(); }}>
        Copy{selectedCount > 1 ? ` (${selectedCount})` : ''}
      </div>
      <div className="kebab-divider" />
      <div
        className="kebab-item-with-flyout"
        style={{ position: 'relative' }}
        onMouseEnter={() => { clearTimeout(leaveTimer.current); setSubmenu('paste'); }}
        onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(s => s === 'paste' ? null : s), 200); }}
      >
        <div className={`kebab-item${!cb ? ' kebab-disabled' : ''}`}>
          ‹ Paste{cb ? ` (${cb.length})` : ''}
        </div>
        {submenu === 'paste' && cb && (
          <div
            className="context-flyout"
            style={{ top: 0 }}
            onMouseEnter={() => clearTimeout(leaveTimer.current)}
            onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSubmenu(null), 200); }}
          >
            <div className="kebab-item" onClick={() => { onPaste('above'); onClose(); }}>Above</div>
            <div className="kebab-divider" />
            <div className="kebab-item" onClick={() => { onPaste('below'); onClose(); }}>Below</div>
          </div>
        )}
      </div>
      {selectedCount > 1 && (
        <>
          <div className="kebab-divider" />
          <div className="kebab-item" onClick={() => { onGroup(); onClose(); }}>
            Group into section
          </div>
        </>
      )}
      <div className="kebab-divider" />
      <div className="kebab-item kebab-delete" onClick={() => { onDelete(); onClose(); }}>
        Delete{selectedCount > 1 ? ` (${selectedCount})` : ''}
      </div>
    </div>
  );
}
