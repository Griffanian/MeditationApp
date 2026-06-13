export async function fetchMeditations() {
  const res = await fetch('/api/meditations');
  return res.json();
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
