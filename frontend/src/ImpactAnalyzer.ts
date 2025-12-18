/**
 * Impact Analysis Utilities
 * Performs graph traversal to identify impacted resources downstream from a change source.
 */

export interface ImpactNode {
  address: string
  depth: number // 0 = source, 1 = direct, 2+ = transitive
  action?: string | null // create, update, delete, replace, no-op
  hasDraft?: boolean
  warnings?: string[] // e.g., "Resource replacement", "Destructive change"
}

export interface ImpactResult {
  source: string
  direct: ImpactNode[] // depth 1
  transitive: ImpactNode[] // depth > 1
  all: ImpactNode[] // all impacted (direct + transitive)
}

/**
 * Get severity warnings for a resource based on its action and impact depth.
 */
function getSeverityWarnings(action: string | null, depth: number, hasDraft: boolean): string[] {
  const warnings: string[] = []

  if (hasDraft) {
    warnings.push('Based on draft change')
  }

  if (action === 'delete') {
    warnings.push('Destructive change')
    if (depth > 0) warnings.push('Forced deletion of dependent resource')
  } else if (action === 'replace') {
    warnings.push('Resource replacement')
    if (depth > 0) warnings.push('Forced replacement of dependent resource')
  } else if (action === 'update') {
    if (depth > 0) warnings.push('Triggered update')
  }

  return warnings
}

/**
 * Traverse dependency graph downstream from a source node using BFS.
 * Returns all reachable nodes categorized by distance from source.
 * Enriches results with plan action data and draft status.
 *
 * @param sourceAddress - The resource address to start impact analysis from
 * @param edges - Array of graph edges [{ source: string, target: string }]
 * @param actionMap - Map of resource address -> action (create/update/delete/replace/no-op)
 * @param draftedResources - Set of resource addresses with draft changes
 * @returns ImpactResult with categorized, severity-enhanced impacted nodes
 */
export function analyzeImpact(
  sourceAddress: string,
  edges: Array<{ source: string; target: string }>,
  actionMap: Map<string, string | null> = new Map(),
  draftedResources: Set<string> = new Set()
): ImpactResult {
  const visited = new Set<string>()
  const byDepth = new Map<number, Array<ImpactNode>>()
  const queue: Array<{ address: string; depth: number }> = [{ address: sourceAddress, depth: 0 }]

  visited.add(sourceAddress)

  // BFS: traverse downstream (follow edges where source = current node)
  while (queue.length > 0) {
    const { address, depth } = queue.shift()!

    // Find all edges where this address is the source
    for (const edge of edges) {
      if (edge.source === address && !visited.has(edge.target)) {
        visited.add(edge.target)
        const nextDepth = depth + 1

        const impactNode: ImpactNode = {
          address: edge.target,
          depth: nextDepth,
          action: actionMap.get(edge.target) || null,
          hasDraft: draftedResources.has(edge.target),
          warnings: getSeverityWarnings(actionMap.get(edge.target) || null, nextDepth, draftedResources.has(edge.target)),
        }

        if (!byDepth.has(nextDepth)) {
          byDepth.set(nextDepth, [])
        }
        byDepth.get(nextDepth)!.push(impactNode)
        queue.push({ address: edge.target, depth: nextDepth })
      }
    }
  }

  // Build result arrays
  const direct: ImpactNode[] = byDepth.get(1) || []
  const transitive: ImpactNode[] = []

  for (let depth = 2; depth < byDepth.size; depth++) {
    transitive.push(...(byDepth.get(depth) || []))
  }

  const all = [...direct, ...transitive]

  return {
    source: sourceAddress,
    direct,
    transitive,
    all,
  }
}

/**
 * Check if a node should be highlighted based on impact analysis.
 */
export function getImpactClass(nodeAddress: string, result: ImpactResult | null): 'source' | 'direct' | 'transitive' | 'none' {
  if (!result) return 'none'
  if (nodeAddress === result.source) return 'source'
  if (result.direct.some((n) => n.address === nodeAddress)) return 'direct'
  if (result.transitive.some((n) => n.address === nodeAddress)) return 'transitive'
  return 'none'
}
