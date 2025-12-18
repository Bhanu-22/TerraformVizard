const BASE = 'http://localhost:3000';

export async function fetchPlan() {
  const res = await fetch(`${BASE}/plan`, { method: 'POST' });
  const txt = await res.text();
  if (!res.ok) {
    let body = txt
    try { body = JSON.parse(txt) } catch (e) {}
    throw new Error(`Plan request failed: ${res.status} ${res.statusText} - ${typeof body === 'string' ? body : (body.error || JSON.stringify(body))}`)
  }
  return JSON.parse(txt);
}

export async function fetchGraph() {
  const res = await fetch(`${BASE}/graph`);
  const txt = await res.text();
  if (!res.ok) {
    let body = txt
    try { body = JSON.parse(txt) } catch (e) {}
    throw new Error(`Graph request failed: ${res.status} ${res.statusText} - ${typeof body === 'string' ? body : (body.error || JSON.stringify(body))}`)
  }
  return JSON.parse(txt);
}

export async function postWorkspace(path: string) {
  const res = await fetch(`${BASE}/workspace`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) });
  const txt = await res.text();
  if (!res.ok) {
    let body = txt
    try { body = JSON.parse(txt) } catch (e) {}
    throw new Error(`Workspace request failed: ${res.status} ${res.statusText} - ${typeof body === 'string' ? body : (body.error || JSON.stringify(body))}`)
  }
  return JSON.parse(txt);
}

export async function getWorkspace() {
  const res = await fetch(`${BASE}/workspace`);
  const txt = await res.text();
  if (!res.ok) {
    let body = txt
    try { body = JSON.parse(txt) } catch (e) {}
    throw new Error(`Get workspace failed: ${res.status} ${res.statusText} - ${typeof body === 'string' ? body : (body.error || JSON.stringify(body))}`)
  }
  return JSON.parse(txt);
}
