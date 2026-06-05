import { Router } from 'express';
import { SessionStore } from '../database/SessionStore.js';

const router = Router();
const store = new SessionStore();

router.get('/', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  res.json(store.getAll(limit));
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const session = store.getById(id);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  res.json(session);
});

router.post('/', (req, res) => {
  const { agent_id, title, messages, metadata } = req.body;
  const id = store.create({ agent_id: agent_id || null, title: title || '', summary: null, messages: JSON.stringify(messages || []), metadata: JSON.stringify(metadata || {}) });
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

export default router;
