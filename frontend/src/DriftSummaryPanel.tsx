import React from 'react'
import { DriftResult } from './DriftAnalyzer'

export default function DriftSummaryPanel({ drift }: { drift: DriftResult | null }) {
  if (!drift) return <div style={{ fontSize: 12, color: 'var(--muted)', padding: 8 }}>No drift information available</div>

  const driftCount = drift.drifted.length
  const orphanCount = drift.orphaned.length

  return (
    <div style={{ fontSize: 12 }}>
      <div className="section" style={{ marginBottom: 12 }}><strong>Drift Summary</strong></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div className="stat-box risk">
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{driftCount}</div>
          <div style={{ fontSize: 11 }}>Drifted</div>
        </div>
        <div className="stat-box warn">
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{orphanCount}</div>
          <div style={{ fontSize: 11 }}>Orphaned</div>
        </div>
      </div>

      {driftCount > 0 && (
        <details open style={{ marginBottom: 12 }}>
          <summary style={{ fontWeight: 'bold', paddingBottom: 6, cursor: 'pointer' }}>Drifted Resources ({driftCount})</summary>
          <div style={{ paddingLeft: 12, marginTop: 6 }}>
            {drift.drifted.map((d) => (
              <div key={d.address} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--muted-border)' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{d.address}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.reason}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      {orphanCount > 0 && (
        <details open>
          <summary style={{ fontWeight: 'bold', paddingBottom: 6, cursor: 'pointer' }}>Orphaned Resources ({orphanCount})</summary>
          <div style={{ paddingLeft: 12, marginTop: 6 }}>
            {drift.orphaned.map((d) => (
              <div key={d.address} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--muted-border)' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{d.address}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.reason}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
