import { getDb } from './Database.js';

export interface Context {
  id?: number;
  key: string;
  value: string;
  description: string | null;
  updated_at?: string;
}

export class ContextManager {
  get(key: string): Context | null {
    return getDb().query('SELECT * FROM contexts WHERE key = ?').get(key) as Context | null;
  }

  getAll(): Context[] {
    return getDb().query('SELECT * FROM contexts ORDER BY key').all() as Context[];
  }

  set(key: string, value: string, description?: string): void {
    const existing = this.get(key);
    if (existing) {
      getDb().query(
        `UPDATE contexts SET value = $1, description = COALESCE($2, description), updated_at = datetime('now') WHERE key = $3`
      ).run(value, description || null, key);
    } else {
      getDb().query(
        `INSERT INTO contexts (key, value, description) VALUES ($1, $2, $3)`
      ).run(key, value, description || null);
    }
  }

  delete(key: string): void {
    getDb().query('DELETE FROM contexts WHERE key = ?').run(key);
  }

  search(query: string): Context[] {
    const like = `%${query}%`;
    return getDb().query(
      'SELECT * FROM contexts WHERE key LIKE $1 OR value LIKE $1 OR description LIKE $1 ORDER BY key'
    ).all(like) as Context[];
  }
}
