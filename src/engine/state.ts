import * as fs from 'fs';
import * as path from 'path';

export interface ExecutionMetrics {
  actionsExecuted: number;
  xpGains: Record<string, number>;
  goldGained: number;
  itemsGathered: Record<string, number>;
  tasksCoinsGained: number;
}

export interface ExecutionState {
  script: string;
  currentLine: number;
  variables: Record<string, any>;
  callStack: number[];
  startTime: number;
  lastAgentCheckIn: number;
  status: 'running' | 'paused' | 'stopped' | 'error';
  errorMessage?: string;
  executionLog: string[];
  metrics: ExecutionMetrics;
}

const STATE_DIR = path.resolve(process.cwd(), 'state');
const STATE_FILE = path.join(STATE_DIR, 'execution_state.json');
const MAX_LOG_ENTRIES = 1000;
const MAX_SNAPSHOTS = 3;

export function createEmptyState(script: string = ''): ExecutionState {
  return {
    script,
    currentLine: 0,
    variables: {},
    callStack: [],
    startTime: Date.now(),
    lastAgentCheckIn: Date.now(),
    status: 'stopped',
    executionLog: [],
    metrics: {
      actionsExecuted: 0,
      xpGains: {},
      goldGained: 0,
      itemsGathered: {},
      tasksCoinsGained: 0,
    },
  };
}

export function saveState(state: ExecutionState): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });

  // Rotate snapshots before overwriting
  for (let i = MAX_SNAPSHOTS - 1; i >= 1; i--) {
    const from = `${STATE_FILE}.${i - 1}`;
    const to   = `${STATE_FILE}.${i}`;
    if (fs.existsSync(from)) {
      fs.renameSync(from, to);
    }
  }
  if (fs.existsSync(STATE_FILE)) {
    fs.renameSync(STATE_FILE, `${STATE_FILE}.1`);
  }

  // Trim log if needed
  if (state.executionLog.length > MAX_LOG_ENTRIES) {
    state.executionLog = state.executionLog.slice(-MAX_LOG_ENTRIES);
  }

  // Atomic write: write to .tmp then rename
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, STATE_FILE);
}

export function loadState(): ExecutionState | null {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw) as ExecutionState;
  } catch {
    // Try snapshots
    for (let i = 1; i <= MAX_SNAPSHOTS; i++) {
      const snap = `${STATE_FILE}.${i}`;
      if (fs.existsSync(snap)) {
        try {
          const raw = fs.readFileSync(snap, 'utf8');
          console.warn(`Loaded snapshot ${i} due to corrupted state file`);
          return JSON.parse(raw) as ExecutionState;
        } catch {}
      }
    }
    return null;
  }
}

export function appendLog(state: ExecutionState, message: string): void {
  const ts = new Date().toISOString().substring(11, 19);
  state.executionLog.push(`[${ts}] ${message}`);
  if (state.executionLog.length > MAX_LOG_ENTRIES) {
    state.executionLog.shift();
  }
  console.log(`[${ts}] ${message}`);
}
