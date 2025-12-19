// Explain-Why engine (frontend-only, conservative)
// Builds short, traceable explanations for impacted resources using graph edges and plan.configuration expressions.

type Explanation = {
  subject: string
  reasonType: 'dependency' | 'variable' | 'output' | 'drift' | 'unknown'
  explanation: string
  path?: string[]
}

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

function findPath(source: string, target: string, edges: Array<{ source: string; target: string }>): string[] | null {
  // BFS with parent map
  const q: string[] = [source]
  const parent = new Map<string, string | null>()
  parent.set(source, null)
  while (q.length) {
    const cur = q.shift()!
    if (cur === target) {
      const path: string[] = []
      let n: string | null = cur
      while (n) {
        path.unshift(n)
        n = parent.get(n) || null
      }
      return path
    }
    for (const e of edges) {
      if (e.source === cur && !parent.has(e.target)) {
        parent.set(e.target, cur)
        q.push(e.target)
      }
    }
  }
  return null
}

function findAttributeReference(fromAddr: string, toAddr: string, conf: any): { attribute?: string; reference?: string } | null {
  if (!conf) return null
  const exprs = collectExpressions(conf)
  // look for expressions on toAddr that reference fromAddr
  const candidates = exprs.filter((e) => {
    // conservative matching by exact or suffix
    const addrMatches = e.address === toAddr || e.address.endsWith(toAddr) || toAddr.endsWith(e.address)
    return addrMatches
  })
  for (const c of candidates) {
    const refs: string[] = (c.expr && c.expr.references) || []
    for (const r of refs) {
      if (r.includes(fromAddr) || fromAddr.includes(r) || r.split('.').slice(0, -1).join('.').includes(fromAddr)) {
        return { attribute: c.attribute, reference: r }
      }
    }
  }
  // fallback: search any expression anywhere that mentions both
  for (const c of exprs) {
    const refs: string[] = (c.expr && c.expr.references) || []
    if (refs.some((r) => r.includes(fromAddr)) && refs.some((r) => r.includes(toAddr))) {
      return { attribute: c.attribute, reference: refs.find((r) => r.includes(fromAddr)) }
    }
  }
  return null
}

export function explainWhyForImpact(impactResult: any, plan: any, edges: Array<{ source: string; target: string }>): Explanation[] {
  const out: Explanation[] = []
  if (!impactResult || !plan) return out
  const conf = plan.configuration || null

  for (const node of impactResult.all || []) {
    const subject = node.address
    const path = findPath(impactResult.source, subject, edges)
    if (!path) {
      out.push({ subject, reasonType: 'unknown', explanation: 'Explanation unavailable: no dependency path found in graph', path: undefined })
      continue
    }

    // For the immediate predecessor, attempt to find attribute-level reference
    const pred = path.length >= 2 ? path[path.length - 2] : null
    if (!pred) {
      out.push({ subject, reasonType: 'unknown', explanation: 'No predecessor found in path', path })
      continue
    }

    const ref = findAttributeReference(pred, subject, conf)
    if (ref && ref.attribute && ref.reference) {
      const explanation = `Depends on ${pred} via ${subject}.${ref.attribute}, which references ${ref.reference}`
      out.push({ subject, reasonType: 'dependency', explanation, path })
    } else {
      // Provide a conservative, human-readable path explanation
      const explanation = `Dependency path: ${path.join(' → ')}. No attribute-level reference exposed in plan configuration.`
      out.push({ subject, reasonType: 'dependency', explanation, path })
    }
  }

  return out
}

export function explainRefactorWarning(warning: any, plan: any, edges: Array<{ source: string; target: string }>): Explanation[] {
  const out: Explanation[] = []
  if (!warning || !plan) return out
  const conf = plan.configuration || null

  // Determine the subject of the refactor warning. Prefer explicit address, then name.
  const subject = warning.subjectAddress || warning.target || warning.name || null
  if (!subject) {
    out.push({ subject: 'unknown', reasonType: 'unknown', explanation: 'Refactor warning has no identifiable subject', path: undefined })
    return out
  }

  // Search configuration expressions for any consumers that reference the subject.
  const exprs = collectExpressions(conf)
  const consumers: Array<{ address: string; attribute: string; reference: string }> = []
  for (const e of exprs) {
    const refs: string[] = (e.expr && e.expr.references) || []
    for (const r of refs) {
      if (r.includes(subject) || subject.includes(r)) {
        consumers.push({ address: e.address, attribute: e.attribute, reference: r })
      }
    }
  }

  if (consumers.length === 0) {
    out.push({ subject, reasonType: 'unknown', explanation: 'No consuming resources or references found in plan configuration. Explanation unavailable.', path: undefined })
    return out
  }

  // For each consumer, try to compute a path and build a conservative explanation.
  for (const c of consumers) {
    const path = findPath(subject, c.address, edges) || undefined
    const reasonType: Explanation['reasonType'] = subject.startsWith('var.') ? 'variable' : subject.startsWith('output.') ? 'output' : 'dependency'
    const explanation = `Referenced by ${c.address}.${c.attribute} (expression reference: ${c.reference})` + (path ? ` via path ${path.join(' → ')}` : '')
    out.push({ subject, reasonType, explanation, path })
  }

  return out
}

export default { explainWhyForImpact, explainRefactorWarning }

export function explainValueFlow(steps: Array<{ kind: string; detail: string }>, resourceAddress: string, attribute: string): { explanation: string; items: string[] } {
  if (!steps || steps.length === 0) return { explanation: 'Explanation unavailable', items: [] }

  const items: string[] = []

  // First, describe the observed value/literal if present
  const first = steps[0]
  if (first.kind === 'literal') {
    items.push(`\`${attribute}\` appears to be a literal or resolved value: ${first.detail}`)
  }

  // For subsequent steps, explain conservatively
  for (let i = 1; i < steps.length; i++) {
    const s = steps[i]
    if (s.kind === 'var') {
      items.push(`Because it references variable \`${s.detail}\`.`)
    } else if (s.kind === 'module_input' || s.kind === 'module_output') {
      items.push(`Because it flows through module reference \`${s.detail}\`.`)
    } else if (s.kind === 'resource_attribute') {
      items.push(`Because it references resource attribute \`${s.detail}\`.`)
    } else if (s.kind === 'unknown') {
      items.push(`Origin not traceable from plan JSON: \`${s.detail}\`.`)
    } else {
      items.push(`Reference: \`${s.detail}\` (type: ${s.kind})`)
    }
  }

  const explanation = items.length > 0 ? items.join(' ') : 'Explanation unavailable'
  return { explanation, items }
}
