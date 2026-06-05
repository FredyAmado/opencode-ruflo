import type { Plugin } from 'opencode';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readdirSync, existsSync } from 'fs';

const PLUGIN_ID = 'opencode-ruflo';
const WORKER_PORT = 37778;
const RUFFLO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER_SCRIPT = `${RUFFLO_ROOT}/server/src/worker-service.ts`;
const MCP_SCRIPT = `${RUFFLO_ROOT}/mcp/src/ruflo-tools.ts`;
const OBSIDIAN_LOG = `${process.env.USERPROFILE}/Documents/OpencodeObsidian/OpencodeObsidian/LLM-Wiki/log.md`;
const OBSIDIAN_WIKI = `${process.env.USERPROFILE}/Documents/OpencodeObsidian/OpencodeObsidian/LLM-Wiki/wiki`;

let workerProcess: any = null;

function dateStamp() {
  return new Date().toISOString().split('T')[0];
}

async function logToFile(date: string, type: string, title: string, body: string) {
  try {
    const { appendFile } = await import('fs/promises');
    const entry = `\n## [${date}] ${type} | ${title}\n${body}\n`;
    await appendFile(OBSIDIAN_LOG, entry, 'utf-8');
  } catch {}
}

async function logToMemory(type: string, content: string, agentName?: string) {
  try {
    const tags = agentName ? [agentName, 'auto'] : ['auto'];
    await fetch(`http://127.0.0.1:${WORKER_PORT}/api/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content, tags }),
    });
  } catch {}
}

function getPluginSkills(): { file: string; priority: number }[] {
  const skills: { file: string; priority: number }[] = [
    { file: `${RUFFLO_ROOT}/skills/ruflo/SKILL.md`, priority: 80 },
  ];
  const pluginsDir = `${RUFFLO_ROOT}/plugins`;
  if (existsSync(pluginsDir)) {
    const dirs = readdirSync(pluginsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      const skillDir = resolve(pluginsDir, dir.name, 'skills');
      if (existsSync(skillDir)) {
        const files = readdirSync(skillDir, { withFileTypes: true });
        for (const f of files) {
          if (f.isFile() && f.name.endsWith('.md')) {
            skills.push({ file: resolve(skillDir, f.name), priority: 75 });
          }
        }
      }
    }
  }
  return skills;
}

const plugin: Plugin = {
  id: PLUGIN_ID,
  name: 'Ruflo',
  description: 'Orquestación multi-agente para Opencode',

  config() {
    return {
      mcp: {
        servers: {
          'opencode-ruflo': {
            command: 'bun',
            args: ['run', MCP_SCRIPT],
          },
        },
      },
      instructions: getPluginSkills(),
    };
  },

  async 'chat.message'(message: any) {
    const text = message?.text || '';
    const date = dateStamp();

    const agentMatch = text.match(/^@(\w+)\s+(.+)/);
    if (agentMatch) {
      const agentName = agentMatch[1];
      const prompt = agentMatch[2];
      try {
        const res = await fetch(`http://127.0.0.1:${WORKER_PORT}/api/agents`);
        if (!res.ok) return;
        const agents = await res.json();
        const agent = agents.find((a: any) => a.name === agentName);
        if (agent) {
          const spawnRes = await fetch(`http://127.0.0.1:${WORKER_PORT}/api/agents/${agent.id}/spawn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });
          if (spawnRes.ok) {
            const result = await spawnRes.json();
            const summary = result.response?.substring(0, 1500) || '(sin respuesta)';
            logToFile(date, 'agent', `@${agentName}: ${prompt.substring(0, 100)}`, `- Agente: ${agentName} (${agent.type})\n- Prompt: ${prompt}\n- Respuesta:\n  ${summary.replace(/\n/g, '\n  ')}`);
            logToMemory('interaction', `@${agentName}: ${prompt}\n\n${summary.substring(0, 2000)}`, agentName);
            return result.response;
          }
        }
      } catch {}
      return;
    }

    const swarmMatch = text.match(/^#swarm\s+(.+)/);
    if (swarmMatch) {
      const objective = swarmMatch[1];
      try {
        const swarmsRes = await fetch(`http://127.0.0.1:${WORKER_PORT}/api/swarms`);
        if (!swarmsRes.ok) return;
        const swarms = await swarmsRes.json();
        const activeSwarm = swarms.find((s: any) => s.status === 'idle');
        if (activeSwarm) {
          const execRes = await fetch(`http://127.0.0.1:${WORKER_PORT}/api/swarms/${activeSwarm.id}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objective }),
          });
          if (execRes.ok) {
            const result = await execRes.json();
            const response = typeof result.result === 'string'
              ? result.result
              : JSON.stringify(result, null, 2);
            const summary = response.substring(0, 1500);
            logToFile(date, 'swarm', `Swarm #${activeSwarm.id}: ${objective.substring(0, 100)}`, `- Swarm: ${activeSwarm.name} (${activeSwarm.topology})\n- Workers: ${activeSwarm.worker_ids}\n- Objetivo: ${objective}\n- Resultado:\n  ${summary.replace(/\n/g, '\n  ')}`);
            logToMemory('swarm', `#swarm #${activeSwarm.id} [${activeSwarm.topology}]: ${objective}\n\n${summary.substring(0, 2000)}`);
            return response;
          }
        }
      } catch {}
    }

    const resumenMatch = text.match(/^#resumen/);
    if (resumenMatch) {
      try {
        const obsRes = await fetch(`http://127.0.0.1:${WORKER_PORT}/api/observations?q=${date}`);
        if (!obsRes.ok) return 'No pude obtener las observaciones del día.';
        const observations = await obsRes.json();
        if (!observations || observations.length === 0) {
          return 'No hay trabajo registrado hoy.';
        }
        let resumen = `# Resumen Diario — ${date}\n\n## Trabajo Realizado\n\n`;
        for (const obs of observations) {
          resumen += `- **${obs.type}**: ${obs.content.substring(0, 300)}...\n`;
        }
        resumen += `\n---\n*Generado automáticamente por opencode-ruflo*`;
        logToFile(date, 'resumen', 'Resumen diario', resumen);
        logToMemory('summary', `Resumen diario ${date}\n${resumen.substring(0, 2000)}`);
        const wikiResumenPath = `${OBSIDIAN_WIKI}/fuentes/${date}-resumen-diario.md`;
        try {
          const { mkdir, writeFile } = await import('fs/promises');
          await mkdir(`${OBSIDIAN_WIKI}/fuentes`, { recursive: true });
          await writeFile(wikiResumenPath, resumen, 'utf-8');
        } catch {}
        return resumen;
      } catch (e: any) {
        return `Error generando resumen: ${e.message}`;
      }
    }
  },
};

async function startWorker() {
  if (workerProcess) return;
  const { spawn } = await import('child_process');
  workerProcess = spawn('bun', ['run', WORKER_SCRIPT], {
    stdio: 'inherit',
    env: { ...process.env },
  });
  workerProcess.on('error', (err: any) => console.error(`[${PLUGIN_ID}] Worker error:`, err.message));
  workerProcess.on('exit', (code: number | null) => {
    console.log(`[${PLUGIN_ID}] Worker exited with code ${code}`);
    workerProcess = null;
  });
  process.on('exit', () => stopWorker());
}

async function stopWorker() {
  if (workerProcess) {
    workerProcess.kill('SIGTERM');
    workerProcess = null;
  }
}

startWorker();

export default plugin;
