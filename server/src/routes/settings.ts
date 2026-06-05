import { Router } from 'express';
import { SettingsManager } from '../worker/SettingsManager.js';

const router = Router();
const settings = new SettingsManager();

router.get('/', (_req, res) => {
  res.json(settings.getAll());
});

router.put('/', (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    settings.set(key, value as string | number);
  }
  res.json(settings.getAll());
});

export default router;
