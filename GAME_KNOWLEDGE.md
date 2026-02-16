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
- **Starting Location:** Characters spawn at (0,0) on the map
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
- Mining
- Woodcutting
- Alchemy

**Combat:**
- Combat level (separate from skill levels)
- XP from fighting monsters
- Wisdom stat increases XP gain (1% per 10 wisdom)

**Skill XP Observations:**
- Crafting and gathering actions return `details.xp` plus `details.items` in the action response (SkillResponseSchema).
- Character schema includes per-skill XP fields like `weaponcrafting_xp`, `weaponcrafting_max_xp`, and `weaponcrafting_total_xp`.
- Logs endpoints `/my/logs` and `/my/logs/{name}` include action history with `type`, `description`, `content`, `cooldown`, and `created_at`; useful for deriving XP per action and cooldowns.
- **Skill lists:** Use `/resources` to list gatherable resources and `/items?craft_skill=weaponcrafting` (or other skill) to list crafts.
- **XP table:** Skill XP uses a shared level table (see skills docs for full values).

### Combat System
- **Elements:** Fire, Earth, Water, Air
- **Stats:** HP, attack (per element), resistance (per element), critical strike, haste, initiative
- **Turn-based:** Initiative determines turn order
- **Drops:** Gold + potential item drops (based on monster)
- **Multi-character:** Boss fights support up to 3 characters
- **Threat:** Affects monster targeting in multi-char combat
- **Fight action:** `/my/{name}/action/fight` uses current map tile; request body only supports optional `participants` (max 2), and monster must be present on the tile
- **Fight response:** Includes win/lose, per-turn log, drops, and XP
- **Fight cooldown:** Scales with fight duration; stronger stats reduce cooldown
- **Fight rules:** Max 100 turns; losing returns you to (0,0) overworld with 1 HP
- **Cooldown formula:** `turns * 2 - (haste * 0.01) * (turns * 2)` with minimum 5s
- **Damage formula:** `Round(Attack * Round(Damage * 0.01))` per element; multi-element weapons resolve separately
- **Resistance formula:** `Round(Attack * Round(Resistance * 0.01))` per element
- **Critical strike:** 1 critical strike = 1% chance; crit deals 1.5x total attack
- **Initiative ties:** Higher HP goes first, then random
- **Threat targeting:** 90% highest threat, 10% lowest HP; ties prefer lowest HP then random
- **Wisdom/Prospecting:** 1 point = 0.1% XP/drop bonus
- **Utilities keywords:** Restore, Splash Restore, Boost, Antipoison
- **Rune keywords:** Burn, Lifesteal, Healing, Healing Aura, Vampiric Strike, Frenzy, Shell, Guard
- **Monster effects:** Burn, Lifesteal, Healing, Reconstitution, Poison, Corrupted, Frenzy, Berserker Rage, Void Drain, Barrier

### Resources & Items
- **Items have levels:** Equipment requires character level
- **Crafting requirements:** Skill level + materials
- **Item types:** utility, equipment, resource, consumable, currency, rune, bag, artifact
- **Tradeable flag:** Some items cannot be traded
- **Effects:** Items can have stat bonuses and special effects
- **Item conditions:** Use `gt`, `lt`, `eq`, `ne` against character fields to gate equip/use
- **Consumable effects:** Heal, Gold, Teleport_x, Teleport_y

### Map & Navigation
- **Layers:** interior, overworld, underground
- **Coordinates:** X, Y position on each layer
- **Move action:** POST `/my/{name}/action/move` with `{ "x": number, "y": number }` or `{ "map_id": number }`
- **Map IDs:** Unique identifier per map tile
- **Content types:** monster, resource, workshop, bank, grand_exchange, tasks_master, npc
- **Access types:** standard, teleportation, conditional, blocked
- **Transitions:** Special teleports between layers (may have requirements)
- **Pathfinding:** A* finds shortest path around blocked tiles; cooldown 5s per map
- **Transition action:** POST `/my/{name}/action/transition` from a tile with a transition; 5s cooldown
- **Conditions:** `access.conditions` gates entering tiles; `transition.conditions` gates using portals
- **Condition operators:** `eq`, `ne`, `gt`, `lt` for character fields
- **Map-only operators:** `has_item` (inventory or equipped), `cost` (consumes item or gold), `achievement_unlocked`

