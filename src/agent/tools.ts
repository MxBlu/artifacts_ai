import * as fs from 'fs';
import * as path from 'path';
import { ArtifactsAPI, Character } from '../api';
import { ExecutionState } from '../engine/state';
import { ScriptExecutor } from '../engine/executor';
import { findTiles, searchItems, searchMonsters, searchResources, getAllItems, getItemByCode } from '../cache';

// ─── Tool result types ────────────────────────────────────────────────────────

export interface GameState {
  name: string;
  level: number;
  xp: number;
  max_xp: number;
  hp: number;
  max_hp: number;
  gold: number;
  position: { x: number; y: number; layer: string };
  inventory: Array<{ code: string; quantity: number }>;
  inventory_slots: { used: number; max: number };
  cooldown: number;
  cooldown_expiration: string;
  task: string;
  task_type: string;
  task_progress: number;
  task_total: number;
  task_coins: number;
  skills: Record<string, { level: number; xp: number; max_xp: number }>;
  equipment: Record<string, string | null>;
}

export interface ExecutionStatus {
  isRunning: boolean;
  script: string;
  currentLine: number;
  uptime: number;
  actionCount: number;
  executionLog: string[];
  lastError?: string;
  metrics: {
    actionsExecuted: number;
    xpGains: Record<string, number>;
    goldGained: number;
  };
}

// ─── Tool implementations ─────────────────────────────────────────────────────

const SKILL_NAMES = [
  'mining', 'woodcutting', 'fishing', 'weaponcrafting',
  'gearcrafting', 'jewelrycrafting', 'cooking', 'alchemy',
];

// Maps craft skill → workshop DSL location alias and coordinates
// These match LOCATION_ALIASES in executor.ts
export const SKILL_TO_WORKSHOP: Record<string, { alias: string; x: number; y: number }> = {
  mining:           { alias: 'workshop_mining',          x: 1,  y: 5  },
  woodcutting:      { alias: 'workshop_woodcutting',     x: -2, y: -3 },
  weaponcrafting:   { alias: 'workshop_weaponcrafting',  x: 2,  y: 1  },
  gearcrafting:     { alias: 'workshop_gearcrafting',    x: 3,  y: 1  },
  jewelrycrafting:  { alias: 'workshop_jewelrycrafting', x: 1,  y: 3  },
  cooking:          { alias: 'workshop_cooking',         x: 1,  y: 1  },
  alchemy:          { alias: 'workshop_alchemy',         x: 2,  y: 3  },
};

const EQUIPMENT_SLOTS = [
  'weapon', 'shield', 'helmet', 'body_armor', 'leg_armor', 'boots',
  'ring1', 'ring2', 'amulet', 'artifact1', 'artifact2', 'artifact3',
  'utility1', 'utility2', 'bag', 'rune',
];

export function buildGameState(char: Character): GameState {
  const inv = (char.inventory as any[] ?? []).filter(Boolean);
  const usedSlots = inv.length;
  const maxSlots = char.inventory_max_items ?? 20;

  const skills: Record<string, { level: number; xp: number; max_xp: number }> = {};
  for (const skill of SKILL_NAMES) {
    skills[skill] = {
      level: char[`${skill}_level`] ?? 1,
      xp: char[`${skill}_xp`] ?? 0,
      max_xp: char[`${skill}_max_xp`] ?? 150,
    };
  }

  const equipment: Record<string, string | null> = {};
  for (const slot of EQUIPMENT_SLOTS) {
    equipment[slot] = char[`${slot}_slot`] ?? null;
  }

  return {
    name: char.name,
    level: char.level,
    xp: char.xp,
    max_xp: char.max_xp,
    hp: char.hp,
    max_hp: char.max_hp,
    gold: char.gold,
    position: { x: char.x, y: char.y, layer: char.layer ?? 'overworld' },
    inventory: inv.map((i: any) => ({ code: i.code, quantity: i.quantity })),
    inventory_slots: { used: usedSlots, max: maxSlots },
    cooldown: char.cooldown ?? 0,
    cooldown_expiration: char.cooldown_expiration ?? '',
    task: char.task ?? '',
    task_type: char.task_type ?? '',
    task_progress: char.task_progress ?? 0,
    task_total: char.task_total ?? 0,
    task_coins: char.task_coins ?? 0,
    skills,
    equipment,
  };
}

