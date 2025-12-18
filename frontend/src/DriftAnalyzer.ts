// Drift detection utilities (frontend-only, conservative)

export interface DriftResult {
  drifted: Array<{ address: string; reason: string }>
  orphaned: Array<{ address: string; reason: string }>
}

function collectAddressesFromConfig(conf: any): Set<string> {
  const s = new Set<string>()
  if (!conf) return s

  function walkModule(mod: any, prefix: string) {
    const resources = mod.resources || []
    for (const r of resources) {
      const addr = prefix ? `${prefix}.${r.address}` : r.address
      s.add(addr)
    }
    const moduleCalls = mod.module_calls || {}
    for (const [name, mcall] of Object.entries(moduleCalls)) {
      if ((mcall as any).module) walkModule((mcall as any).module, prefix ? `${prefix}.module.${name}` : `module.${name}`)
    }
  }

  if (conf.root_module) walkModule(conf.root_module, '')
  return s
}

function collectAddressesFromPriorState(prior: any): Set<string> {
  const s = new Set<string>()
  if (!prior) return s

  function walkModule(mod: any, prefix: string) {
    const resources = mod.resources || []
    for (const r of resources) {
      const addr = prefix ? `${prefix}.${r.address}` : r.address
      s.add(addr)
    }
    const child = mod.child_modules || []
    for (const c of child) {
      const childPrefix = c.address || ''
      walkModule(c, childPrefix)
    }
  }

  if (prior.root_module) walkModule(prior.root_module, '')
  return s
}

export function analyzeDrift(plan: any): DriftResult {
  const res: DriftResult = { drifted: [], orphaned: [] }
  if (!plan) return res

  // config addresses
  const configAddrs = collectAddressesFromConfig(plan.configuration)
  // prior_state or prior_state-like
  const prior = plan.prior_state || plan.state || null
  const priorAddrs = collectAddressesFromPriorState(prior)

  // Drifted: resource_changes showing update/replace actions
  const rc = plan.resource_changes || []
  for (const r of rc) {
    const addr = r.address
    const actions = r.change && r.change.actions ? r.change.actions : []
    if (actions.includes('update')) {
      res.drifted.push({ address: addr, reason: 'Configuration differs from state (update)' })
    } else if (actions.includes('replace') || (actions.includes('delete') && actions.includes('create'))) {
      res.drifted.push({ address: addr, reason: 'Resource will be replaced (replace/force)' })
    }
  }

  // Orphaned: present in prior state but not in configuration
  for (const addr of Array.from(priorAddrs)) {
    if (!configAddrs.has(addr)) {
      res.orphaned.push({ address: addr, reason: 'Resource present in state but not in configuration (orphaned)' })
    }
  }

  return res
}
