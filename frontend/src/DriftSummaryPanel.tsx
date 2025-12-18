import React from 'react'
import { DriftResult } from './DriftAnalyzer'

export default function DriftSummaryPanel({ drift }: { drift: DriftResult | null }) {
  if (!drift) return <div style={{ fontSize: 12, color: '#666', padding: 8 }}>No drift information available</div>

  const driftCount = drift.drifted.length
  const orphanCount = drift.orphaned.length

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Drift Summary</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#fee2e2', padding: 8, borderRadius: 4 }}>
          <div style={{ fontWeight: 'bold', color: '#991b1b' }}>{driftCount}</div>
          <div style={{ fontSize: 11, color: '#991b1b' }}>Drifted</div>
        </div>
        <div style={{ background: '#fff7ed', padding: 8, borderRadius: 4 }}>
          <div style={{ fontWeight: 'bold', color: '#92400e' }}>{orphanCount}</div>
          <div style={{ fontSize: 11, color: '#92400e' }}>Orphaned</div>
        </div>
      </div>

      {driftCount > 0 && (
        <details open style={{ marginBottom: 8 }}>
          <summary style={{ fontWeight: 'bold' }}>Drifted Resources ({driftCount})</summary>
          <div style={{ paddingLeft: 12, marginTop: 6 }}>
            {drift.drifted.map((d) => (
              <div key={d.address} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 'bold' }}>{d.address}</div>
                <div style={{ fontSize: 11, color: '#444' }}>{d.reason}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      {orphanCount > 0 && (
        <details open>
          <summary style={{ fontWeight: 'bold' }}>Orphaned Resources ({orphanCount})</summary>
          <div style={{ paddingLeft: 12, marginTop: 6 }}>
            {drift.orphaned.map((d) => (
              <div key={d.address} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 'bold' }}>{d.address}</div>
                <div style={{ fontSize: 11, color: '#444' }}>{d.reason}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
