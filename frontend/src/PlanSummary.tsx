import React from 'react'

export default function PlanSummary({ summary }: { summary: any }) {
  if (!summary) return <div>No summary</div>
  return (
    <div style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
      <h3>Plan Summary</h3>
      <div>Creates: {summary.create}</div>
      <div>Updates: {summary.update}</div>
      <div>Deletes: {summary.delete}</div>
      <div>No change: {summary.no_change}</div>
    </div>
  )
}
