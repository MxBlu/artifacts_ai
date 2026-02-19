import { chat, MODEL_CHAT, MODEL_REASONER, Message } from './llm';
import { AgentTools, GameState } from './tools';
import { ExecutionState, appendLog, saveState } from '../engine/state';
import { ScriptExecutor } from '../engine/executor';
import { getRecentStrategySummary } from './strategies';
import { validateScript } from '../engine/parser';

// Check-in every 10 minutes by default
const CHECK_IN_INTERVAL_MS = 10 * 60 * 1000;

export type CheckInDecision = 'CONTINUE' | 'MODIFY' | 'STOP';

export interface CheckInResult {
  decision: CheckInDecision;
  reasoning: string;
  newScript?: string;
  stopReason?: string;
}

export class CheckInSystem {
  private tools: AgentTools;
  private state: ExecutionState;
  private executor: ScriptExecutor | null = null;
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  // External log callback for web UI
  onAgentLog?: (msg: string) => void;
  // Fired when agent decides to MODIFY mid-run (mid-cycle steer)
  onModify?: (reasoning: string, newScript: string) => void;

  constructor(tools: AgentTools, state: ExecutionState, intervalMs = CHECK_IN_INTERVAL_MS) {
    this.tools = tools;
    this.state = state;
    this.intervalMs = intervalMs;
  }

  setExecutor(executor: ScriptExecutor | null) {
    this.executor = executor;
  }

  start() {
    this.scheduleNext();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // Trigger an immediate check-in (e.g. from human steering input)
  async triggerNow(humanInput?: string): Promise<CheckInResult> {
    this.stop();
    const result = await this.runCheckIn(humanInput);
    if (result.decision === 'CONTINUE') {
      this.scheduleNext();
    }
    return result;
  }
  private scheduleNext() {
    this.timer = setTimeout(async () => {
      if (this.state.status !== 'running') return;
      await this.runCheckIn();
      if (this.state.status === 'running') {
        this.scheduleNext();
      }
    }, this.intervalMs);
  }

  private async runCheckIn(humanInput?: string): Promise<CheckInResult> {
    const ts = new Date().toISOString().substring(11, 19);
    this.log(`[${ts}] Check-in triggered${humanInput ? ' (human input)' : ''}`);

    let gameState: GameState;
    try {
      gameState = await this.tools.get_game_state();
    } catch (err: any) {
      this.log(`Check-in: failed to get game state: ${err.message}`);
      return { decision: 'CONTINUE', reasoning: 'Could not fetch game state' };
    }

    const execStatus = this.tools.get_execution_status();
    const strategyHistory = getRecentStrategySummary(5);
    const prompt = buildCheckInPrompt(gameState, execStatus, strategyHistory, humanInput);

    this.log('Consulting agent for check-in...');

    // Use reasoner if we have a human instruction (needs deeper strategy thinking),
    // or if execution has been stuck / errored
    const needsReasoning = !!humanInput || !!execStatus.lastError || !execStatus.isRunning;
    const model = needsReasoning ? MODEL_REASONER : MODEL_CHAT;

    const messages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: prompt },
    ];

    let raw: string;
    try {
      raw = await chat(messages, model, 2048);
    } catch (err: any) {
      this.log(`Check-in LLM error: ${err.message}`);
      return { decision: 'CONTINUE', reasoning: 'LLM unavailable' };
    }

    this.log(`Agent response (${model}):\n${raw}`);

    const result = parseCheckInResponse(raw);
    this.log(`Decision: ${result.decision}`);

    // Apply the decision
    await this.applyDecision(result);

    this.state.lastAgentCheckIn = Date.now();
    saveState(this.state);

    return result;
  }

  private async applyDecision(result: CheckInResult): Promise<void> {
    switch (result.decision) {
      case 'CONTINUE':
        this.log('Continuing current script');
        break;

      case 'MODIFY':
        if (result.newScript) {
          // Validate before accepting
          const errors = validateScript(result.newScript);
          if (errors.length > 0) {
            const errorSummary = errors
              .map(e => e.line > 0 ? `  Line ${e.line}: ${e.message} (raw: "${e.raw}")` : `  ${e.message}`)
              .join('\n');
            this.log(`Script validation failed (${errors.length} error(s)):\n${errorSummary}`);
            this.log('Sending errors back to agent for correction...');

            // Build correction prompt and retry once with reasoner
            const correctionPrompt = buildCorrectionPrompt(result.newScript, errorSummary);
            const messages: Message[] = [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: correctionPrompt },
            ];
            let raw: string;
            try {
              raw = await chat(messages, MODEL_REASONER, 2048);
            } catch (err: any) {
              this.log(`Correction LLM error: ${err.message} — keeping old script`);
              break;
            }
            this.log(`Agent correction response:\n${raw}`);
            const corrected = parseCheckInResponse(raw);
            if (corrected.decision === 'MODIFY' && corrected.newScript) {
              const correctionErrors = validateScript(corrected.newScript);
              if (correctionErrors.length > 0) {
                const s = correctionErrors.map(e => e.line > 0 ? `Line ${e.line}: ${e.message}` : e.message).join('; ');
                this.log(`Corrected script still has errors: ${s} — keeping old script`);
                break;
              }
              result.newScript = corrected.newScript;
              this.log('Agent correction accepted — using corrected script');
            } else {
              this.log(`Agent responded with ${corrected.decision} instead of MODIFY — keeping old script`);
              break;
            }
          }

          this.log('Modifying script...');
          if (this.executor) {
            this.executor.stop();
            await sleep(500);
          }
          this.onModify?.(result.reasoning, result.newScript);
          this.tools.updateScript(result.newScript);
          this.state.script = result.newScript;
          this.state.currentLine = 0;
          appendLog(this.state, 'Agent modified script');
          saveState(this.state);
          // Executor restart is handled by the agent loop
        }
        break;

      case 'STOP':
        this.log(`Stopping: ${result.stopReason ?? 'agent requested stop'}`);
        if (this.executor) {
          this.executor.stop();
        }
        this.state.status = 'stopped';
        appendLog(this.state, `Script stopped: ${result.stopReason ?? 'agent decision'}`);
        saveState(this.state);
        break;
    }
  }

  private log(msg: string) {
    appendLog(this.state, `[AGENT] ${msg}`);
    this.onAgentLog?.(`[AGENT] ${msg}`);
  }
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an autonomous AI player for Artifacts MMO. Your goal is to reach level 50 in all skills.

