import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const WORKER_URL = 'http://127.0.0.1:37778';

const server = new Server(
  { name: 'opencode-ruflo', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'ruflo_health',
      description: 'Verifica que el worker de Ruflo esté funcionando',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'ruflo_agent_list',
      description: 'Lista todos los agentes registrados con sus tipos y estados',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'ruflo_agent_get',
      description: 'Obtiene detalles de un agente por ID o nombre',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'ID del agente' },
          name: { type: 'string', description: 'Nombre del agente (alternativo a ID)' },
        },
      },
    },
    {
      name: 'ruflo_agent_spawn',
      description: 'Ejecuta una tarea en un agente. El agente usa su personalidad y conocimientos para responder',
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: { type: 'number', description: 'ID del agente a ejecutar' },
          prompt: { type: 'string', description: 'Instrucción o tarea para el agente' },
        },
        required: ['agent_id', 'prompt'],
      },
    },
    {
      name: 'ruflo_agent_create',
      description: 'Crea un nuevo agente personalizado',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del agente' },
          type: { type: 'string', description: 'Tipo (coder, tester, architect, reviewer, security, researcher, writer, devops, designer, planner, o personalizado)' },
          description: { type: 'string', description: 'Descripción del agente' },
          model: { type: 'string', description: 'Modelo AI opcional (default: deepseek-v4-flash-free)' },
        },
        required: ['name'],
      },
    },
    {
      name: 'ruflo_agent_tasks',
      description: 'Lista las tareas de un agente',
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: { type: 'number', description: 'ID del agente' },
          limit: { type: 'number', description: 'Máximo de resultados (default: 20)' },
        },
        required: ['agent_id'],
      },
    },
    {
      name: 'ruflo_memory_search',
      description: 'Busca en la memoria compartida (observaciones de agentes)',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto a buscar' },
          type: { type: 'string', description: 'Filtrar por tipo (observation, decision, learning, interaction, error, summary)' },
          limit: { type: 'number', description: 'Máximo de resultados (default: 20)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'ruflo_context_get',
      description: 'Obtiene el contexto compartido entre agentes',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Clave del contexto (opcional, si no se especifica lista todo)' },
          search: { type: 'string', description: 'Buscar en claves y valores' },
        },
      },
    },
    {
      name: 'ruflo_context_set',
      description: 'Actualiza o crea una entrada de contexto compartido entre agentes',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Clave del contexto' },
          value: { type: 'string', description: 'Valor del contexto' },
          description: { type: 'string', description: 'Descripción opcional' },
        },
        required: ['key', 'value'],
      },
    },
    {
      name: 'ruflo_memory_summarize',
      description: 'Genera un resumen de las últimas interacciones de un agente usando AI',
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: { type: 'number', description: 'ID del agente' },
          task_ids: { type: 'array', items: { type: 'number' }, description: 'IDs de tareas a resumir' },
        },
        required: ['agent_id', 'task_ids'],
      },
    },
    {
      name: 'ruflo_swarm_init',
      description: 'Crea un nuevo swarm (enjambre de agentes) para trabajar en equipo',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del swarm' },
          topology: { type: 'string', description: 'Topología: hierarchical, sequential, mesh (default: hierarchical)' },
          worker_ids: { type: 'array', items: { type: 'number' }, description: 'IDs de los agentes workers' },
          coordinator_agent_id: { type: 'number', description: 'ID del agente coordinador (opcional)' },
        },
        required: ['name', 'worker_ids'],
      },
    },
    {
      name: 'ruflo_swarm_execute',
      description: 'Ejecuta un swarm con un objetivo. Los agentes trabajan en equipo según la topología',
      inputSchema: {
        type: 'object',
        properties: {
          swarm_id: { type: 'number', description: 'ID del swarm a ejecutar' },
          objective: { type: 'string', description: 'Objetivo o tarea para el equipo de agentes' },
        },
        required: ['swarm_id', 'objective'],
      },
    },
    {
      name: 'ruflo_swarm_status',
      description: 'Obtiene el estado y resultados de un swarm',
      inputSchema: {
        type: 'object',
        properties: {
          swarm_id: { type: 'number', description: 'ID del swarm' },
        },
        required: ['swarm_id'],
      },
    },
    {
      name: 'ruflo_plugin_list',
      description: 'Lista los plugins de ruflo instalados',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'ruflo_plugin_scan',
      description: 'Escanea los directorios de plugins y los registra en el sistema',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'ruflo_health': {
      const res = await fetch(`${WORKER_URL}/api/health`);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_agent_list': {
      const res = await fetch(`${WORKER_URL}/api/agents`);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_agent_get': {
      const a = args as any;
      let url = `${WORKER_URL}/api/agents`;
      if (a.id) url = `${WORKER_URL}/api/agents/${a.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (a.name && Array.isArray(data)) {
        const found = data.find((ag: any) => ag.name === a.name);
        if (!found) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Agent not found' }, null, 2) }] };
        return { content: [{ type: 'text', text: JSON.stringify(found, null, 2) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_agent_spawn': {
      const a = args as any;
      const res = await fetch(`${WORKER_URL}/api/agents/${a.agent_id}/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: a.prompt }),
      });
      const data = await res.json();
      const text = typeof data.response === 'string' ? data.response : JSON.stringify(data, null, 2);
      return { content: [{ type: 'text', text }] };
    }

    case 'ruflo_agent_create': {
      const a = args as any;
      const res = await fetch(`${WORKER_URL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: a.name, type: a.type || 'general', description: a.description || '', model: a.model || null }),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_agent_tasks': {
      const a = args as any;
      const limit = a.limit || 20;
      const res = await fetch(`${WORKER_URL}/api/agents/${a.agent_id}/tasks?limit=${limit}`);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_memory_search': {
      const a = args as any;
      let url = `${WORKER_URL}/api/observations?q=${encodeURIComponent(a.query)}`;
      if (a.type) url += `&type=${encodeURIComponent(a.type)}`;
      if (a.limit) url += `&limit=${a.limit}`;
      const res = await fetch(url);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_context_get': {
      const a = args as any;
      if (a.key) {
        const res = await fetch(`${WORKER_URL}/api/context/${encodeURIComponent(a.key)}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      let url = `${WORKER_URL}/api/context`;
      if (a.search) url += `?q=${encodeURIComponent(a.search)}`;
      const res = await fetch(url);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_context_set': {
      const a = args as any;
      const res = await fetch(`${WORKER_URL}/api/context/${encodeURIComponent(a.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: a.value, description: a.description }),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_memory_summarize': {
      const a = args as any;
      const res = await fetch(`${WORKER_URL}/api/summarize/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: a.agent_id, task_ids: a.task_ids }),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_swarm_init': {
      const a = args as any;
      const res = await fetch(`${WORKER_URL}/api/swarms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: a.name,
          topology: a.topology || 'hierarchical',
          worker_ids: a.worker_ids,
          coordinator_agent_id: a.coordinator_agent_id || null,
        }),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_swarm_execute': {
      const a = args as any;
      const res = await fetch(`${WORKER_URL}/api/swarms/${a.swarm_id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective: a.objective }),
      });
      const data = await res.json();
      const text = typeof data.result === 'string' ? data.result : JSON.stringify(data, null, 2);
      return { content: [{ type: 'text', text }] };
    }

    case 'ruflo_swarm_status': {
      const a = args as any;
      const res = await fetch(`${WORKER_URL}/api/swarms/${a.swarm_id}`);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_plugin_list': {
      const res = await fetch(`${WORKER_URL}/api/plugins`);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'ruflo_plugin_scan': {
      const res = await fetch(`${WORKER_URL}/api/plugins/scan`, { method: 'POST' });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
