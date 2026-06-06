import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

const PLUGIN_ID = 'opencode-ruflo';
const WORKER_PORT = 37778;
const RUFFLO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER_SCRIPT = join(RUFFLO_ROOT, 'server', 'src', 'worker-service.ts');
const MCP_SCRIPT = join(RUFFLO_ROOT, 'mcp', 'src', 'ruflo-tools.ts');
const AGENTS_DIR = join(homedir(), '.config', 'opencode', 'agents');
const OBSIDIAN_LOG = join(homedir(), 'Documents', 'OpencodeObsidian', 'OpencodeObsidian', 'LLM-Wiki', 'log.md');
const OBSIDIAN_WIKI = join(homedir(), 'Documents', 'OpencodeObsidian', 'OpencodeObsidian', 'LLM-Wiki', 'wiki');

let workerProcess: ReturnType<typeof spawn> | null = null;
let workerStarted = false;
let bootstrapCache: string | null = null;

type CavemanMode = 'normal' | 'lite' | 'full';
let cavemanMode: CavemanMode = 'lite';

const COMPRESSION_INSTRUCTIONS: Record<CavemanMode, string> = {
  normal: '',
  lite: '[COMPRESSION: lite] Be direct and concise. Omit filler phrases ("I\'d be happy to help", "Great question!", "Let me know if you need anything else"), hedges ("I think", "might be", "perhaps"), and redundant restatements. Keep explanations complete but stripped of verbal padding.',
  full: '',
};

const DOC_PATTERNS = /\b(readme|changelog|documentaci[óo]n|docs?|commit message|release notes)\b/i;

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
      signal: AbortSignal.timeout(3000),
    });
  } catch {}
}

async function logToWiki(date: string, type: string, source: string, title: string, content: string) {
  try {
    const { mkdir, writeFile } = await import('fs/promises');
    const autoDir = join(OBSIDIAN_WIKI, 'fuentes', 'auto');
    await mkdir(autoDir, { recursive: true });
    const slug = title.substring(0, 50).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'registro';
    const path = join(autoDir, `${date}-${slug}.md`);
    const page = `---
date: ${date}
type: ${type}
source: ${source}
---

# ${title}

${content.substring(0, 3000)}
`;
    await writeFile(path, page, 'utf-8');
  } catch {}
}

async function compileDailySummary(): Promise<string> {
  try {
    const [summariesRes, observationsRes] = await Promise.all([
      fetch(`http://127.0.0.1:${WORKER_PORT}/api/summarize/recent?limit=5`, { signal: AbortSignal.timeout(5000) }),
      fetch(`http://127.0.0.1:${WORKER_PORT}/api/observations?limit=20`, { signal: AbortSignal.timeout(5000) }),
    ]);

    const parts: string[] = [];

    if (summariesRes.ok) {
      const summaries = await summariesRes.json();
      if (Array.isArray(summaries) && summaries.length) {
        parts.push('=== Session Summaries ===');
        for (const s of summaries.slice(0, 3)) {
          parts.push(`[${s.created_at}] ${s.summary?.substring(0, 300)}`);
        }
      }
    }

    if (observationsRes.ok) {
      const observations = await observationsRes.json();
      if (Array.isArray(observations) && observations.length) {
        parts.push('\n=== Recent Activity ===');
        for (const o of observations.slice(0, 10)) {
          parts.push(`[${o.created_at}] (${o.type}) ${o.content?.substring(0, 150)}`);
        }
      }
    }

    return parts.length ? parts.join('\n') : '';
  } catch {}
  return '';
}

function extractTextFromParts(parts: any[]): string {
  return parts
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text || '')
    .join('\n');
}

