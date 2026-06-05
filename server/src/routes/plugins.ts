import { Router } from 'express';
import { PluginManager, PluginManifest } from '../plugins/PluginManager.js';
import { AgentStore } from '../database/AgentStore.js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const router = Router();
const manager = new PluginManager();

router.get('/', (_req, res) => {
  res.json(manager.getAll());
});

router.post('/scan', (_req, res) => {
  const count = manager.loadPluginsFromDirectories();
  res.json({ loaded: count, plugins: manager.getAll() });
});

router.post('/install', (req, res) => {
  const { directory } = req.body;
  if (!directory || !existsSync(directory)) {
    res.status(400).json({ error: 'Valid directory path required' });
    return;
  }
  const manifestPath = resolve(directory, 'plugin.json');
  if (!existsSync(manifestPath)) {
    res.status(400).json({ error: 'plugin.json not found in directory' });
    return;
  }
  try {
    const manifest: PluginManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const agentStore = new AgentStore();
    let agentCount = 0;
    const skillFiles: string[] = [];

    if (manifest.agents) {
      for (const agentDef of manifest.agents) {
        agentStore.upsertFromDefinition(agentDef.name, {
          type: agentDef.type,
          description: agentDef.description,
          model: agentDef.model,
        });
        const existing = agentStore.getByName(agentDef.name);
        if (existing) {
          const config = JSON.parse(existing.config || '{}');
          config.persona = agentDef.persona;
          config.plugin = manifest.name;
          agentStore.update(existing.id!, { config: JSON.stringify(config) });
        }
        agentCount++;
      }
    }
    if (manifest.skills) {
      for (const skill of manifest.skills) {
        const skillPath = resolve(directory, skill);
        if (existsSync(skillPath)) skillFiles.push(skillPath);
      }
    }

    const id = manager.register(manifest, directory, agentCount, skillFiles);
    res.status(201).json({ id, name: manifest.name, agents: agentCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:name/enable', (req, res) => {
  manager.enable(req.params.name);
  res.json({ success: true });
});

router.put('/:name/disable', (req, res) => {
  manager.disable(req.params.name);
  res.json({ success: true });
});

router.delete('/:name', (req, res) => {
  manager.uninstall(req.params.name);
  res.json({ success: true });
});

export default router;
