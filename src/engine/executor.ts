import { ArtifactsAPI, Character, SimpleItem } from '../api';
import { ASTNode, Condition, Expr, CmpOp, parseScript } from './parser';
import { ExecutionState, appendLog, saveState } from './state';
import { nearestTile, getItemByCode } from '../cache';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_LOOP_ITERATIONS = 10_000;

const NODE_TYPE_TO_SKILL: Record<string, string> = {
  woodcut: 'woodcutting',
  mine:    'mining',
  fish:    'fishing',
  gather:  'alchemy',
};
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const STUCK_THRESHOLD = 50; // actions without state change = stuck
const LOCATION_ALIASES: Record<string, { x: number; y: number }> = {
  bank:              { x: 4,  y: 1  },
  grand_exchange:    { x: 5,  y: 1  },
  ge:                { x: 5,  y: 1  },
  tasks_master:      { x: 1,  y: 2  },   // monsters tasks master
  tasks_master_items:{ x: 4,  y: 13 },   // items tasks master
  workshop_cooking:  { x: 1,  y: 1  },
  workshop_weaponcrafting: { x: 2, y: 1 },
  workshop_gearcrafting:   { x: 3, y: 1 },
  workshop_jewelrycrafting:{ x: 1, y: 3 },
  workshop_alchemy:  { x: 2,  y: 3  },
  workshop_woodcutting:    { x: -2, y: -3 },
  workshop_mining:   { x: 1,  y: 5  },
  // legacy alias — defaults to the main city bank
  workshop:          { x: 2,  y: 1  },
};

// ─── Executor class ───────────────────────────────────────────────────────────

export class ScriptExecutor {
  private api: ArtifactsAPI;
  private characterName: string;
  private state: ExecutionState;
  private character: Character | null = null;
  private stuckCounter = 0;
  private lastStateHash = '';
  private stopped = false;

  // Callbacks for external observers (web interface)
  onAction?: (msg: string) => void;
  onStateChange?: (state: ExecutionState) => void;
  onLevelUp?: (skill: string, newLevel: number) => void;

  constructor(api: ArtifactsAPI, characterName: string, state: ExecutionState) {
    this.api = api;
    this.characterName = characterName;
    this.state = state;
  }

  async run(): Promise<void> {
    this.stopped = false;
    this.state.status = 'running';
    saveState(this.state);

    const nodes = parseScript(this.state.script);
    appendLog(this.state, `Starting script execution (${nodes.length} top-level nodes)`);

    try {
      await this.execBlock(nodes);
      appendLog(this.state, 'Script completed successfully');
      this.state.status = 'stopped';
    } catch (err: any) {
      if (err.message === 'STOPPED') {
        this.state.status = 'stopped';
        appendLog(this.state, 'Script stopped by user');
      } else if (err.message === 'PAUSED') {
        this.state.status = 'paused';
        appendLog(this.state, 'Script paused');
      } else {
        this.state.status = 'error';
        this.state.errorMessage = err.message;
        appendLog(this.state, `Error: ${err.message}`);
      }
    } finally {
      saveState(this.state);
    }
  }

  stop()  { this.stopped = true; this.state.status = 'stopped'; }
  pause() { this.stopped = true; this.state.status = 'paused'; }

  getState(): ExecutionState { return this.state; }

  // ─── Block execution ────────────────────────────────────────────────────────

  private async execBlock(nodes: ASTNode[]): Promise<void> {
    for (const node of nodes) {
      if (this.stopped) throw new Error('STOPPED');
      await this.execNode(node);
    }
  }

  // ─── Node dispatch ──────────────────────────────────────────────────────────

  private async execNode(node: ASTNode): Promise<void> {
    if (this.stopped) throw new Error('STOPPED');

    switch (node.type) {
      case 'goto':          return this.execGoto(node);
      case 'gather':
      case 'woodcut':
      case 'mine':
      case 'fish':          return this.execGather(node.type);
      case 'fight':         return this.execFight(node);
      case 'bank':          return this.execBank(node);
      case 'equip':         return this.execEquip(node);
      case 'unequip':       return this.execUnequip(node);
      case 'recycle':       return this.execRecycle(node);
      case 'craft':         return this.execCraft(node);
      case 'ge':            return this.execGE(node);
      case 'npc':           return this.execNPC(node);
      case 'task':          return this.execTask(node);
      case 'use':           return this.execUse(node);
      case 'transition':    return this.execTransition();
      case 'rest':          return this.execRest();
      case 'sleep':         return this.execSleep(node);
      case 'wait_cooldown': return this.execWaitCooldown();
      case 'log':           return this.execLog(node);
      case 'set':           return this.execSet(node);
      case 'if':            return this.execIf(node);
      case 'loop_count':    return this.execLoopCount(node);
      case 'loop_until':    return this.execLoopUntil(node);
      case 'loop_while':    return this.execLoopWhile(node);
      case 'loop_forever':  return this.execLoopForever(node);
      default:
        appendLog(this.state, `Unknown command: ${(node as any).type}`);
    }
  }

