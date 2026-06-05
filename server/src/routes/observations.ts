import { Router } from 'express';
import { ObservationStore } from '../database/ObservationStore.js';

const router = Router();
const store = new ObservationStore();

router.get('/', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const q = req.query.q as string;
  const type = req.query.type as string;

  if (q && type) {
    res.json(store.searchByType(type, q, limit));
  } else if (q) {
    res.json(store.search(q, limit));
  } else if (type) {
    res.json(store.searchByType(type, undefined, limit));
  } else {
    res.json(store.getAll(limit));
  }
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const obs = store.getById(id);
  if (!obs) { res.status(404).json({ error: 'Observation not found' }); return; }
  res.json(obs);
});

router.post('/', (req, res) => {
  const { agent_id, type, content, tags, source } = req.body;
  if (!content) { res.status(400).json({ error: 'content is required' }); return; }
  const id = store.create({
    agent_id: agent_id || null,
    type: type || 'observation',
    content,
    tags: JSON.stringify(tags || []),
    source: source || null,
  });
  res.status(201).json({ id });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  store.delete(id);
  res.json({ success: true });
});

export default router;