### Economy
- **Gold:** Primary currency
- **Grand Exchange:** Player marketplace (3% listing tax)
- **NPCs:** Buy/sell items at fixed prices
- **Bank:** Shared storage across characters (expandable, 20 slots per expansion)
- **GE orders:** Check `/grandexchange/orders?code=ITEM_CODE` and `/grandexchange/history/ITEM_CODE`
- **GE actions:** Must be on a grand exchange tile to buy/sell/cancel orders
- **NPC currency:** NPC items can cost gold or a specific item code

### Tasks System
- Tasks Master NPC gives repeatable tasks
- Task types: monsters (kill X), items (gather/craft X)
- Rewards: gold + items + task coins
- 6 task coins = 1 random reward from task rewards pool
- Can cancel tasks for 1 task coin
- Tasks Master actions: new task, complete, cancel, exchange coins, and trade items
- Task lists: `/tasks/all` and `/tasks/rewards` list objectives and exchange rewards
- Task progress: available on `/characters/{name}` responses

### Achievements
- Account-wide progress across all characters
- Types: `combat_kill`, `combat_drop`, `combat_level`, `gathering`, `crafting`, `recycling`, `task`, `use`
- Endpoints: `/accounts/{account}/achievements`, `/achievements`, `/badges`
- Season requirements can change; check server status endpoint

### Actions & Logs
- Cooldowns (base): move 5s per map, fight 2s per turn, rest 1s per 5 HP (min 3s), gathering 30s + resource level/2, crafting 5s per item, recycling 3s per item, bank item in/out 3s per different item, give item 3s per different item, others 3s
- Logs: `/my/{name}/logs?page=1&size=50` for action history

### Events
- Timed world events spawn exclusive monsters/resources/NPCs
- Endpoints: `/events` (all), `/events/active` (active only)

### Inventory & Bank
- Inventory: 20 slots, up to 100 total items (max total +2 per level)
- Bank: shared across characters; base 50 slots
- Bank expansions: +20 slots for 4,500 gold; cost doubles each purchase
- Bank item actions require bank tile; up to 20 different items per request
- Bank gold actions have flat 3s cooldown per transaction

### NPC Trading
- List NPCs: `/npcs/details`
- NPC items: `/npcs/items/{npc_code}`; `currency` is gold or item code
- Buy/sell require standing on the NPC tile

### Recycling
- Recycle weapons/equipment at weaponcrafting/gearcrafting/jewelrycrafting workshops
- Returns at least 1 resource from the original craft (random among its materials)

### Cooldowns
- **All actions have cooldowns** (returned in API response)
- Movement: depends on distance
- Gathering/Crafting: depends on action
- Combat: depends on outcome
- Banking: 3s × number of different items (deposits/withdrawals)
- **Move gating:** You cannot act again until the movement cooldown ends

## Quickstart Notes

### Client Basics
- The web client shows action logs, character details, and map info for coordinates
- The in-client code editor runs Node.js; scripts are run with `node index.js`
- Chromium-based browsers are recommended for the editor

### First Fight Flow
- Example target: chicken at (0,1) with ~60 HP and water attack
- Early weapon provides earth damage (check Equipment tab in client)
- Fight via POST `/my/{name}/action/fight` on the current tile

### HP Recovery
- Rest via POST `/my/{name}/action/rest`
- Rest cooldown is 1s per 5 HP recovered; good early, slow at high HP
- Food from fishing/cooking is a better long-term recovery path

### Gathering Basics
- Gather via POST `/my/{name}/action/gathering` on a resource tile
- Each gather action yields 1 resource in the response inventory summary
- Example: ash_wood from ash_tree at (-1,0)

### Crafting Basics
- Weaponcrafting workshop example location: (2,1)
- Unequip item via POST `/my/{name}/action/unequip` with `{ "slot": "weapon" }`
- Craft via POST `/my/{name}/action/crafting` with `{ "code": "wooden_staff" }`
- Equip via POST `/my/{name}/action/equip` with `{ "code": "wooden_staff", "slot": "weapon" }`
- Craft responses include cooldown and XP gained

### Early Progress Ideas
- Mine copper, smelt bars, craft starter gear
- Fish and cook for consumables
- Craft level 1 weapons to push weaponcrafting to level 5

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
