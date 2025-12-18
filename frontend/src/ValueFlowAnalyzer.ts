// Heuristic value flow analyzer using Terraform JSON "configuration" expressions and references.

export type FlowStep = {
  kind: 'literal' | 'var' | 'module_input' | 'module_output' | 'resource_attribute' | 'unknown'
  detail: string
}

// Walk configuration modules and collect resource expressions keyed by resource address
function collectExpressions(conf: any) {
  const list: Array<{ address: string; attribute: string; expr: any }> = []
  if (!conf) return list

  function walkModule(mod: any, pathPrefix: string) {
    const resources = mod.resources || []
    for (const r of resources) {
      const addr = pathPrefix ? `${pathPrefix}.${r.address}` : r.address
      const expressions = r.expressions || {}
      for (const attr of Object.keys(expressions)) {
        list.push({ address: addr, attribute: attr, expr: expressions[attr] })
      }
    }
    const moduleCalls = mod.module_calls || {}
    for (const [name, mcall] of Object.entries(moduleCalls)) {
      if ((mcall as any).module) walkModule((mcall as any).module, pathPrefix ? `${pathPrefix}.module.${name}` : `module.${name}`)
    }
  }

  if (conf.root_module) walkModule(conf.root_module, '')
  return list
}

export function getValueFlow(plan: any, resourceAddress: string, attribute: string): FlowStep[] {
  const steps: FlowStep[] = []
  if (!plan) return [{ kind: 'unknown', detail: 'No plan data available' }]

  const rc = (plan.resource_changes || []).find((r: any) => r.address === resourceAddress)
  const value = rc?.change?.after ? rc.change.after[attribute] : undefined

  // conservative: if primitive, mark literal first
  if (value === undefined) {
    steps.push({ kind: 'unknown', detail: 'Attribute not present in plan change.after' })
  } else if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    steps.push({ kind: 'literal', detail: String(value) })
  } else if (Array.isArray(value) || typeof value === 'object') {
    steps.push({ kind: 'literal', detail: Array.isArray(value) ? `[array ${value.length}]` : '[object]' })
  }

  // Try to use configuration expressions (if present) to find references
  const conf = plan.configuration
  if (conf) {
    const exprs = collectExpressions(conf)
    // Find expressions for this resource/attribute by suffix match to be conservative
    const matches = exprs.filter((e) => (e.address === resourceAddress || resourceAddress.endsWith(e.address) || e.address.endsWith(resourceAddress)) && e.attribute === attribute)
    if (matches.length === 0) {
      // Try looser scan: find any expression that references this resource.attribute
      const maybeMatches = exprs.filter((e) => {
        const refs = (e.expr && e.expr.references) || []
        return refs.some((r: string) => r.includes(resourceAddress) || r.includes(`${resourceAddress}.${attribute}`))
      })
      if (maybeMatches.length > 0) {
        for (const m of maybeMatches) {
          const refs = (m.expr && m.expr.references) || []
          for (const r of refs) {
            if (r.startsWith('var.')) {
              steps.push({ kind: 'var', detail: r })
            } else if (r.startsWith('module.')) {
              steps.push({ kind: 'module_output', detail: r })
            } else if (r.includes('.')) {
              steps.push({ kind: 'resource_attribute', detail: r })
            } else {
              steps.push({ kind: 'unknown', detail: r })
            }
          }
        }
      }
    } else {
      // We have direct expression entries for the attribute
      for (const m of matches) {
        const refs = (m.expr && m.expr.references) || []
        if (refs.length === 0) {
          steps.push({ kind: 'unknown', detail: 'Expression present but no references exposed' })
        }
        for (const r of refs) {
          if (r.startsWith('var.')) {
            steps.push({ kind: 'var', detail: r })
          } else if (r.startsWith('module.')) {
            steps.push({ kind: 'module_output', detail: r })
          } else if (r.includes('.')) {
            steps.push({ kind: 'resource_attribute', detail: r })
          } else {
            steps.push({ kind: 'unknown', detail: r })
          }
        }
      }
    }
  }

  // If only literal was detected and no expressions found, try to inspect references across plan.resource_changes to see if some other resource's after value equals this value (heuristic)
  if (steps.length === 1 && steps[0].kind === 'literal' && plan.resource_changes) {
    const literalVal = steps[0].detail
    const matches = []
    for (const r of plan.resource_changes) {
      const after = r.change && r.change.after
      if (!after) continue
      for (const [k, v] of Object.entries(after)) {
        try {
          if (String(v) === literalVal) {
            matches.push({ addr: r.address, attr: k })
          }
        } catch (e) {}
      }
    }
    if (matches.length > 0) {
      steps.push({ kind: 'resource_attribute', detail: `${matches[0].addr}.${matches[0].attr}` })
    }
  }

  if (steps.length === 1 && steps[0].kind === 'literal') {
    // No further information discovered
    steps.push({ kind: 'unknown', detail: 'Value appears to be a literal or resolved value; origin not traceable from plan JSON' })
  }

  return steps
}
