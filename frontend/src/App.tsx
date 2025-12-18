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
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Terraform Plan & Visualization (READ-ONLY)</h2>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <label style={{ marginRight: 8 }}><strong>Draft Mode:</strong></label>
            <button onClick={toggleDraftMode} style={{ padding: '6px 10px' }}>{draftMode ? 'ON' : 'OFF'}</button>
          </div>
          <div>
            <label style={{ marginRight: 8 }}><strong>Impact Preview:</strong></label>
            <button onClick={toggleImpactMode} style={{ padding: '6px 10px' }}>{impactMode ? 'ON' : 'OFF'}</button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input value={workspaceInput} onChange={(e) => setWorkspaceInput(e.target.value)} placeholder="Enter absolute path to Terraform folder" style={{ width: 520, padding: 8 }} />
        <button onClick={onLoadWorkspace} disabled={workspaceLoading} style={{ padding: '8px 12px' }}>{workspaceLoading ? 'Loading...' : 'Load Workspace'}</button>
        <button onClick={onPlan} disabled={loading || !workspacePath} style={{ padding: '8px 12px' }}>
          {loading ? 'Planning...' : 'Plan'}
        </button>
      </div>

      <div style={{ marginBottom: 8 }}><strong>Active workspace:</strong> {workspacePath || '(none)'}</div>

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
