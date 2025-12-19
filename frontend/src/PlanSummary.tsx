import React from 'react'

export default function PlanSummary({ summary }: { summary: any }) {
  if (!summary) return <div style={{ fontSize: 12, color: 'var(--muted)' }}>No summary</div>
  return (
    <div className="panel" style={{ padding: 12, borderRadius: 6 }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Plan Summary</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
        <div className="stat-box info">
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{summary.create}</div>
          <div style={{ fontSize: 11 }}>Creates</div>
        </div>
        <div className="stat-box info">
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{summary.update}</div>
          <div style={{ fontSize: 11 }}>Updates</div>
        </div>
        <div className="stat-box risk">
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{summary.delete}</div>
          <div style={{ fontSize: 11 }}>Deletes</div>
        </div>
        <div className="stat-box muted">
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{summary.no_change}</div>
          <div style={{ fontSize: 11 }}>Unchanged</div>
        </div>
      </div>
    </div>
  )
}
