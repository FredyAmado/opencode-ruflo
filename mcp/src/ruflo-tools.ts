import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, join, extname, basename } from 'path';

const WORKER_URL = 'http://127.0.0.1:37778';

interface ValidationResult {
  category: 'structure' | 'security' | 'staleness';
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

function validatePlugin(dir: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (!dir || !existsSync(dir)) {
    results.push({ category: 'structure', check: 'directory_exists', status: 'fail', message: 'Directory does not exist' });
    return results;
  }

  const manifestPath = resolve(dir, 'plugin.json');

  // --- Structure checks ---
  if (!existsSync(manifestPath)) {
    results.push({ category: 'structure', check: 'manifest_exists', status: 'fail', message: 'plugin.json not found' });
    return results;
  }
  results.push({ category: 'structure', check: 'manifest_exists', status: 'pass', message: 'plugin.json found' });

  let manifest: any;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    results.push({ category: 'structure', check: 'manifest_valid_json', status: 'pass', message: 'plugin.json is valid JSON' });
  } catch {
    results.push({ category: 'structure', check: 'manifest_valid_json', status: 'fail', message: 'plugin.json is not valid JSON' });
    return results;
  }

  const required = ['name', 'version', 'description'];
  for (const field of required) {
    if (manifest[field]) {
      results.push({ category: 'structure', check: `manifest_has_${field}`, status: 'pass', message: `${field}: "${manifest[field]}"` });
    } else {
      results.push({ category: 'structure', check: `manifest_has_${field}`, status: 'fail', message: `Missing required field: ${field}` });
    }
  }

  if (manifest.name && !/^[a-z][a-z0-9-]+$/.test(manifest.name)) {
    results.push({ category: 'structure', check: 'naming_convention', status: 'fail', message: `Plugin name "${manifest.name}" should be lowercase kebab-case (letters, numbers, hyphens only)` });
  } else if (manifest.name) {
    results.push({ category: 'structure', check: 'naming_convention', status: 'pass', message: `Plugin name "${manifest.name}" follows kebab-case` });
  }

  // Agent validation
  if (manifest.agents) {
    if (Array.isArray(manifest.agents)) {
      results.push({ category: 'structure', check: 'agents_array', status: 'pass', message: `${manifest.agents.length} agent(s) defined` });
      for (let i = 0; i < manifest.agents.length; i++) {
        const agent = manifest.agents[i];
        if (!agent.name) {
          results.push({ category: 'structure', check: `agent_${i}_name`, status: 'fail', message: `Agent #${i + 1} missing 'name'` });
        }
        if (!agent.type) {
          results.push({ category: 'structure', check: `agent_${i}_type`, status: 'fail', message: `Agent "${agent.name || 'unnamed'}" missing 'type'` });
        }
        if (!agent.description) {
          results.push({ category: 'structure', check: `agent_${i}_description`, status: 'warn', message: `Agent "${agent.name}" missing 'description'` });
        }
        if (!agent.persona) {
          results.push({ category: 'structure', check: `agent_${i}_persona`, status: 'warn', message: `Agent "${agent.name}" missing 'persona'` });
        }
      }
    } else {
      results.push({ category: 'structure', check: 'agents_array', status: 'fail', message: '"agents" must be an array' });
    }
  } else {
    results.push({ category: 'structure', check: 'agents_array', status: 'warn', message: 'No agents defined in manifest' });
  }

  // Skills validation
  if (manifest.skills) {
    if (Array.isArray(manifest.skills)) {
      for (let i = 0; i < manifest.skills.length; i++) {
        const skillPath = resolve(dir, manifest.skills[i]);
        if (existsSync(skillPath)) {
          results.push({ category: 'structure', check: `skill_${i}_exists`, status: 'pass', message: `Skill file found: ${manifest.skills[i]}` });
        } else {
          results.push({ category: 'structure', check: `skill_${i}_exists`, status: 'fail', message: `Skill file not found: ${manifest.skills[i]}` });
        }
      }
    } else {
      results.push({ category: 'structure', check: 'skills_array', status: 'fail', message: '"skills" must be an array' });
    }
  }

  // Required directories
  const expectedDirs = ['skills'];
  for (const sub of expectedDirs) {
    const subPath = resolve(dir, sub);
    if (existsSync(subPath)) {
      results.push({ category: 'structure', check: `dir_${sub}`, status: 'pass', message: `Directory "${sub}/" exists` });
    }
  }

