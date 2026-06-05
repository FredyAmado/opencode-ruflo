import { useEffect, useState } from 'react'
import { api, Agent, Task } from '../api.ts'

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selected, setSelected] = useState<Agent | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [spawnPrompt, setSpawnPrompt] = useState('')
  const [spawnRes, setSpawnRes] = useState('')
  const [agentType, setAgentType] = useState('general')
  const [agentName, setAgentName] = useState('')
  const [agentDesc, setAgentDesc] = useState('')

  useEffect(() => { api.agents.list().then(setAgents) }, [])

  function viewAgent(a: Agent) {
    setSelected(a)
    setSpawnRes('')
    api.agents.tasks(a.id).then(setTasks)
  }

  async function doSpawn() {
    if (!selected || !spawnPrompt) return
    setSpawnRes('Ejecutando...')
    try {
      const r = await api.agents.spawn(selected.id, spawnPrompt)
      setSpawnRes(r.response)
      api.agents.tasks(selected.id).then(setTasks)
    } catch (e: any) { setSpawnRes(`Error: ${e.message}`) }
  }

  async function createAgent() {
    if (!agentName) return
    const r = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: agentName, type: agentType, description: agentDesc }),
    })
    if (r.ok) {
      setAgentName(''); setAgentDesc('')
      api.agents.list().then(setAgents)
    }
  }

  return (
    <div>
      <h2>Agentes</h2>

      <div className="tabs">
        <button className={!selected ? 'active' : ''} onClick={() => setSelected(null)}>Lista</button>
        <button className="secondary" onClick={() => setSelected(null)}>+ Nuevo</button>
      </div>

      {!selected ? (
        <>
          <div className="card">
            <h3>Crear agente</h3>
            <input placeholder="Nombre" value={agentName} onChange={e => setAgentName(e.target.value)} />
            <select value={agentType} onChange={e => setAgentType(e.target.value)}>
              {['general','coder','tester','architect','reviewer','security','researcher','writer','devops','designer','planner'].map(t =>
                <option key={t} value={t}>{t}</option>
              )}
            </select>
            <textarea placeholder="Descripción" value={agentDesc} onChange={e => setAgentDesc(e.target.value)} />
            <button onClick={createAgent}>Crear</button>
          </div>

          <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Modelo</th><th></th></tr></thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.name}</td>
                  <td><span className="badge badge-idle">{a.type}</span></td>
                  <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.model || '(default)'}</td>
                  <td><button className="small" onClick={() => viewAgent(a)}>Ver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div>
          <button className="secondary" onClick={() => setSelected(null)}>← Volver</button>
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3>{selected.name}</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{selected.description}</p>
            <p><strong>Tipo:</strong> {selected.type} | <strong>Estado:</strong> <span className={`badge badge-${selected.status}`}>{selected.status}</span> | <strong>Modelo:</strong> {selected.model || '(default)'}</p>

            <div className="spawn-form">
              <input placeholder="Instrucción para el agente..." value={spawnPrompt}
                onChange={e => setSpawnPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSpawn()} />
              <button onClick={doSpawn}>Ejecutar</button>
            </div>
            {spawnRes && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Respuesta:</strong>
                <pre>{spawnRes}</pre>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Tareas recientes ({tasks.length})</h3>
            {tasks.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sin tareas</p>}
            {tasks.map(t => (
              <div key={t.id} style={{ marginBottom: '0.5rem', fontSize: '0.85rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span className={`badge badge-${t.status}`} style={{ marginRight: '0.5rem' }}>{t.status}</span>
                <strong>#{t.id}</strong> — {t.input.substring(0, 80)}...
                {t.output && <pre style={{ marginTop: '0.3rem' }}>{t.output.substring(0, 200)}</pre>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
