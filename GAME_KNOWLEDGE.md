# Artifacts MMO - Game Knowledge

This document tracks discovered game mechanics, data, and patterns. Update as we learn more through exploration and API interaction.

## API Structure

### Base Info
- **Base URL:** https://api.artifactsmmo.com
- **API Version:** 6.1.0
- **Rate Limits:** See `/` endpoint for current limits
- **Authentication:** Bearer token via `/token` endpoint (HTTPBasic auth)

## Game Systems

### Character Management
- **Max Characters:** 5 per account
- **Starting Location:** TBD (discover on first character creation)
- **Character Slots:** weapon, shield, helmet, body_armor, leg_armor, boots, ring1, ring2, amulet, artifact1-3, utility1-2, bag, rune
- **Inventory:** Limited slots, expandable via bag items
- **HP Regen:** Rest action (1s per 5 HP, minimum 3s)

### Skills & Levelling
**Gathering Skills:**
- Mining
- Woodcutting
- Fishing
- Alchemy (also gathering?)

**Crafting Skills:**
- Weaponcrafting
- Gearcrafting
- Jewelrycrafting
- Cooking

**Combat:**
- Combat level (separate from skill levels)
- XP from fighting monsters
- Wisdom stat increases XP gain (1% per 10 wisdom)

**Skill XP Observations:**
- Crafting and gathering actions return `details.xp` plus `details.items` in the action response (SkillResponseSchema).
- Character schema includes per-skill XP fields like `weaponcrafting_xp`, `weaponcrafting_max_xp`, and `weaponcrafting_total_xp`.
- Logs endpoints `/my/logs` and `/my/logs/{name}` include action history with `type`, `description`, `content`, `cooldown`, and `created_at`; useful for deriving XP per action and cooldowns.

### Combat System
- **Elements:** Fire, Earth, Water, Air
- **Stats:** HP, attack (per element), resistance (per element), critical strike, haste, initiative
- **Turn-based:** Initiative determines turn order
- **Drops:** Gold + potential item drops (based on monster)
- **Multi-character:** Boss fights support up to 3 characters
- **Threat:** Affects monster targeting in multi-char combat
- **Fight action:** `/my/{name}/action/fight` uses current map tile; request body only supports optional `participants` (max 2), and monster must be present on the tile

### Resources & Items
- **Items have levels:** Equipment requires character level
- **Crafting requirements:** Skill level + materials
- **Item types:** utility, equipment, resource, consumable, currency, rune, bag, artifact
- **Tradeable flag:** Some items cannot be traded
- **Effects:** Items can have stat bonuses and special effects

### Map & Navigation
- **Layers:** interior, overworld, underground
- **Coordinates:** X, Y position on each layer
- **Map IDs:** Unique identifier per map tile
- **Content types:** monster, resource, workshop, bank, grand_exchange, tasks_master, npc
- **Access types:** standard, teleportation, conditional, blocked
- **Transitions:** Special teleports between layers (may have requirements)

### Economy
- **Gold:** Primary currency
- **Grand Exchange:** Player marketplace (3% listing tax)
- **NPCs:** Buy/sell items at fixed prices
- **Bank:** Shared storage across characters (expandable, 20 slots per expansion)

### Tasks System
- Tasks Master NPC gives repeatable tasks
- Task types: monsters (kill X), items (gather/craft X)
- Rewards: gold + items + task coins
- 6 task coins = 1 random reward from task rewards pool
- Can cancel tasks for 1 task coin
- Tasks Master actions: new task, complete, cancel, exchange coins, and trade items
- Task lists: `/tasks/list` and `/tasks/rewards` list objectives and exchange rewards

### Cooldowns
- **All actions have cooldowns** (returned in API response)
- Movement: depends on distance
- Gathering/Crafting: depends on action
- Combat: depends on outcome
- Banking: 3s × number of different items (deposits/withdrawals)

### Error Codes (Common)
- 404: Not found (item, monster, resource, map, etc.)
- 486: Action already in progress
- 490: Already at destination
- 492: Insufficient gold
- 493: Skill level too low
- 494: Name already in use
- 495: Max characters reached
- 496: Conditions not met
- 497: Inventory full
- 498: Character not found
- 499: Character in cooldown

## Discovered Data

### Starting Areas
_TBD - discover on first login_

### Efficient Farming Routes
_TBD - identify as we explore_

### Valuable Resources
_TBD - track prices and demand_

### Optimal Skill Progression
_TBD - plan after exploring content_

### Skill XP Samples (2026-02-13)
Observed XP per action from `SKILL_XP_LOG.md` (character: mxblue, layer: overworld).

| Skill | Action | XP | Cooldown (s) | Output | Location |
| --- | --- | --- | --- | --- | --- |
| Woodcutting | Gather ash_tree | 9 | 30 | ash_wood x1 | overworld (-1,0) |
| Mining | Gather copper_rocks | 6 | 27 | copper_ore x1 | overworld (2,0) |
| Alchemy | Gather sunflower_field | 13 | 30 | sunflower x1 | overworld (2,2) |
| Fishing | Gather gudgeon_spot | 13 | 30 | gudgeon x1 | overworld (4,2) |
| Cooking | Craft cooked_gudgeon | 32 | 5 | cooked_gudgeon x1 | overworld (1,1) |
| Mining | Craft copper_bar | 5 | 5 | copper_bar x1 | overworld (1,5) |
| Weaponcrafting | Craft copper_dagger | 63 | 5 | copper_dagger x1 | overworld (2,1) |
| Gearcrafting | Craft copper_boots | 63 | 5 | copper_boots x1 | overworld (3,1) |
| Jewelrycrafting | Craft copper_ring | 76 | 5 | copper_ring x1 | overworld (1,3) |

## Notes

- Prospecting stat increases drop chances (1% per 10 PP)
- Critical strikes add 50% extra damage
- Monster types: normal, elite, boss
- Bank is shared across all characters on account
- Events can spawn dynamically on maps
- Achievements give account-wide points
- Leaderboards exist for characters and accounts
