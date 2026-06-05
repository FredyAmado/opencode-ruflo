import { useEffect, useState } from 'react'
import { api } from '../api.ts'
import type { Context as ContextEntry } from '../api.ts'

export default function Context() {
  const [entries, setEntries] = useState<ContextEntry[]>([])
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => { api.context.list().then(setEntries) }, [])

  async function addEntry() {
    if (!newKey || !newValue) return
    await api.context.set(newKey, newValue, newDesc)
    setNewKey(''); setNewValue(''); setNewDesc('')
    api.context.list().then(setEntries)
  }

  async function updateEntry(key: string) {
    if (editing === key) {
      await api.context.set(key, newValue, newDesc)
      setEditing(null); setNewValue(''); setNewDesc('')
      api.context.list().then(setEntries)
    } else {
      const e = entries.find(x => x.key === key)
      if (e) { setEditing(key); setNewValue(e.value); setNewDesc(e.description || '') }
    }
  }

  async function deleteEntry(key: string) {
    await api.context.delete(key)
    api.context.list().then(setEntries)
  }

  return (
    <div>
      <h2>Contexto Compartido</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        El contexto compartido está disponible para todos los agentes y swarms.
      </p>

      <div className="card">
        <h3>{editing ? `Editando: ${editing}` : 'Nueva entrada'}</h3>
        {!editing && <input placeholder="Clave" value={newKey} onChange={e => setNewKey(e.target.value)} />}
        <input placeholder="Valor" value={newValue} onChange={e => setNewValue(e.target.value)} />
        <input placeholder="Descripción (opcional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
        <button onClick={editing ? () => updateEntry(editing) : addEntry}>
          {editing ? 'Actualizar' : 'Añadir'}
        </button>
        {editing && <button className="secondary" onClick={() => setEditing(null)}>Cancelar</button>}
      </div>

      <table>
        <thead><tr><th>Clave</th><th>Valor</th><th>Descripción</th><th></th></tr></thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.key}>
              <td><strong>{e.key}</strong></td>
              <td><pre style={{ margin: 0 }}>{e.value}</pre></td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{e.description || '-'}</td>
              <td>
                <button className="small secondary" onClick={() => updateEntry(e.key)}>Editar</button>
                <button className="small danger" onClick={() => deleteEntry(e.key)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
