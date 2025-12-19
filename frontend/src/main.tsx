import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DraftProvider } from './DraftContext'
import 'reactflow/dist/style.css'
import './styles/global.css'

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
  <DraftProvider>
    <App />
  </DraftProvider>
)