export class AgentTools {
  private api: ArtifactsAPI;
  private characterName: string;
  private executionState: ExecutionState;
  private executor: ScriptExecutor | null = null;
  private executorStartTime: number | null = null;

  constructor(api: ArtifactsAPI, characterName: string, executionState: ExecutionState) {
    this.api = api;
    this.characterName = characterName;
    this.executionState = executionState;
  }

  setExecutor(executor: ScriptExecutor | null, startTime: number | null) {
    this.executor = executor;
    this.executorStartTime = startTime;
  }

  // ─── Information tools ──────────────────────────────────────────────────────

  async get_game_state(): Promise<GameState> {
    const char = await this.api.getCharacter(this.characterName);
    return buildGameState(char);
  }

  get_execution_status(): ExecutionStatus {
    const state = this.executionState;
    const uptime = this.executorStartTime
      ? Math.floor((Date.now() - this.executorStartTime) / 1000)
      : 0;
    return {
      isRunning: state.status === 'running',
      script: state.script,
      currentLine: state.currentLine,
      uptime,
      actionCount: state.metrics.actionsExecuted,
      executionLog: state.executionLog.slice(-20),
      lastError: state.errorMessage,
      metrics: {
        actionsExecuted: state.metrics.actionsExecuted,
        xpGains: state.metrics.xpGains,
        goldGained: state.metrics.goldGained,
      },
    };
  }

