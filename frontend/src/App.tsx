import React, { useEffect, useState } from 'react'
import { fetchPlan, fetchGraph, postWorkspace, getWorkspace } from './api'
import PlanSummary from './PlanSummary'
import PlanJsonViewer from './PlanJsonViewer'
import FlowView from './FlowView'

export default function App() {
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
      <h2>Terraform Plan & Visualization (READ-ONLY)</h2>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
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
