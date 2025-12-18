import React, { useMemo } from 'react'
import { getValueFlow, FlowStep } from './ValueFlowAnalyzer'

export default function ValueFlowView({ plan, resourceAddress, attribute }: { plan: any; resourceAddress: string; attribute: string }) {
  const steps: FlowStep[] = useMemo(() => getValueFlow(plan, resourceAddress, attribute), [plan, resourceAddress, attribute])

  return (
    <div style={{ marginTop: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Value Flow</div>
      {steps.length === 0 && <div style={{ color: '#666' }}>No flow information available</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 10, textAlign: 'center' }}>{i === 0 ? '•' : '←'}</div>
            <div>
              <div style={{ fontWeight: 'bold' }}>{s.kind}</div>
              <div style={{ color: '#444', fontSize: 12 }}>{s.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
