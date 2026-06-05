import express from 'express';
import path from 'path';
import { existsSync } from 'fs';
import { SettingsManager } from './worker/SettingsManager.js';
import { getDb, closeDb } from './database/Database.js';
import { syncAgentsToDb } from './agents/agent-loader.js';
import healthRouter from './routes/health.js';
import agentsRouter from './routes/agents.js';
import tasksRouter from './routes/tasks.js';
import sessionsRouter from './routes/sessions.js';
import settingsRouter from './routes/settings.js';
import observationsRouter from './routes/observations.js';
import contextRouter from './routes/context.js';
import summarizeRouter from './routes/summarize.js';
import swarmsRouter from './routes/swarms.js';
import pluginsRouter from './routes/plugins.js';
import { PluginManager } from './plugins/PluginManager.js';

const settings = new SettingsManager();
const port = settings.get('worker_port') as number;

const app = express();
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/observations', observationsRouter);
app.use('/api/context', contextRouter);
app.use('/api/summarize', summarizeRouter);
app.use('/api/swarms', swarmsRouter);
app.use('/api/plugins', pluginsRouter);

const webUiDist = path.join(import.meta.dir, '..', '..', 'web-ui', 'dist');
if (existsSync(webUiDist)) {
  app.use(express.static(webUiDist));
  console.log(`[opencode-ruflo] Web UI static files from ${webUiDist}`);
}

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const indexPath = path.join(webUiDist, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      service: 'opencode-ruflo',
      version: '0.1.0',
      endpoints: ['/api/health', '/api/agents', '/api/tasks', '/api/sessions', '/api/settings', '/api/observations', '/api/context', '/api/summarize', '/api/swarms', '/api/plugins'],
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

getDb();

const agentCount = syncAgentsToDb();
console.log(`[opencode-ruflo] Cargados ${agentCount} agentes desde definiciones`);

const pluginManager = new PluginManager();
const pluginCount = pluginManager.loadPluginsFromDirectories();
console.log(`[opencode-ruflo] Cargados ${pluginCount} plugins desde directorios`);

const skillPaths = pluginManager.getSkillPaths();
if (skillPaths.length > 0) {
  console.log(`[opencode-ruflo] Skills de plugins: ${skillPaths.length} archivos`);
}

const server = app.listen(port, () => {
  console.log(`[opencode-ruflo] Worker daemon started on port ${port}`);
});

process.on('SIGTERM', () => {
  console.log('[opencode-ruflo] Shutting down...');
  closeDb();
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[opencode-ruflo] Shutting down...');
  closeDb();
  server.close();
  process.exit(0);
});
