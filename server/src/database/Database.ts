import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DB_PATH } from '../shared/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database | null = null;

export function getDb(): Database {
  if (db) return db;
  db = new Database(DB_PATH, { create: true });
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  initializeSchema();
  return db;
}

function initializeSchema(): void {
  const schemaPath = resolve(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  getDb().exec(schema);

  // Migrations for existing databases (safe to run on fresh installs — try-catch ignores "duplicate column" errors)
  const migrations = [
    "ALTER TABLE tasks ADD COLUMN tokens_input INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE tasks ADD COLUMN tokens_output INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE tasks ADD COLUMN tokens_cache INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE agents ADD COLUMN last_used_at TEXT",
  ];
  for (const m of migrations) {
    try { getDb().exec(m); } catch {}
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
