import { readFileSync, writeFileSync, existsSync } from 'fs';
import { SETTINGS_PATH } from '../shared/paths.js';

export interface Settings {
  provider: string;
  model: string;
  worker_port: number;
  [key: string]: string | number;
}

const DEFAULTS: Settings = {
  provider: 'openrouter',
  model: 'deepseek/deepseek-v4-flash-free',
  worker_port: 37778,
};

export class SettingsManager {
  private settings: Settings;

  constructor() {
    this.settings = { ...DEFAULTS };
    this.load();
  }

  private load(): void {
    if (existsSync(SETTINGS_PATH)) {
      try {
        const data = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
        this.settings = { ...DEFAULTS, ...data };
      } catch {
        this.settings = { ...DEFAULTS };
      }
    }
  }

  save(): void {
    writeFileSync(SETTINGS_PATH, JSON.stringify(this.settings, null, 2), 'utf-8');
  }

  get(key: string): string | number | undefined {
    return this.settings[key];
  }

  getAll(): Settings {
    return { ...this.settings };
  }

  set(key: string, value: string | number): void {
    this.settings[key as keyof Settings] = value as any;
    this.save();
  }
}
