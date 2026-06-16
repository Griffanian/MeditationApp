// Unique ID generation and tree-lookup utilities for segments

export function generateId() {
  return crypto.randomUUID();
}

// Recursively ensure every segment has an id. Returns true if any were added.
export function ensureIds(segments) {
  let changed = false;
  for (const seg of segments) {
    if (!seg.id) {
      seg.id = generateId();
      changed = true;
    }
    if (seg.type === 'loop' && seg.segments) {
      if (ensureIds(seg.segments)) changed = true;
    }
  }
  return changed;
}

// Find a segment by id anywhere in the tree
export function findById(segments, id) {
  for (const seg of segments) {
    if (seg.id === id) return seg;
    if (seg.type === 'loop' && seg.segments) {
      const found = findById(seg.segments, id);
      if (found) return found;
    }
  }
  return null;
}

// Find a segment by id and return { seg, parent (array), index }
export function findByIdWithContext(segments, id) {
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].id === id) return { seg: segments[i], parent: segments, index: i };
    if (segments[i].type === 'loop' && segments[i].segments) {
      const found = findByIdWithContext(segments[i].segments, id);
      if (found) return found;
    }
  }
  return null;
}

// Return all segment IDs in document order (depth-first)
export function allIds(segments) {
  const ids = [];
  for (const seg of segments) {
    ids.push(seg.id);
    if (seg.type === 'loop' && seg.segments) {
      ids.push(...allIds(seg.segments));
    }
  }
  return ids;
}

// Deep clone segments and assign fresh IDs to every segment.
// For speech segments, preserve the original id as sourceId so the
// backend can link the copy to the same audio component.
export function cloneWithNewIds(segments) {
  const cloned = JSON.parse(JSON.stringify(segments));
  function reassign(segs) {
    for (const seg of segs) {
      if (seg.type === 'speech') seg.sourceId = seg.id;
      seg.id = generateId();
      if (seg.type === 'loop' && seg.segments) reassign(seg.segments);
    }
  }
  reassign(cloned);
  return cloned;
}

// Check if candidateId is a descendant of ancestorId in the tree
export function isDescendantOf(segments, ancestorId, candidateId) {
  const ancestor = findById(segments, ancestorId);
  if (!ancestor || ancestor.type !== 'loop' || !ancestor.segments) return false;
  return !!findById(ancestor.segments, candidateId);
}
