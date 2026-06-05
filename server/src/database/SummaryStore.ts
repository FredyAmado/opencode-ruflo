import { getDb } from './Database.js';

export interface Summary {
  id?: number;
  agent_id: number | null;
  session_id: number | null;
  summary: string;
  model: string | null;
  created_at?: string;
}

export class SummaryStore {
  getByAgent(agentId: number, limit = 10): Summary[] {
    return getDb().query('SELECT * FROM summaries WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?').all(agentId, limit) as Summary[];
  }

  getBySession(sessionId: number): Summary | null {
    return getDb().query('SELECT * FROM summaries WHERE session_id = ? ORDER BY created_at DESC LIMIT 1').get(sessionId) as Summary | null;
  }

  create(summary: Summary): number {
    const result = getDb().query(
      `INSERT INTO summaries (agent_id, session_id, summary, model)
       VALUES ($1, $2, $3, $4) RETURNING id`
    ).get(summary.agent_id, summary.session_id, summary.summary, summary.model) as { id: number };
    return result.id;
  }

  getRecent(limit = 20): Summary[] {
    return getDb().query('SELECT * FROM summaries ORDER BY created_at DESC LIMIT ?').all(limit) as Summary[];
  }
}
