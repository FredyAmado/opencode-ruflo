import { Router } from 'express';
import { AgentStore } from '../database/AgentStore.js';
import { TaskStore } from '../database/TaskStore.js';
import { ObservationStore } from '../database/ObservationStore.js';
import { spawnAgent } from '../agents/agent-runner.js';
import { callProvider } from '../providers/openrouter.js';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';

const router = Router();
const agentStore = new AgentStore();
const taskStore = new TaskStore();
const obsStore = new ObservationStore();

const SELECTOR_PROMPT = `Eres un planificador de tareas. Dado un objetivo, determina qué agentes especializados se necesitan.

Agentes disponibles:
- coder: programación y desarrollo
- tester: pruebas de software
- architect: diseño de arquitectura
- security: seguridad informática
- reviewer: revisión de código
- researcher: investigación técnica
- designer: diseño UI/UX
- devops: DevOps e infraestructura
- writer: documentación técnica
- doc-writer: documentación detallada
- security-auditor: auditoría OWASP
- test-generator: generación automática de tests
- planner: planificación de proyectos
- chronicler: registro cronista

Responde SOLO con un JSON array de nombres de agentes, ordenados por orden de ejecución.
Ejemplo: ["coder","tester","reviewer"]
No más de 4 agentes. Si la tarea es simple, usa 1 solo agente.`;

function inferAgentFromType(type: string): string {
  const map: Record<string, string> = {
    login: 'security',
    authenticate: 'security',
    jwt: 'security',
    password: 'security',
    oauth: 'security',
    token: 'security',
    encrypt: 'security',
    code: 'coder',
    program: 'coder',
    develop: 'coder',
    feature: 'coder',
    function: 'coder',
    refactor: 'coder',
    bug: 'coder',
    fix: 'coder',
    test: 'tester',
    quality: 'tester',
    architect: 'architect',
    design: 'architect',
    structure: 'architect',
    security: 'security',
    audit: 'security-auditor',
    vulnerab: 'security-auditor',
    review: 'reviewer',
    research: 'researcher',
    investigate: 'researcher',
    ui: 'designer',
    ux: 'designer',
    interface: 'designer',
    devops: 'devops',
    deploy: 'devops',
    infra: 'devops',
    ci: 'devops',
    cd: 'devops',
    doc: 'writer',
    document: 'writer',
    readme: 'doc-writer',
    plan: 'planner',
    roadmap: 'planner',
    chronicle: 'chronicler',
  };
  const lower = type.toLowerCase();
  for (const [key, agent] of Object.entries(map)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lower)) return agent;
  }
  return 'coder';
}

const HIGH_COMPLEXITY_KEYWORDS = ['auth', 'security', 'payment', 'blockchain', 'ml', 'ai', 'architecture', 'enterprise', 'scale', 'distributed', 'crypto', 'neural', 'recommendation', 'pipeline', 'kubernetes', 'microservices', 'oauth', 'jwt', 'encrypt'];

function analyzeComplexity(objective: string, agentCount: number): 'high' | 'medium' | 'low' {
  const lower = objective.toLowerCase();
  const hasHighKeyword = HIGH_COMPLEXITY_KEYWORDS.some(k => lower.includes(k));
  if (hasHighKeyword || agentCount >= 4) return 'high';
  if (agentCount >= 2) return 'medium';
  return 'low';
}

function suggestModel(complexity: string, agentCount: number): string | null {
  if (complexity === 'high' && agentCount >= 2) return 'deepseek/deepseek-chat';
  return null;
}

async function logToWiki(objective: string, agents: string[], results: any[]) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const wikiRoot = resolve(process.env.USERPROFILE || 'C:\\Users\\Usuario', 'Documents', 'OpencodeObsidian', 'OpencodeObsidian', 'LLM-Wiki', 'wiki');
    const autoDir = `${wikiRoot}/fuentes/auto`;
    await mkdir(autoDir, { recursive: true });
    const slug = objective.substring(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'orquestacion';
    const path = `${autoDir}/${date}-orquestacion-${slug}.md`;
    const summary = results.map((r: any) =>
      `- **${r.agent}**: ${r.error ? `❌ ${r.error}` : `${(r.response || '').substring(0, 300)}...`}`
    ).join('\n');
    const page = `---
date: ${date}
type: orchestration
source: agent
agents: [${agents.map(a => `"${a}"`).join(', ')}]
---

# Orquestación: ${objective}

## Agentes usados
${agents.map(a => `- ${a}`).join('\n')}

## Resultados
${summary}
`;
    await writeFile(path, page, 'utf-8');
  } catch {}
}

