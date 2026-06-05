import { useEffect, useState } from 'react'
import { api, Observation } from '../api.ts'

export default function Memory() {
  const [observations, setObservations] = useState<Observation[]>([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('observation')

  function load() {
    const params: { q?: string; type?: string; limit?: number } = { limit: 50 }
    if (query) params.q = query
    if (typeFilter) params.type = typeFilter
    api.observations.list(params).then(setObservations)
  }

  useEffect(load, [query, typeFilter])

  async function addObservation() {
    if (!newContent) return
    await api.observations.create({ type: newType, content: newContent, tags: ['manual'] })
    setNewContent(''); load()
  }

  return (
    <div>
      <h2>Memoria</h2>

      <div className="grid">
        <div className="card">
          <h3>Añadir observación</h3>
          <select value={newType} onChange={e => setNewType(e.target.value)}>
            {['observation','decision','learning','note'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <textarea placeholder="Contenido..." value={newContent} onChange={e => setNewContent(e.target.value)} />
          <button onClick={addObservation}>Guardar</button>
        </div>

        <div className="card">
          <h3>Buscar</h3>
          <input placeholder="Buscar en memoria..." value={query} onChange={e => setQuery(e.target.value)} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Todos los tipos</option>
            {['observation','interaction','decision','learning','swarm','error','summary','note'].map(t =>
              <option key={t} value={t}>{t}</option>
            )}
          </select>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{observations.length} resultados</div>
        </div>
      </div>

      <table>
        <thead><tr><th>ID</th><th>Tipo</th><th>Contenido</th><th>Fecha</th></tr></thead>
        <tbody>
          {observations.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td><span className={`badge badge-${o.type}`}>{o.type}</span></td>
              <td><pre style={{ margin: 0, maxHeight: '100px' }}>{o.content}</pre></td>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{o.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
