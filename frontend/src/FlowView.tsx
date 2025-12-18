import React, { useMemo, useState } from 'react'
import ReactFlow, { Background, Controls } from 'reactflow'
import dagre from 'dagre'

function parseDot(dot: string) {
  // Very small DOT parser: extract edges of the form "A" -> "B";
  const edges: Array<{ source: string; target: string }> = []
  const nodeSet = new Set<string>()
  if (!dot) return { nodes: [], edges: [] }
  const lines = dot.split(/\r?\n/)
  const edgeRe = /"([^"]+)"\s*->\s*"([^"]+)"/
  for (const l of lines) {
    const m = l.match(edgeRe)
    if (m) {
      const a = m[1]
      const b = m[2]
      edges.push({ source: a, target: b })
      nodeSet.add(a)
      nodeSet.add(b)
    }
  }
  const nodes = Array.from(nodeSet).map((id, idx) => ({ id, label: id, idx }))
  return { nodes, edges }
}

function actionToColor(action: string | null) {
  switch (action) {
    case 'create':
      return '#16a34a' // green
    case 'update':
      return '#f59e0b' // yellow
    case 'delete':
      return '#dc2626' // red
    default:
      return '#9ca3af' // gray
  }
}

export default function FlowView({ dot, plan }: { dot: string; plan: any }) {
  const [selected, setSelected] = useState<string | null>(null)

  const { nodes, edges } = useMemo(() => parseDot(dot || ''), [dot])
  // Resource addresses from plan (preferred canonical node ids)
  const planAddresses: string[] = useMemo(() => (plan && plan.resource_changes ? plan.resource_changes.map((r: any) => r.address) : []), [plan])

  // Resolve DOT node labels to plan addresses when possible
  function resolveId(raw: string) {
    if (!raw) return null
    if (planAddresses.includes(raw)) return raw
    // try exact segment match: resource address may be suffix of raw
    for (const addr of planAddresses) {
      if (raw.endsWith(addr)) return addr
      if (raw.includes(addr)) return addr
      if (addr.includes(raw)) return addr
    }
    // fallback to raw
    return raw
  }

  // Remap edges to use resolved ids and filter unknowns
  const resolvedEdges = useMemo(() => {
    return edges
      .map((e) => {
        const s = resolveId(e.source)
        const t = resolveId(e.target)
        if (!s || !t) return null
        return { source: s, target: t }
      })
      .filter(Boolean) as Array<{ source: string; target: string }>
  }, [edges, planAddresses])

  // Map resource address -> action from plan
  const actionMap = useMemo(() => {
    const m = new Map()
    const rc = (plan && plan.resource_changes) || []
    for (const r of rc) {
      const addr = r.address
      const actions = r.change && r.change.actions ? r.change.actions : []
      let action = null
      if (actions.includes('create') && !actions.includes('delete')) action = 'create'
      else if (actions.includes('delete') && !actions.includes('create')) action = 'delete'
      else if (actions.includes('update') || (actions.includes('create') && actions.includes('delete'))) action = 'update'
      else if (actions.includes('no-op')) action = 'no-op'
      m.set(addr, action)
    }
    return m
  }, [plan])

  // Use dagre to compute an automatic layout
  function computeLayout(nodesIn: Array<any>, edgesIn: Array<any>) {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'LR' })
    const NODE_WIDTH = 200
    const NODE_HEIGHT = 48

    for (const n of nodesIn) {
      g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
    }
    for (const e of edgesIn) {
      g.setEdge(e.source, e.target)
    }

    dagre.layout(g)

    const positioned = nodesIn.map((n) => {
      const gd = g.node(n.id)
      return {
        id: n.id,
        data: n.data,
        position: { x: gd.x - NODE_WIDTH / 2, y: gd.y - NODE_HEIGHT / 2 },
        style: { background: actionToColor(n.data?.action || null), color: '#fff', padding: 8, borderRadius: 6 },
      }
    })

    const rfEdges = edgesIn.map((e, i) => ({ id: `e${i}`, source: e.source, target: e.target, animated: true, arrowHeadType: 'arrowclosed', style: { stroke: '#888', strokeWidth: 2 } }))
    return { positioned, rfEdges }
  }

  // Build node list from the union of plan addresses and parsed DOT nodes,
  // resolving DOT labels to canonical plan addresses when possible.
  const prelimNodes = useMemo(() => {
    const allIds = new Set<string>()
    for (const addr of planAddresses) allIds.add(addr)
    for (const n of nodes) {
      const resolved = resolveId(n.id) || n.id
      allIds.add(resolved)
    }
    const arr: Array<any> = []
    let i = 0
    for (const id of Array.from(allIds)) {
      const parts = id.split('.')
      const short = parts[parts.length - 1]
      const action = actionMap.get(id) || null
      arr.push({ id, data: { label: short, full: id, action } })
      i++
    }
    return arr
  }, [planAddresses, nodes, actionMap])

  const { positioned: rfNodes, rfEdges } = useMemo(() => computeLayout(prelimNodes, resolvedEdges), [prelimNodes, resolvedEdges])

  // Find change object for selected node
  const selectedChange = useMemo(() => {
    if (!selected || !plan || !plan.resource_changes) return null
    return plan.resource_changes.find((r: any) => r.address === selected) || null
  }, [selected, plan])

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1, height: '60vh', border: '1px solid #eee' }}>
        <ReactFlow nodes={rfNodes} edges={rfEdges} onNodeClick={(_, node) => { if (node && node.id) setSelected(node.id); }} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      <div style={{ width: 360, border: '1px solid #eee', padding: 8, height: '60vh', overflow: 'auto' }}>
        <h4>Resource Details</h4>
        {selected ? (
          <div>
            <div><strong>Address:</strong> {selected}</div>
            <div style={{ marginTop: 8 }}><strong>Action:</strong> {selectedChange ? (selectedChange.change && selectedChange.change.actions ? selectedChange.change.actions.join(', ') : 'n/a') : 'n/a'}</div>
            <div style={{ marginTop: 8 }}><strong>Change Object</strong></div>
            <pre style={{ background: '#f7f7f7', padding: 8 }}>{JSON.stringify(selectedChange ? selectedChange.change : {}, null, 2)}</pre>
          </div>
        ) : (
          <div>Select a node to see details</div>
        )}
      </div>
    </div>
  )
}
