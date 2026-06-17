import { useState, useEffect } from 'react';
import { fetchMyViewers } from '../api';

/**
 * Inline viewer management panel.
 * Shows all the builder's viewers with toggles for this specific content.
 * Props:
 *   fetchViewers: () => Promise<[{id, username}]>  — viewers shared with this item
 *   addViewer: (username) => Promise
 *   removeViewer: (userId) => Promise
 *   onClose: () => void
 */
export default function ViewerManager({ fetchViewers, addViewer, removeViewer, onClose }) {
  const [allViewers, setAllViewers] = useState([]);    // all builder's viewers
  const [sharedIds, setSharedIds] = useState(new Set()); // IDs shared with this item
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null); // userId being toggled

  useEffect(() => {
    Promise.all([
      fetchMyViewers().catch(() => []),
      fetchViewers().catch(() => []),
    ]).then(([all, shared]) => {
      setAllViewers(Array.isArray(all) ? all : []);
      setSharedIds(new Set(Array.isArray(shared) ? shared.map(v => v.id) : []));
      setLoading(false);
    });
  }, []);

  async function handleToggle(viewer) {
    setToggling(viewer.id);
    try {
      if (sharedIds.has(viewer.id)) {
        await removeViewer(viewer.id);
        setSharedIds(prev => { const next = new Set(prev); next.delete(viewer.id); return next; });
      } else {
        await addViewer(viewer.username);
        setSharedIds(prev => new Set(prev).add(viewer.id));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="viewer-manager" onClick={e => e.stopPropagation()}>
      <div className="viewer-manager-header">
        <span className="viewer-manager-title">Viewers</span>
        <button className="viewer-manager-close" onClick={onClose}>&times;</button>
      </div>
      {loading ? (
        <div className="viewer-manager-loading">Loading...</div>
      ) : allViewers.length === 0 ? (
        <div className="viewer-manager-empty">No viewers yet. Invite viewers from your Account page.</div>
      ) : (
        <div className="viewer-manager-list">
          {allViewers.map(v => (
            <label key={v.id} className={`viewer-manager-row${toggling === v.id ? ' toggling' : ''}`}>
              <input
                type="checkbox"
                checked={sharedIds.has(v.id)}
                onChange={() => handleToggle(v)}
                disabled={toggling === v.id}
              />
              <span>{v.username}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
