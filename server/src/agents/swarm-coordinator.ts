import { spawnAgent } from './agent-runner.js';
import { SwarmStore, Swarm } from '../database/SwarmStore.js';
import { ObservationStore } from '../database/ObservationStore.js';
import { AgentStore } from '../database/AgentStore.js';

export interface SwarmResult {
  swarmId: number;
  status: string;
  result: string | null;
  taskResults: { agentName: string; output: string }[];
}

async function runSubTask(swarmId: number, agentId: number, prompt: string, swarmStore: SwarmStore, parentTaskId?: number): Promise<string> {
  const taskId = swarmStore.createTask({
    swarm_id: swarmId,
    agent_id: agentId,
    parent_id: parentTaskId || null,
    type: 'work',
    input: JSON.stringify({ prompt }),
    status: 'running',
  });

  try {
    const result = await spawnAgent(agentId, prompt);
    swarmStore.updateTask(taskId, 'completed', result.response);
    return result.response;
  } catch (err: any) {
    swarmStore.updateTask(taskId, 'failed', err.message);
    return `[Error: ${err.message}]`;
  }
}

export async function runSequentialSwarm(swarm: Swarm, objective: string): Promise<SwarmResult> {
  const swarmStore = new SwarmStore();
  const obsStore = new ObservationStore();
  const agentStore = new AgentStore();
  const workerIds: number[] = JSON.parse(swarm.worker_ids || '[]');

  swarmStore.update(swarm.id!, { status: 'running' });

  const taskResults: { agentName: string; output: string }[] = [];
  let context = objective;

  for (const agentId of workerIds) {
    const agent = agentStore.getById(agentId);
    if (!agent) continue;
    const output = await runSubTask(swarm.id!, agentId, context, swarmStore);
    context = output;
    taskResults.push({ agentName: agent.name, output });
  }

  const finalResult = context;

  swarmStore.update(swarm.id!, { status: 'completed', result: finalResult });

  obsStore.create({
    agent_id: null,
    type: 'swarm',
    content: `[Swarm #${swarm.id}] Secuencial: ${objective.substring(0, 100)}\nResultado: ${finalResult.substring(0, 300)}`,
    tags: JSON.stringify(['swarm', 'sequential', swarm.topology]),
    source: `swarm:${swarm.id}`,
  });

  return { swarmId: swarm.id!, status: 'completed', result: finalResult, taskResults };
}

export async function runHierarchicalSwarm(swarm: Swarm, objective: string): Promise<SwarmResult> {
  const swarmStore = new SwarmStore();
  const obsStore = new ObservationStore();
  const agentStore = new AgentStore();
  const workerIds: number[] = JSON.parse(swarm.worker_ids || '[]');

  swarmStore.update(swarm.id!, { status: 'running' });

  const taskResults: { agentName: string; output: string }[] = [];

  const planPrompt = `Eres el coordinador de un equipo de agentes. Tu equipo tiene estos agentes:\n${workerIds.map(id => {
    const a = agentStore.getById(id);
    return a ? `- ${a.name} (${a.type}): ${a.description.substring(0, 80)}` : '';
  }).filter(Boolean).join('\n')}\n\nObjetivo: ${objective}\n\nDesglosa este objetivo en subtareas, una por agente. Para cada subtarea, escribe instrucciones claras.`;

  const planResult = workerIds.length > 0
    ? await runSubTask(swarm.id!, workerIds[0], planPrompt, swarmStore)
    : 'No workers available';

  taskResults.push({ agentName: 'coordinator', output: planResult });

  for (let i = 1; i < workerIds.length; i++) {
    const agent = agentStore.getById(workerIds[i]);
    if (!agent) continue;
    const workerPrompt = `Contexto del equipo:\n${planResult}\n\nTu tarea como ${agent.name} (${agent.type}): contribuye al objetivo "${objective}" según el plan de arriba.`;
    const output = await runSubTask(swarm.id!, workerIds[i], workerPrompt, swarmStore, swarmStore.getTasks(swarm.id!)[0]?.id);
    taskResults.push({ agentName: agent.name, output });
  }

  const summaryPrompt = `Sintetiza los resultados de este equipo de trabajo:\n${taskResults.map(t => `## ${t.agentName}\n${t.output.substring(0, 500)}`).join('\n\n')}\n\nObjetivo original: ${objective}\n\nProporciona un resumen ejecutivo del trabajo completado.`;
  const summary = workerIds.length > 1
    ? await runSubTask(swarm.id!, workerIds[1], summaryPrompt, swarmStore)
    : planResult;

  swarmStore.update(swarm.id!, { status: 'completed', result: summary });

  obsStore.create({
    agent_id: null,
    type: 'swarm',
    content: `[Swarm #${swarm.id}] Jerárquico: ${objective.substring(0, 100)}\nResultado: ${summary.substring(0, 300)}`,
    tags: JSON.stringify(['swarm', 'hierarchical', swarm.topology]),
    source: `swarm:${swarm.id}`,
  });

  return { swarmId: swarm.id!, status: 'completed', result: summary, taskResults };
}

export async function runMeshSwarm(swarm: Swarm, objective: string): Promise<SwarmResult> {
  const swarmStore = new SwarmStore();
  const obsStore = new ObservationStore();
  const agentStore = new AgentStore();
  const workerIds: number[] = JSON.parse(swarm.worker_ids || '[]');

  swarmStore.update(swarm.id!, { status: 'running' });

  const results = await Promise.all(workerIds.map(async (agentId) => {
    const agent = agentStore.getById(agentId);
    if (!agent) return null;
    const output = await runSubTask(swarm.id!, agentId, objective, swarmStore);
    return { agentName: agent.name, output };
  }));

  const taskResults = results.filter(Boolean) as { agentName: string; output: string }[];

  const combined = taskResults.map(t => `## ${t.agentName}\n${t.output.substring(0, 500)}`).join('\n\n');
  const finalResult = combined || 'No results';

  swarmStore.update(swarm.id!, { status: 'completed', result: finalResult });

  obsStore.create({
    agent_id: null,
    type: 'swarm',
    content: `[Swarm #${swarm.id}] Mesh: ${objective.substring(0, 100)}\nParticipantes: ${taskResults.length}`,
    tags: JSON.stringify(['swarm', 'mesh', swarm.topology]),
    source: `swarm:${swarm.id}`,
  });

  return { swarmId: swarm.id!, status: 'completed', result: finalResult, taskResults };
}

export async function executeSwarm(swarmId: number, objective: string): Promise<SwarmResult> {
  const swarmStore = new SwarmStore();
  const swarm = swarmStore.getById(swarmId);
  if (!swarm) throw new Error(`Swarm ${swarmId} no encontrado`);

  switch (swarm.topology) {
    case 'sequential':
      return runSequentialSwarm(swarm, objective);
    case 'mesh':
      return runMeshSwarm(swarm, objective);
    case 'hierarchical':
    default:
      return runHierarchicalSwarm(swarm, objective);
  }
}
