import { Router } from 'express';
import { summarizeConversation } from '../agents/summarizer.js';
import { SummaryStore } from '../database/SummaryStore.js';

const router = Router();
const summaryStore = new SummaryStore();

router.post('/conversation', async (req, res) => {
  const { agent_id, task_ids } = req.body;
  if (!agent_id || !task_ids) { res.status(400).json({ error: 'agent_id and task_ids required' }); return; }
  try {
    const summary = await summarizeConversation(agent_id, task_ids);
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  res.json(summaryStore.getRecent(limit));
});

export default router;
