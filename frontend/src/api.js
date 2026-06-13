export async function fetchCategories() {
  const res = await fetch('/api/categories');
  return res.json();
}

export async function createCategory(displayName) {
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create');
  return data;
}

export async function renameCategory(name, displayName) {
  await fetch(`/api/categories/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
}

export async function deleteCategory(name) {
  await fetch(`/api/categories/${name}`, { method: 'DELETE' });
}

export async function fetchMeditations() {
  const res = await fetch('/api/meditations');
  return res.json();
}

export async function createMeditation(displayName, category) {
  const res = await fetch('/api/meditations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName, category }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create');
  return data;
}

export async function renameMeditation(name, displayName) {
  await fetch(`/api/meditations/${name}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
}

export async function deleteMeditation(name) {
  await fetch(`/api/meditations/${name}/meta`, { method: 'DELETE' });
}

export async function fetchMeta(name) {
  const res = await fetch(`/api/meditations/${name}/meta`);
  return res.json();
}

export async function saveMeta(name, meta) {
  await fetch(`/api/meditations/${name}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
}

export async function fetchInstructions(name) {
  const res = await fetch(`/api/meditations/${name}/instructions`);
  return res.json();
}

export async function saveInstructions(name, instructions) {
  await fetch(`/api/meditations/${name}/instructions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(instructions),
  });
}

// --- Instructions PDF ---

export async function checkInstructionsPdf(name) {
  const res = await fetch(`/api/meditations/${name}/instructions-pdf`);
  return res.json();
}

export async function uploadInstructionsPdf(name, file) {
  const form = new FormData();
  form.append('file', file);
  await fetch(`/api/meditations/${name}/instructions-pdf`, {
    method: 'POST',
    body: form,
  });
}

export async function deleteInstructionsPdf(name) {
  await fetch(`/api/meditations/${name}/instructions-pdf`, { method: 'DELETE' });
}

export async function extractInstructions(name, { youtubeUrl } = {}) {
  const res = await fetch(`/api/meditations/${name}/extract-instructions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to extract instructions');
  return data;
}

// --- Per-stage APIs ---

export async function fetchStageVariables(name, stageId) {
  const res = await fetch(`/api/meditations/${name}/stages/${stageId}/variables`);
  return res.json();
}

export async function saveStageVariables(name, stageId, variables) {
  await fetch(`/api/meditations/${name}/stages/${stageId}/variables`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(variables),
  });
}

export async function fetchStageScript(name, stageId) {
  const res = await fetch(`/api/meditations/${name}/stages/${stageId}/script`);
  return res.json();
}

export async function saveStageScript(name, stageId, script) {
  await fetch(`/api/meditations/${name}/stages/${stageId}/script`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(script),
  });
}

export async function fetchStageComponents(name, stageId) {
  const res = await fetch(`/api/meditations/${name}/stages/${stageId}/components`);
  return res.json();
}

export async function fetchStageTimestamps(name, stageId, segId) {
  const res = await fetch(`/api/meditations/${name}/stages/${stageId}/timestamps/${segId}?t=${Date.now()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function generateStageScript(name, stageId) {
  const res = await fetch(`/api/meditations/${name}/stages/${stageId}/generate-script`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate script');
  return data;
}

export async function generateAllAudio(name, stageId) {
  const res = await fetch(`/api/meditations/${name}/stages/${stageId}/generate-all`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate audio');
  return data;
}

export async function assembleStage(name, stageId) {
  const res = await fetch(`/api/meditations/${name}/stages/${stageId}/assemble`, { method: 'POST' });
  return res.json();
}

export async function updateLoops(name, loops) {
  await fetch(`/api/meditations/${name}/loops`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loops),
  });
}

export async function assembleAudio(name) {
  const res = await fetch(`/api/meditations/${name}/assemble`, { method: 'POST' });
  return res.json();
}
