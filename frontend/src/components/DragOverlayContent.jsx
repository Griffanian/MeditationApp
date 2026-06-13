export default function DragOverlayContent({ seg }) {
  if (!seg) return null;

  let icon, label, className;

  if (seg.type === 'speech') {
    icon = '🤖';
    const preview = seg.text.length > 60 ? seg.text.slice(0, 60) + '...' : seg.text;
    label = preview;
    className = 'segment speech';
  } else if (seg.type === 'pause') {
    icon = '⏸';
    label = `Pause: ${seg.duration_seconds}s`;
    className = 'segment pause';
  } else if (seg.type === 'asset') {
    icon = '🔊';
    label = seg.file;
    className = 'segment asset';
  } else if (seg.type === 'loop') {
    icon = '↻';
    label = `Loop × ${seg.repeat} (${seg.segments.length} segments)`;
    className = 'loop-header';
  }

  return (
    <div className={className} style={{
      filter: 'brightness(1.2)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      cursor: 'grabbing',
    }}>
      <span className="seg-icon">{icon}</span>
      <span className="seg-label">{label}</span>
    </div>
  );
}
