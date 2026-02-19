import * as dotenv from 'dotenv';
dotenv.config();

import { ArtifactsAPI } from '../api';
import { ScriptExecutor } from '../engine/executor';
import { createEmptyState, loadState, appendLog, saveState, ExecutionState } from '../engine/state';
import { AgentTools } from './tools';
import { CheckInSystem } from './checkin';
import { bootstrapAgent } from './bootstrap';
import { StrategyEntry, appendStrategy, loadStrategies } from './strategies';

export interface AgentOptions {
  humanInput?: string;  // Initial instruction from user (passed to bootstrap + first check-in)
  resume?: boolean;     // Resume from saved state instead of bootstrapping
}

export class Agent {
  private api: ArtifactsAPI;
  private characterName: string;
  private tools: AgentTools;
  private checkin: CheckInSystem;
  private state: ExecutionState;
  private executor: ScriptExecutor | null = null;
  private executorStartTime: number | null = null;
  private running = false;
  private currentStrategy: StrategyEntry | null = null;

  // Callbacks for web UI (Phase 3)
  onAgentLog?: (msg: string) => void;
  onExecutionLog?: (msg: string) => void;
  onStateChange?: (state: ExecutionState) => void;
  onLevelUp?: (skill: string, newLevel: number) => void;

  constructor(api: ArtifactsAPI, characterName: string) {
    this.api = api;
    this.characterName = characterName;
    this.state = loadState() ?? createEmptyState('');
    this.tools = new AgentTools(api, characterName, this.state);
    this.checkin = new CheckInSystem(this.tools, this.state);

    this.checkin.onAgentLog = (msg) => {
      this.log(msg);
      this.onAgentLog?.(msg);
    };

    // Mid-cycle MODIFY: close current strategy, open a new one
    this.checkin.onModify = (reasoning, newScript) => {
      this.closeStrategy('modified');
      this.openStrategy(reasoning, newScript);
    };
  }

  async start(options: AgentOptions = {}): Promise<void> {
    this.running = true;

    if (options.resume && this.state.script) {
      this.log(`Resuming with existing script (${this.state.script.split('\n').length} lines)`);
      if (options.humanInput) {
        // Trigger immediate check-in with the human instruction before resuming
        this.log(`Human instruction: ${options.humanInput}`);
        await this.startExecutorAndCheckins(options.humanInput);
      } else {
        await this.startExecutorAndCheckins();
      }
    } else {
      await this.runBootstrap(options.humanInput);
    }
  }

  stop() {
    this.running = false;
    this.checkin.stop();
    this.executor?.stop();
    this.log('Agent stopped');
  }

  // Trigger an immediate check-in with a human instruction (called by web UI)
  async steer(input: string): Promise<void> {
    this.log(`Human steering: ${input}`);
    await this.checkin.triggerNow(input);
  }

  // ─── Bootstrap ──────────────────────────────────────────────────────────────

  private async runBootstrap(humanInput?: string): Promise<void> {
    this.log('Bootstrapping agent: fetching game state...');

    let gameState;
    try {
      gameState = await this.tools.get_game_state();
    } catch (err: any) {
      this.log(`Bootstrap failed to get game state: ${err.message}`);
      throw err;
    }

    this.log(`Character: ${gameState.name} Lv${gameState.level}, HP ${gameState.hp}/${gameState.max_hp}`);
    this.log('Generating initial script with deepseek-reasoner...');

    let bootstrapResult;
    try {
      bootstrapResult = await bootstrapAgent(gameState);
    } catch (err: any) {
      this.log(`Bootstrap LLM failed: ${err.message}`);
      throw err;
    }

    this.log(`Strategy: ${bootstrapResult.reasoning.slice(0, 200)}...`);
    this.log(`Script generated (${bootstrapResult.script.split('\n').length} lines)`);

    // Store script in state
    this.state.script = bootstrapResult.script;
    this.state.currentLine = 0;
    this.state.status = 'running';
    appendLog(this.state, `[AGENT] Bootstrap complete. Script: ${bootstrapResult.script.split('\n').length} lines`);
    saveState(this.state);

    // Open a strategy entry for this bootstrap run
    this.currentStrategy = {
      id: new Date().toISOString(),
      startedAt: Date.now(),
      reasoning: bootstrapResult.reasoning,
      script: bootstrapResult.script,
      metrics: { actionsExecuted: 0, xpGains: {}, goldGained: 0 },
    };

    this.tools.setExecutor(null, null);
    await this.startExecutorAndCheckins(humanInput);
  }

  // ─── Executor + check-in loop ────────────────────────────────────────────────

