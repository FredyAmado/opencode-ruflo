import { Router } from 'express';
import { SwarmStore } from '../database/SwarmStore.js';
import { executeSwarm } from '../agents/swarm-coordinator.js';

const router = Router();
const store = new SwarmStore();

router.get('/', (_req, res) => {
  res.json(store.getAll());
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const swarm = store.getById(id);
  if (!swarm) { res.status(404).json({ error: 'Swarm not found' }); return; }
  res.json(swarm);
});

router.get('/:id/tasks', (req, res) => {
  const id = parseInt(req.params.id, 10);
  res.json(store.getTasks(id));
});

router.post('/', (req, res) => {
  const { name, topology, coordinator_agent_id, worker_ids } = req.body;
  if (!name || !worker_ids) { res.status(400).json({ error: 'name and worker_ids required' }); return; }
  const id = store.create({
    name,
    topology: topology || 'hierarchical',
    status: 'idle',
    coordinator_agent_id: coordinator_agent_id || null,
    worker_ids: JSON.stringify(worker_ids),
    context: '{}',
    result: null,
    error: null,
  });
  res.status(201).json({ id });
});

router.post('/:id/execute', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { objective } = req.body;
  if (!objective) { res.status(400).json({ error: 'objective is required' }); return; }
  try {
    const result = await executeSwarm(id, objective);
    res.json(result);
  } catch (err: any) {
    store.update(id, { status: 'failed', error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  store.delete(id);
  res.json({ success: true });
});

export default router;