  // ─── Expressions & Conditions ───────────────────────────────────────────────

  private evalExpr(expr: Expr): any {
    switch (expr.kind) {
      case 'number': return expr.value;
      case 'string': return expr.value;
      case 'var':    return this.state.variables[expr.name] ?? 0;
    }
  }

  private compare(a: number, op: CmpOp, b: number): boolean {
    switch (op) {
      case '>=': return a >= b;
      case '<=': return a <= b;
      case '>':  return a > b;
      case '<':  return a < b;
      case '==': return a === b;
      case '!=': return a !== b;
    }
  }

  private async evalCondition(cond: Condition): Promise<boolean> {
    const char = await this.getCharacter();

    switch (cond.cond) {
      case 'inventory_full': {
        const used = (char.inventory as any[])?.reduce((s: number, i: any) => s + (i ? 1 : 0), 0) ?? 0;
        const max = char.inventory_max_items ?? 20;
        return used >= max;
      }
      case 'inventory_space': {
        const used = (char.inventory as any[])?.reduce((s: number, i: any) => s + (i ? 1 : 0), 0) ?? 0;
        const max = char.inventory_max_items ?? 20;
        const space = max - used;
        return this.compare(space, cond.op, Number(this.evalExpr(cond.value)));
      }
      case 'has_item': {
        const inv: any[] = char.inventory ?? [];
        const item = inv.find((i: any) => i?.code === cond.item);
        if (!item) return false;
        if (cond.quantity) return item.quantity >= Number(this.evalExpr(cond.quantity));
        return true;
      }
      case 'skill_level': {
        const lvl = char[`${cond.skill}_level`] ?? 0;
        return this.compare(Number(lvl), cond.op, Number(this.evalExpr(cond.value)));
      }
      case 'hp':
        return this.compare(char.hp, cond.op, Number(this.evalExpr(cond.value)));
      case 'hp_percent': {
        const pct = (char.hp / char.max_hp) * 100;
        return this.compare(pct, cond.op, Number(this.evalExpr(cond.value)));
      }
      case 'gold':
        return this.compare(char.gold, cond.op, Number(this.evalExpr(cond.value)));
      case 'at_location':
        return char.x === Number(this.evalExpr(cond.x)) && char.y === Number(this.evalExpr(cond.y));
      case 'has_task':
        return !!(char.task && char.task !== '');
      case 'task_progress_complete': {
        const progress = char.task_progress ?? 0;
        const total = char.task_total ?? 1;
        return progress >= total;
      }
      case 'task_coins':
        return this.compare(char.task_coins ?? 0, cond.op, Number(this.evalExpr(cond.value)));
    }
  }

  // ─── Character State ────────────────────────────────────────────────────────

  private async getCharacter(): Promise<Character> {
    this.character = await this.api.getCharacter(this.characterName);
    return this.character;
  }

  // Check if any skill levelled up between prev and next character state
  private checkLevelUps(prev: Character, next: Character): void {
    const skills = ['level', 'mining_level', 'woodcutting_level', 'fishing_level',
      'weaponcrafting_level', 'gearcrafting_level', 'jewelrycrafting_level',
      'cooking_level', 'alchemy_level'];
    for (const key of skills) {
      const oldLvl = prev[key] ?? 0;
      const newLvl = next[key] ?? 0;
      if (newLvl > oldLvl) {
        const skillName = key === 'level' ? 'combat' : key.replace('_level', '');
        appendLog(this.state, `LEVEL UP! ${skillName} → ${newLvl}`);
        this.onLevelUp?.(skillName, newLvl);
      }
    }
  }

  private async waitCooldown(): Promise<void> {
    const char = await this.getCharacter();
    if (!char.cooldown_expiration) return;

    const exp = new Date(char.cooldown_expiration).getTime();
    const now = Date.now();
    const wait = exp - now;
    if (wait > 0) {
      await sleep(wait + 200); // +200ms buffer
    }
  }

  // ─── API call with retry ────────────────────────────────────────────────────

