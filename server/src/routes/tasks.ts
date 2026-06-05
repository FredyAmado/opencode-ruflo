import { Router } from 'express';
import { TaskStore } from '../database/TaskStore.js';

const router = Router();
const store = new TaskStore();

router.get('/', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  res.json(store.getAll(limit));
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = store.getById(id);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json(task);
});

router.get('/by-agent/:agentId', (req, res) => {
  const agentId = parseInt(req.params.agentId, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  res.json(store.getByAgent(agentId, limit));
});

router.post('/', (req, res) => {
  const { agent_id, type, priority, input } = req.body;
  const id = store.create({ agent_id: agent_id || null, parent_task_id: null, type: type || 'chat', status: 'pending', priority: priority || 0, input: JSON.stringify(input || {}), output: null, error: null });
  res.status(201).json({ id });
});

router.patch('/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, output, error } = req.body;
  store.updateStatus(id, status, output, error);
  res.json({ success: true });
});

export default router;