  // --- Security scan ---
  const secretPatterns: { regex: RegExp; label: string; severity: string }[] = [
    { regex: /['"](?:sk-|pk-)[a-zA-Z0-9]{20,}['"]/g, label: 'OpenAI-style API key', severity: 'high' },
    { regex: /gh[pousr]_[A-Za-z0-9_]{20,}/g, label: 'GitHub token', severity: 'high' },
    { regex: /AKIA[0-9A-Z]{16}/g, label: 'AWS access key', severity: 'high' },
    { regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/g, label: 'Private key', severity: 'critical' },
    { regex: /https?:\/\/[^:]+:[^@]+@/g, label: 'URL with embedded credentials', severity: 'high' },
  ];

  const scanFiles = getAllFiles(dir);
  let secretFound = false;
  for (const file of scanFiles) {
    const ext = extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) continue;
    try {
      const content = readFileSync(file, 'utf-8');
      for (const pattern of secretPatterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          secretFound = true;
          const relative = file.replace(dir, '').replace(/^[/\\]/, '');
          results.push({ category: 'security', check: `secret_${pattern.label.replace(/\s+/g, '_')}`, status: 'fail', message: `${pattern.label} found in ${relative} (${matches.length} match(es))` });
        }
      }
    } catch {}
  }
  if (!secretFound) {
    results.push({ category: 'security', check: 'secrets_scan', status: 'pass', message: 'No hardcoded secrets detected' });
  }

  // Check for hardcoded env variable names
  const envPattern = /process\.env\.(\w+)|Deno\.env\.get\(['"](\w+)['"]\)/g;
  for (const file of scanFiles) {
    if (['.ts', '.js', '.mjs', '.cjs'].includes(extname(file).toLowerCase())) {
      try {
        const content = readFileSync(file, 'utf-8');
        const envVars = [...content.matchAll(envPattern)].map(m => m[1] || m[2]);
        if (envVars.length) {
          for (const v of [...new Set(envVars)]) {
            results.push({ category: 'security', check: `env_var_${v}`, status: 'warn', message: `Uses env var ${v} — ensure it's documented` });
          }
        }
      } catch {}
    }
  }

  // --- Staleness check ---
  try {
    const stat = statSync(manifestPath);
    const ageDays = (Date.now() - stat.mtimeMs) / 86400000;
    if (ageDays > 180) {
      results.push({ category: 'staleness', check: 'plugin_age', status: 'fail', message: `Last modified ${Math.floor(ageDays)} days ago (> 180 days)` });
    } else if (ageDays > 90) {
      results.push({ category: 'staleness', check: 'plugin_age', status: 'warn', message: `Last modified ${Math.floor(ageDays)} days ago (> 90 days)` });
    } else {
      results.push({ category: 'staleness', check: 'plugin_age', status: 'pass', message: `Last modified ${Math.floor(ageDays)} days ago` });
    }
  } catch {
    results.push({ category: 'staleness', check: 'plugin_age', status: 'warn', message: 'Could not determine plugin age' });
  }

  return results;
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...getAllFiles(full));
        }
      } else {
        files.push(full);
      }
    }
  } catch {}
  return files;
}

function formatValidationReport(results: ValidationResult[]): string {
  const groups: Record<string, ValidationResult[]> = { structure: [], security: [], staleness: [] };
  for (const r of results) {
    groups[r.category]?.push(r);
  }

  const lines: string[] = [];
  const counts = { pass: 0, fail: 0, warn: 0 };

  for (const [categoryLabel, catResults] of Object.entries(groups)) {
    const label = { structure: 'Estructura', security: 'Seguridad', staleness: 'Obsolescencia' }[categoryLabel] || categoryLabel;
    lines.push(`\n## ${label} (${catResults.length})`);

    for (const r of catResults) {
      counts[r.status]++;
      const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⚠️';
      lines.push(`  ${icon} ${r.message}`);
    }
  }

  lines.unshift(`## Resultado: ${counts.pass} ✅ / ${counts.fail} ❌ / ${counts.warn} ⚠️`);
  return lines.join('\n');
}

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
    {
      name: 'ruflo_plugin_validate',
      description: 'Valida un plugin de ruflo: estructura, seguridad y obsolescencia. Devuelve un reporte con checks de cada categoría.',
      inputSchema: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Ruta absoluta al directorio del plugin a validar' },
        },
        required: ['directory'],
      },
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

    case 'ruflo_plugin_validate': {
      const a = args as any;
      if (!a.directory) {
        return { content: [{ type: 'text', text: '❌ Error: "directory" argument is required' }] };
      }
      const results = validatePlugin(a.directory);
      return { content: [{ type: 'text', text: formatValidationReport(results) }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