router.post('/', async (req, res) => {
  const { objective, agents: requestedAgents, plan, model } = req.body;
  if (!objective) {
    res.status(400).json({ error: 'objective is required' });
    return;
  }

  try {
    const allAgents = agentStore.getAll();
    const agentNames = allAgents.map((a: any) => a.name);

    let selectedAgents: string[] = [];

    if (plan) {
      selectedAgents = [inferAgentFromType(objective)];
    } else if (requestedAgents && Array.isArray(requestedAgents)) {
      selectedAgents = requestedAgents.filter((n: string) => agentNames.includes(n));
      if (selectedAgents.length === 0) {
        selectedAgents = ['coder'];
      }
    } else {
      try {
        const llmResponse = await callProvider([
          { role: 'system', content: SELECTOR_PROMPT },
          { role: 'user', content: `Objetivo: ${objective.substring(0, 500)}` },
        ], { model: 'deepseek/deepseek-v4-flash-free', temperature: 0.3, max_tokens: 200 });
        const jsonMatch = llmResponse.match(/\[.*?\]/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          selectedAgents = parsed.filter((n: string) => agentNames.includes(n));
        }
      } catch {}
      if (selectedAgents.length === 0) {
        selectedAgents = [inferAgentFromType(objective)];
      }
    }

    // Plan mode: instant response using keyword matching (no LLM)
    if (plan) {
      const complexity = analyzeComplexity(objective, selectedAgents.length);
      const modelSuggestion = suggestModel(complexity, selectedAgents.length);
      res.json({
        objective,
        agents: selectedAgents,
        plan: true,
        complexity,
        modelSuggestion,
        message: modelSuggestion
          ? `Tarea compleja. Recomiendo usar ${modelSuggestion} para mejor calidad. ¿Cambio el modelo?`
          : 'Revisa el plan y confirma para ejecutar',
      });
      return;
    }

    const parentTaskId = taskStore.create({
      agent_id: null,
      parent_task_id: null,
      type: 'orchestration',
      status: 'processing',
      priority: 1,
      input: JSON.stringify({ objective, agents: selectedAgents }),
      output: null,
      error: null,
    });

    // Return immediately with task ID (async processing)
    res.json({ parentTaskId, status: 'processing', objective, agents: selectedAgents });

    // Background processing
    (async () => {
      const results: any[] = [];
      let combinedContext = objective;

      for (const agentName of selectedAgents) {
        const agent = allAgents.find((a: any) => a.name === agentName);
        if (!agent) continue;

        const agentPrompt = `Eres parte de un flujo orquestado. Objetivo general: ${objective}\n\nContexto de pasos previos:\n${results.map(r => `- ${r.agent}: ${r.response?.substring(0, 500)}`).join('\n')}\n\nTu tarea específica como ${agentName}:\n${combinedContext}`;

        try {
          const result = await spawnAgent(agent.id, agentPrompt, model);
          results.push({ agent: agentName, taskId: result.taskId, response: result.response });
        } catch (err: any) {
          results.push({ agent: agentName, error: err.message });
        }
      }

      const combinedOutput = JSON.stringify(results.map(r => ({
        agent: r.agent,
        status: r.error ? 'failed' : 'completed',
        result: r.error ? r.error : (r.response?.substring(0, 2000) || ''),
      })));

      taskStore.updateStatus(parentTaskId, 'completed', combinedOutput);
      logToWiki(objective, selectedAgents, results);

      obsStore.create({
        agent_id: null,
        type: 'orchestration',
        content: `Orquestación: ${objective.substring(0, 200)}\nAgentes: ${selectedAgents.join(', ')}\nTareas: ${results.length > 0 ? results.map(r => `#${r.taskId}`).join(', ') : 'ninguna'}`,
        tags: JSON.stringify(['orchestration', ...selectedAgents]),
        source: `task:${parentTaskId}`,
      });
    })();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