function buildBootstrap(): string {
  if (bootstrapCache) return bootstrapCache;

  const parts: string[] = [];

  // Detect available agents from markdown files
  const agents: string[] = [];
  if (existsSync(AGENTS_DIR)) {
    const files = readdirSync(AGENTS_DIR);
    for (const f of files) {
      const cmd = f.replace(/\.md$/, '');
      if (cmd && !cmd.startsWith('_')) agents.push(cmd);
    }
  }

  const ceoAgents = agents.filter(a => /^(ceo|wiki-keeper|chronicler)$/i.test(a));
  const retryAgents = agents.filter(a => /^retry-/i.test(a));
  const imgAgents = agents.filter(a => /^img-/i.test(a));
  const videoAgents = agents.filter(a => /^video-/i.test(a));

  parts.push(`<SYSTEM_CONTEXT plugin="ruflo" version="1">
You have the ruflo multi-agent orchestration system available.

## Command Reference
Use these commands to access ruflo capabilities:

### Agent Routing
- \`@ceo <task>\` — Delegate strategic planning and orchestration to the CEO agent
- \`@wiki-keeper <task>\` — Consult or update the Obsidian knowledge wiki
- \`@chronicler <action>\` — Force a manual logging operation
- \`/modo [lite|full|normal]\` — Set output compression level (lite = no filler, full = concise, normal = standard)`);

  if (retryAgents.length) {
    parts.push(`\n### Model Fallback
- \`@retry-nemotron <problem>\` — Retry with Nemotron 3 Super (free)
- \`@retry-poolside <problem>\` — Retry with Poolside Laguna XS.2 (free)
- \`@retry-gemini <problem>\` — Retry with Gemini 2.5 Flash (\$0.15/M)`);
  }

  if (imgAgents.length) {
    parts.push(`\n### Image Generation
- \`@img-flux-klein <prompt>\` — FLUX 2 Klein (free, then \$0.0006/img)
- \`@img-flux-flex <prompt>\` — Flux.2 Flex (~\$0.003/img)
- \`@img-seedream <prompt>\` — Seedream 4.5 (~\$0.04/img)
- \`@img-nanobanana <prompt>\` — Nano Banana 2 (~\$0.05/img)`);
  }

  if (videoAgents.length) {
    parts.push(`\n### Video Generation
- \`@video-veo-lite <prompt>\` — Veo 3.1 Lite (cheap, 4-8s)
- \`@video-kling <prompt>\` — Kling v3.0 Standard (medium, 3-15s)`);
  }

  parts.push(`\n### Swarm & Summary
- \`#swarm <objective>\` — Execute coordinated multi-agent swarm
- \`#resumen\` — Compile daily work summary to all 3 storage layers

## Routing Rules
When the user types an @command, the ruflo plugin intercepts it and converts it to a delegation instruction. You MUST honor these delegations:
- If the message starts with delegation instructions for @ceo, use the Task tool with subagent_type: "ceo"
- If for @wiki-keeper, use Task with subagent_type: "wiki-keeper"
- If for @retry-*, @img-*, @video-*, use Task with the matching subagent_type
- If for #swarm, use the ruflo MCP tools to orchestrate parallel agents
- If for #resumen, present the compiled daily summary to the user

Do NOT handle delegated tasks yourself — always pass them to the appropriate agent.

## Auto-Logging
All interactions (messages, tool executions, agent delegations) are automatically logged to:
1. Ruflo memory (SQLite database)
2. Opencode-mem (cross-session persistent memory)
3. Obsidian LLM-Wiki (markdown files)
</SYSTEM_CONTEXT>`);

  bootstrapCache = parts.join('\n');
  return bootstrapCache;
}

function startWorker() {
  if (workerProcess || workerStarted) return;
  workerStarted = true;
  try {
    const bunPath = resolve(homedir(), '.bun', 'bin', 'bun.exe');
    workerProcess = spawn(bunPath, ['run', WORKER_SCRIPT], {
      stdio: 'ignore',
      detached: true,
      env: { ...process.env },
      windowsHide: true,
    });
    workerProcess.unref();
    workerProcess.on('error', (err: any) => console.error(`[${PLUGIN_ID}] Worker error:`, err.message));
    console.error(`[${PLUGIN_ID}] Worker started (PID: ${workerProcess.pid})`);
  } catch (err: any) {
    console.error(`[${PLUGIN_ID}] Worker start failed:`, err.message);
  }
}

async function stopWorker() {
  if (workerProcess) {
    workerProcess.kill('SIGTERM');
    workerProcess = null;
    workerStarted = false;
  }
}

function getPluginSkills(): string[] {
  const skills: string[] = [
    join(RUFFLO_ROOT, 'skills', 'ruflo', 'SKILL.md'),
  ];
  const pluginsDir = join(RUFFLO_ROOT, 'plugins');
  if (existsSync(pluginsDir)) {
    const dirs = readdirSync(pluginsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      const skillDir = resolve(pluginsDir, dir.name, 'skills');
      if (existsSync(skillDir)) {
        const files = readdirSync(skillDir, { withFileTypes: true });
        for (const f of files) {
          if (f.isFile() && f.name.endsWith('.md')) {
            skills.push(resolve(skillDir, f.name));
          }
        }
      }
    }
  }
  return skills;
}