  query_game_knowledge(query: string): string {
    // Simple keyword search over GAME_KNOWLEDGE.md
    const knowledgePath = path.resolve(process.cwd(), 'GAME_KNOWLEDGE.md');
    if (!fs.existsSync(knowledgePath)) return 'GAME_KNOWLEDGE.md not found';

    const content = fs.readFileSync(knowledgePath, 'utf8');
    const lines = content.split('\n');
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(k => k.length > 2);

    // Score each line by keyword matches, return surrounding context
    const results: Array<{ score: number; startLine: number }> = [];
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      const score = keywords.filter(k => lineLower.includes(k)).length;
      if (score > 0) results.push({ score, startLine: i });
    }

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, 5);

    if (topResults.length === 0) return `No results found for: ${query}`;

    const sections: string[] = [];
    const seen = new Set<number>();
    for (const r of topResults) {
      const start = Math.max(0, r.startLine - 2);
      const end = Math.min(lines.length, r.startLine + 8);
      if (!seen.has(start)) {
        seen.add(start);
        sections.push(lines.slice(start, end).join('\n'));
      }
    }

    return sections.join('\n---\n');
  }

  async lookup_item(search: string): Promise<string> {
    try {
      const matches = await searchItems(this.api, search);
      if (matches.length === 0) return `No items found matching: ${search}`;
      // If exact code match, show full detail
      const exact = matches.find(i => i.code === search.toLowerCase().replace(/\s+/g, '_'));
      if (exact) {
        return JSON.stringify({
          code: exact.code, name: exact.name, level: exact.level,
          type: exact.type, subtype: exact.subtype,
          craft: exact.craft ?? null, tradeable: exact.tradeable,
        }, null, 2);
      }
      return matches.slice(0, 5).map(i => `${i.code}: ${i.name} (lv${i.level}, ${i.type})`).join('\n');
    } catch (err: any) {
      return `Error looking up item: ${err.message}`;
    }
  }

  async lookup_monster(search: string): Promise<string> {
    try {
      const matches = await searchMonsters(this.api, search);
      if (matches.length === 0) return `Monster not found: ${search}`;
      const m = matches[0];
      return JSON.stringify({
        code: m.code, name: m.name, level: m.level, hp: m.hp, type: m.type,
        drops: m.drops?.slice(0, 10),
        min_gold: m.min_gold, max_gold: m.max_gold,
        attack: { fire: m.attack_fire, earth: m.attack_earth, water: m.attack_water, air: m.attack_air },
        resist: { fire: m.res_fire, earth: m.res_earth, water: m.res_water, air: m.res_air },
      }, null, 2);
    } catch (err: any) {
      return `Error looking up monster: ${err.message}`;
    }
  }

  async lookup_resource(search: string): Promise<string> {
    try {
      const matches = await searchResources(this.api, search);
      if (matches.length === 0) return `No resources found matching: ${search}`;
      return matches.slice(0, 5).map(r =>
        `${r.code}: ${r.name} (${r.skill} lv${r.level}, drops: ${r.drops?.map(d => d.code).join(', ')})`
      ).join('\n');
    } catch (err: any) {
      return `Error looking up resource: ${err.message}`;
    }
  }

  async find_location(search: string): Promise<string> {
    try {
      const results = await findTiles(this.api, search);
      if (results.length === 0) return `No locations found matching: ${search}`;
      return results.slice(0, 10).map(({ tile }) => {
        const content = tile.interactions?.content;
        return `(${tile.x}, ${tile.y}) ${tile.name}: ${content ? `${content.type}=${content.code}` : 'no content'}`;
      }).join('\n');
    } catch (err: any) {
      return `Error finding location: ${err.message}`;
    }
  }

  async get_market_prices(item_code: string): Promise<string> {
    // Grand Exchange price lookup
    try {
      const response = await (this.api as any).client?.get(`/grandexchange/orders?code=${item_code}&size=5`) ??
        { data: { data: [] } };
      return JSON.stringify(response.data?.data ?? [], null, 2);
    } catch {
      return `Market data unavailable for: ${item_code}`;
    }
  }

  /**
   * Resolve the full crafting chain for a target item.
   * Returns a flat list of raw materials needed + intermediate steps.
   * Resolves up to 2 hops deep (e.g. ore → bar → weapon).
   */
  async craft_chain(item_code: string, quantity = 1): Promise<string> {
    try {
      const item = await getItemByCode(this.api, item_code);
      if (!item) return `Item not found: ${item_code}`;
      if (!item.craft) return `${item_code} is not craftable`;

      // Resolve ingredients recursively (max 2 levels)
      const rawMaterials: Record<string, number> = {};
      const steps: string[] = [];

      const resolve = async (code: string, qty: number, depth: number) => {
        const it = await getItemByCode(this.api, code);
        if (!it?.craft || depth >= 2) {
          rawMaterials[code] = (rawMaterials[code] ?? 0) + qty;
          return;
        }
        const batchSize = it.craft.quantity ?? 1;
        const batches = Math.ceil(qty / batchSize);
        const ws = it.craft.skill ? SKILL_TO_WORKSHOP[it.craft.skill] : undefined;
        const wsNote = ws ? ` @ goto ${ws.alias} (${ws.x},${ws.y})` : '';
        steps.push(`  craft ${batches}x ${code} (${it.craft.skill ?? '?'} lv${it.craft.level ?? '?'}${wsNote})`);
        for (const ing of (it.craft.items ?? [])) {
          await resolve(ing.code, ing.quantity * batches, depth + 1);
        }
      };

      const topBatchSize = item.craft.quantity ?? 1;
      const topBatches = Math.ceil(quantity / topBatchSize);
      const topWs = item.craft.skill ? SKILL_TO_WORKSHOP[item.craft.skill] : undefined;
      const topWsNote = topWs ? ` @ goto ${topWs.alias} (${topWs.x},${topWs.y})` : '';
      steps.push(`craft ${topBatches}x ${item_code} (${item.craft.skill ?? '?'} lv${item.craft.level ?? '?'}${topWsNote})`);

      for (const ing of (item.craft.items ?? [])) {
        await resolve(ing.code, ing.quantity * topBatches, 1);
      }

      const rawList = Object.entries(rawMaterials)
        .map(([code, qty]) => `  ${qty}x ${code}`)
        .join('\n');

      return `Crafting chain for ${quantity}x ${item_code}:\n\nSteps (bottom-up):\n${steps.join('\n')}\n\nRaw materials needed:\n${rawList}`;
    } catch (err: any) {
      return `Error resolving craft chain: ${err.message}`;
    }
  }

  /**
   * Given current inventory + bank contents, return what the character can craft right now
   * at each skill level, ranked by XP per craft.
   */
  async get_craftable_items(
    inventoryOrBank: Array<{ code: string; quantity: number }>,
    skillLevels: Record<string, number>,
  ): Promise<string> {
    try {
      const items = await getAllItems(this.api);
      const stock: Record<string, number> = {};
      for (const { code, quantity } of inventoryOrBank) {
        stock[code] = (stock[code] ?? 0) + quantity;
      }

      const craftable: Array<{ code: string; skill: string; level: number; qty: number; xp: number }> = [];

      for (const item of items) {
        if (!item.craft) continue;
        const skill = item.craft.skill;
        const level = item.craft.level;
        const ingredients = item.craft.items;
        const output = item.craft.quantity;
        if (!skill || level === undefined || !ingredients) continue;
        const skillLevel = skillLevels[skill] ?? 1;
        if (skillLevel < level) continue;

        // How many batches can we craft?
        let maxBatches = Infinity;
        for (const ing of ingredients) {
          const have = stock[ing.code] ?? 0;
          maxBatches = Math.min(maxBatches, Math.floor(have / ing.quantity));
        }
        if (maxBatches === Infinity || maxBatches === 0) continue;

        craftable.push({
          code: item.code,
          skill,
          level,
          qty: maxBatches * (output ?? 1),
          xp: (item as any).xp ?? 0, // if API returns XP per craft
        });
      }

      if (craftable.length === 0) return 'Nothing craftable with current materials.';

      // Group by skill
      const bySkill: Record<string, typeof craftable> = {};
      for (const c of craftable) {
        (bySkill[c.skill] ??= []).push(c);
      }

      const lines: string[] = [];
      for (const [skill, items] of Object.entries(bySkill)) {
        lines.push(`${skill}:`);
        for (const c of items.sort((a, b) => a.level - b.level)) {
          lines.push(`  ${c.code} x${c.qty} (lv${c.level} recipe)`);
        }
      }
      return lines.join('\n');
    } catch (err: any) {
      return `Error checking craftable items: ${err.message}`;
    }
  }

  /**
   * Fetch available tasks from the API, filtered to tasks the character can do
   * based on their current skill levels and combat level.
   */
  async get_available_tasks(characterLevel: number, skillLevels: Record<string, number>): Promise<string> {
    try {
      // Fetch all tasks (both monster and item types)
      const resp = await (this.api as any).client?.get('/tasks/list?size=100');
      const tasks: any[] = resp?.data?.data ?? [];
      if (tasks.length === 0) return 'No tasks available';

      const doable: string[] = [];
      const notReady: string[] = [];

      for (const task of tasks) {
        const lvReq = task.level ?? 1;
        const isMonster = task.type === 'monsters';
        const relevantLevel = isMonster ? characterLevel : (skillLevels[task.skill ?? ''] ?? characterLevel);
        const canDo = relevantLevel >= lvReq;
        const reward = `${task.rewards.gold}g + ${task.rewards.items.map((i: any) => `${i.quantity}x ${i.code}`).join(', ')}`;
        const qty = `${task.min_quantity}-${task.max_quantity}`;
        const line = `  ${task.code} [lv${lvReq} ${task.type}] qty:${qty} → ${reward}`;
        if (canDo) doable.push(line);
        else notReady.push(line);
      }

      return `Available tasks (${doable.length}):\n${doable.join('\n')}\n\nNot yet available (${notReady.length}):\n${notReady.slice(0, 10).join('\n')}`;
    } catch (err: any) {
      return `Error fetching tasks: ${err.message}`;
    }
  }

  // ─── Action tools ───────────────────────────────────────────────────────────

  updateScript(script: string): void {
    this.executionState.script = script;
  }

  getScript(): string {
    return this.executionState.script;
  }
}
