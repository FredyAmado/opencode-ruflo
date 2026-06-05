import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { AgentStore } from '../database/AgentStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AGENTS_DIR = resolve(__dirname, '..', '..', '..', 'agents');

export interface AgentDefinition {
  name: string;
  type: string;
  model: string | null;
  description: string;
  persona: string;
}

export function parseAgentMarkdown(filePath: string): AgentDefinition | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const body = frontmatterMatch[2].trim();

    const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const type = frontmatter.match(/^type:\s*(.+)$/m)?.[1]?.trim();
    const model = frontmatter.match(/^model:\s*(.+)$/m)?.[1]?.trim() || null;
    const descLine = frontmatter.match(/^description:\s*(.+)$/m)?.[1];
    let description = '';
    if (descLine) {
      const trimmed = descLine.trim();
      if (trimmed === '>' || trimmed === '|') {
        const lines = frontmatter.split('\n');
        const idx = lines.findIndex(l => l.startsWith('description:'));
        const descLines: string[] = [];
        for (let i = idx + 1; i < lines.length; i++) {
          if (/^\s+\S/.test(lines[i])) descLines.push(lines[i].trim());
          else if (lines[i].trim() === '') continue;
          else break;
        }
        description = descLines.join(' ');
      } else {
        description = trimmed;
      }
    }

    if (!name || !type) return null;

    return { name, type, model, description, persona: body };
  } catch {
    return null;
  }
}

export function loadAllAgentDefinitions(): AgentDefinition[] {
  const agents: AgentDefinition[] = [];
  if (!readdirSync(AGENTS_DIR, { withFileTypes: true })) return agents;

  const files = readdirSync(AGENTS_DIR, { withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && extname(file.name) === '.md') {
      const def = parseAgentMarkdown(resolve(AGENTS_DIR, file.name));
      if (def) agents.push(def);
    }
  }
  return agents;
}

export function syncAgentsToDb(): number {
  const store = new AgentStore();
  const defs = loadAllAgentDefinitions();
  let count = 0;
  for (const def of defs) {
    const existing = store.getByName(def.name);
    if (existing) {
      store.update(existing.id!, {
        type: def.type,
        description: def.description,
        model: def.model,
        config: JSON.stringify({ persona: def.persona }),
      });
    } else {
      store.create({
        name: def.name,
        type: def.type,
        description: def.description,
        model: def.model,
        config: JSON.stringify({ persona: def.persona }),
        status: 'idle',
      });
    }
    count++;
  }
  return count;
}
