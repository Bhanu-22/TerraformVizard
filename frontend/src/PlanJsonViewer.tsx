import React from 'react'

export default function PlanJsonViewer({ plan }: { plan: any }) {
  if (!plan) return <div style={{ fontSize: 12, color: 'var(--muted)', padding: 12 }}>No plan loaded</div>
  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Raw Plan JSON</h3>
      <pre className="code-block" style={{ maxHeight: '40vh', overflow: 'auto', fontSize: 11 }}>
        {JSON.stringify(plan, null, 2)}
      </pre>
    </div>
  )
}
