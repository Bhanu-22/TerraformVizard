import React from 'react'

export default function PlanJsonViewer({ plan }: { plan: any }) {
  if (!plan) return <div>No plan loaded</div>
  return (
    <div style={{ padding: 8 }}>
      <h3>Raw Plan JSON</h3>
      <pre style={{ maxHeight: '40vh', overflow: 'auto', background: '#f7f7f7', padding: 8 }}>
        {JSON.stringify(plan, null, 2)}
      </pre>
    </div>
  )
}
