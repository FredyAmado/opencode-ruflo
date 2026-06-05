import { useState } from 'react'
import Dashboard from './components/Dashboard.tsx'
import Agents from './components/Agents.tsx'
import Swarms from './components/Swarms.tsx'
import Memory from './components/Memory.tsx'
import Context from './components/Context.tsx'
import Plugins from './components/Plugins.tsx'

type Page = 'dashboard' | 'agents' | 'swarms' | 'memory' | 'context' | 'plugins'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  const nav = [
    { id: 'dashboard' as Page, label: 'Dashboard' },
    { id: 'agents' as Page, label: 'Agentes' },
    { id: 'swarms' as Page, label: 'Swarms' },
    { id: 'memory' as Page, label: 'Memoria' },
    { id: 'context' as Page, label: 'Contexto' },
    { id: 'plugins' as Page, label: 'Plugins' },
  ]

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Ruflo</h1>
        <nav>
          {nav.map(n => (
            <a key={n.id} href="#" className={page === n.id ? 'active' : ''}
              onClick={e => { e.preventDefault(); setPage(n.id) }}>
              {n.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="main">
        {page === 'dashboard' && <Dashboard />}
        {page === 'agents' && <Agents />}
        {page === 'swarms' && <Swarms />}
        {page === 'memory' && <Memory />}
        {page === 'context' && <Context />}
        {page === 'plugins' && <Plugins />}
      </main>
    </div>
  )
}
