import React from 'react'
import { OutputUsageResult } from './OutputUsageAnalyzer'

export default function OutputUsagePanel({ result }: { result: OutputUsageResult | null }) {
  if (!result) return <div style={{ fontSize: 12, color: 'var(--muted)', padding: 12 }}>No output usage data</div>

  return (
    <div style={{ fontSize: 12 }}>
      <div className="section" style={{ marginBottom: 12 }}><strong>Output Usage: <code className="inline-code">{result.identifier}</code></strong></div>

      <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--muted-border)' }}>
        <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>📦 Direct Modules ({result.directModules.length})</div>
        <div style={{ paddingLeft: 12, fontSize: 11 }}>
          {result.directModules.length === 0 ? <div style={{ color: 'var(--muted)' }}>None</div> : result.directModules.map((m) => <div key={m} style={{ marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{m}</div>)}
        </div>
      </div>

      <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--muted-border)' }}>
        <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>📝 Direct Resources ({result.directResources.length})</div>
        <div style={{ paddingLeft: 12, fontSize: 11 }}>
          {result.directResources.length === 0 ? <div style={{ color: 'var(--muted)' }}>None</div> : result.directResources.map((r) => <div key={r} style={{ marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{r}</div>)}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>🔗 Transitive Consumers ({result.transitiveResources.length})</div>
        <div style={{ paddingLeft: 12, fontSize: 11 }}>
          {result.transitiveResources.length === 0 ? <div style={{ color: 'var(--muted)' }}>None</div> : result.transitiveResources.map((r) => <div key={r} style={{ marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{r}</div>)}
        </div>
      </div>
    </div>
  )
}
