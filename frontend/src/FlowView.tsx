import React, { useMemo, useState } from 'react'
import ReactFlow, { Background, Controls } from 'reactflow'
import dagre from 'dagre'
import { useDrafts } from './DraftContext'
import { extractResourceSummary, annotateRisks, describeIngressEgressRules, getCategoryLabel, isEditableField, renderBlockValue } from './ResourceFormatter'
import { analyzeImpact, ImpactResult } from './ImpactAnalyzer'
import { ImpactSummaryPanel } from './ImpactSummaryPanel'
import ValueFlowView from './ValueFlowView'
import { analyzeOutputUsage } from './OutputUsageAnalyzer'
import OutputUsagePanel from './OutputUsagePanel'
import { analyzeDrift, DriftResult } from './DriftAnalyzer'
import DriftSummaryPanel from './DriftSummaryPanel'

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
  const [viewMode, setViewMode] = useState<'human' | 'json'>('human')
  const { draftMode, drafts, addDraft, getDraftsForResource, hasDraftForResource, impactMode, impactSource, setImpactSource } = useDrafts()

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

  // Analyze impact when impact source is set
  const impactResult = useMemo(() => {
    if (!impactMode || !impactSource || resolvedEdges.length === 0) return null
    // Build set of resources with draft changes
    const draftedResources: Set<string> = new Set(drafts.map((d) => d.resourceAddress))
    // Only count drafts as "potential changes" if Draft Mode is ON
    return analyzeImpact(impactSource, resolvedEdges, actionMap, draftMode ? draftedResources : new Set())
  }, [impactMode, impactSource, resolvedEdges, actionMap, draftMode, drafts])

  // Compute drift info from plan
  const driftResult: DriftResult | null = useMemo(() => {
    if (!plan) return null
    try {
      return analyzeDrift(plan)
    } catch (e) {
      return null
    }
  }, [plan])

  // Use dagre to compute an automatic layout
  function computeLayout(nodesIn: Array<any>, edgesIn: Array<any>, impact: ImpactResult | null = null, drift: DriftResult | null = null) {
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

    // Prepare quick lookup sets for drift/orphan
    const driftSet = new Set<string>((drift && drift.drifted ? drift.drifted.map((d) => d.address) : []))
    const orphanSet = new Set<string>((drift && drift.orphaned ? drift.orphaned.map((d) => d.address) : []))

    const positioned = nodesIn.map((n) => {
      const gd = g.node(n.id)
      const hasDraft = hasDraftForResource(n.id)
      
      // Determine impact classification if in impact mode
      let impactClass = 'none'
      let borderStyle = hasDraft ? '2px dashed #2563eb' : 'none'
      let opacity = 1
      
      if (impact) {
        if (n.id === impact.source) {
          impactClass = 'source'
          borderStyle = '3px solid #ef4444' // strong red border for source
        } else if (impact.direct.some((d) => d.address === n.id)) {
          impactClass = 'direct'
          borderStyle = '2px solid #2563eb' // bold blue border for direct impact
        } else if (impact.transitive.some((d) => d.address === n.id)) {
          impactClass = 'transitive'
          borderStyle = '2px dashed #2563eb' // dashed blue border for transitive
        } else {
          impactClass = 'none'
          opacity = 0.4 // dim unrelated nodes
        }
      } else {
        // Apply drift/orphan styling when not in impact mode
        if (driftSet.has(n.id)) {
          // drifted: yellow outline
          borderStyle = '3px solid #f59e0b'
        }
        if (orphanSet.has(n.id)) {
          // orphaned: dashed red outline
          borderStyle = '2px dashed #ef4444'
          opacity = 0.9
        }
      }
      
      return {
        id: n.id,
        data: n.data,
        position: { x: gd.x - NODE_WIDTH / 2, y: gd.y - NODE_HEIGHT / 2 },
        style: { 
          background: actionToColor(n.data?.action || null), 
          color: '#fff', 
          padding: 8, 
          borderRadius: 6, 
          border: borderStyle,
          opacity: opacity
        },
      }
    })

    const rfEdges = edgesIn.map((e, i) => {
      let edgeStyle = { stroke: '#888', strokeWidth: 2 }
      
      // If in impact mode, fade unrelated edges and highlight impact paths
      if (impact) {
        const isSourceEdge = e.source === impact.source || impact.direct.some((d) => d.address === e.source)
        const isTargetImpacted = impact.all.some((d) => d.address === e.target)
        
        if (isSourceEdge && isTargetImpacted) {
          edgeStyle = { stroke: '#2563eb', strokeWidth: 3 } // highlight impact edges
        } else {
          edgeStyle = { stroke: '#ddd', strokeWidth: 1 } // fade unrelated edges
        }
      }
      
      return { id: `e${i}`, source: e.source, target: e.target, animated: true, arrowHeadType: 'arrowclosed', style: edgeStyle }
    })
    
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

  const { positioned: rfNodes, rfEdges } = useMemo(() => computeLayout(prelimNodes, resolvedEdges, impactResult), [prelimNodes, resolvedEdges, impactResult])

  // Find change object for selected node
  const selectedChange = useMemo(() => {
    if (!selected || !plan || !plan.resource_changes) return null
    return plan.resource_changes.find((r: any) => r.address === selected) || null
  }, [selected, plan])

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1, height: '60vh', border: '1px solid #eee' }}>
        <ReactFlow nodes={rfNodes} edges={rfEdges} onNodeClick={(_, node) => { 
          if (node && node.id) {
            if (impactMode) {
              setImpactSource(node.id)
            } else {
              setSelected(node.id)
            }
          }
        }} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      <div style={{ width: 360, border: '1px solid #eee', padding: 8, height: '60vh', overflow: 'auto' }}>
        {/* Impact Preview Mode: Show impact summary */}
        {impactMode ? (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Impact Preview</h4>
            <ImpactSummaryPanel impactResult={impactResult} draftMode={draftMode} />
          </div>
        ) : (
          <div>
            {/* Normal Mode: Show resource details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>Resource Details{hasDraftForResource(selected || '') ? <span className="node-draft-badge">Draft</span> : null}</h4>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setViewMode('human')} style={{ padding: '4px 8px', background: viewMode === 'human' ? '#2563eb' : '#ddd', color: viewMode === 'human' ? '#fff' : '#000', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Human</button>
                <button onClick={() => setViewMode('json')} style={{ padding: '4px 8px', background: viewMode === 'json' ? '#2563eb' : '#ddd', color: viewMode === 'json' ? '#fff' : '#000', border: 'none', borderRadius: 4, cursor: 'pointer' }}>JSON</button>
              </div>
            </div>
            {selected ? (
              <div>
                {viewMode === 'human' ? (
                  <HumanResourceView selectedChange={selectedChange} selected={selected} draftMode={draftMode} getDraftsForResource={getDraftsForResource} addDraft={addDraft} plan={plan} resolvedEdges={resolvedEdges} />
                ) : (
                  <RawJsonView selectedChange={selectedChange} />
                )}
              </div>
            ) : (
              <div>Select a node to see details</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface RawJsonViewProps {
  selectedChange: any
}

function RawJsonView({ selectedChange }: RawJsonViewProps) {
  return <pre style={{ background: '#f7f7f7', padding: 8, fontSize: 12 }}>{JSON.stringify(selectedChange ? selectedChange.change : {}, null, 2)}</pre>
}

interface HumanResourceViewProps {
  selectedChange: any
  selected: string
  draftMode: boolean
  getDraftsForResource: (address: string) => any[]
  addDraft: (draft: any) => void
}
 
function HumanResourceView({ selectedChange, selected, draftMode, getDraftsForResource, addDraft, plan, resolvedEdges }: HumanResourceViewProps & { plan?: any; resolvedEdges?: Array<{ source: string; target: string }> }) {
  if (!selectedChange) return <div>No change data available</div>

  const summary = extractResourceSummary(selectedChange)
  const config = selectedChange.change?.after || {}
  const before = selectedChange.change?.before || {}
  const action = selectedChange.change?.actions ? selectedChange.change.actions.join(', ') : 'n/a'

  // Group fields by category
  const categories: Record<string, Record<string, any>> = {}
  const fieldCategories = new Map<string, string>([
    ['ingress', 'Security'],
    ['egress', 'Security'],
    ['vpc_id', 'Networking'],
    ['subnet_id', 'Networking'],
    ['availability_zone', 'Metadata'],
    ['tags', 'Metadata'],
    ['name', 'Metadata'],
    ['description', 'Metadata'],
    ['publicly_accessible', 'Security'],
    ['engine', 'Database'],
    ['db_name', 'Database'],
    ['master_username', 'Database'],
  ])

  // Organize config fields by category
  Object.entries(config).forEach(([key, value]) => {
    if (isEditableField(key) && typeof value !== 'object') {
      const category = getCategoryLabel(key)
      if (!categories[category]) categories[category] = {}
      categories[category][key] = value
    }
  })

  // Per-attribute trace toggles
  const [traceOpen, setTraceOpen] = React.useState<Record<string, boolean>>({})
  function toggleTrace(attr: string) {
    setTraceOpen((s) => ({ ...s, [attr]: !s[attr] }))
  }

  // Output usage UI state
  const [showOutputUsage, setShowOutputUsage] = React.useState(false)
  const [outputUsageResult, setOutputUsageResult] = React.useState<any>(null)
  function handleShowOutputUsage() {
    if (!plan || !selected) return
    const identifier = selected.startsWith('module.') ? selected : `module.${selected}`
    try {
      const res = analyzeOutputUsage(plan, identifier, resolvedEdges)
      setOutputUsageResult(res)
      setShowOutputUsage(true)
    } catch (e) {
      setOutputUsageResult(null)
      setShowOutputUsage(true)
    }
  }

  // Get risks
  const risks = annotateRisks(summary.resourceType, config)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #ddd' }}>
        <div style={{ fontSize: 12, color: '#666' }}>{summary.resourceType}</div>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>{summary.resourceName || summary.address}</div>
        <div style={{ fontSize: 11, color: '#999' }}>Module: {summary.moduleCtx || '(root)'}</div>
        <div style={{ marginTop: 4, padding: '4px 6px', background: action.includes('create') ? '#e8f5e9' : action.includes('delete') ? '#ffebee' : '#e3f2fd', borderRadius: 3, fontSize: 11 }}>
          <strong>Action:</strong> {action}
        </div>
        {plan && (selected?.startsWith('module.') || (plan.configuration && plan.configuration.root_module && Object.keys(plan.configuration.root_module.outputs || {}).length > 0)) && (
          <div style={{ marginTop: 8 }}>
            <button onClick={handleShowOutputUsage} style={{ padding: '6px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', background: '#f3f4f6' }}>Show Output Usage</button>
            {showOutputUsage && <div style={{ marginTop: 8 }}><OutputUsagePanel result={outputUsageResult} /></div>}
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>Summary</div>
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          {summary.afterConfig?.description && <div><strong>Description:</strong> {summary.afterConfig.description}</div>}
          {summary.afterConfig?.engine && <div><strong>Engine:</strong> {summary.afterConfig.engine}</div>}
          {summary.afterConfig?.instance_type && <div><strong>Type:</strong> {summary.afterConfig.instance_type}</div>}
        </div>
      </div>

      {/* Configuration sections */}
      {Object.entries(categories).map(([category, fields]) => (
        <details key={category} style={{ marginBottom: 8 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 12, paddingBottom: 4 }}>
            {category} ({Object.keys(fields).length})
          </summary>
          <div style={{ paddingLeft: 12, fontSize: 11 }}>
            {Object.entries(fields).map(([key, value]) => {
              const draft = getDraftsForResource(selected).find((d) => d.attributePath === key)
              const displayVal = draft ? draft.newValue : value
              return (
                <div key={key} style={{ marginBottom: 6, padding: 4, background: draft ? '#fef3c7' : 'transparent', borderRadius: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <div style={{ fontWeight: 'bold' }}>{key}</div>
                    <div>
                      <button onClick={() => toggleTrace(key)} style={{ padding: '2px 6px', fontSize: 11, marginRight: 6 }}>{traceOpen[key] ? 'Hide Flow' : 'Trace'}</button>
                    </div>
                  </div>
                  {draftMode ? (
                    <input
                      value={String(displayVal)}
                      onChange={(e) =>
                        addDraft({
                          resourceAddress: selected,
                          attributePath: key,
                          oldValue: value,
                          newValue: e.target.value,
                          source: 'resource',
                        })
                      }
                      style={{
                        width: '100%',
                        padding: 4,
                        border: '1px solid #ccc',
                        borderRadius: 2,
                        fontSize: 11,
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <div style={{ color: '#444' }}>{renderBlockValue(value)}</div>
                  )}

                  {traceOpen[key] && (
                    <div style={{ marginTop: 8 }}>
                      <ValueFlowView plan={plan} resourceAddress={selected} attribute={key} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </details>
      ))}

      {/* Risks */}
      {risks.length > 0 && (
        <div style={{ marginBottom: 8, padding: 8, background: '#fef3c7', borderRadius: 3, border: '1px solid #fcd34d' }}>
          <div style={{ fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>⚠️ Insights</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
            {risks.map((risk, idx) => (
              <li key={idx}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Advanced section */}
      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 11, color: '#666' }}>Advanced</summary>
        <div style={{ paddingLeft: 12, marginTop: 6, fontSize: 10 }}>
          <div style={{ marginBottom: 6 }}>
            <strong>Address:</strong> <code style={{ background: '#f0f0f0', padding: 2, borderRadius: 2 }}>{selected}</code>
          </div>
          {before && Object.keys(before).length > 0 && (
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 10, color: '#666' }}>Before (Previous State)</summary>
              <pre style={{ background: '#f7f7f7', padding: 4, fontSize: 9, overflow: 'auto', maxHeight: 150 }}>{JSON.stringify(before, null, 2)}</pre>
            </details>
          )}
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 10, color: '#666' }}>Raw Configuration</summary>
            <pre style={{ background: '#f7f7f7', padding: 4, fontSize: 9, overflow: 'auto', maxHeight: 150 }}>{JSON.stringify(config, null, 2)}</pre>
          </details>
        </div>
      </details>
    </div>
  )
}
