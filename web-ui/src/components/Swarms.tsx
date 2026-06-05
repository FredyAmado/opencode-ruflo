import { useEffect, useState } from 'react'
import { api, Swarm, Task } from '../api.ts'

export default function Swarms() {
  const [swarms, setSwarms] = useState<Swarm[]>([])
  const [selected, setSelected] = useState<Swarm | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [name, setName] = useState('')
  const [topology, setTopology] = useState('hierarchical')
  const [workerIds, setWorkerIds] = useState('')
  const [objective, setObjective] = useState('')
  const [result, setResult] = useState('')
  const [agents, setAgents] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    api.swarms.list().then(setSwarms)
    api.agents.list().then(a => setAgents(a.map(x => ({ id: x.id, name: x.name }))))
  }, [])

  async function createSwarm() {
    const ids = workerIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    if (!name || ids.length === 0) return
    await api.swarms.create(name, topology, ids)
    setName(''); setWorkerIds('')
    api.swarms.list().then(setSwarms)
    setSelected(null)
  }

  async function executeSwarm(s: Swarm) {
    if (!objective) return
    setResult('Ejecutando swarm...')
    try {
      const r = await api.swarms.execute(s.id, objective)
      setResult(typeof r.result === 'string' ? r.result : JSON.stringify(r, null, 2))
      api.swarms.list().then(sr => setSwarms(sr))
      api.swarms.tasks(s.id).then(setTasks)
    } catch (e: any) { setResult(`Error: ${e.message}`) }
  }

  function viewSwarm(s: Swarm) {
    setSelected(s); setResult(''); setObjective('')
    api.swarms.tasks(s.id).then(setTasks).catch(() => setTasks([]))
  }

  function agentName(id: number): string {
    return agents.find(a => a.id === id)?.name || `agente #${id}`
  }

  return (
    <div>
      <h2>Swarms</h2>

      <div className="card">
        <h3>Crear Swarm</h3>
        <input placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} />
        <select value={topology} onChange={e => setTopology(e.target.value)}>
          <option value="hierarchical">Jerárquico</option>
          <option value="sequential">Secuencial</option>
          <option value="mesh">Mesh</option>
        </select>
        <input placeholder="IDs de agentes separados por coma (ej: 2,9,1)" value={workerIds} onChange={e => setWorkerIds(e.target.value)} />
        {agents.length > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Agentes disponibles: {agents.map(a => `${a.name}(${a.id})`).join(', ')}
          </div>
        )}
        <button onClick={createSwarm}>Crear</button>
      </div>

      <table>
        <thead><tr><th>ID</th><th>Nombre</th><th>Topología</th><th>Estado</th><th>Workers</th><th></th></tr></thead>
        <tbody>
          {swarms.map(s => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td><span className="badge badge-idle">{s.topology}</span></td>
              <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
              <td style={{ fontSize: '0.8rem' }}>{s.worker_ids}</td>
              <td><button className="small" onClick={() => viewSwarm(s)}>Ver</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <button className="secondary" onClick={() => setSelected(null)}>← Cerrar</button>
          <h3 style={{ marginTop: '0.5rem' }}>{selected.name}</h3>
          <p><strong>Topología:</strong> {selected.topology} | <strong>Estado:</strong> <span className={`badge badge-${selected.status}`}>{selected.status}</span></p>
          <p><strong>Workers:</strong> {selected.worker_ids}</p>

          {tasks.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>Tareas del Swarm ({tasks.length})</h3>
              {tasks.map(t => (
                <div key={t.id} className="card" style={{ marginBottom: '0.5rem', background: 'var(--surface2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span><strong>#{t.id}</strong> — {agentName(t.agent_id)}</span>
                    <span className={`badge badge-${t.status}`}>{t.status}</span>
                  </div>
                  {t.output && (
                    <pre style={{ fontSize: '0.8rem', maxHeight: '400px', background: '#00000055' }}>{t.output}</pre>
                  )}
                  {t.error && (
                    <pre style={{ fontSize: '0.8rem', color: 'var(--error)', background: '#00000055' }}>{t.error}</pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {selected.status === 'completed' && selected.result && (
            <div style={{ marginTop: '0.5rem' }}>
              <h3 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>Resultado Final</h3>
              <pre>{selected.result}</pre>
            </div>
          )}

          {selected.status !== 'running' && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Ejecutar:</strong>
              <div className="spawn-form">
                <input placeholder="Objetivo del swarm..." value={objective} onChange={e => setObjective(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeSwarm(selected)} />
                <button onClick={() => executeSwarm(selected)}>Ejecutar</button>
              </div>
              {result && <pre style={{ marginTop: '0.5rem' }}>{result}</pre>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
