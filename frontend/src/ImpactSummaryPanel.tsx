import React from 'react'
import { ImpactResult } from './ImpactAnalyzer'

interface ImpactSummaryPanelProps {
  impactResult: ImpactResult | null
  draftMode: boolean
}

export function ImpactSummaryPanel({ impactResult, draftMode }: ImpactSummaryPanelProps) {
  if (!impactResult) {
    return (
      <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 16 }}>
        Click a resource in Impact Preview mode to analyze blast radius
      </div>
    )
  }

  const directCount = impactResult.direct.length
  const transitiveCount = impactResult.transitive.length
  const totalImpacted = directCount + transitiveCount

  // Check for destructive warnings
  const hasDestructiveWarnings = impactResult.all.some((node) => node.warnings?.some((w) => w.includes('Destructive') || w.includes('Forced')))

  return (
    <div style={{ fontSize: 12 }}>
      {/* Impact summary header */}
      <div style={{ background: '#fef3c7', padding: 10, borderRadius: 4, marginBottom: 12, border: '1px solid #fcd34d' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>📍 Blast Radius Analysis</div>
        <div style={{ fontSize: 11, color: '#666' }}>Source: <code style={{ background: '#f0f0f0', padding: 2, borderRadius: 2 }}>{impactResult.source}</code></div>
        {draftMode && (
          <div style={{ fontSize: 11, color: '#d97706', marginTop: 4, fontStyle: 'italic' }}>⚠️ Including hypothetical draft changes</div>
        )}
      </div>

      {/* Impact counts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#dbeafe', padding: 8, borderRadius: 4, textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: 16, color: '#0284c7' }}>{directCount}</div>
          <div style={{ fontSize: 10, color: '#0369a1' }}>Direct Impacts</div>
        </div>
        <div style={{ background: '#dbeafe', padding: 8, borderRadius: 4, textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontWeight: 'bold', fontSize: 16, color: '#0284c7' }}>{transitiveCount}</div>
          <div style={{ fontSize: 10, color: '#0369a1' }}>Transitive Impacts</div>
        </div>
      </div>

      {/* Destructive warning banner */}
      {hasDestructiveWarnings && (
        <div style={{ background: '#fee2e2', padding: 8, borderRadius: 4, marginBottom: 12, border: '1px solid #fca5a5' }}>
          <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: 11 }}>🔴 Destructive Changes Detected</div>
          <div style={{ fontSize: 10, color: '#991b1b', marginTop: 4 }}>Some impacted resources will be recreated or deleted</div>
        </div>
      )}

      {/* No impact case */}
      {totalImpacted === 0 && (
        <div style={{ background: '#dcfce7', padding: 8, borderRadius: 4, textAlign: 'center', border: '1px solid #86efac' }}>
          <div style={{ color: '#166534', fontSize: 11 }}>✓ No downstream impacts detected</div>
        </div>
      )}

      {/* Affected resources list */}
      {totalImpacted > 0 && (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #e5e7eb' }}>Affected Resources</div>

          {/* Direct impacts */}
          {directCount > 0 && (
            <details open style={{ marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 11, paddingBottom: 4, color: '#2563eb' }}>
                🔵 Direct Dependencies ({directCount})
              </summary>
              <div style={{ paddingLeft: 12, fontSize: 10 }}>
                {impactResult.direct.map((node) => (
                  <div key={node.address} style={{ marginBottom: 6, padding: 6, background: '#eff6ff', borderRadius: 2, borderLeft: '2px solid #2563eb' }}>
                    <div style={{ fontWeight: 'bold', wordBreak: 'break-word', marginBottom: 2 }}>{node.address}</div>
                    {node.action && <div style={{ fontSize: 9, color: '#666' }}>Action: <strong>{node.action}</strong></div>}
                    {node.warnings && node.warnings.length > 0 && (
                      <div style={{ fontSize: 9, color: '#dc2626', marginTop: 2 }}>
                        {node.warnings.map((w, idx) => (
                          <div key={idx}>⚠️ {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Transitive impacts */}
          {transitiveCount > 0 && (
            <details open style={{ marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 11, paddingBottom: 4, color: '#2563eb' }}>
                ◇ Transitive Dependencies ({transitiveCount})
              </summary>
              <div style={{ paddingLeft: 12, fontSize: 10 }}>
                {impactResult.transitive.map((node) => (
                  <div key={node.address} style={{ marginBottom: 6, padding: 6, background: '#f0f9ff', borderRadius: 2, borderLeft: '2px dashed #2563eb' }}>
                    <div style={{ wordBreak: 'break-word', marginBottom: 2 }}>
                      {node.address} <span style={{ color: '#999', fontSize: 9 }}>(depth {node.depth})</span>
                    </div>
                    {node.action && <div style={{ fontSize: 9, color: '#666' }}>Action: <strong>{node.action}</strong></div>}
                    {node.warnings && node.warnings.length > 0 && (
                      <div style={{ fontSize: 9, color: '#dc2626', marginTop: 2 }}>
                        {node.warnings.map((w, idx) => (
                          <div key={idx}>⚠️ {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
