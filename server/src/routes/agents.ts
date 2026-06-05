import { Router } from 'express';
import { AgentStore } from '../database/AgentStore.js';
import { TaskStore } from '../database/TaskStore.js';
import { spawnAgent } from '../agents/agent-runner.js';

const router = Router();
const store = new AgentStore();
const taskStore = new TaskStore();

router.get('/', (_req, res) => {
  res.json(store.getAll());
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const agent = store.getById(id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
  res.json(agent);
});

router.get('/:id/tasks', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  res.json(taskStore.getByAgent(id, limit));
});

router.post('/', (req, res) => {
  const { name, type, description, model, config } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }
  const id = store.create({ name, type: type || 'general', description: description || '', model: model || null, config: config || '{}', status: 'idle' });
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  store.update(id, req.body);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  store.delete(id);
  res.json({ success: true });
});

router.post('/:id/spawn', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { prompt } = req.body;
  if (!prompt) { res.status(400).json({ error: 'prompt is required' }); return; }
  try {
    const result = await spawnAgent(id, prompt);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
