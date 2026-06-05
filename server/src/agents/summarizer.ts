import { callProvider } from '../providers/openrouter.js';
import { SummaryStore } from '../database/SummaryStore.js';
import { TaskStore } from '../database/TaskStore.js';
import { ObservationStore } from '../database/ObservationStore.js';

export async function summarizeConversation(agentId: number, taskIds: number[]): Promise<string> {
  const taskStore = new TaskStore();
  const summaryStore = new SummaryStore();
  const obsStore = new ObservationStore();

  const tasks = taskIds.map(id => taskStore.getById(id)).filter(Boolean);
  if (tasks.length === 0) throw new Error('No tasks to summarize');

  const conversationText = tasks.map(t =>
    `[Input]: ${t!.input}\n[Output]: ${t!.output || '(sin respuesta)'}`
  ).join('\n\n---\n\n');

  const prompt = `Resume las siguientes interacciones de un agente de IA. Extrae:
1. Decisiones tomadas
2. Código o soluciones propuestas
3. Problemas identificados
4. Próximos pasos

Conversación:
${conversationText.substring(0, 6000)}

Resumen (en español, conciso):`;

  const summary = await callProvider([
    { role: 'system', content: 'Eres un asistente que resume conversaciones técnicas de forma clara y concisa.' },
    { role: 'user', content: prompt },
  ]);

  summaryStore.create({
    agent_id: agentId,
    session_id: null,
    summary,
    model: null,
  });

  obsStore.create({
    agent_id: agentId,
    type: 'summary',
    content: `Resumen generado: ${summary.substring(0, 500)}`,
    tags: JSON.stringify(['summary', 'auto']),
    source: `tasks:${taskIds.join(',')}`,
  });

  return summary;
}
