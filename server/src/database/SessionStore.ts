import { getDb } from './Database.js';

export interface Session {
  id?: number;
  agent_id: number | null;
  title: string;
  summary: string | null;
  messages: string;
  metadata: string;
  created_at?: string;
  updated_at?: string;
}

export class SessionStore {
  getAll(limit = 50): Session[] {
    return getDb().query('SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?').all(limit) as Session[];
  }

  getById(id: number): Session | null {
    return getDb().query('SELECT * FROM sessions WHERE id = ?').get(id) as Session | null;
  }

  getByAgent(agentId: number, limit = 20): Session[] {
    return getDb().query('SELECT * FROM sessions WHERE agent_id = ? ORDER BY updated_at DESC LIMIT ?').all(agentId, limit) as Session[];
  }

  create(session: Session): number {
    const result = getDb().query(
      `INSERT INTO sessions (agent_id, title, summary, messages, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`
    ).get(session.agent_id, session.title, session.summary, session.messages, session.metadata) as { id: number };
    return result.id;
  }

  update(id: number, updates: Partial<Session>): void {
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
    getDb().query(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  delete(id: number): void {
    getDb().query('DELETE FROM sessions WHERE id = ?').run(id);
  }
}
