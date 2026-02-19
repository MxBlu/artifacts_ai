import * as fs from 'fs';
import * as path from 'path';
import { chat, MODEL_REASONER, Message } from './llm';
import { GameState } from './tools';

// DSL command reference injected into bootstrap prompt
const DSL_DOCS = `\
## DSL Command Reference

Navigation:
  goto <x> <y>              Move to coordinates (overworld)
  goto <location_name>      Move to named location (bank, tasks_master, etc.)
  transition                Use portal on current tile (changes layer)

Gathering:
  gather                    Gather resource on current tile
  woodcut                   Gather wood (alias for gather on wood tile)
  mine                      Gather ore (alias for gather on mine tile)
  fish                      Gather fish (alias for gather on fish tile)

Combat:
  fight [monster_code]      Fight monster on current tile

Banking:
  bank deposit allitems     Deposit everything except equipped
  bank deposit <item>       Deposit specific item
  bank withdraw <item> <qty>

Equipment:
  equip <item_code>
  unequip <slot>            Slots: weapon, shield, helmet, body_armor, leg_armor, boots, ring1, ring2, amulet

Crafting:
  craft <item_code> [qty]   Must be at correct workshop tile

NPC:
  npc buy <item> <qty>      Must be on NPC tile
  npc sell <item> <qty>

Tasks:
  task new                  Get a new task from tasks master
  task complete             Complete current task
  task cancel               Cancel task (costs 1 task coin)
  task exchange             Exchange 6 task coins for reward

Utility:
  rest                      Call REST endpoint to restore HP (cooldown scales with HP restored)
  sleep <seconds>           Wait for specified time (no API call)
  wait_cooldown             Wait for active cooldown to expire
  log "message"             Write to execution log

Variables:
  set <var> = <value>       Set a variable
  {{var_name}}              Interpolate variable

Control Flow:
  if <condition>:
    <body>
  else:
    <body>

  loop <n>:                 Repeat n times
    <body>
  loop until <condition>:   Repeat until condition is true
  loop while <condition>:   Repeat while condition is true
  loop forever:             Repeat indefinitely

Conditions:
  inventory_full
  has_item <code> [qty]
  <skill>_level >= <n>      e.g. mining_level >= 5
  hp < <n>                  absolute HP
  hp_percent < <n>          HP as percentage
  gold > <n>
  has_task
  task_progress_complete

Comments: lines starting with # are ignored
`;

// Known locations from GAME_KNOWLEDGE.md
const KNOWN_LOCATIONS = `\
## Known Locations (overworld)

| Location | Coordinates | Type |
|----------|-------------|------|
| Chicken spawn | (0, 1) | monster (chicken) |
| Ash tree | (-1, 0) | woodcutting (ash_wood) |
| Copper rocks | (2, 0) | mining (copper_ore) |
| Sunflower field | (2, 2) | alchemy (sunflower) |
| Gudgeon fishing | (4, 2) | fishing (gudgeon) |
| Cooking workshop | (1, 1) | crafting (cooking) |
| Weaponcrafting workshop | (2, 1) | crafting (weaponcrafting) |
| Gearcrafting workshop | (3, 1) | crafting (gearcrafting) |
| Jewelrycrafting workshop | (1, 3) | crafting (jewelrycrafting) |
| Smelting workshop | (1, 5) | crafting (mining/smelting) |
| Woodcutting workshop | (-2, -3) | crafting (woodcutting/planks) |
| Bank | (4, 1) | bank |
| Tasks Master (monsters) | (1, 2) | tasks |
| Tasks Master (items) | (4, 13) | tasks |
| Grand Exchange | (5, 1) | trading |

## Skill XP Rates (observed)

| Skill | Action | XP/action | Cooldown |
|-------|--------|-----------|----------|
| Woodcutting | ash_tree gather | 9 XP | 30s |
| Mining | copper_rocks gather | 6 XP | 27s |
| Alchemy | sunflower_field gather | 13 XP | 30s |
| Fishing | gudgeon_spot gather | 13 XP | 30s |
| Cooking | craft cooked_gudgeon | 32 XP | 5s |
| Mining | craft copper_bar | 5 XP | 5s |
| Weaponcrafting | craft copper_dagger | 63 XP | 5s |
| Gearcrafting | craft copper_boots | 63 XP | 5s |
| Jewelrycrafting | craft copper_ring | 76 XP | 5s |

## Crafting Recipes (observed, level 1-10)
- ash_plank: 6x ash_wood (woodcutting workshop at -2,-3)
- copper_bar: 8x copper_ore (smelting workshop at 1,5)
- copper_dagger: 6x copper_bar (weaponcrafting at 2,1)
- copper_axe: 6x copper_bar (weaponcrafting at 2,1)
- copper_boots: 5x copper_bar (gearcrafting at 3,1)
- copper_ring: 6x copper_bar (jewelrycrafting at 1,3)
- wooden_staff: 1x wooden_stick + 4x ash_wood (weaponcrafting at 2,1)
- fishing_net: 6x ash_plank (weaponcrafting at 2,1)
- cooked_gudgeon: 1x gudgeon (cooking at 1,1)
- small_health_potion: needs sunflower (alchemy at 2,3)

## Level 5 Recipes (require monster drops)
- sticky_dagger: 5x copper_bar + 2x green_slimeball (lv5 weaponcrafting)
- sticky_sword: 5x copper_bar + 2x yellow_slimeball (lv5 weaponcrafting)
- fire_staff: 2x red_slimeball + 5x ash_plank (lv5 weaponcrafting)
- water_bow: 2x blue_slimeball + 5x ash_plank (lv5 weaponcrafting)

## Tasks System
- Monster tasks: kill N of a monster type (50-400 kills), reward: 200-500g + 3-5 tasks_coin
- Item tasks: gather/craft N of an item (10-400 qty), reward: 150-350g + 2-4 tasks_coin
- tasks_coin can be exchanged (6 coins → reward box) via "task exchange" command
- Tasks master for monsters: (1, 2) — use for combat tasks
- Tasks master for items: (4, 13) — use for gathering/crafting tasks
- Cancel task costs 1 tasks_coin

## Task Loop Pattern (DSL example)
\`\`\`
# Monster task loop
loop forever:
  if has_task:
    if task_progress_complete:
      goto 1 2
      task complete
    else:
      # fight the task monster (move to its tile first)
      goto 0 1
      fight
  else:
    goto 1 2
    task new
\`\`\`
`;

