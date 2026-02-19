import * as fs from 'fs';
import * as path from 'path';
import { chat, MODEL_REASONER, MODEL_CHAT, Message } from './llm';
import { GameState } from './tools';
import { validateScript } from '../engine/parser';

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
  fetch <item> <qty>        Ensure <qty> of <item> is in inventory — checks inventory first,
                            then withdraws the shortfall from bank (moves to bank if needed).
                            Does nothing if already have enough. Logs warning if bank also lacks stock.

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
  not <condition>           Negates any condition (e.g. not has_item copper_bar)
  has_item <code> [qty]
  has_item_total <code> <qty>   true if inventory + bank combined >= qty
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
## Crafting Rule
ALWAYS \`goto <workshop_alias>\` BEFORE \`craft\`. The workshop alias matches the item's craft skill:
| craft.skill      | goto alias               | Coordinates |
|------------------|--------------------------|-------------|
| mining           | workshop_mining          | (1, 5)      |
| woodcutting      | workshop_woodcutting     | (-2, -3)    |
| weaponcrafting   | workshop_weaponcrafting  | (2, 1)      |
| gearcrafting     | workshop_gearcrafting    | (3, 1)      |
| jewelrycrafting  | workshop_jewelrycrafting | (1, 3)      |
| cooking          | workshop_cooking         | (1, 1)      |
| alchemy          | workshop_alchemy         | (2, 3)      |

Example: to craft copper_bar (craft.skill = mining): goto workshop_mining → craft copper_bar

## Known Locations (overworld)

| Location | Coordinates | Type |
|----------|-------------|------|
| Chicken spawn | (0, 1) | monster (chicken) |
| Ash tree | (-1, 0) | woodcutting (ash_wood) |
| Copper rocks | (2, 0) | mining (copper_ore) |
| Sunflower field | (2, 2) | alchemy (sunflower) |
| Gudgeon fishing | (4, 2) | fishing (gudgeon) |
| Cooking workshop | (1, 1) | crafting (cooking) — goto alias: workshop_cooking |
| Weaponcrafting workshop | (2, 1) | crafting (weaponcrafting) — goto alias: workshop_weaponcrafting |
| Gearcrafting workshop | (3, 1) | crafting (gearcrafting) — goto alias: workshop_gearcrafting |
| Jewelrycrafting workshop | (1, 3) | crafting (jewelrycrafting) — goto alias: workshop_jewelrycrafting |
| Smelting workshop | (1, 5) | crafting (mining/smelting) — goto alias: workshop_mining |
| Woodcutting workshop | (-2, -3) | crafting (woodcutting/planks) — goto alias: workshop_woodcutting |
| Alchemy workshop | (2, 3) | crafting (alchemy) — goto alias: workshop_alchemy |
| Bank | (4, 1) | bank |
| Tasks Master (monsters) | (1, 2) | tasks |
| Tasks Master (items) | (4, 13) | tasks |
| Grand Exchange | (5, 1) | trading |
| Rune NPC | (6, 13) | npc (sells runes for rune_slot) |

## Gathering Tools (equip in weapon_slot to reduce gathering cooldown)
Base gathering cooldown = 30s + resource_level/2. Tools reduce this directly.

| Tool | Lvl | Skill | Reduction | Craft |
|------|-----|-------|-----------|-------|
| copper_axe | 1 | woodcutting | -10s | 6x copper_bar (weaponcrafting) |
| copper_pickaxe | 1 | mining | -10s | 6x copper_bar (weaponcrafting) |
| fishing_net | 1 | fishing | -10s | 6x ash_plank (weaponcrafting) |
| apprentice_gloves | 1 | alchemy | -10s | 6x feather (weaponcrafting) |
| iron_axe | 10 | woodcutting | -20s | 2x spruce_plank + 8x iron_bar + 1x jasper_crystal |
| iron_pickaxe | 10 | mining | -20s | 2x spruce_plank + 8x iron_bar + 1x jasper_crystal |
| spruce_fishing_rod | 10 | fishing | -20s | 8x spruce_plank + 2x iron_bar + 1x jasper_crystal |
| leather_gloves | 10 | alchemy | -20s | 2x ash_plank + 8x cowhide + 1x jasper_crystal |
| steel_axe | 20 | woodcutting | -30s | (requires monster drops) |
| steel_pickaxe | 20 | mining | -30s | (requires monster drops) |

**Priority:** Craft copper_axe and copper_pickaxe ASAP — they cut gathering time by 33%. Always equip the right tool before a gathering loop. Unequip and re-equip when switching skill (e.g. unequip axe, equip pickaxe before mining).

Example:
\`\`\`
equip copper_axe
goto -1 0
loop 20:
  woodcut
\`\`\`


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
- **Craft gathering tools early:** copper_axe and copper_pickaxe each cost 6x copper_bar (weaponcrafting lv1) and reduce gathering cooldown by 10s (33% faster). Always equip the correct tool before a gathering loop.
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

  const raw = await chat(messages, MODEL_CHAT, 8192);

  const reasoningMatch = raw.match(/REASONING:\s*\n([\s\S]+?)(?=SCRIPT:)/);
  const scriptMatch = raw.match(/SCRIPT:\s*\n([\s\S]+)/);

  const reasoning = reasoningMatch?.[1]?.trim() ?? raw;
  let script = stripCodeFences(scriptMatch?.[1]?.trim() ?? '') || generateFallbackScript();

  // Validate and retry once if there are parse errors
  const errors = validateScript(script);
  if (errors.length > 0) {
    const errorSummary = errors
      .map(e => e.line > 0 ? `  Line ${e.line}: ${e.message} (raw: "${e.raw}")` : `  ${e.message}`)
      .join('\n');
    console.warn(`[bootstrap] Script has ${errors.length} parse error(s):\n${errorSummary}`);
    console.warn('[bootstrap] Sending errors back to agent for correction...');

    const correctionPrompt = `The DSL script you generated has parse errors. Fix only the invalid lines and return the corrected script.

## Script with errors
\`\`\`
${script}
\`\`\`

## Errors found
${errorSummary}

Respond with:
REASONING:
<brief note on what you fixed>
SCRIPT:
<corrected DSL script>`;

    const correctionMessages: Message[] = [
      { role: 'system', content: BOOTSTRAP_SYSTEM },
      { role: 'user', content: correctionPrompt },
    ];

    try {
      const correctionRaw = await chat(correctionMessages, MODEL_CHAT, 4096);
      const correctedScriptMatch = correctionRaw.match(/SCRIPT:\s*\n([\s\S]+)/);
      if (correctedScriptMatch?.[1]) {
        const correctedScript = stripCodeFences(correctedScriptMatch[1].trim());
        const correctionErrors = validateScript(correctedScript);
        if (correctionErrors.length === 0) {
          console.warn('[bootstrap] Corrected script is valid — using it');
          script = correctedScript;
        } else {
          const s = correctionErrors.map(e => e.line > 0 ? `Line ${e.line}: ${e.message}` : e.message).join('; ');
          console.warn(`[bootstrap] Corrected script still has errors: ${s} — using fallback`);
          script = generateFallbackScript();
        }
      } else {
        console.warn('[bootstrap] Correction response had no SCRIPT block — using fallback');
        script = generateFallbackScript();
      }
    } catch (err: any) {
      console.warn(`[bootstrap] Correction LLM failed: ${err.message} — using fallback`);
      script = generateFallbackScript();
    }
  }

  return { script, reasoning };
}

// Strip markdown code fences LLMs tend to wrap scripts in
function stripCodeFences(text: string): string {
  return text.replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '').trim();
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
