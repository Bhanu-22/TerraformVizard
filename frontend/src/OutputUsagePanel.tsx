import React from 'react'
import { OutputUsageResult } from './OutputUsageAnalyzer'

export default function OutputUsagePanel({ result }: { result: OutputUsageResult | null }) {
  if (!result) return <div style={{ fontSize: 12, color: '#666', padding: 8 }}>No output usage data</div>

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Output Usage: {result.identifier}</div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold' }}>Direct Modules ({result.directModules.length})</div>
        <div style={{ paddingLeft: 12 }}>
          {result.directModules.length === 0 ? <div style={{ color: '#666' }}>None</div> : result.directModules.map((m) => <div key={m}>{m}</div>)}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold' }}>Direct Resources ({result.directResources.length})</div>
        <div style={{ paddingLeft: 12 }}>
          {result.directResources.length === 0 ? <div style={{ color: '#666' }}>None</div> : result.directResources.map((r) => <div key={r}>{r}</div>)}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 'bold' }}>Transitive Consumers ({result.transitiveResources.length})</div>
        <div style={{ paddingLeft: 12 }}>
          {result.transitiveResources.length === 0 ? <div style={{ color: '#666' }}>None</div> : result.transitiveResources.map((r) => <div key={r}>{r}</div>)}
        </div>
      </div>
    </div>
  )
}
