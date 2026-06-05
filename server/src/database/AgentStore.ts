import { getDb } from './Database.js';

export interface Agent {
  id?: number;
  name: string;
  type: string;
  description: string;
  model: string | null;
  config: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export class AgentStore {
  getAll(): Agent[] {
    return getDb().query('SELECT * FROM agents ORDER BY name').all() as Agent[];
  }

  getById(id: number): Agent | null {
    return getDb().query('SELECT * FROM agents WHERE id = ?').get(id) as Agent | null;
  }

  getByName(name: string): Agent | null {
    return getDb().query('SELECT * FROM agents WHERE name = ?').get(name) as Agent | null;
  }

  create(agent: Agent): number {
    const result = getDb().query(
      `INSERT INTO agents (name, type, description, model, config, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
    ).get(agent.name, agent.type, agent.description, agent.model || null, agent.config, agent.status || 'idle') as { id: number };
    return result.id;
  }

  update(id: number, updates: Partial<Agent>): void {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    getDb().query(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  delete(id: number): void {
    getDb().query('DELETE FROM agents WHERE id = ?').run(id);
  }

  upsertFromDefinition(name: string, def: { type?: string; description?: string; model?: string }): void {
    const existing = this.getByName(name);
    if (existing) {
      this.update(existing.id!, { 
        type: def.type || existing.type,
        description: def.description || existing.description,
        model: def.model || existing.model,
      });
    } else {
      this.create({
        name,
        type: def.type || 'general',
        description: def.description || '',
        model: def.model || null,
        config: '{}',
        status: 'idle',
      });
    }
  }
}
