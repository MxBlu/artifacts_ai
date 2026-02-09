export interface Config {
  apiToken: string;
  characterName: string;
}

const CONFIG_KEY = 'artifacts_mmo_config';

export function saveConfig(config: Config): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadConfig(): Config | null {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
