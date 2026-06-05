import { useEffect, useState } from 'react'
import { api, Plugin } from '../api.ts'

export default function Plugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([])

  function load() { api.plugins.list().then(setPlugins) }
  useEffect(load, [])

  async function toggle(p: Plugin) {
    if (p.enabled) await api.plugins.disable(p.name)
    else await api.plugins.enable(p.name)
    load()
  }

  async function scan() {
    await api.plugins.scan()
    load()
  }

  return (
    <div>
      <h2>Plugins</h2>
      <button onClick={scan} style={{ marginBottom: '1rem' }}>Escanear directorios</button>

      <table>
        <thead><tr><th>Plugin</th><th>Versión</th><th>Agentes</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {plugins.map(p => (
            <tr key={p.id}>
              <td>
                <strong>{p.name}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.description}</div>
              </td>
              <td>v{p.version}</td>
              <td>{p.agent_count}</td>
              <td>
                <span className={`badge ${p.enabled ? 'badge-completed' : 'badge-failed'}`}>
                  {p.enabled ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>
                <button className={`small ${p.enabled ? 'danger' : 'secondary'}`} onClick={() => toggle(p)}>
                  {p.enabled ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {plugins.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          No hay plugins instalados. Crea directorios en <code>plugins/</code> con su <code>plugin.json</code> y haz clic en "Escanear directorios".
        </div>
      )}
    </div>
  )
}
