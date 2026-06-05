import { getDb } from './Database.js';

export interface Swarm {
  id?: number;
  name: string;
  topology: string;
  status: string;
  coordinator_agent_id: number | null;
  worker_ids: string;
  context: string;
  result: string | null;
  error: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SwarmTask {
  id?: number;
  swarm_id: number;
  agent_id: number;
  parent_id: number | null;
  type: string;
  input: string;
  output: string | null;
  status: string;
  created_at?: string;
  completed_at?: string | null;
}

export class SwarmStore {
  getAll(): Swarm[] {
    return getDb().query('SELECT * FROM swarms ORDER BY created_at DESC').all() as Swarm[];
  }

  getById(id: number): Swarm | null {
    return getDb().query('SELECT * FROM swarms WHERE id = ?').get(id) as Swarm | null;
  }

  create(swarm: Swarm): number {
    const r = getDb().query(
      `INSERT INTO swarms (name, topology, status, coordinator_agent_id, worker_ids, context)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
    ).get(swarm.name, swarm.topology, swarm.status, swarm.coordinator_agent_id, swarm.worker_ids, swarm.context) as { id: number };
    return r.id;
  }

  update(id: number, updates: Partial<Swarm>): void {
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
    getDb().query(`UPDATE swarms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  delete(id: number): void {
    getDb().query('DELETE FROM swarm_tasks WHERE swarm_id = ?').run(id);
    getDb().query('DELETE FROM swarms WHERE id = ?').run(id);
  }

  getTasks(swarmId: number): SwarmTask[] {
    return getDb().query('SELECT * FROM swarm_tasks WHERE swarm_id = ? ORDER BY id').all(swarmId) as SwarmTask[];
  }

  createTask(task: SwarmTask): number {
    const r = getDb().query(
      `INSERT INTO swarm_tasks (swarm_id, agent_id, parent_id, type, input, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
    ).get(task.swarm_id, task.agent_id, task.parent_id, task.type, task.input, task.status) as { id: number };
    return r.id;
  }

  updateTask(id: number, status: string, output?: string): void {
    const updates = ["status = ?"];
    const values = [status];
    if (output !== undefined) { updates.push("output = ?"); values.push(output); }
    if (status === 'completed' || status === 'failed') { updates.push("completed_at = datetime('now')"); }
    values.push(id);
    getDb().query(`UPDATE swarm_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
}
