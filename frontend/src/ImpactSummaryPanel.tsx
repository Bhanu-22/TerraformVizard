import React from 'react'
import { ImpactResult } from './ImpactAnalyzer'
import { explainWhyForImpact, explainRefactorWarning } from './explainWhy'

interface ImpactSummaryPanelProps {
  impactResult: ImpactResult | null
  draftMode: boolean
  plan?: any
  resolvedEdges?: Array<{ source: string; target: string }>
}

export function ImpactSummaryPanel({ impactResult, draftMode, plan, resolvedEdges }: ImpactSummaryPanelProps) {
  if (!impactResult) {
    return (
      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 16 }}>
        Click a resource in Impact Preview mode to analyze blast radius
      </div>
    )
  }

  const directCount = impactResult.direct.length
  const transitiveCount = impactResult.transitive.length
  const totalImpacted = directCount + transitiveCount

  // Check for destructive warnings
  const hasDestructiveWarnings = impactResult.all.some((node) => node.warnings?.some((w) => w.includes('Destructive') || w.includes('Forced')))

  // Build explanations (conservative)
  let explanations: any[] = []
  if (impactResult && plan && resolvedEdges) {
    try {
      explanations = explainWhyForImpact(impactResult, plan, resolvedEdges)
    } catch (e) {
      explanations = []
    }
  }

  return (
    <div style={{ fontSize: 12 }}>
      {/* Impact summary header */}
      <div className="section" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>📍 Blast Radius Analysis</div>
        <div className="ty-label">Source: <code className="inline-code">{impactResult.source}</code></div>
        {draftMode && (
          <div className="badge caution" style={{ marginTop: 6, display: 'inline-block' }}>⚠️ Including hypothetical draft changes</div>
        )}
      </div>

      {/* Impact counts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div className="stat-box primary">
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{directCount}</div>
          <div style={{ fontSize: 10 }}>Direct Impacts</div>
        </div>
        <div className="stat-box primary" style={{ borderStyle: 'dashed' }}>
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{transitiveCount}</div>
          <div style={{ fontSize: 10 }}>Transitive Impacts</div>
        </div>
      </div>

      {/* Destructive warning banner */}
      {hasDestructiveWarnings && (
        <div className="stat-box risk" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 11 }}>🔴 Destructive Changes Detected</div>
          <div style={{ fontSize: 10, marginTop: 4 }}>Some impacted resources will be recreated or deleted</div>
        </div>
      )}

      {/* No impact case */}
      {totalImpacted === 0 && (
        <div className="stat-box muted" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11 }}>✓ No downstream impacts detected</div>
        </div>
      )}

      {/* Affected resources list */}
      {totalImpacted > 0 && (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--muted-border)' }}>Affected Resources</div>

          {/* Direct impacts */}
          {directCount > 0 && (
            <details open style={{ marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 11, paddingBottom: 4, color: 'var(--draft)' }}>
                🔵 Direct Dependencies ({directCount})
              </summary>
              <div style={{ paddingLeft: 12, fontSize: 10 }}>
                {impactResult.direct.map((node) => (
                  <div key={node.address} style={{ marginBottom: 6, padding: 6, background: 'rgba(31,111,235,0.04)', borderRadius: 2, borderLeft: '2px solid var(--draft)' }}>
                    <div style={{ fontWeight: 'bold', wordBreak: 'break-word', marginBottom: 2 }}>{node.address}</div>
                    {node.action && <div style={{ fontSize: 9, color: 'var(--muted)' }}>Action: <strong>{node.action}</strong></div>}
                    {node.warnings && node.warnings.length > 0 && (
                      <div style={{ fontSize: 9, color: 'var(--delete)', marginTop: 2 }}>
                        {node.warnings.map((w, idx) => (
                          <div key={idx}>
                            <div>⚠️ {w}</div>
                            {/* Attach a conservative "Why?" explainer for refactor-like warnings */}
                            {plan && resolvedEdges && (() => {
                              try {
                                const reasons = explainRefactorWarning({ name: w, subjectAddress: node.address }, plan, resolvedEdges)
                                if (reasons && reasons.length > 0) {
                                  return (
                                    <details style={{ marginTop: 4 }}>
                                      <summary style={{ cursor: 'pointer', fontSize: 11 }}>Why?</summary>
                                        <div style={{ paddingLeft: 8, fontSize: 11 }}>
                                                    {reasons.map((r, i) => (
                                                      <div key={i} style={{ marginBottom: 6 }}>
                                                        <div className="explain-why">{r.explanation}</div>
                                                        {r.path && <div style={{ color: 'var(--muted)', fontSize: 11 }}>Path: {r.path.join(' → ')}</div>}
                                                      </div>
                                                    ))}
                                        </div>
                                    </details>
                                  )
                                }
                              } catch (e) {
                                return null
                              }
                              return null
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Explain-Why */}
                    {explanations && explanations.length > 0 && (() => {
                      const e = explanations.find((x) => x.subject === node.address)
                      if (e) {
                        return (
                          <details style={{ marginTop: 6 }}>
                            <summary style={{ cursor: 'pointer', fontSize: 11 }}>Why?</summary>
                            <div style={{ paddingLeft: 8, fontSize: 11 }}>
                              <div className="explain-why" style={{ marginBottom: 6 }}>{e.explanation}</div>
                              {e.path && (
                                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Path: {e.path.join(' → ')}</div>
                              )}
                            </div>
                          </details>
                        )
                      }
                      return null
                    })()}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Transitive impacts */}
          {transitiveCount > 0 && (
            <details open style={{ marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 11, paddingBottom: 4, color: 'var(--draft)' }}>
                ◇ Transitive Dependencies ({transitiveCount})
              </summary>
              <div style={{ paddingLeft: 12, fontSize: 10 }}>
                {impactResult.transitive.map((node) => (
                  <div key={node.address} style={{ marginBottom: 6, padding: 6, background: 'rgba(31,111,235,0.02)', borderRadius: 2, borderLeft: '2px dashed var(--draft)' }}>
                    <div style={{ wordBreak: 'break-word', marginBottom: 2 }}>
                      {node.address} <span style={{ color: 'var(--muted)', fontSize: 9 }}>(depth {node.depth})</span>
                    </div>
                    {node.action && <div style={{ fontSize: 9, color: 'var(--muted)' }}>Action: <strong>{node.action}</strong></div>}
                    {node.warnings && node.warnings.length > 0 && (
                      <div style={{ fontSize: 9, color: 'var(--delete)', marginTop: 2 }}>
                        {node.warnings.map((w, idx) => (
                          <div key={idx}>⚠️ {w}</div>
                        ))}
                      </div>
                    )}
                    {explanations && explanations.length > 0 && (() => {
                      const e = explanations.find((x) => x.subject === node.address)
                      if (e) {
                        return (
                          <details style={{ marginTop: 6 }}>
                            <summary style={{ cursor: 'pointer', fontSize: 11 }}>Why?</summary>
                            <div style={{ paddingLeft: 8, fontSize: 11 }}>
                              <div className="explain-why" style={{ marginBottom: 6 }}>{e.explanation}</div>
                              {e.path && (
                                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Path: {e.path.join(' → ')}</div>
                              )}
                            </div>
                          </details>
                        )
                      }
                      return null
                    })()}
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
