import React from 'react'
import { useDrafts } from './DraftContext'

export default function DraftSummary() {
  const { drafts, revertDraft, clearDrafts } = useDrafts()
  if (!drafts || drafts.length === 0) return <div style={{ padding: 8 }}>No draft changes</div>

  const byResource: Record<string, any[]> = {}
  for (const d of drafts) {
    byResource[d.resourceAddress] = byResource[d.resourceAddress] || []
    byResource[d.resourceAddress].push(d)
  }

  return (
    <div style={{ padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
      <h3>Draft Changes</h3>
      <div style={{ fontSize: 12, color: '#555' }}>No changes applied — drafts are in-memory only.</div>
      <div style={{ marginTop: 8 }}>
        {Object.keys(byResource).map((res) => (
          <div key={res} style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>{res}</div>
            <ul>
              {byResource[res].map((d: any) => (
                <li key={d.id} style={{ marginBottom: 4 }}>
                  <code style={{ background: '#f7f7f7', padding: '2px 6px' }}>{d.attributePath}</code>
                  : <span style={{ textDecoration: 'line-through', color: '#777', marginLeft: 6 }}>{String(d.oldValue)}</span> → <strong style={{ marginLeft: 6 }}>{String(d.newValue)}</strong>
                  <button onClick={() => revertDraft(d.id)} style={{ marginLeft: 8 }}>Revert</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={() => clearDrafts()}>Clear all drafts</button>
      </div>
    </div>
  )
}
