const BASE = import.meta.env.VITE_API_URL || '';

// Wrapper around fetch that sends cookies cross-origin and kicks to login on 403.
function apiFetch(url, opts = {}) {
  return fetch(url, { credentials: 'include', ...opts }).then(res => {
    if (res.status === 403) {
      // Session expired or missing — reload to show login screen
      window.location.reload();
    }
    return res;
  });
}

// --- Auth (use raw fetch — these must work without a session) ---

export async function checkAuth() {
  const res = await fetch(`${BASE}/api/auth/status`, { credentials: 'include' });
  return res.json();
}

export async function loginUser(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function logoutUser() {
  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
}

export async function fetchCategories() {
  const res = await apiFetch(`${BASE}/api/categories`);
  return res.json();
}

export async function createCategory(displayName) {
  const res = await apiFetch(`${BASE}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create');
  return data;
}

export async function renameCategory(name, displayName) {
  await apiFetch(`${BASE}/api/categories/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
}

export async function deleteCategory(name) {
  await apiFetch(`${BASE}/api/categories/${name}`, { method: 'DELETE' });
}

export async function fetchMeditations() {
  const res = await apiFetch(`${BASE}/api/meditations`);
  return res.json();
}

export async function createMeditation(displayName, category) {
  const res = await apiFetch(`${BASE}/api/meditations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName, category }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create');
  return data;
}

export async function renameMeditation(name, displayName) {
  await apiFetch(`${BASE}/api/meditations/${name}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
}

export async function deleteMeditation(name) {
  await apiFetch(`${BASE}/api/meditations/${name}/meta`, { method: 'DELETE' });
}

export async function fetchMeta(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/meta`);
  return res.json();
}

export async function saveMeta(name, meta) {
  await apiFetch(`${BASE}/api/meditations/${name}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
}

export async function fetchInstructions(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/instructions`);
  return res.json();
}

export async function saveInstructions(name, instructions) {
  await apiFetch(`${BASE}/api/meditations/${name}/instructions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(instructions),
  });
}

// --- Instructions PDF ---

export async function checkInstructionsPdf(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/instructions-pdf`);
  return res.json();
}

export async function uploadInstructionsPdf(name, file) {
  const form = new FormData();
  form.append('file', file);
  await apiFetch(`${BASE}/api/meditations/${name}/instructions-pdf`, {
    method: 'POST',
    body: form,
  });
}

export async function deleteInstructionsPdf(name) {
  await apiFetch(`${BASE}/api/meditations/${name}/instructions-pdf`, { method: 'DELETE' });
}

export async function extractInstructions(name, { youtubeUrl, context } = {}) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/extract-instructions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl || null, context: context || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to extract instructions');
  return data;
}

// --- Chat ---

export async function sendChatMessage(message, history, context) {
  const res = await apiFetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Chat failed');
  return data;
}

export async function fetchStageDurations(items) {
  const res = await apiFetch(`${BASE}/api/stage-durations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return res.json();
}

// --- Per-stage APIs ---

export async function fetchStageVariables(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/variables`);
  return res.json();
}

export async function saveStageVariables(name, stageId, variables) {
  await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/variables`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(variables),
  });
}

export async function fetchStageScript(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/script`);
  return res.json();
}

export async function saveStageScript(name, stageId, script) {
  await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/script`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(script),
  });
}

export async function fetchStageComponents(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/components`);
  return res.json();
}

export async function fetchStageTimestamps(name, stageId, segId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/timestamps/${segId}?t=${Date.now()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function generateStageScript(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/generate-script`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate script');
  return data;
}

export async function generateAllAudio(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/generate-all`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate audio');
  return data;
}

export async function assembleStage(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/assemble`, { method: 'POST' });
  if (!res.ok) {
    let msg = `Assembly failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function updateLoops(name, loops) {
  await apiFetch(`${BASE}/api/meditations/${name}/loops`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loops),
  });
}

export async function assembleAudio(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/assemble`, { method: 'POST' });
  return res.json();
}

// --- Practices ---

export async function fetchPractices() {
  const res = await apiFetch(`${BASE}/api/practices`);
  return res.json();
}

export async function createPractice(displayName) {
  const res = await apiFetch(`${BASE}/api/practices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create');
  return data;
}

export async function fetchPractice(name) {
  const res = await apiFetch(`${BASE}/api/practices/${name}`);
  return res.json();
}

export async function savePractice(name, data) {
  await apiFetch(`${BASE}/api/practices/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deletePractice(name) {
  await apiFetch(`${BASE}/api/practices/${name}`, { method: 'DELETE' });
}

export async function fetchAvailableStages() {
  const res = await apiFetch(`${BASE}/api/practices/stages`);
  return res.json();
}

export { BASE };