export default async ({ client, project, directory }: any) => {
  startWorker();

  return {
    // Config: register MCP server and skill paths
    config: (cfg: any) => {
      cfg.mcp = cfg.mcp || {};
      if (!cfg.mcp['opencode-ruflo']) {
        const bunPath = resolve(homedir(), '.bun', 'bin', 'bun.exe');
        cfg.mcp['opencode-ruflo'] = {
          type: 'local',
          command: bunPath,
          args: ['run', MCP_SCRIPT],
          enabled: true,
        };
      }

      cfg.skills = cfg.skills || {};
      cfg.skills.paths = [...(cfg.skills.paths || []), join(RUFFLO_ROOT, 'skills')];
    },

    // System bootstrap: inject ruflo agent/command context + napkin at session start
    'experimental.chat.system.transform': async (_input: any, output: any) => {
      if (!output?.system) return;

      // Bootstrap: ruflo agent/command reference
      const bootstrap = buildBootstrap();
      const alreadyInjected = output.system.some((s: string) => s.includes('plugin="ruflo"'));
      if (!alreadyInjected) {
        output.system.push(bootstrap);
      }

      // Napkin: project learning memory (.napkin.md)
      const napkinPath = directory ? join(directory, '.napkin.md') : null;
      if (napkinPath && existsSync(napkinPath)) {
        const napkinContent = readFileSync(napkinPath, 'utf-8').trim();
        if (napkinContent) {
          const alreadyNapkin = output.system.some((s: string) => s.includes('<NAPKIN>'));
          if (!alreadyNapkin) {
            output.system.push(`\n<NAPKIN>\n${napkinContent}\n</NAPKIN>`);
          }
        }
      }
    },

    // Messages transform: intercept @commands and route them
    'experimental.chat.messages.transform': async (_input: any, output: any) => {
      if (!output?.messages?.length) return;

      const date = dateStamp();
      const projectName = project?.name || 'unknown';
      const messages = output.messages;

      // Find the last user message (current user input)
      const lastUserMsg = [...messages].reverse().find((m: any) => m.info?.role === 'user');
      if (!lastUserMsg || !lastUserMsg.parts?.length) return;

      const fullText = extractTextFromParts(lastUserMsg.parts);
      if (!fullText.trim()) return;

      // Skip if already processed (contains our routing marker)
      if (fullText.includes('[ROUTED_TO') || fullText.includes('[SYSTEM_OVERRIDE')) return;

      const textParts = lastUserMsg.parts.filter((p: any) => p.type === 'text');
      if (!textParts.length) return;
      const firstTextPart = textParts[0];

      // /modo command: change compression mode
      const modoMatch = fullText.match(/\/modo\s+(lite|full|normal)/i);
      if (modoMatch) {
        const newMode = modoMatch[1].toLowerCase() as CavemanMode;
        cavemanMode = newMode;
        await logToMemory('modo_change', `Caveman mode set to ${cavemanMode}`, 'system');
        firstTextPart.text = `[SYSTEM_OVERRIDE]\nModo cambiado a "${cavemanMode}". ${
          cavemanMode === 'lite' ? 'Sin relleno, explicaciones completas.' :
          cavemanMode === 'full' ? 'Máxima compresión, fragmentos.' :
          'Sin compresión.'
        } Usa /modo para cambiar en cualquier momento.`;
        return;
      }

      // --- Command detection ---

      // @ceo command
      const ceoMatch = fullText.match(/@ceo\s+(.+)/is);
      if (ceoMatch) {
        const task = ceoMatch[1].trim();
        await Promise.all([
          logToMemory('ceo_task', task, 'ceo'),
          logToWiki(date, 'ceo_task', 'plugin', `@ceo: ${task.substring(0, 80)}`, task),
        ]);
        firstTextPart.text = `[ROUTED_TO_CEO]\nThe user requested the ceo agent for the following task. You MUST delegate this to the ceo subagent using the Task tool with subagent_type "ceo". Do NOT handle this yourself.\n\nTask: ${task}`;
        return;
      }

      // @wiki-keeper command
      const wikiMatch = fullText.match(/@wiki-keeper\s+(.+)/is);
      if (wikiMatch) {
        const task = wikiMatch[1].trim();
        await Promise.all([
          logToMemory('wiki_task', task, 'wiki-keeper'),
          logToWiki(date, 'wiki_task', 'plugin', `@wiki-keeper: ${task.substring(0, 80)}`, task),
        ]);
        firstTextPart.text = `[ROUTED_TO_WIKI_KEEPER]\nThe user requested the wiki-keeper agent. You MUST delegate to the wiki-keeper subagent using the Task tool with subagent_type "wiki-keeper". Do NOT handle this yourself.\n\nTask: ${task}`;
        return;
      }

      // @chronicler command
      const chroniclerMatch = fullText.match(/@chronicler\s+(.+)/is);
      if (chroniclerMatch) {
        const action = chroniclerMatch[1].trim();
        await logToMemory('chronicler_action', action, 'chronicler');
        firstTextPart.text = `[ROUTED_TO_CHRONICLER]\nThe user requested @chronicler. You MUST delegate to the chronicler agent using: Task with subagent_type "chronicler".\n\nAction: ${action}`;
        return;
      }

      // #swarm command
      const swarmMatch = fullText.match(/#swarm\s+(.+)/is);
      if (swarmMatch) {
        const objective = swarmMatch[1].trim();
        await Promise.all([
          logToMemory('swarm', objective, 'swarm'),
          logToWiki(date, 'swarm', 'plugin', `#swarm: ${objective.substring(0, 80)}`, objective),
        ]);
        firstTextPart.text = `[SYSTEM_OVERRIDE]\nThe user requested a multi-agent swarm with objective: "${objective}". Use the ruflo MCP tools to orchestrate parallel agents:\n1. Call ruflo_swarm_init to create the swarm\n2. Call ruflo_swarm_execute with the objective\n3. Report results back to the user\n\nObjective: ${objective}`;
        return;
      }

      // #resumen command (compile daily summary)
      if (/^#resumen\b/im.test(fullText)) {
        await logToMemory('resumen_requested', 'Compiling daily summary', 'chronicler');
        const summary = await compileDailySummary();
        if (summary) {
          firstTextPart.text = `[SYSTEM_OVERRIDE]\nThe user requested a daily summary (#resumen). Here is the compiled summary from the ruflo worker:\n\n${summary}\n\nPresent this in a clean format with accomplishments, pending items, and key decisions.`;
        } else {
          firstTextPart.text = `[SYSTEM_OVERRIDE]\nThe user requested a daily summary (#resumen). Please compile a summary of today's session including:\n1. Tasks worked on\n2. What was accomplished\n3. Pending items\n4. Key decisions\n5. Open questions\n\nFormat as a clean daily report.`;
        }
        return;
      }

      // @retry-*, @img-*, @video-* agent routing
      const agentMatch = fullText.match(/@(retry-\w+|img-\w+|video-\w+)\s+(.+)/is);
      if (agentMatch) {
        const agentName = agentMatch[1];
        const task = agentMatch[2].trim();
        await logToMemory('agent_redirect', `${agentName}: ${task}`, agentName);
        firstTextPart.text = `[ROUTED_TO_${agentName.toUpperCase()}]\nThe user requested @${agentName}. You MUST delegate to this agent using the Task tool with subagent_type "${agentName}".\n\nTask: ${task}`;
        return;
      }

      // Compression mode: inject instruction for non-command messages
      if (cavemanMode !== 'normal' && !fullText.includes('[COMPRESSION:')) {
        const isDocTask = DOC_PATTERNS.test(fullText);
        const instruction = isDocTask
          ? '[COMPRESSION: off] Auto-detected documentation or commit task. Use normal verbosity.'
          : COMPRESSION_INSTRUCTIONS[cavemanMode];
        const idx = messages.indexOf(lastUserMsg);
        if (idx !== -1) {
          messages.splice(idx, 0, {
            info: { role: 'system' },
            parts: [{ type: 'text', text: instruction }],
          });
        }
      }

      // Auto-log: regular messages (non-command)
      if (fullText.length > 10) {
        await logToMemory('message', fullText.substring(0, 500), projectName);
      }
    },

    // Auto-log tool executions
    'tool.execute.after': async (input: any, output: any) => {
      const date = dateStamp();
      const toolName = input?.tool || input?.name || 'unknown';
      const toolInput = JSON.stringify(input?.input || input?.args || {});
      const toolResult = JSON.stringify(output?.result || output || '').slice(0, 2000);

      await Promise.all([
        logToMemory(
          'tool_execution',
          `Tool: ${toolName}\nInput: ${toolInput}\nResult: ${toolResult.substring(0, 500)}`,
          toolName
        ),
        logToWiki(
          date,
          'tool_execution',
          toolName,
          `Tool: ${toolName}`,
          `Input: ${toolInput}\n\nResult: ${toolResult}`
        ),
      ]);
    },

    // Session compaction: log to memory
    'experimental.session.compacting': async (_input: any, _output: any) => {
      await logToMemory('session_compacted', `Session compacted at ${new Date().toISOString()}`, 'system');
    },
  };
};
