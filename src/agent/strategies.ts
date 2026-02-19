import * as fs from 'fs';
import * as path from 'path';

export type StrategyOutcome = 'completed' | 'modified' | 'error' | 'stopped';

export interface StrategyEntry {
  id: string;               // ISO timestamp used as ID
  startedAt: number;        // epoch ms
  endedAt?: number;
  durationSecs?: number;
  reasoning: string;        // why the agent chose this strategy
  script: string;           // the DSL script that ran
  outcome?: StrategyOutcome;
  outcomeNote?: string;     // e.g. error message or human steer that caused change
  metrics: {
    actionsExecuted: number;
    xpGains: Record<string, number>;
    goldGained: number;
  };
}

const STRATEGIES_FILE = path.resolve(process.cwd(), 'state', 'strategies.json');
const MAX_ENTRIES = 50; // keep last 50

export function loadStrategies(): StrategyEntry[] {
  if (!fs.existsSync(STRATEGIES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(STRATEGIES_FILE, 'utf8')) as StrategyEntry[];
  } catch {
    return [];
  }
}

export function appendStrategy(entry: StrategyEntry): void {
  fs.mkdirSync(path.dirname(STRATEGIES_FILE), { recursive: true });
  const entries = loadStrategies();
  entries.unshift(entry); // newest first
  const trimmed = entries.slice(0, MAX_ENTRIES);
  const tmp = `${STRATEGIES_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(trimmed, null, 2), 'utf8');
  fs.renameSync(tmp, STRATEGIES_FILE);
}

// Return last N entries as a compact human-readable summary for the LLM
export function getRecentStrategySummary(n = 5): string {
  const entries = loadStrategies().slice(0, n);
  if (entries.length === 0) return '(no history yet)';

  return entries.map((e, i) => {
    const dur = e.durationSecs != null ? `${Math.round(e.durationSecs / 60)}m` : '?m';
    const xp = Object.entries(e.metrics.xpGains)
      .map(([s, v]) => `${s}:+${v}`)
      .join(', ') || 'none';
    const gold = e.metrics.goldGained > 0 ? `, gold:+${e.metrics.goldGained}` : '';
    const firstLine = e.script.split('\n').find(l => l.trim() && !l.trim().startsWith('#')) ?? '';
    return `${i + 1}. [${new Date(e.startedAt).toISOString().slice(0, 16)}] ${dur} | ${e.outcome ?? 'running'} | xp: ${xp}${gold}\n   reason: ${e.reasoning.slice(0, 120)}\n   script: ${firstLine}${e.outcomeNote ? `\n   note: ${e.outcomeNote}` : ''}`;
  }).join('\n\n');
}
