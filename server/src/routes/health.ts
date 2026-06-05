import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'opencode-ruflo',
    version: '0.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
