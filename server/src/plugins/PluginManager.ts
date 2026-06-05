import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../database/Database.js';
import { AgentStore } from '../database/AgentStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PLUGINS_DIR = resolve(__dirname, '..', '..', '..', 'plugins');

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  agents?: { name: string; type: string; description: string; model?: string; persona: string }[];
  skills?: string[];
}

export interface PluginRecord {
  id?: number;
  name: string;
  version: string;
  description: string;
  directory: string;
  enabled: number;
  agent_count: number;
  skill_files: string;
  created_at?: string;
  updated_at?: string;
}

export class PluginManager {
  getAll(): PluginRecord[] {
    return getDb().query('SELECT * FROM plugins ORDER BY name').all() as PluginRecord[];
  }

  getByName(name: string): PluginRecord | null {
    return getDb().query('SELECT * FROM plugins WHERE name = ?').get(name) as PluginRecord | null;
  }

  register(manifest: PluginManifest, directory: string, agentCount: number, skillFiles: string[]): number {
    const existing = this.getByName(manifest.name);
    if (existing) {
      getDb().query(
        `UPDATE plugins SET version=$1, description=$2, directory=$3, agent_count=$4, skill_files=$5, updated_at=datetime('now') WHERE name=$6`
      ).run(manifest.version, manifest.description, directory, agentCount, JSON.stringify(skillFiles), manifest.name);
      return existing.id!;
    }
    const r = getDb().query(
      `INSERT INTO plugins (name, version, description, directory, enabled, agent_count, skill_files)
       VALUES ($1, $2, $3, $4, 1, $5, $6) RETURNING id`
    ).get(manifest.name, manifest.version, manifest.description, directory, agentCount, JSON.stringify(skillFiles)) as { id: number };
    return r.id;
  }

  enable(name: string): void {
    getDb().query("UPDATE plugins SET enabled=1, updated_at=datetime('now') WHERE name=?").run(name);
  }

  disable(name: string): void {
    getDb().query("UPDATE plugins SET enabled=0, updated_at=datetime('now') WHERE name=?").run(name);
  }

  uninstall(name: string): void {
    getDb().query('DELETE FROM plugins WHERE name = ?').run(name);
  }

  loadPluginsFromDirectories(): number {
    const agentStore = new AgentStore();
    let count = 0;

    if (!existsSync(PLUGINS_DIR)) return 0;

    const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pluginDir = resolve(PLUGINS_DIR, entry.name);
      const manifestPath = resolve(pluginDir, 'plugin.json');
      if (!existsSync(manifestPath)) continue;

      try {
        const manifest: PluginManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        if (!manifest.name) continue;

        let agentCount = 0;
        const skillFiles: string[] = [];

        if (manifest.agents) {
          for (const agentDef of manifest.agents) {
            agentStore.upsertFromDefinition(agentDef.name, {
              type: agentDef.type,
              description: agentDef.description,
              model: agentDef.model,
            });
            const existing = agentStore.getByName(agentDef.name);
            if (existing) {
              const config = JSON.parse(existing.config || '{}');
              config.persona = agentDef.persona;
              config.plugin = manifest.name;
              agentStore.update(existing.id!, { config: JSON.stringify(config) });
            }
            agentCount++;
          }
        }

        if (manifest.skills) {
          for (const skill of manifest.skills) {
            const skillPath = resolve(pluginDir, skill);
            if (existsSync(skillPath)) {
              skillFiles.push(skillPath);
            }
          }
        }

        this.register(manifest, pluginDir, agentCount, skillFiles);
        count++;
      } catch (err) {
        console.error(`[plugins] Error loading plugin ${entry.name}:`, err);
      }
    }

    return count;
  }

  getSkillPaths(): string[] {
    const plugins = this.getAll();
    const paths: string[] = [];
    for (const p of plugins) {
      if (!p.enabled) continue;
      const files: string[] = JSON.parse(p.skill_files || '[]');
      for (const f of files) {
        if (existsSync(f)) paths.push(f);
      }
    }
    return paths;
  }
}
