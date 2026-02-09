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

### Combat System
- **Elements:** Fire, Earth, Water, Air
- **Stats:** HP, attack (per element), resistance (per element), critical strike, haste, initiative
- **Turn-based:** Initiative determines turn order
- **Drops:** Gold + potential item drops (based on monster)
- **Multi-character:** Boss fights support up to 3 characters
- **Threat:** Affects monster targeting in multi-char combat

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

## Notes

- Prospecting stat increases drop chances (1% per 10 PP)
- Critical strikes add 50% extra damage
- Monster types: normal, elite, boss
- Bank is shared across all characters on account
- Events can spawn dynamically on maps
- Achievements give account-wide points
- Leaderboards exist for characters and accounts
