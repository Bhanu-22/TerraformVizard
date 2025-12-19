import React, { useMemo, useState } from 'react'
import { getValueFlow, FlowStep } from './ValueFlowAnalyzer'
import { explainValueFlow } from './explainWhy'

export default function ValueFlowView({ plan, resourceAddress, attribute }: { plan: any; resourceAddress: string; attribute: string }) {
  const steps: FlowStep[] = useMemo(() => getValueFlow(plan, resourceAddress, attribute), [plan, resourceAddress, attribute])
  const [showWhy, setShowWhy] = useState(false)
  const why = useMemo(() => explainValueFlow(steps, resourceAddress, attribute), [steps, resourceAddress, attribute])

  return (
    <div style={{ marginTop: 8, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold' }}>Value Flow</div>
        <button className="badge" onClick={() => setShowWhy((s) => !s)} style={{ padding: '4px 8px', fontSize: 11, fontWeight: 'bold' }}>{showWhy ? 'Hide Why?' : 'Why?'}</button>
      </div>
      {steps.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>No flow information available</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 8, borderLeft: i === 0 ? '2px solid var(--accent)' : '2px solid var(--muted-border)', paddingTop: 4, paddingBottom: 4 }}>
            <div style={{ width: 6, marginTop: 2, minWidth: 6 }}>{i === 0 ? '●' : '↑'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: 12 }}>{s.kind}</div>
              <div className="ty-label" style={{ fontSize: 11, marginTop: 2 }}>{s.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {showWhy && (
        <div style={{ marginTop: 12 }}>
          <div className="explain-why" style={{ padding: 8, marginBottom: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>Why?</div>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>{why.explanation}</div>
            {why.items && why.items.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 12 }}>
                {why.items.map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