You generate scripts in a simple DSL to control your character. You are called periodically to review progress and decide whether to continue, modify, or stop the current script.

Respond with exactly one of these formats:

CONTINUE
<brief reasoning>

MODIFY
<brief reasoning>
SCRIPT:
<new DSL script>

STOP
<reason>

When generating scripts, use only these commands:
- goto <x> <y> | goto <location_name>
- gather | woodcut | mine | fish
- fight [monster_code]
- bank deposit allitems | bank deposit <item> | bank withdraw <item> <qty>
- equip <item> | unequip <slot>
- craft <item> [qty]
- npc buy <item> <qty> | npc sell <item> <qty>
- task new | task complete | task cancel | task exchange
- use <item>
- transition
- rest | sleep <seconds> | wait_cooldown | log "message"
- log "message"
- set <var> = <value>
- if <condition>: / else:
- loop <n>: | loop until <cond>: | loop while <cond>: | loop forever:

Conditions: inventory_full, has_item <code> [qty], <skill>_level >= <n>, hp < <n>, hp_percent < <n>, gold > <n>, has_task, task_progress_complete

Use the reasoner model when you need to rethink strategy from scratch. Use chat model for routine CONTINUE decisions.`;

function buildCheckInPrompt(
  gameState: GameState,
  execStatus: ExecutionStatus,
  strategyHistory: string,
  humanInput?: string,
): string {
  const skills = Object.entries(gameState.skills)
    .map(([s, v]) => `  ${s}: Lv${v.level} (${v.xp}/${v.max_xp} XP)`)
    .join('\n');

  const inv = gameState.inventory.length > 0
    ? gameState.inventory.map(i => `  ${i.code} x${i.quantity}`).join('\n')
    : '  (empty)';

  const scriptWithLines = execStatus.script
    .split('\n')
    .map((l, i) => `${String(i + 1).padStart(3)} ${i + 1 === execStatus.currentLine ? '→ ' : '  '}${l}`)
    .join('\n');

  const recentLog = execStatus.executionLog.slice(-10).join('\n');
  const uptime = formatDuration(execStatus.uptime);

  let humanSection = '';
  if (humanInput) {
    humanSection = `\n## Human Instruction\n${humanInput}\n`;
  }

  return `[SCRIPT EXECUTION CHECK-IN]
${humanSection}
## Strategy History (last 5 runs)
${strategyHistory}

## Current Script (line ${execStatus.currentLine})
\`\`\`
${scriptWithLines}
\`\`\`

## Execution Status
- Uptime: ${uptime}
- Actions executed: ${execStatus.actionCount}
- Status: ${execStatus.isRunning ? 'running' : execStatus.lastError ? `error: ${execStatus.lastError}` : 'stopped'}

## Character State
- Name: ${gameState.name}
- Level: ${gameState.level} (${gameState.xp}/${gameState.max_xp} XP)
- HP: ${gameState.hp}/${gameState.max_hp}
- Gold: ${gameState.gold}
- Position: (${gameState.position.x}, ${gameState.position.y}) [${gameState.position.layer}]
- Inventory: ${gameState.inventory_slots.used}/${gameState.inventory_slots.max} slots
- Task: ${gameState.task || 'none'} (${gameState.task_progress}/${gameState.task_total})
- Task coins: ${gameState.task_coins}

## Skills
${skills}

## Inventory
${inv}

## Recent Log
${recentLog}

Review the above and respond with CONTINUE, MODIFY (with new script), or STOP.`;
}

// ─── Response parser ─────────────────────────────────────────────────────────

function parseCheckInResponse(raw: string): CheckInResult {
  const text = raw.trim();

  if (text.startsWith('CONTINUE')) {
    return {
      decision: 'CONTINUE',
      reasoning: text.slice('CONTINUE'.length).trim(),
    };
  }

  if (text.startsWith('STOP')) {
    return {
      decision: 'STOP',
      reasoning: text.slice('STOP'.length).trim(),
      stopReason: text.slice('STOP'.length).trim(),
    };
  }

  if (text.startsWith('MODIFY')) {
    const scriptMatch = text.match(/SCRIPT:\s*\n([\s\S]+)/);
    const reasoning = text
      .slice('MODIFY'.length)
      .replace(/SCRIPT:[\s\S]+/, '')
      .trim();
    return {
      decision: 'MODIFY',
      reasoning,
      newScript: scriptMatch?.[1]?.trim() ?? '',
    };
  }

  // Fallback: treat as CONTINUE
  return { decision: 'CONTINUE', reasoning: text };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function buildCorrectionPrompt(script: string, errorSummary: string): string {
  return `The following DSL script has parse errors. Fix them and return a corrected version.

## Script with errors
\`\`\`
${script}
\`\`\`

## Errors found
${errorSummary}

Respond with MODIFY using the corrected script. Only fix the invalid lines — do not change the rest of the script logic.`;
}

// Import used in prompt builder but defined in tools.ts - re-export for clarity
import type { ExecutionStatus } from './tools';
