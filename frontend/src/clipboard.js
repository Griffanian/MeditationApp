// Shared clipboard for segment copy/paste (stores an array of segments)
let clipboard = null;

export function getClipboard() { return clipboard; }
export function setClipboard(segments) { clipboard = segments; }
