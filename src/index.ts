import * as fs from 'fs';
import * as path from 'path';
import { ArtifactsAPI } from './api';
import { ScriptExecutor } from './engine/executor';
import { createEmptyState, loadState, saveState } from './engine/state';

const CHARACTER_NAME = 'greenglasses';
const AUTH_FILE = path.resolve(process.cwd(), 'auth_headers.txt');

function loadApiToken(): string {
  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`auth_headers.txt not found at ${AUTH_FILE}`);
  }
  const raw = fs.readFileSync(AUTH_FILE, 'utf8').trim();
  // Format: "Authorization: Bearer <token>"
  const match = raw.match(/Bearer\s+(\S+)/);
  if (!match) throw new Error(`Could not parse Bearer token from ${AUTH_FILE}`);
  return match[1];
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const scriptFile = args[1];

  const token = loadApiToken();
  const api = new ArtifactsAPI(token);

  // ─── CLI commands ───────────────────────────────────────────────────────────

  if (command === 'run' && scriptFile) {
    // Run a script file: npx tsx src/index.ts run scripts/my_script.dsl
    if (!fs.existsSync(scriptFile)) {
      console.error(`Script file not found: ${scriptFile}`);
      process.exit(1);
    }
    const script = fs.readFileSync(scriptFile, 'utf8');
    const state = createEmptyState(script);
    state.status = 'running';
    const executor = new ScriptExecutor(api, CHARACTER_NAME, state);
    setupSignalHandlers(executor);
    await executor.run();
    return;
  }

  if (command === 'resume') {
    // Resume from saved state
    const state = loadState();
    if (!state) {
      console.error('No saved state found to resume');
      process.exit(1);
    }
    if (state.status === 'running' || state.status === 'paused') {
      console.log(`Resuming from line ${state.currentLine}, status: ${state.status}`);
      state.status = 'running';
      const executor = new ScriptExecutor(api, CHARACTER_NAME, state);
      setupSignalHandlers(executor);
      await executor.run();
    } else {
      console.log(`State status is '${state.status}', nothing to resume`);
    }
    return;
  }

  if (command === 'status') {
    const state = loadState();
    if (!state) {
      console.log('No execution state found');
      return;
    }
    console.log(`Status: ${state.status}`);
    console.log(`Script lines: ${state.script.split('\n').length}`);
    console.log(`Current line: ${state.currentLine}`);
    console.log(`Actions executed: ${state.metrics.actionsExecuted}`);
    console.log(`Gold gained: ${state.metrics.goldGained}`);
    console.log(`Last 5 log entries:`);
    state.executionLog.slice(-5).forEach(l => console.log(' ', l));
    return;
  }

  if (command === 'stop') {
    const state = loadState();
    if (state) {
      state.status = 'stopped';
      saveState(state);
      console.log('Execution state set to stopped');
    }
    return;
  }

  // ─── Auto-recovery on startup ───────────────────────────────────────────────
  const savedState = loadState();
  if (savedState && savedState.status === 'running') {
    console.log(`Recovering interrupted execution (line ${savedState.currentLine})...`);
    const executor = new ScriptExecutor(api, CHARACTER_NAME, savedState);
    setupSignalHandlers(executor);
    await executor.run();
    return;
  }

  // Default: show help
  console.log(`
Artifacts MMO Script Executor

Usage:
  npx tsx src/index.ts run <script.dsl>    Run a DSL script
  npx tsx src/index.ts resume              Resume from last saved state
  npx tsx src/index.ts status              Show current execution status
  npx tsx src/index.ts stop                Mark current execution as stopped

Character: ${CHARACTER_NAME}
`);
}

function setupSignalHandlers(executor: ScriptExecutor): void {
  process.on('SIGINT', () => {
    console.log('\nSIGINT received - stopping execution...');
    executor.stop();
    setTimeout(() => process.exit(0), 2000);
  });
  process.on('SIGTERM', () => {
    executor.stop();
    setTimeout(() => process.exit(0), 2000);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
