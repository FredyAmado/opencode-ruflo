import { Router } from 'express';
import { ContextManager } from '../database/ContextManager.js';

const router = Router();
const ctx = new ContextManager();

router.get('/', (req, res) => {
  const q = req.query.q as string;
  if (q) { res.json(ctx.search(q)); return; }
  res.json(ctx.getAll());
});

router.get('/:key', (req, res) => {
  const entry = ctx.get(req.params.key);
  if (!entry) { res.status(404).json({ error: 'Context key not found' }); return; }
  res.json(entry);
});

router.put('/:key', (req, res) => {
  const { value, description } = req.body;
  if (!value) { res.status(400).json({ error: 'value is required' }); return; }
  ctx.set(req.params.key, value, description);
  res.json({ success: true });
});

router.delete('/:key', (req, res) => {
  ctx.delete(req.params.key);
  res.json({ success: true });
});

export default router;