const BOOTSTRAP_SYSTEM = `You are an autonomous AI player for Artifacts MMO. Your goal is to reach level 50 in all skills as efficiently as possible.

You generate scripts in a custom DSL to control your character. Write clean, efficient scripts that run for a long time before needing changes.

${DSL_DOCS}

Script writing guidelines:
- Always use "loop forever:" as the outermost loop for continuous execution
- Bank when inventory is full before continuing
- Rest when HP is low (hp_percent < 30) before fighting
- Use tasks system to earn bonus gold and tasks_coin — integrate task loops into combat/gathering loops
- Prioritize skills that unlock better strategies first
- Comments (#) are helpful for explaining loop purpose
- Crafting is fast XP but requires gathering materials first
- Early priority: woodcutting and mining to get copper gear, then combat
- Crafting chains: gather raw materials → smelt/plank → craft gear (each step gives XP)
- Item tasks (at 4,13) are great for gathering loops — get a task, gather to fill it, complete it for bonus gold
- Monster tasks (at 1,2) integrate naturally into combat farming loops`;

export interface BootstrapResult {
  script: string;
  reasoning: string;
}

export async function bootstrapAgent(gameState: GameState): Promise<BootstrapResult> {
  const skills = Object.entries(gameState.skills)
    .map(([s, v]) => `  ${s}: Lv${v.level} (${v.xp}/${v.max_xp} XP)`)
    .join('\n');

  const inv = gameState.inventory.length > 0
    ? gameState.inventory.map(i => `  ${i.code} x${i.quantity}`).join('\n')
    : '  (empty)';

  const equipment = Object.entries(gameState.equipment)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n') || '  (none)';

  const userPrompt = `
## Current Character State
- Name: ${gameState.name}
- Level: ${gameState.level} (${gameState.xp}/${gameState.max_xp} XP)
- HP: ${gameState.hp}/${gameState.max_hp}
- Gold: ${gameState.gold}
- Position: (${gameState.position.x}, ${gameState.position.y}) [${gameState.position.layer}]
- Inventory: ${gameState.inventory_slots.used}/${gameState.inventory_slots.max} slots
- Task: ${gameState.task ? `${gameState.task} (${gameState.task_progress}/${gameState.task_total}, type: ${gameState.task_type})` : 'none'}
- Tasks coins: ${gameState.task_coins}

## Skills
${skills}

## Inventory
${inv}

## Equipment
${equipment}

${KNOWN_LOCATIONS}

## Your Task
Generate an efficient long-running script that:
1. Explains its strategy in comments at the top
2. Uses "loop forever:" as outermost structure  
3. Handles inventory management (bank when full)
4. Handles HP (rest when low before fighting)
5. Integrates tasks into the main loop for bonus gold/coins
6. Focuses on efficient skill progression toward level 50 in all skills

Start with what makes sense given current character state. For a brand new level 1 character, a good opening strategy is woodcutting + copper mining to gather crafting materials, then batch-craft gear for fast crafting XP, then move to combat with better equipment. Weave in item tasks (at 4,13 for gather tasks) or monster tasks (at 1,2) to earn bonus gold.

Respond with:
REASONING:
<your strategy rationale>
SCRIPT:
<the DSL script>
`;

  const messages: Message[] = [
    { role: 'system', content: BOOTSTRAP_SYSTEM },
    { role: 'user', content: userPrompt },
  ];

  const raw = await chat(messages, MODEL_REASONER, 4096);

  const reasoningMatch = raw.match(/REASONING:\s*\n([\s\S]+?)(?=SCRIPT:)/);
  const scriptMatch = raw.match(/SCRIPT:\s*\n([\s\S]+)/);

  const reasoning = reasoningMatch?.[1]?.trim() ?? raw;
  const script = scriptMatch?.[1]?.trim() ?? generateFallbackScript();

  return { script, reasoning };
}

// Fallback script if LLM fails or produces unparseable output
function generateFallbackScript(): string {
  return `\
# Fallback script: woodcutting + mining loop
# Goal: gather materials for crafting while building gathering skills

loop forever:
  # Gather ash wood for woodcutting XP
  goto -1 0
  loop 10:
    if inventory_full:
      goto 4 1
      bank deposit allitems
      goto -1 0
    woodcut

  # Mine copper ore for mining XP
  goto 2 0
  loop 10:
    if inventory_full:
      goto 4 1
      bank deposit allitems
      goto 2 0
    mine

  # Bank and rest
  goto 4 1
  bank deposit allitems
`;
}
