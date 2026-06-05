import { TaskStore } from '../database/TaskStore.js';
import { AgentStore } from '../database/AgentStore.js';
import { ObservationStore } from '../database/ObservationStore.js';
import { callProvider } from '../providers/openrouter.js';

export interface SpawnResult {
  taskId: number;
  response: string;
}

export async function spawnAgent(agentId: number, prompt: string): Promise<SpawnResult> {
  const store = new AgentStore();
  const taskStore = new TaskStore();
  const obsStore = new ObservationStore();

  const agent = store.getById(agentId);
  if (!agent) throw new Error(`Agente ${agentId} no encontrado`);

  const config = JSON.parse(agent.config || '{}');
  const persona = config.persona || `Eres un agente de tipo ${agent.type}. Responde de forma útil y profesional.`;

  store.update(agentId, { status: 'running' });

  const taskId = taskStore.create({
    agent_id: agentId,
    parent_task_id: null,
    type: 'chat',
    status: 'running',
    priority: 0,
    input: JSON.stringify({ prompt }),
    output: null,
    error: null,
  });

  try {
    const response = await callProvider([
      { role: 'system', content: persona },
      { role: 'user', content: prompt },
    ], { model: agent.model || undefined });

    taskStore.updateStatus(taskId, 'completed', response);
    store.update(agentId, { status: 'idle' });

    obsStore.create({
      agent_id: agentId,
      type: 'interaction',
      content: `[${agent.name}] Prompt: ${prompt.substring(0, 200)}\nRespuesta: ${response.substring(0, 300)}`,
      tags: JSON.stringify([agent.type, 'interaction']),
      source: `task:${taskId}`,
    });

    return { taskId, response };
  } catch (err: any) {
    taskStore.updateStatus(taskId, 'failed', undefined, err.message);
    store.update(agentId, { status: 'idle' });

    obsStore.create({
      agent_id: agentId,
      type: 'error',
      content: `[${agent.name}] Error: ${err.message}. Prompt: ${prompt.substring(0, 200)}`,
      tags: JSON.stringify([agent.type, 'error']),
      source: `task:${taskId}`,
    });

    throw err;
  }
}
