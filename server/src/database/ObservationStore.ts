import { getDb } from './Database.js';

export interface Observation {
  id?: number;
  agent_id: number | null;
  type: string;
  content: string;
  tags: string;
  source: string | null;
  created_at?: string;
}

export class ObservationStore {
  getAll(limit = 50): Observation[] {
    return getDb().query('SELECT * FROM observations ORDER BY created_at DESC LIMIT ?').all(limit) as Observation[];
  }

  getById(id: number): Observation | null {
    return getDb().query('SELECT * FROM observations WHERE id = ?').get(id) as Observation | null;
  }

  getByAgent(agentId: number, limit = 20): Observation[] {
    return getDb().query('SELECT * FROM observations WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?').all(agentId, limit) as Observation[];
  }

  search(query: string, limit = 20): Observation[] {
    const like = `%${query}%`;
    return getDb().query(
      `SELECT * FROM observations WHERE content LIKE $1 OR tags LIKE $1 ORDER BY created_at DESC LIMIT $2`
    ).all(like, limit) as Observation[];
  }

  searchByType(type: string, query?: string, limit = 20): Observation[] {
    if (query) {
      const like = `%${query}%`;
      return getDb().query(
        `SELECT * FROM observations WHERE type = $1 AND (content LIKE $2 OR tags LIKE $2) ORDER BY created_at DESC LIMIT $3`
      ).all(type, like, limit) as Observation[];
    }
    return getDb().query('SELECT * FROM observations WHERE type = ? ORDER BY created_at DESC LIMIT ?').all(type, limit) as Observation[];
  }

  create(obs: Observation): number {
    const result = getDb().query(
      `INSERT INTO observations (agent_id, type, content, tags, source)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`
    ).get(obs.agent_id, obs.type, obs.content, obs.tags, obs.source) as { id: number };
    return result.id;
  }

  delete(id: number): void {
    getDb().query('DELETE FROM observations WHERE id = ?').run(id);
  }
}
