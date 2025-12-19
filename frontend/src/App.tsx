import React, { useEffect, useState } from 'react'
import { fetchPlan, fetchGraph, postWorkspace, getWorkspace } from './api'
import PlanSummary from './PlanSummary'
import PlanJsonViewer from './PlanJsonViewer'
import FlowView from './FlowView'
import { useDrafts } from './DraftContext'
import DraftSummary from './DraftSummary'
import './styles.css'

export default function App() {
  const { draftMode, toggleDraftMode, impactMode, toggleImpactMode } = useDrafts()
  const [planData, setPlanData] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [dot, setDot] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [workspacePath, setWorkspacePath] = useState<string>('')
  const [workspaceInput, setWorkspaceInput] = useState<string>('')
  const [workspaceLoading, setWorkspaceLoading] = useState(false)

  async function onPlan() {
    try {
      setLoading(true)
      const p = await fetchPlan()
      setPlanData(p.plan)
      setSummary(p.summary)
      const g = await fetchGraph()
      setDot(g.dot)
    } catch (err: any) {
      alert(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // fetch current workspace on mount
    getWorkspace().then((r) => setWorkspacePath(r.workspace)).catch(() => {})
  }, [])

  async function onLoadWorkspace() {
    try {
      setWorkspaceLoading(true)
      const res = await postWorkspace(workspaceInput)
      setWorkspacePath(res.workspace)
      alert('Workspace loaded: ' + res.workspace)
    } catch (err: any) {
      alert(err.message || String(err))
    } finally {
      setWorkspaceLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--muted-border)' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Terraform Vizard</h2>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <label style={{ marginRight: 8, color: 'var(--muted)' }}><strong>Draft Mode:</strong></label>
            <button onClick={toggleDraftMode} className="badge draft" style={{ padding: '4px 8px', marginLeft: 4, fontWeight: 'bold' }}>{draftMode ? 'ON' : 'OFF'}</button>
          </div>
          <div>
            <label style={{ marginRight: 8, color: 'var(--muted)' }}><strong>Impact Preview:</strong></label>
            <button onClick={toggleImpactMode} className="badge info" style={{ padding: '4px 8px', marginLeft: 4, fontWeight: 'bold' }}>{impactMode ? 'ON' : 'OFF'}</button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input value={workspaceInput} onChange={(e) => setWorkspaceInput(e.target.value)} placeholder="Enter absolute path to Terraform folder" style={{ width: 520, padding: '8px 12px', background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
        <button onClick={onLoadWorkspace} disabled={workspaceLoading} style={{ padding: '8px 12px', background: 'var(--accent)', color: 'var(--text)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>{workspaceLoading ? 'Loading...' : 'Load Workspace'}</button>
        <button onClick={onPlan} disabled={loading || !workspacePath} style={{ padding: '8px 12px', background: 'var(--accent)', color: 'var(--text)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', opacity: loading || !workspacePath ? 0.6 : 1 }}>
          {loading ? 'Planning...' : 'Plan'}
        </button>
      </div>

      <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--muted-border)' }}><strong style={{ color: 'var(--muted)' }}>Active workspace:</strong> <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{workspacePath || '(none)'}</span></div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12 }}>
        <div>
          <PlanSummary summary={summary} />
          <div style={{ marginTop: 12 }}>
            <DraftSummary />
          </div>
          <div style={{ marginTop: 12 }}>
            <PlanJsonViewer plan={planData} />
          </div>
        </div>

        <div>
          <FlowView dot={dot} plan={planData} />
        </div>
      </div>
    </div>
  )
}
