export const SEGMENT_TYPES = [
  { type: 'speech', icon: '🤖', label: 'Speech', default: { type: 'speech', text: 'New spoken segment.' } },
  { type: 'pause', icon: '⏸', label: 'Pause', default: { type: 'pause', duration_seconds: 5 } },
  { type: 'asset', icon: '🔊', label: 'Asset', default: { type: 'asset', file: 'and_out.mp3' } },
  { type: 'loop', icon: '↻', label: 'Loop', default: { type: 'loop', repeat: 3, segments: [] } },
  { type: 'section', icon: '▼', label: 'Section', default: { type: 'loop', repeat: 1, label: 'New Section', segments: [] } },
  { type: 'split_marker', icon: '◆', label: 'Split Marker', default: { type: 'split_marker' } },
];

export const SEGMENT_ICONS = {
  speech: '🤖',
  pause: '⏸',
  asset: '🔊',
  loop: '↻',
  split_marker: '◆',
};
