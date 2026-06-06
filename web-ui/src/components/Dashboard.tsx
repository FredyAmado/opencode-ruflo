import { useEffect, useState } from 'react'
import { api, Agent, Swarm, Observation, Plugin, StatsResponse } from '../api.ts'

function fmt(n: number): string {
  return n.toLocaleString()
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [swarms, setSwarms] = useState<Swarm[]>([])
  const [observations, setObservations] = useState<Observation[]>([])
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [health, setHealth] = useState<string>('')

  useEffect(() => {
    api.health().then(h => setHealth(`${h.status} v${h.version}`)).catch(() => setHealth('offline'))
    api.agents.list().then(setAgents).catch(() => {})
    api.swarms.list().then(setSwarms).catch(() => {})
    api.observations.list({ limit: 5 }).then(setObservations).catch(() => {})
    api.plugins.list().then(setPlugins).catch(() => {})
    api.stats.get().then(setStats).catch(() => {})
  }, [])

  const running = agents.filter(a => a.status === 'running').length
  const completedSwarms = swarms.filter(s => s.status === 'completed').length

  return (
    <div>
      <h2>Dashboard</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Worker: {health} — {agents.length} agentes, {swarms.length} swarms, {plugins.length} plugins
      </p>

      {/* Token stats */}
      <div className="stat-grid">
        <div className="stat"><div className="num">{stats ? fmt(stats.tokens.input) : '—'}</div><div className="label">Tokens Input</div></div>
        <div className="stat"><div className="num">{stats ? fmt(stats.tokens.output) : '—'}</div><div className="label">Tokens Output</div></div>
        <div className="stat"><div className="num">{stats ? fmt(stats.tokens.cache) : '—'}</div><div className="label">Cache Hits</div></div>
        <div className="stat"><div className="num">{stats ? `$${stats.tokens.cost.toFixed(4)}` : '—'}</div><div className="label">Costo Est.</div></div>
      </div>

      {/* Agent & Skill usage */}
      <div className="stat-grid" style={{ marginTop: '0.75rem' }}>
        <div className="stat"><div className="num">{agents.length}</div><div className="label">Agentes</div></div>
        <div className="stat"><div className="num">{stats ? stats.agents.used : '—'}</div><div className="label">Usados</div></div>
        <div className="stat"><div className="num">{running}</div><div className="label">Activos</div></div>
        <div className="stat"><div className="num">{stats ? stats.skills.installed : '—'}</div><div className="label">Skills Instalados</div></div>
        <div className="stat"><div className="num">{stats ? stats.skills.used : '—'}</div><div className="label">Skills Usados</div></div>
        <div className="stat"><div className="num">{stats ? stats.skills.unusedCount : '—'}</div><div className="label">Skills Sin Uso</div></div>
      </div>

      {/* Balance cards */}
      <div className="stat-grid" style={{ marginTop: '0.75rem' }}>
        <div className="stat">
          <div className="num" style={{ color: 'var(--accent)' }}>
            {stats?.balances.openrouter !== null && stats?.balances.openrouter !== undefined
              ? `$${stats.balances.openrouter.toFixed(2)}`
              : '—'}
          </div>
          <div className="label">OpenRouter</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: 'var(--accent)' }}>
            {stats?.balances.imagerouter !== null && stats?.balances.imagerouter !== undefined
              ? `$${stats.balances.imagerouter.toFixed(2)}`
              : '—'}
          </div>
          <div className="label">ImageRouter</div>
        </div>
        <div className="stat"><div className="num">{swarms.length}</div><div className="label">Swarms</div></div>
        <div className="stat"><div className="num">{completedSwarms}</div><div className="label">Completados</div></div>
        <div className="stat"><div className="num">{observations.length}</div><div className="label">Observaciones</div></div>
        <div className="stat"><div className="num">{plugins.length}</div><div className="label">Plugins</div></div>
      </div>

      <div className="grid" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <h3>Últimas observaciones</h3>
          {observations.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sin datos</p>}
          {observations.map(o => (
            <div key={o.id} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span className={`badge badge-${o.type}`} style={{ marginRight: '0.5rem' }}>{o.type}</span>
              {o.content.substring(0, 80)}...
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Swarms recientes</h3>
          {swarms.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sin datos</p>}
          {swarms.slice(0, 5).map(s => (
            <div key={s.id} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span className={`badge badge-${s.status}`} style={{ marginRight: '0.5rem' }}>{s.status}</span>
              {s.name} [{s.topology}]
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
