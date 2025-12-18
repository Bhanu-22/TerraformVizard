import React, { createContext, useContext, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

export type Draft = {
  id: string
  resourceAddress: string
  attributePath: string
  oldValue: any
  newValue: any
  source: 'resource' | 'variable'
}

type DraftContextType = {
  drafts: Draft[]
  draftMode: boolean
  toggleDraftMode: () => void
  addDraft: (d: Omit<Draft, 'id'>) => Draft
  revertDraft: (id: string) => void
  clearDrafts: () => void
  getDraftsForResource: (address: string) => Draft[]
  hasDraftForResource: (address: string) => boolean
  impactMode: boolean
  toggleImpactMode: () => void
  impactSource: string | null
  setImpactSource: (address: string | null) => void
}

const DraftContext = createContext<DraftContextType | null>(null)

export function useDrafts() {
  const ctx = useContext(DraftContext)
  if (!ctx) throw new Error('useDrafts must be used within DraftProvider')
  return ctx
}

export const DraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [draftMode, setDraftMode] = useState<boolean>(false)
  const [impactMode, setImpactMode] = useState<boolean>(false)
  const [impactSource, setImpactSource] = useState<string | null>(null)

  function addDraft(d: Omit<Draft, 'id'>) {
    // remove any existing draft for same resource+attributePath
    const id = uuidv4()
    const created: Draft = { id, ...d }
    setDrafts((s) => {
      const filtered = s.filter((x) => !(x.resourceAddress === d.resourceAddress && x.attributePath === d.attributePath))
      return [...filtered, created]
    })
    return created
  }

  function revertDraft(id: string) {
    setDrafts((s) => s.filter((x) => x.id !== id))
  }

  function clearDrafts() {
    setDrafts([])
  }

  function getDraftsForResource(address: string) {
    return drafts.filter((d) => d.resourceAddress === address)
  }

  function hasDraftForResource(address: string) {
    return drafts.some((d) => d.resourceAddress === address)
  }

  function toggleDraftMode() {
    setDraftMode((v) => !v)
  }

  function toggleImpactMode() {
    setImpactMode((v) => !v)
    // Clear impact source when toggling off
    if (impactMode) {
      setImpactSource(null)
    }
  }

  return (
    <DraftContext.Provider value={{ drafts, draftMode, toggleDraftMode, addDraft, revertDraft, clearDrafts, getDraftsForResource, hasDraftForResource, impactMode, toggleImpactMode, impactSource, setImpactSource }}>
      {children}
    </DraftContext.Provider>
  )
}
