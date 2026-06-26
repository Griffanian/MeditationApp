function SegPreview({ seg }) {
  let icon, label, className;

  if (seg.type === 'speech') {
    icon = '🤖';
    const preview = seg.text.length > 60 ? seg.text.slice(0, 60) + '...' : seg.text;
    label = preview.split(' ').map((w, i) => (
      <span key={i} className={/\{\w+\}/.test(w) ? 'var-ref' : ''}>{w}{' '}</span>
    ));
    className = `segment speech${/\{\w+\}/.test(seg.text) ? ' has-variables' : ''}`;
  } else if (seg.type === 'pause') {
    icon = '⏸';
    label = `Pause: ${seg.duration_seconds}s`;
    className = 'segment pause';
  } else if (seg.type === 'asset') {
    icon = '🔊';
    label = seg.file;
    className = 'segment asset';
  } else if (seg.type === 'loop') {
    if (seg.label) {
      icon = '▼';
      label = seg.label;
      className = 'section-header';
    } else {
      icon = '↻';
      label = `Loop × ${seg.repeat || '?'} (${seg.segments.length} segments)`;
      className = 'loop-header';
    }
  } else if (seg.type === 'split_marker') {
    icon = '◆';
    label = 'Split Marker';
    className = 'segment split-marker';
  }

  return (
    <div className={className} style={{ cursor: 'grabbing' }}>
      <span className="seg-icon">{icon}</span>
      <span className="seg-label">{label}</span>
    </div>
  );
}

export default function DragOverlayContent({ segs = [] }) {
  if (segs.length === 0) return null;

  return (
    <div style={{
      filter: 'brightness(1.2)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      position: 'relative',
    }}>
      {segs.slice(0, 3).map(seg => (
        <SegPreview key={seg.id} seg={seg} />
      ))}
      {segs.length > 3 && (
        <div style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
          padding: '4px 0',
        }}>
          +{segs.length - 3} more
        </div>
      )}
      {segs.length > 1 && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: -8,
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: '50%',
          width: 22,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {segs.length}
        </div>
      )}
    </div>
  );
}