  private async startExecutorAndCheckins(initialHumanInput?: string): Promise<void> {
    // Trigger immediate check-in with human input if provided
    if (initialHumanInput) {
      this.log(`Processing initial human instruction...`);
      const result = await this.checkin.triggerNow(initialHumanInput);
      if (result.decision === 'STOP') {
        this.log('Agent decided to stop based on human instruction');
        return;
      }
    }

    // Main agent loop: run executor, restart on MODIFY, stop on STOP
    while (this.running) {
      await this.runExecutorCycle();

      if (!this.running) break;

      // Executor finished — check exit status
      const currentStatus = this.state.status;

      if (currentStatus === 'stopped') {
        // Distinguish script completion (no more lines) from explicit stop
        const scriptLines = this.state.script.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
        const isNaturalEnd = this.state.currentLine >= scriptLines;

        if (isNaturalEnd) {
          this.log('Script completed — triggering check-in for new strategy');
          this.closeStrategy('completed');
          const result = await this.checkin.triggerNow();
          if (result.decision === 'STOP') break;
          if (result.decision === 'MODIFY' && result.newScript) {
            this.openStrategy(result.reasoning, result.newScript);
          } else {
            // CONTINUE: re-run from start with same script
            this.state.currentLine = 0;
            this.state.status = 'running';
            saveState(this.state);
            this.openStrategy('Continuing same script after completion', this.state.script);
          }
        } else {
          this.closeStrategy('stopped');
          this.log('Script stopped by command — agent loop ended');
          break;
        }
      } else if (currentStatus === 'error') {
        this.log(`Script errored: ${this.state.errorMessage} — triggering check-in`);
        this.closeStrategy('error', this.state.errorMessage);
        const result = await this.checkin.triggerNow();
        if (result.decision === 'STOP') break;
        if (result.decision === 'MODIFY' && result.newScript) {
          this.openStrategy(result.reasoning, result.newScript);
        } else {
          // CONTINUE: reset to running for retry
          this.state.status = 'running';
          saveState(this.state);
          this.openStrategy('Retrying after error', this.state.script);
        }
      } else if (currentStatus === 'paused') {
        // Shouldn't normally end in paused state; treat like error
        this.closeStrategy('stopped', 'paused unexpectedly');
        this.log('Script paused unexpectedly — stopping agent loop');
        break;
      }
    }
  }

  private async runExecutorCycle(): Promise<void> {
    this.executorStartTime = Date.now();
    this.executor = new ScriptExecutor(this.api, this.characterName, this.state);
    this.tools.setExecutor(this.executor, this.executorStartTime);
    this.checkin.setExecutor(this.executor);

    // Forward executor logs to web UI
    this.executor.onAction = (msg: string) => {
      appendLog(this.state, `[EXEC] ${msg}`);
      this.onExecutionLog?.(`[EXEC] ${msg}`);
    };
    this.executor.onStateChange = (s) => {
      this.onStateChange?.(s);
    };
    this.executor.onLevelUp = (skill, newLevel) => {
      this.onLevelUp?.(skill, newLevel);
    };

    // Start check-in timer
    this.checkin.start();

    try {
      this.log('Starting script executor...');
      await this.executor.run();
      this.log(`Executor finished with status: ${this.state.status}`);
    } catch (err: any) {
      this.log(`Executor threw: ${err.message}`);
      this.state.status = 'error';
      this.state.errorMessage = err.message;
      saveState(this.state);
    } finally {
      this.checkin.stop();
      this.executor = null;
      this.tools.setExecutor(null, null);
      this.checkin.setExecutor(null);
    }
  }

  private log(msg: string) {
    const ts = new Date().toISOString().substring(11, 19);
    const line = `[${ts}] ${msg}`;
    console.log(line);
    this.onAgentLog?.(line);
  }

  // ─── Strategy tracking ───────────────────────────────────────────────────────

  private openStrategy(reasoning: string, script: string): void {
    this.currentStrategy = {
      id: new Date().toISOString(),
      startedAt: Date.now(),
      reasoning,
      script,
      metrics: { actionsExecuted: 0, xpGains: {}, goldGained: 0 },
    };
  }

  private closeStrategy(outcome: StrategyEntry['outcome'], note?: string): void {
    if (!this.currentStrategy) return;
    const now = Date.now();
    this.currentStrategy.endedAt = now;
    this.currentStrategy.durationSecs = Math.round((now - this.currentStrategy.startedAt) / 1000);
    this.currentStrategy.outcome = outcome;
    if (note) this.currentStrategy.outcomeNote = note;
    // Snapshot final metrics from execution state
    this.currentStrategy.metrics = {
      actionsExecuted: this.state.metrics.actionsExecuted,
      xpGains: { ...this.state.metrics.xpGains },
      goldGained: this.state.metrics.goldGained,
    };
    appendStrategy(this.currentStrategy);
    this.log(`Strategy logged: ${outcome} after ${this.currentStrategy.durationSecs}s`);
    this.currentStrategy = null;
  }
}
