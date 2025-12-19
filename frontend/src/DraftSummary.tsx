import React from 'react'
import { useDrafts } from './DraftContext'

export default function DraftSummary() {
  const { drafts, revertDraft, clearDrafts } = useDrafts()
  if (!drafts || drafts.length === 0) return <div style={{ padding: 8, fontSize: 12, color: 'var(--muted)' }}>No draft changes</div>

  const byResource: Record<string, any[]> = {}
  for (const d of drafts) {
    byResource[d.resourceAddress] = byResource[d.resourceAddress] || []
    byResource[d.resourceAddress].push(d)
  }

  return (
    <div className="panel" style={{ padding: 12, borderRadius: 6 }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Draft Changes</h3>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>No changes applied — drafts are in-memory only.</div>
      <div style={{ marginBottom: 12 }}>
        {Object.keys(byResource).map((res) => (
          <div key={res} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--muted-border)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{res}</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
              {byResource[res].map((d: any) => (
                <li key={d.id} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <code className="inline-code">{d.attributePath}</code>
                    : <span style={{ textDecoration: 'line-through', color: 'var(--muted)', marginLeft: 6 }}>{String(d.oldValue)}</span> → <strong style={{ marginLeft: 6, color: 'var(--draft)' }}>{String(d.newValue)}</strong>
                  </span>
                  <button onClick={() => revertDraft(d.id)} style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 3, border: '1px solid var(--muted-border)', background: 'transparent', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>Revert</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button onClick={() => clearDrafts()} style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid var(--delete)', background: 'transparent', color: 'var(--delete)', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }}>Clear all drafts</button>
    </div>
  )
}
