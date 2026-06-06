import { getDb } from './Database.js';

export interface Task {
  id?: number;
  agent_id: number | null;
  parent_task_id: number | null;
  type: string;
  status: string;
  priority: number;
  input: string;
  output: string | null;
  error: string | null;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export class TaskStore {
  getAll(limit = 50): Task[] {
    return getDb().query('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?').all(limit) as Task[];
  }

  getById(id: number): Task | null {
    return getDb().query('SELECT * FROM tasks WHERE id = ?').get(id) as Task | null;
  }

  getByAgent(agentId: number, limit = 20): Task[] {
    return getDb().query('SELECT * FROM tasks WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?').all(agentId, limit) as Task[];
  }

  create(task: Task): number {
    const result = getDb().query(
      `INSERT INTO tasks (agent_id, parent_task_id, type, status, priority, input)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
    ).get(task.agent_id, task.parent_task_id, task.type, task.status, task.priority, task.input) as { id: number };
    return result.id;
  }

  updateStatus(id: number, status: string, output?: string, error?: string): void {
    const updates: string[] = ["status = ?"];
    const values: any[] = [status];
    if (output !== undefined) { updates.push("output = ?"); values.push(output); }
    if (error !== undefined) { updates.push("error = ?"); values.push(error); }
    if (status === 'running' || status === 'processing') { updates.push("started_at = datetime('now')"); }
    if (status === 'completed' || status === 'failed') { updates.push("completed_at = datetime('now')"); }
    values.push(id);
    getDb().query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  updateTokens(id: number, input: number, output: number, cache?: number): void {
    getDb().query(
      `UPDATE tasks SET tokens_input = ?, tokens_output = ?, tokens_cache = ? WHERE id = ?`
    ).run(input, output, cache || 0, id);
  }
}
