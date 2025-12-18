// Simple, conservative analyzer to find places that reference an output/module output

export interface OutputUsageResult {
  identifier: string
  directResources: string[]
  transitiveResources: string[]
  directModules: string[]
}

// Walk configuration and find expressions that reference pattern
function collectExpressions(conf: any) {
  const list: Array<{ container: string; expr: any }> = []
  if (!conf) return list

  function walkModule(mod: any, prefix: string) {
    const resources = mod.resources || []
    for (const r of resources) {
      const addr = prefix ? `${prefix}.${r.address}` : r.address
      const expressions = r.expressions || {}
      for (const attr of Object.keys(expressions)) {
        list.push({ container: addr, expr: expressions[attr] })
      }
    }
    const outputs = mod.outputs || {}
    for (const name of Object.keys(outputs)) {
      const outExpr = outputs[name] && outputs[name].value ? outputs[name].value : null
      if (outExpr) list.push({ container: prefix ? `${prefix}.output.${name}` : `output.${name}`, expr: outExpr })
    }
    const moduleCalls = mod.module_calls || {}
    for (const [name, mcall] of Object.entries(moduleCalls)) {
      if ((mcall as any).module) walkModule((mcall as any).module, prefix ? `${prefix}.module.${name}` : `module.${name}`)
    }
  }

  if (conf.root_module) walkModule(conf.root_module, '')
  return list
}

export function analyzeOutputUsage(plan: any, identifier: string, edges: Array<{ source: string; target: string }>) : OutputUsageResult {
  const res: OutputUsageResult = { identifier, directResources: [], transitiveResources: [], directModules: [] }
  if (!plan) return res

  const conf = plan.configuration
  if (!conf) return res

  const exprs = collectExpressions(conf)

  // direct matches: any expression whose references list contains the identifier or startsWith identifier
  for (const e of exprs) {
    const refs = (e.expr && e.expr.references) || []
    if (!Array.isArray(refs)) continue
    for (const r of refs) {
      if (typeof r !== 'string') continue
      if (r === identifier || r.startsWith(identifier + '.') || identifier.startsWith(r + '.')) {
        // container may look like module.foo.resource or aws_instance.bar
        if (e.container.startsWith('module.')) {
          res.directModules.push(e.container)
        } else if (e.container.startsWith('output.')) {
          // ignore
        } else {
          res.directResources.push(e.container)
        }
        break
      }
    }
  }

  // dedupe
  res.directModules = Array.from(new Set(res.directModules))
  res.directResources = Array.from(new Set(res.directResources))

  // For transitive, run BFS from each direct resource using edges
  const visited = new Set<string>()
  const queue: Array<string> = []
  for (const d of res.directResources) {
    visited.add(d)
    queue.push(d)
  }

  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const e of edges) {
      if (e.source === cur && !visited.has(e.target)) {
        visited.add(e.target)
        res.transitiveResources.push(e.target)
        queue.push(e.target)
      }
    }
  }

  // remove any transitive that are also direct
  res.transitiveResources = res.transitiveResources.filter((r) => !res.directResources.includes(r))

  return res
}