  private async apiCall<T>(
    label: string,
    fn: () => Promise<T>,
    retries = MAX_RETRIES,
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await fn();
        this.state.metrics.actionsExecuted++;
        this.checkStuck();
        this.onAction?.(label);
        this.onStateChange?.(this.state);
        saveState(this.state);
        return result;
      } catch (err: any) {
        const status = err?.response?.status;
        const code   = err?.response?.data?.error?.code;

        // Cooldown error (499) - wait and retry
        if (status === 499 || code === 499) {
          const remaining = err?.response?.data?.error?.cooldown_remaining ?? 5;
          appendLog(this.state, `${label} - cooldown, waiting ${remaining}s`);
          await sleep((remaining + 0.5) * 1000);
          continue;
        }

        // Already at destination (490) - treat as success
        if (status === 490 || code === 490) {
          appendLog(this.state, `${label} - already at destination`);
          this.character = await this.api.getCharacter(this.characterName);
          return {} as T;
        }

        // Character not found on this tile for fight/gather
        if (status === 598 || code === 598) {
          appendLog(this.state, `${label} - no target on tile`);
          throw new Error(`No target on tile for: ${label}`);
        }

        if (attempt < retries) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt);
          appendLog(this.state, `${label} failed (${status}), retry in ${delay}ms: ${err.message}`);
          await sleep(delay);
        } else {
          throw err;
        }
      }
    }
    throw new Error(`${label} failed after ${retries} retries`);
  }

  private checkStuck(): void {
    const hash = JSON.stringify({
      pos: this.character ? `${this.character.x},${this.character.y}` : '',
      hp: this.character?.hp,
      inv: (this.character?.inventory ?? []).length,
    });
    if (hash === this.lastStateHash) {
      this.stuckCounter++;
      if (this.stuckCounter >= STUCK_THRESHOLD) {
        appendLog(this.state, `STUCK DETECTED: No state change after ${STUCK_THRESHOLD} actions`);
        this.stuckCounter = 0;
      }
    } else {
      this.stuckCounter = 0;
      this.lastStateHash = hash;
    }
  }

  // ─── Command implementations ────────────────────────────────────────────────

  private async execGoto(node: any): Promise<void> {
    let x: number, y: number;
    if (node.location) {
      const alias = LOCATION_ALIASES[node.location.toLowerCase()];
      if (alias) {
        x = alias.x; y = alias.y;
      } else {
        // Dynamic lookup via cache: search for content code/type/name
        const char = await this.getCharacter();
        const found = await nearestTile(this.api, node.location, char.x, char.y);
        if (!found) throw new Error(`Unknown location: ${node.location}`);
        x = found.x; y = found.y;
        appendLog(this.state, `  → resolved '${node.location}' to (${x}, ${y}) via cache`);
      }
    } else {
      x = Number(this.evalExpr(node.x));
      y = Number(this.evalExpr(node.y));
    }
    appendLog(this.state, `goto ${x} ${y}`);
    await this.apiCall(`goto ${x} ${y}`, () => this.api.moveCharacter(this.characterName, x, y));
  }

  private async execGather(nodeType: string = 'gather'): Promise<void> {
    appendLog(this.state, nodeType);
    const data = await this.apiCall(nodeType, () => this.api.gather(this.characterName));
    if (data?.details) {
      const { xp, items } = data.details;
      const skill = NODE_TYPE_TO_SKILL[nodeType] ?? 'woodcutting';
      if (xp) {
        this.state.metrics.xpGains[skill] = (this.state.metrics.xpGains[skill] ?? 0) + xp;
      }
      for (const item of items ?? []) {
        this.state.metrics.itemsGathered[item.code] =
          (this.state.metrics.itemsGathered[item.code] ?? 0) + item.quantity;
      }
      if (data.character) {
        const prev = this.character;
        this.character = data.character;
        if (prev) this.checkLevelUps(prev, data.character);
      }
      appendLog(this.state, `  → ${items?.map((i: any) => `${i.quantity}x ${i.code}`).join(', ')}, xp: ${xp}`);
    }
  }

  private async execFight(node: any): Promise<void> {
    appendLog(this.state, `fight${node.monster ? ` (${node.monster})` : ''}`);
    const data = await this.apiCall('fight', () => this.api.fightCharacter(this.characterName));
    if (data?.fight) {
      const fight = data.fight;
      // Updated character is in data.characters[0] (top-level) or fight.characters[0]
      const updatedChar: Character | undefined = data.characters?.[0] ?? fight.characters?.[0];
      if (updatedChar) {
        const prev = this.character;
        this.character = updatedChar;
        if (prev) {
          const xpDelta = (updatedChar.xp ?? 0) - (prev.xp ?? 0);
          if (xpDelta > 0) {
            this.state.metrics.xpGains['combat'] = (this.state.metrics.xpGains['combat'] ?? 0) + xpDelta;
          }
          const goldDelta = (updatedChar.gold ?? 0) - (prev.gold ?? 0);
          if (goldDelta > 0) {
            this.state.metrics.goldGained += goldDelta;
          }
          this.checkLevelUps(prev, updatedChar);
        }
      }
      // drops may appear in fight logs as part of items — parse from logs if not direct
      const drops = (fight as any).drops?.map((d: any) => `${d.quantity}x ${d.code}`).join(', ') ?? '';
      appendLog(this.state, `  → ${fight.result}, ${fight.turns} turns${drops ? `, drops: ${drops}` : ''}`);
      if (fight.result === 'loss') {
        appendLog(this.state, '  → DIED — character returned to spawn');
      }
    }
  }

  private async execBank(node: any): Promise<void> {
    if (node.action === 'deposit') {
      if (node.allItems) {
        appendLog(this.state, 'bank deposit allitems');
        const char = await this.getCharacter();
        const items: SimpleItem[] = (char.inventory ?? [])
          .filter((i: any) => i && i.code)
          .map((i: any) => ({ code: i.code, quantity: i.quantity }));
        if (items.length === 0) {
          appendLog(this.state, '  → inventory empty, nothing to deposit');
          return;
        }
        // Deposit one at a time to handle all items
        for (const item of items) {
          await this.apiCall(
            `bank deposit ${item.code}`,
            () => this.api.depositBankItems(this.characterName, [item])
          );
        }
        appendLog(this.state, `  → deposited ${items.length} item types`);
      } else if (node.item) {
        appendLog(this.state, `bank deposit ${node.item}`);
        await this.apiCall(
          `bank deposit ${node.item}`,
          () => this.api.depositBankItems(this.characterName, [{ code: node.item, quantity: 9999 }])
        );
      }
    } else if (node.action === 'withdraw') {
      const qty = node.quantity ? Number(this.evalExpr(node.quantity)) : 1;
      appendLog(this.state, `bank withdraw ${node.item} ${qty}`);
      await this.apiCall(
        `bank withdraw ${node.item}`,
        () => this.api.withdrawBankItems(this.characterName, [{ code: node.item, quantity: qty }])
      );
    }
  }

  private async execEquip(node: any): Promise<void> {
    appendLog(this.state, `equip ${node.item}`);
    // Determine slot by fetching item - simplified: let API choose slot
    await this.apiCall(
      `equip ${node.item}`,
      () => this.api.equipItem(this.characterName, node.item, 'weapon') // slot resolved by API
    );
  }

  private async execUnequip(node: any): Promise<void> {
    appendLog(this.state, `unequip ${node.slot}`);
    await this.apiCall(
      `unequip ${node.slot}`,
      () => this.api.unequipItem(this.characterName, node.slot)
    );
  }

  private async execRecycle(node: any): Promise<void> {
    appendLog(this.state, `recycle ${node.item}`);
    await this.apiCall(
      `recycle ${node.item}`,
      () => this.api.recycleItem(this.characterName, node.item)
    );
  }

  private async execCraft(node: any): Promise<void> {
    const qty = node.quantity ? Number(this.evalExpr(node.quantity)) : 1;
    appendLog(this.state, `craft ${node.item} x${qty}`);
    const data = await this.apiCall(
      `craft ${node.item}`,
      () => this.api.craftItem(this.characterName, node.item, qty)
    );
    if (data?.details) {
      const { xp, items } = data.details;
      // Determine craft skill from item definition
      const itemDef = await getItemByCode(this.api, node.item).catch(() => undefined);
      const skill = itemDef?.craft?.skill ?? 'weaponcrafting';
      if (xp) {
        this.state.metrics.xpGains[skill] = (this.state.metrics.xpGains[skill] ?? 0) + xp;
      }
      if (data.character) {
        const prev = this.character;
        this.character = data.character;
        if (prev) this.checkLevelUps(prev, data.character);
      }
      appendLog(this.state, `  → crafted: ${JSON.stringify(items)}, xp: ${xp}`);
    }
  }

  private async execGE(node: any): Promise<void> {
    // Grand Exchange - TODO: implement when GE endpoints are confirmed
    appendLog(this.state, `ge ${node.action} (not yet implemented)`);
  }

  private async execNPC(node: any): Promise<void> {
    const qty = node.quantity ? Number(this.evalExpr(node.quantity)) : 1;
    appendLog(this.state, `npc ${node.action} ${node.item} x${qty}`);
    if (node.action === 'buy') {
      await this.apiCall(
        `npc buy ${node.item}`,
        () => this.api.buyNpcItem(this.characterName, node.item, qty)
      );
    } else {
      await this.apiCall(
        `npc sell ${node.item}`,
        () => this.api.sellNpcItem(this.characterName, node.item, qty)
      );
    }
  }

  private async execTask(node: any): Promise<void> {
    appendLog(this.state, `task ${node.action}`);
    switch (node.action) {
      case 'new':
        await this.apiCall('task new', () => this.api.acceptNewTask(this.characterName));
        break;
      case 'complete':
        await this.apiCall('task complete', () => this.api.completeTask(this.characterName));
        break;
      case 'cancel':
        await this.apiCall('task cancel', () => this.api.cancelTask(this.characterName));
        break;
      case 'exchange':
        await this.apiCall('task exchange', () => this.api.exchangeTaskCoins(this.characterName));
        break;
      case 'trade': {
        const qty = node.quantity ? Number(this.evalExpr(node.quantity)) : 1;
        await this.apiCall(
          `task trade ${node.item}`,
          () => this.api.tradeTaskItems(this.characterName, node.item, qty)
        );
        break;
      }
    }
  }

  private async execUse(node: any): Promise<void> {
    appendLog(this.state, `use ${node.item}`);
    await this.apiCall(
      `use ${node.item}`,
      () => this.api.useItem(this.characterName, node.item)
    );
  }

  private async execTransition(): Promise<void> {
    appendLog(this.state, 'transition');
    await this.apiCall('transition', () => this.api.transitionCharacter(this.characterName));
  }

  private async execRest(): Promise<void> {
    await this.apiCall('rest', () => this.api.restCharacter(this.characterName));
  }

  private async execSleep(node: any): Promise<void> {
    const seconds = Number(this.evalExpr(node.seconds));
    appendLog(this.state, `sleep ${seconds}s`);
    await sleep(seconds * 1000);
  }

  private async execWaitCooldown(): Promise<void> {
    appendLog(this.state, 'wait_cooldown');
    await this.waitCooldown();
  }

  private execLog(node: any): void {
    appendLog(this.state, `LOG: ${node.message}`);
  }

  private execSet(node: any): void {
    const value = this.evalExpr(node.value);
    this.state.variables[node.name] = value;
    appendLog(this.state, `set ${node.name} = ${value}`);
  }

  // ─── Control flow ───────────────────────────────────────────────────────────

  private async execIf(node: any): Promise<void> {
    const result = await this.evalCondition(node.condition);
    if (result) {
      await this.execBlock(node.body);
    } else if (node.elseBody) {
      await this.execBlock(node.elseBody);
    }
  }

  private async execLoopCount(node: any): Promise<void> {
    const count = Number(this.evalExpr(node.count));
    for (let i = 0; i < count && i < MAX_LOOP_ITERATIONS; i++) {
      if (this.stopped) throw new Error('STOPPED');
      await this.execBlock(node.body);
    }
  }

  private async execLoopUntil(node: any): Promise<void> {
    let iterations = 0;
    while (iterations < MAX_LOOP_ITERATIONS) {
      if (this.stopped) throw new Error('STOPPED');
      const done = await this.evalCondition(node.condition);
      if (done) break;
      await this.execBlock(node.body);
      iterations++;
    }
    if (iterations >= MAX_LOOP_ITERATIONS) {
      appendLog(this.state, `WARNING: Loop exceeded ${MAX_LOOP_ITERATIONS} iterations`);
    }
  }

  private async execLoopWhile(node: any): Promise<void> {
    let iterations = 0;
    while (iterations < MAX_LOOP_ITERATIONS) {
      if (this.stopped) throw new Error('STOPPED');
      const cont = await this.evalCondition(node.condition);
      if (!cont) break;
      await this.execBlock(node.body);
      iterations++;
    }
  }

  private async execLoopForever(node: any): Promise<void> {
    let iterations = 0;
    while (iterations < MAX_LOOP_ITERATIONS) {
      if (this.stopped) throw new Error('STOPPED');
      await this.execBlock(node.body);
      iterations++;
    }
    appendLog(this.state, `WARNING: Forever loop hit ${MAX_LOOP_ITERATIONS} iteration limit`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
