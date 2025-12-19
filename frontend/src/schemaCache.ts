type SchemaResponse = { schema: any }

let inMemoryCache: { [workspace: string]: any } = {}

let BACKEND_FALLBACK = typeof window !== 'undefined' ? (window as any).__BACKEND_URL__ || 'http://localhost:3000' : 'http://localhost:3000'

export function setBackendUrl(url: string) {
  if (!url) return
  BACKEND_FALLBACK = url
}

async function tryFetchCandidates(path: string): Promise<Response | null> {
  const candidates = ['', BACKEND_FALLBACK]
  const tried: string[] = []
  for (const base of candidates) {
    const url = base ? `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}` : path
    tried.push(url)
    try {
      const r = await fetch(url, { credentials: 'same-origin' })
      if (r.ok) return r
      // non-ok but reachable, try next
    } catch (e) {
      // try next candidate
    }
  }
  console.warn('[schemaCache] tryFetchCandidates: none reachable', tried)
  return null
}

async function getWorkspace(): Promise<string | null> {
  try {
    const r = await tryFetchCandidates('/workspace')
    if (!r) return null
    const j = await r.json()
    return j.workspace || null
  } catch (e) {
    return null
  }
}

function storageKey(workspace: string) {
  return `tf:provider-schemas:${workspace}`
}

export async function loadAllSchemas(force = false): Promise<any | null> {
  const ws = await getWorkspace()
  if (!ws) return null

  if (!force && inMemoryCache[ws]) return inMemoryCache[ws]

  // Try localStorage first
  try {
    const key = storageKey(ws)
    if (!force) {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          inMemoryCache[ws] = parsed
          return parsed
        } catch (e) {
          // fall through to fetch
        }
      }
    }
  } catch (e) {
    // localStorage may be unavailable; ignore
  }

  // Fetch from backend (with fallback)
  try {
    const r = await tryFetchCandidates('/providers/schema')
    if (!r) {
      console.warn('[schemaCache] providers/schema request failed (no reachable origin)')
      return null
    }
    const data: SchemaResponse = await r.json()
    inMemoryCache[ws] = data.schema || data
    try {
      const key = storageKey(ws)
      localStorage.setItem(key, JSON.stringify(inMemoryCache[ws]))
    } catch (e) {
      // ignore storage errors
    }
    return inMemoryCache[ws]
  } catch (e) {
    console.warn('[schemaCache] fetch error', e)
    return null
  }
}

export async function getProviderSchema(providerAddress: string): Promise<any | null> {
  const all = await loadAllSchemas(false)
  if (!all) return null
  // provider_schemas may be a map
  if (all.provider_schemas && typeof all.provider_schemas === 'object') {
    if (all.provider_schemas[providerAddress]) return all.provider_schemas[providerAddress]
    // try to find by suffix match (conservative)
    const keys = Object.keys(all.provider_schemas)
    for (const k of keys) {
      if (k.endsWith(providerAddress) || providerAddress.endsWith(k)) return all.provider_schemas[k]
    }
  }
  return null
}

export async function getResourceSchema(resourceType: string): Promise<any | null> {
  const all = await loadAllSchemas(false)
  if (!all || !all.provider_schemas) return null
  // Search each provider's resource_schemas for a match on resourceType
  const providers = all.provider_schemas
  for (const providerKey of Object.keys(providers)) {
    const p = providers[providerKey]
    if (!p || !p.resource_schemas) continue
    // direct match
    if (p.resource_schemas[resourceType]) return p.resource_schemas[resourceType]
    // try suffix or contains match on resourceType
    const keys = Object.keys(p.resource_schemas)
    for (const rk of keys) {
      if (rk === resourceType) return p.resource_schemas[rk]
      if (rk.endsWith(resourceType) || resourceType.endsWith(rk) || rk.includes(resourceType) || resourceType.includes(rk)) return p.resource_schemas[rk]
    }
  }
  return null
}

export async function clearWorkspaceCache(workspace?: string) {
  const ws = workspace || (await getWorkspace())
  if (!ws) return
  delete inMemoryCache[ws]
  try {
    localStorage.removeItem(storageKey(ws))
  } catch (e) {}
}

export function clearAllInMemoryCache() {
  inMemoryCache = {}
}

export default {
  loadAllSchemas,
  getProviderSchema,
  clearWorkspaceCache,
  clearAllInMemoryCache,
}
