import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const RUFFLO_ROOT = resolve(__dirname, '..', '..', '..');
export const RUFFLO_DATA = resolve(homedir(), '.config', 'opencode', 'opencode-ruflo');
export const DB_PATH = resolve(RUFFLO_DATA, 'ruflo.db');
export const SETTINGS_PATH = resolve(RUFFLO_DATA, 'settings.json');
