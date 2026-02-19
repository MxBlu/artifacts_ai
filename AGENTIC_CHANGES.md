# Agentic Changes Log

## [2026-02-19] - Phase 4: XP tracking + skills dashboard

### Changed
- File: `src/engine/executor.ts`
  - Added `NODE_TYPE_TO_SKILL` map: `woodcut→woodcutting`, `mine→mining`, `fish→fishing`, `gather→alchemy`
  - `execGather` now takes `nodeType` param and records XP under the correct skill key
  - Removed dead `detectGatherSkill()` fallback that always returned `'gathering'`
  - `execFight`: fixed `data.character` bug — now uses `data.characters?.[0]` (top-level array in `FightData`) with fallback to `data.fight.characters?.[0]`
  - `execFight`: `fight.drops` cast to `any` to avoid strict type error (drops not in schema but present in practice)
  - `execCraft`: tracks XP under correct craft skill via `getItemByCode` lookup; updates `this.character` from response
  - Added import for `getItemByCode` from `../cache`

- File: `src/web/server.ts`
  - `wss.on('connection')` handler made `async`
  - Fetches live character via `api.getCharacter()` on connect (best-effort, non-fatal)
  - Adds `characterSnapshot` field to `hello` WS payload

- File: `src/web/client.js`
  - `handleHello` stores `characterSnapshot`; calls `renderSkills` on connect even without xpGains
  - `renderSkills(xpGains, xpPerHour)` now shows: skill name, `Lv{N}` (from character snapshot), `+XP` session gains, `XP/hr`; shows combat skill too
  - XP bar shows progress within current level using `xpForLevel()` approximation and character's raw XP
  - Skills with no data are hidden (cleaner display on first connect)
  - Removed unused `xpSnapshot` / `xpSnapshotTime` state vars

- File: `src/web/index.html`
  - `.skill-label` CSS updated: `.skill-name` (white, capitalized), `.skill-info` (blue, 10px) for level/rate/XP display

## [2026-02-19] - Phase 4: Game data cache + location aliases fix

### Added
- File: `src/cache.ts`
  - `getMapTiles(api)` — loads overworld tile index, caches to `state/cache/map_overworld.json` (6h TTL)
  - `getAllItems(api)` — loads full item database, caches to `state/cache/items.json`
  - `loadMonsters(api)` — builds monster index by scanning map tiles + fetching each monster, caches to `state/cache/monsters.json`
  - `getAllResources(api)` — loads resource list, caches to `state/cache/resources.json`
  - `findTiles(api, search, cx, cy)` — finds tiles by content code/type/name, sorted by Manhattan distance
  - `nearestTile(api, search, cx, cy)` — returns nearest matching tile coordinates
  - `searchItems/searchMonsters/searchResources` — in-memory fuzzy search over cached data
  - `invalidateCache()` — clears all in-memory caches (call after major game events)

### Changed
- File: `src/agent/tools.ts`
  - `lookup_item` — now uses `searchItems` from cache (avoids re-fetching all items)
  - `lookup_monster` — now uses `searchMonsters` from cache
  - `lookup_resource` — now uses `searchResources` from cache
  - `find_location` — now uses `findTiles` from cache (no more full map API call per tool use)
- File: `src/engine/executor.ts`
  - Fixed `LOCATION_ALIASES`: corrected all coordinates from live API lookup
    - bank: (4,1), ge: (5,1), tasks_master: (1,2), workshops by skill, woodcutting: (-2,-3)
  - `execGoto`: if location name is not in aliases, falls back to `nearestTile` cache lookup
  - Imported `nearestTile` from `src/cache.ts`

### Notes
- Cache files saved to `state/cache/` (gitignored with `state/`)
- TTL is 6h; in-memory cache is cleared on `invalidateCache()` only
- Monster cache is bootstrapped by scanning map tile content codes then fetching each monster once

## [2026-02-19] - Fix stale 'running' status on web UI connect

### Changed
- File: `src/web/server.ts`
  - On WebSocket `connection`, if saved state has `status: 'running'` but no agent is active, reset to `'stopped'` and persist to disk before sending `hello` payload
  - Prevents dashboard from showing "Running" on a fresh server start after a crash

### Notes
- Both bugs from previous session now fixed: lazy DeepSeek client (already in `llm.ts`) + stale status sanitisation

## [2026-02-19] - Phase 2 complete + Phase 3 web interface

### Added
- File: `src/agent/bootstrap.ts`
  - Initial agent prompt with full DSL docs, known locations, XP rates
  - Calls `deepseek-reasoner` to generate first script from game state
  - `REASONING:` / `SCRIPT:` response parsing; fallback script on parse failure
- File: `src/agent/agent.ts`
  - `Agent` class: main autonomous loop (bootstrap → executor → check-ins → MODIFY)
  - `start({ resume, humanInput })` — bootstraps or resumes from saved state
  - `stop()` / `steer(input)` — public controls for web UI
  - `onAgentLog` / `onExecutionLog` / `onStateChange` callbacks for WebSocket
  - Error/stopped/natural-completion handling with automatic check-in triggers
- File: `src/web/server.ts`
  - HTTP server on port 3000 serving static files from `src/web/`
  - WebSocket server; protocol: `agent_log`, `execution_log`, `state_update`, `stats_update`, `script_update`, `error`, `hello`
  - Client commands: `agent_start`, `agent_stop`, `steer`, `script_run`, `get_state`
  - Sends full state snapshot (`hello`) on new connection
  - Broadcasts real-time logs and stats from agent/executor callbacks
- File: `src/web/index.html`
  - 4-panel dark terminal-aesthetic dashboard
  - Agent log (top-left), execution log (top-right), stats (bottom-left), script viewer (bottom-right)
  - Header: status badge, live actions/gold/runtime, connection indicator, Start/Resume/Stop buttons
- File: `src/web/client.js`
  - WebSocket client with auto-reconnect (3s)
  - Real-time log rendering with color classes (agent=purple, human=yellow, error=red)
  - Script viewer with line highlighting, DSL syntax highlighting, auto-scroll to current line
  - Skills panel with XP bars (session XP gained)
  - Gold/hr, XP/hr, runtime stats
  - Steering input → `steer` WS command

### Changed
- File: `src/index.ts`
  - Added `agent` command: `npx tsx src/index.ts agent [--resume] ["instruction"]`
  - Added `setupAgentSignalHandlers()` for SIGINT/SIGTERM
  - Added `dotenv.config()` import
  - Updated help text
- File: `src/agent/agent.ts`
  - Added public `steer(input)` method (triggers `checkin.triggerNow`)
- File: `package.json`
  - Added `"agent"` and `"web"` scripts
  - Added `ws` dependency + `@types/ws` devDependency
- File: `TASKS.md`
  - Marked Phase 2 and Phase 3 complete; updated current sprint to Phase 4

## [2026-02-19] - Fix rest command: HP restore via API; rename sleep command

### Changed
- File: `src/engine/parser.ts`
  - `RestNode` no longer carries a `seconds` field; `rest` parses as a no-argument command
  - Added `SleepNode { type: 'sleep'; seconds: Expr }` for timed waits
  - Added `sleep` to `ASTNode` union
  - Parse rule: `rest` → `RestNode`; `sleep <n>` → `SleepNode`
- File: `src/engine/executor.ts`
  - `execRest()` now calls `this.api.restCharacter()` (HP restore endpoint, cooldown scales with HP restored)
  - Added `execSleep(node)` for the old timed-wait behaviour
  - Dispatch table updated: `'rest'` → `execRest()`, `'sleep'` → `execSleep(node)`
- File: `src/agent/bootstrap.ts`
  - DSL docs updated: `rest` documented as HP-restore API call; `sleep <seconds>` as timed wait
- File: `src/agent/checkin.ts`
  - System prompt command list updated to reflect `rest` / `sleep <seconds>` distinction
- File: `scripts/combat_chickens.dsl`
  - `rest 10` → `rest` (now correctly calls HP-restore endpoint instead of sleeping)
- File: `SPEC.md`
  - Utility commands section updated: `rest` = REST API call; `sleep <seconds>` = timed wait
- File: `TASKS.md`
  - Annotated utility commands task with note on `rest` / `sleep` distinction

## [2026-02-19 23:52] - Phase 1: Script Executor Foundation

### Added
- File: `src/engine/parser.ts`
  - Full DSL tokenizer and parser
  - AST node types for all 20+ commands (goto, gather, woodcut, mine, fish, fight, bank, equip, unequip, recycle, craft, ge, npc, task, use, transition, rest, wait_cooldown, log, set)
  - Control flow: if/else, loop count, loop until, loop while, loop forever
  - Condition evaluator types: inventory_full, inventory_space, has_item, skill_level, hp, hp_percent, gold, at_location, has_task, task_progress_complete, task_coins
  - Variable interpolation: `{{var_name}}` syntax in goto and other commands
  - Shorthand skill conditions: `woodcutting_level >= 5` (without `skill_level` prefix)
  - Comment stripping (# comments)

- File: `src/engine/state.ts`
  - ExecutionState interface with script, currentLine, variables, callStack, metrics
  - Atomic save with temp-then-rename strategy
  - Snapshot rotation (last 3 states for crash recovery)
  - `appendLog()` with timestamp formatting and console echo
  - `loadState()` with fallback to snapshots on corruption

- File: `src/engine/executor.ts`
  - `ScriptExecutor` class - full execution engine
  - All command implementations wired to ArtifactsAPI
  - Condition evaluator using live character state
  - Control flow: if/else, loop_count, loop_until, loop_while, loop_forever (10k iteration limit)
  - API retry with exponential backoff (3 retries)
  - Cooldown error (499) handling with automatic wait
  - Already-at-destination (490) as no-op
  - Stuck detection after 50 actions without state change
  - Callbacks: `onAction`, `onStateChange` for web interface
  - `stop()` / `pause()` for external control
  - Location aliases: bank, workshop, grand_exchange, ge, tasks_master

- File: `src/index.ts`
  - Main CLI entry point
  - Commands: `run <file>`, `resume`, `status`, `stop`
  - Auto-recovery: resumes running state on startup
  - Reads Bearer token from `auth_headers.txt`
  - SIGINT/SIGTERM graceful shutdown

- File: `scripts/combat_chickens.dsl`
  - Sample script: fight chickens 20 times with HP-based bank/rest recovery

- File: `scripts/woodcutting.dsl`
  - Sample script: woodcut until level 5 with bank deposit on inventory full

- File: `scripts/smoke_test.dsl`
  - Minimal 2-action test: goto + fight

### Changed
- File: `package.json`
  - Added `start` and `engine` scripts pointing to `tsx src/index.ts`

### Notes
- Smoke tested against live API: move to (0,1) + fight worked correctly
- Fight won in 29 turns against chicken at (0,1); character at level 1
- State persistence verified (state/execution_state.json written after each action)
- Cooldown waiting works: 58s fight cooldown waited correctly

## [2026-02-19 14:50] - Add test character configuration

### Changed
- File: `AGENTS.md`
  - Added Configuration section specifying "greenglasses" as the test character
  - Included example API call using the greenglasses character
  - Clarified that all autonomous agent actions will use this character

### Notes
- greenglasses is the designated character for testing and development
- All script executor commands and agent tools will target this character
- API endpoints require character name in path: `/my/greenglasses/action/*`

## [2026-02-19 14:45] - Update AGENTS.md for autonomous AI agent project

### Changed
- File: `AGENTS.md`
  - Rewrote project overview to focus on autonomous AI agent player (not human-operated)
  - Referenced SPEC.md as the authoritative architecture specification
  - Added "Agent Autonomy" section explicitly granting permission to make API requests, fetch docs, etc.
  - Updated quick start instructions for new project structure
  - Replaced "Build and Test" with implementation phases overview
  - Updated code style section to emphasize cost efficiency and agent-focused patterns
  - Changed project structure to match new architecture (engine/, agent/, web/)
  - Updated example interaction to show script executor command implementation
  - Emphasized autonomous operation, script generation, and web interface monitoring

### Notes
- Agents now have explicit autonomy to test APIs with curl using auth_headers.txt
- Can fetch documentation from docs.artifactsmmo.com without asking
- Project focused on building autonomous agent, not human-operated client
- Core components: Script engine, agent tools, web interface
- Goal: Reach level 50 in all skills via autonomous gameplay

## [2026-02-19 14:30] - Add web interface specification

### Changed
- File: `SPEC.md`
  - Replaced "Human Steering Interface" section with comprehensive "Web Interface" section
  - Added 5 UI components: Agent Log, Execution Log, Stats Dashboard, Script Viewer, Steering Input
  - Defined WebSocket message protocol for real-time updates
  - Added XP/hr and gold/hr tracking specifications
  - Included manual play mode for taking control during raids
  - Added natural language steering input for mid-execution course correction
  - Updated implementation Phase 3 to focus on Web Interface
  - Added "Design Decisions" section explaining web interface choice and technology stack

- File: `TASKS.md`
  - Replaced Phase 3 "Human Steering" with "Phase 3: Web Interface"
  - Added 9 subsections with detailed implementation tasks:
    - WebSocket server setup
    - Frontend core UI
    - Agent log panel
    - Execution log panel
    - Stats dashboard with XP/hr tracking
    - Script viewer with line highlighting
    - Human steering text input
    - Manual play mode
    - Testing and polish

### Notes
- Web interface provides real-time monitoring and steering capabilities
- Dual logs separate AI reasoning from action execution for clarity
- Stats tracking includes XP/hr, gold/hr, and session metrics
- Natural language steering allows human to give new instructions mid-execution
- Manual play mode enables seamless takeover for complex content
- WebSocket architecture ensures low-latency bidirectional communication
- Dark terminal aesthetic for easy monitoring during long sessions

## [2026-02-19 14:15] - Add missing script commands to SPEC

### Changed
- File: `SPEC.md`
  - Added NPC trading commands (npc buy, npc sell)
  - Added task management commands (task new, task complete, task cancel, task exchange, task trade)
  - Added consumable command (use item_code)
  - Added transition command (transition between layers)
  - Added task-related conditions (has_task, task_progress_complete, task_coins)
  - Added three script examples showing different features

- File: `TASKS.md`
  - Updated Phase 1.2 to include new commands in implementation checklist

### Notes
- Transition command allows portal/layer teleportation (5s cooldown)
- Task system provides repeatable objectives for gold/items/task coins
- Consumables include potions, food, teleport scrolls
- NPC trading is separate from Grand Exchange (shop-based)

## [2026-02-19 13:45] - Create AI Agent Player Specification

### Added
- File: `SPEC.md`
  - Complete specification for autonomous AI agent client
  - Script DSL design (commands, control flow, variables)
  - Script executor architecture with persistence
  - Agent tool interface (13 tools for information and control)
  - Human steering system for collaborative play
  - Check-in system for 10-minute agent monitoring
  - Bootstrap prompt with level 50 aspirational goal
  - Safety systems (execution limits, error recovery, stuck detection)
  - Implementation phases (5 phases from executor to advanced features)

### Changed
- File: `TASKS.md`
  - Replaced human-operated client tasks with AI agent implementation roadmap
  - Organized into 5 phases matching SPEC.md
  - Phase 1: Script Executor (parser, executor, persistence, safety)
  - Phase 2: Agent Integration (tools, check-ins, bootstrap)
  - Phase 3: Human Steering (takeover, collaboration, injection)
  - Phase 4: Optimization (pathfinding, caching, metrics)
  - Phase 5: Advanced Features (crafting chains, quests, death recovery)

### Notes
- Design optimizes for agent cost reduction via script generation
- Agent generates scripts, executor runs them cheaply
- 10-minute check-ins balance autonomy with oversight
- Single character focus with human steering for raids
- Execution state saves to disk for crash recovery
- Grand Exchange available but not prioritized

## [2026-02-16 12:23] - Hide map grid coordinates

### Changed
- File: `src/main.ts`
  - Removed coordinate labels from map grid cells

## [2026-02-16 12:18] - Add item recycling

### Changed
- File: `src/api.ts`
  - Added recycling response types and API helper
- File: `src/main.ts`
  - Added recycle controls to crafting modal and wired recycle actions

## [2026-02-16 12:09] - Add concept knowledge

### Changed
- File: `GAME_KNOWLEDGE.md`
  - Added achievements, actions, events, inventory/bank, maps, NPCs, recycling, skills, stats, and GE details

## [2026-02-16 12:00] - Add quickstart knowledge

### Changed
- File: `GAME_KNOWLEDGE.md`
  - Added quickstart notes on movement, fighting, resting, gathering, and crafting
  - Noted example coordinates and early progression ideas

## [2026-02-16 10:17] - Allow auto craft start

### Changed
- File: `src/main.ts`
  - Enable the craft button when auto-craft is active even with zero materials

## [2026-02-16 10:11] - Refresh craft cooldown state

### Changed
- File: `src/main.ts`
  - Disable craft and auto buttons while the character is on cooldown
  - Re-render the craft modal when cooldown status changes so buttons re-enable

## [2026-02-13 22:33] - Show transition conditions on hover

### Changed
- File: `src/main.ts`
  - Rendered transition condition requirements in the tile hover modal

## [2026-02-13 22:31] - Gate transition conditions

### Changed
- File: `src/main.ts`
  - Added transition condition checks to disable consumable-gated transitions
  - Blocked transition action when requirements are not met

## [2026-02-13 22:27] - Add transition tile support

### Changed
- File: `index.html`
  - Added transition label toggle, icon styling, and context menu entry
- File: `src/api.ts`
  - Added transition response types and API helper
- File: `src/main.ts`
  - Added transition label toggle, map icon rendering, and context menu action
  - Added transition move/trigger flow with cooldown handling and map reload

## [2026-02-13 17:18] - Add task master map labels

### Changed
- File: `index.html`
  - Added Tasks checkbox to map labels and task icon styling
- File: `src/main.ts`
  - Added task label toggle and task master icon rendering

## [2026-02-13 17:12] - Move view tasks button

### Changed
- File: `index.html`
  - Removed View Tasks button from config panel
- File: `src/main.ts`
  - Rendered View Tasks button inside Character Info
  - Wired inline button after character info refresh

## [2026-02-13 17:05] - Add tasks list button

### Changed
- File: `index.html`
  - Added View Tasks button in configuration panel
- File: `src/main.ts`
  - Added available tasks list modal rendering and handler

## [2026-02-13 16:58] - Add tasks master support

### Changed
- File: `src/api.ts`
  - Added task schemas, reward listings, and task master action helpers
- File: `src/main.ts`
  - Added tasks master modal with task actions and reward list
  - Added context menu action for tasks master tiles
- File: `index.html`
  - Added tasks master modal markup and styling
  - Added tasks menu item to the context menu
- File: `GAME_KNOWLEDGE.md`
  - Noted tasks master actions and task list endpoints

## [2026-02-13 16:32] - Add NPC trading support

### Changed
- File: `src/api.ts`
  - Added NPC item types plus buy/sell API helpers
- File: `src/main.ts`
  - Added NPC trade modal with buy/sell actions
  - Added context menu action for NPC tiles
- File: `index.html`
  - Added NPC trade modal markup and styling
  - Added NPC trade context menu item

## [2026-02-13 16:12] - Add woodcutting workshop support

### Changed
- File: `src/main.ts`
  - Map woodcutting workshop codes to the woodcutting skill
  - Use woodcutting level for workshop gating in the craft modal

## [2026-02-13 15:26] - Add nested crafting automation

### Changed
- File: `src/main.ts`
  - Auto-craft now resolves nested crafting steps and gathers base materials as needed
  - Craft requirements show `(c)` for nested crafting and `(g)` when gathering is required

## [2026-02-13 15:08] - Fix auto craft item lookups

### Changed
- File: `src/main.ts`
  - Restored item lookups in auto-craft helpers and removed stray gather automation reference

## [2026-02-13 14:55] - Add auto craft target quantities

### Changed
- File: `src/main.ts`
  - Auto craft now accepts a target quantity up to 99 and marks above-bank options with `(g)`
  - Automation stops once the target output is reached
  - Gathering runs in single-craft batches when the bank runs out

## [2026-02-13 14:41] - Show bank-missing gather markers

### Changed
- File: `src/main.ts`
  - Mark `(g)` in craft requirements based on bank quantities when auto is enabled

## [2026-02-13 14:36] - Allow switching auto craft target

### Changed
- File: `src/main.ts`
  - Kept Auto button enabled for other items so you can switch targets without disabling first

## [2026-02-13 14:32] - Gather missing crafting materials

### Changed
- File: `src/main.ts`
  - Auto-craft now gathers missing ingredient drops when the bank is short
  - Craft modal marks gather-needed ingredients with `(g)` in the requirements list
  - Expanded gather automation helpers to support alchemy resources and shared bank deposits

## [2026-02-13 13:20] - Record skill XP samples

### Changed
- File: `GAME_KNOWLEDGE.md`
  - Added observed XP per action samples from SKILL_XP_LOG.md

## [2026-02-13 13:05] - Add bank deposit all control

### Changed
- File: `index.html`
  - Added bank inventory header styling for a deposit-all button
- File: `src/main.ts`
  - Added Deposit All button and handler in bank modal

## [2026-02-13 12:56] - Track crafted sample progress

### Changed
- File: `scripts/skill_research.ts`
  - Persist `sampleCraftedResources` and skip crafted items on resume

## [2026-02-13 12:44] - Add nested craft materials

### Changed
- File: `scripts/skill_research.ts`
  - Resolve craft requirements recursively (e.g., bars from ore)

## [2026-02-13 12:33] - Automate crafting ingredient collection

### Changed
- File: `scripts/skill_research.ts`
  - Gather and fight repeatedly to satisfy crafting ingredient requirements

## [2026-02-13 12:22] - Limit research to single actions

### Changed
- File: `scripts/skill_research.ts`
  - Sample each action once and skip crafts without materials

## [2026-02-13 12:10] - Stream skill log output

### Changed
- File: `scripts/skill_research.ts`
  - Write `SKILL_XP_LOG.md` incrementally during the run

## [2026-02-13 12:02] - Add cooldown gating and progress tracking

### Changed
- File: `scripts/skill_research.ts`
  - Wait for character cooldown before each action to avoid 499s
  - Persist sampled resources in `skill_research_progress.json` for resumable runs

## [2026-02-13 11:52] - Handle already-at-destination errors

### Changed
- File: `scripts/skill_research.ts`
  - Treat 490 errors as no-op moves and refresh character state

## [2026-02-13 11:46] - Add cooldown retry and progress logging

### Changed
- File: `scripts/skill_research.ts`
  - Added cooldown-aware retries for 499 errors
  - Added progress logging for API actions and data loads

## [2026-02-13 11:32] - Add automated skill research script

### Added
- File: `scripts/skill_research.ts`
  - Added automation to gather/craft/fight and log per-action XP to `SKILL_XP_LOG.md`

### Changed
- File: `package.json`
  - Added `research:skills` script

## [2026-02-13 11:12] - Add API curl wrapper

### Added
- File: `scripts/api.sh`
  - Added a curl wrapper that uses `auth_headers.txt` for auth

### Changed
- File: `package.json`
  - Added `api` script to call the curl wrapper

## [2026-02-13 11:05] - Add weaponcrafting analysis tooling

### Added
- File: `src/weaponcrafting_analysis.ts`
  - Added a log-driven weaponcrafting XP and prerequisite action analyzer

### Changed
- File: `src/api.ts`
  - Added character list, logs, and resources pagination helpers
  - Added log response types and resource list response types
- File: `package.json`
  - Added `analyze:weaponcrafting` script and `tsx` dev dependency
- File: `GAME_KNOWLEDGE.md`
  - Documented skill XP fields and log endpoints for XP experiments

## [2026-02-13 10:12] - Add API testing guidance

### Changed
- File: `AGENTS.md`
  - Added curl examples for using `auth_headers.txt` with the API

## [2026-02-13 09:45] - Rename status section

### Changed
- File: `index.html`
  - Renamed the Fight Status section to Status

## [2026-02-13 09:16] - Improve cooldown precision

### Changed
- File: `src/main.ts`
  - Track cooldown readiness using API remaining seconds
  - Use millisecond waits to avoid fractional cooldown errors

## [2026-02-12 16:03] - Delay auto-craft start

### Changed
- File: `src/main.ts`
  - Auto toggle now only prepares bank-aware quantities
  - Craft button starts the auto-craft loop when auto is enabled

## [2026-02-12 16:00] - Add bank-backed craft automation

### Changed
- File: `src/main.ts`
  - Added auto-craft toggle and bank-aware craft limits in the craft modal
  - Implemented crafting automation that cycles between workshop and bank
- File: `index.html`
  - Added styling for the craft automation toggle

## [2026-02-12 15:47] - Add bank items section

### Changed
- File: `src/main.ts`
  - Added a collapsible bank items section in character info

## [2026-02-12 10:45] - Show bank item total

### Changed
- File: `src/main.ts`
  - Display total bank item quantity under character info
  - Only show bank total once bank data is loaded
  - Refresh character info after loading bank data

## [2026-02-12 10:30] - Toast status positioning

### Changed
- File: `index.html`
  - Made status messages a fixed top toast to avoid layout shifts

## [2026-02-12 10:36] - Gate bank menu on cooldown

### Changed
- File: `src/main.ts`
  - Disabled the bank context menu item while on cooldown

## [2026-02-12 10:20] - Disable gather actions below level

### Changed
- File: `src/main.ts`
  - Grey out gather actions and automation when resource level is unmet

  ## [2026-02-12 10:12] - Show resource level requirements in hover

  ### Changed
  - File: `src/api.ts`
    - Added resource response types and `getResource()` API method
  - File: `src/main.ts`
    - Added resource caching and hover modal requirement rendering

## [2026-02-12 09:34] - Add auto bank deposit

### Changed
- File: `src/main.ts`
  - Added inventory-full checks and auto-deposit flow in gather automation

## [2026-02-12 09:18] - Add bank modal

### Changed
- File: `index.html`
  - Added bank modal markup, styles, and context menu option
- File: `src/api.ts`
  - Added bank API types and methods for details, items, and transactions
- File: `src/main.ts`
  - Added bank modal rendering and banking actions
  - Hide empty inventory slots in the bank modal
  - Refresh bank modal controls when cooldown state changes

## [2026-02-12 09:05] - Add workshop loading status

### Changed
- File: `src/main.ts`
  - Show a loading status while fetching workshop item lists

## [2026-02-11 16:00] - Add mining workshop support

### Changed
- File: `src/main.ts`
  - Added mining workshop detection in craft skill detection
  - Added mining level retrieval in skill level function

## [2026-02-11 15:54] - Fix mining context menu

### Changed
- File: `src/main.ts`
  - Only show mining context menu option when tile is a mining node

## [2026-02-11 15:49] - Add NPC labels

### Changed
- File: `index.html`
  - Added NPC label toggle and styling
- File: `src/main.ts`
  - Limited field labels to resource nodes only
  - Added NPC detection and map label rendering
  - Wired the NPC label toggle

## [2026-02-11 15:41] - Add alchemy field labels

### Changed
- File: `index.html`
  - Added alchemy field label toggle and styling
- File: `src/main.ts`
  - Added alchemy field detection and map label rendering
  - Wired the field label toggle

## [2026-02-11 15:33] - Add mining support

### Changed
- File: `index.html`
  - Added mining label toggle, rock badge styling, and context menu action
- File: `src/main.ts`
  - Added mining node detection, mining actions, and automation loop support
  - Render mining labels and wire mining UI handlers
  - Fixed mining-related inventory typing and cooldown scheduling

## [2026-02-11 15:24] - Add consumable item use

### Changed
- File: `src/api.ts`
  - Added use item response types and `useItem()` API method
- File: `src/main.ts`
  - Added consumable detection, inventory use controls, and use action handler
- File: `index.html`
  - Added styling for use item button and quantity selector

## [2026-02-11 15:05] - Add craft quantity input

### Changed
- File: `index.html`
  - Added craft quantity dropdown styling
- File: `src/main.ts`
  - Calculate max craftable quantities from inventory and render dropdown when >1
  - Use dropdown quantity when crafting
  - Moved craft quantity control before required level in the modal
  - Close the crafting modal when crafting starts

## [2026-02-11 14:44] - Add craft action

### Changed
- File: `index.html`
  - Added craft button styling in the modal
- File: `src/api.ts`
  - Added crafting response types and `craftItem()` API method
- File: `src/main.ts`
  - Added craft buttons in the modal and handler to craft items

## [2026-02-11 14:35] - Add crafting modal

### Changed
- File: `index.html`
  - Added Craft context menu item and crafting modal UI
- File: `src/api.ts`
  - Added item craft fields and global items fetch
- File: `src/main.ts`
  - Added workshop skill detection, item filtering, and crafting modal rendering
  - Move to workshop tile before opening the modal

## [2026-02-11 14:30] - Hide non-equipable buttons

### Changed
- File: `src/main.ts`
  - Only render Equip buttons for items with a valid slot

## [2026-02-11 14:22] - Add equip buttons in inventory

### Changed
- File: `index.html`
  - Added equip button styling in inventory list
- File: `src/api.ts`
  - Added item fetch types and `equipItem()` API method
- File: `src/main.ts`
  - Added item cache and slot resolution for equippable items
  - Added equip buttons for inventory items and handler to equip

## [2026-02-11 14:12] - Add unequip buttons in equipment section

### Changed
- File: `index.html`
  - Added styling for unequip buttons in the equipment list
- File: `src/api.ts`
  - Added unequip response types and `unequipItem()` API method
- File: `src/main.ts`
  - Added unequip buttons in the equipment collapsible
  - Added handler to call unequip and refresh character info

## [2026-02-11 14:05] - Add gather automation loops

### Changed
- File: `index.html`
  - Added automation loop action slots for woodcutting and fishing
- File: `src/main.ts`
  - Added gather automation loop for woodcutting and fishing
  - Stop button now cancels any active automation

## [2026-02-11 13:55] - Show action errors above map

### Changed
- File: `index.html`
  - Moved status message above the map area
- File: `src/main.ts`
  - Display error statuses for 15 seconds before hiding

## [2026-02-11 13:48] - Add fishing action

### Changed
- File: `index.html`
  - Added Fish option to the context menu
- File: `src/main.ts`
  - Added fishing context menu visibility and action handling
  - Move to the fishing tile if needed, then gather

## [2026-02-11 13:41] - Retry woodcut after move cooldown

### Changed
- File: `src/main.ts`
  - Persist target tile and auto-gather after move cooldown expires

## [2026-02-11 13:33] - Add woodcut action on trees

### Changed
- File: `index.html`
  - Added Cut Wood option to the context menu
- File: `src/api.ts`
  - Added gathering response types and `gather()` API method
- File: `src/main.ts`
  - Added woodcut context menu visibility and action handling
  - Move to the tree tile if needed, then gather

## [2026-02-11 13:24] - Add resource label toggles

### Changed
- File: `index.html`
  - Added toggles for tree and fishing labels
  - Added resource label badge styling
- File: `src/main.ts`
  - Render tree and fishing labels based on resource codes
  - Added toggle handlers for resource labels

## [2026-02-11 13:18] - Add map label toggles

### Changed
- File: `index.html`
  - Added map label controls under the map
- File: `src/main.ts`
  - Toggle monster labels when rendering the map

## [2026-02-11 13:12] - Simplify cooldown label text

### Changed
- File: `src/main.ts`
  - Removed remaining seconds from the cooldown label text

## [2026-02-11 13:08] - Show cooldown action reason

### Changed
- File: `src/main.ts`
  - Track the last cooldown reason from actions
  - Display the cooldown reason in the timers pane when available

## [2026-02-11 13:02] - Fix automation label source

### Changed
- File: `src/main.ts`
  - Use a constant automation label in the timer pane

## [2026-02-11 12:58] - Keep automation timer label constant

### Changed
- File: `src/main.ts`
  - Pin the automation timer label to the started action

## [2026-02-11 12:52] - Show automation timer in pane

### Changed
- File: `src/main.ts`
  - Track automation start time and status
  - Render automation action and elapsed time in the timers pane

## [2026-02-11 12:40] - Fix fight loop click target

### Changed
- File: `src/main.ts`
  - Preserve the selected tile before hiding the context menu when starting automation

## [2026-02-11 12:33] - Separate fight menu hover highlights

### Changed
- File: `index.html`
  - Added separate hover styling for the fight label and automation action slot

## [2026-02-11 12:27] - Widen fight loop hitbox

### Changed
- File: `index.html`
  - Added an action slot id so the whole segment is clickable
- File: `src/main.ts`
  - Start automation when clicking the action slot segment

## [2026-02-11 12:20] - Allow fight loop start during cooldown

### Changed
- File: `src/main.ts`
  - Only disable the fight menu when no character is loaded
  - Allow the loop icon to start automation even while on cooldown

## [2026-02-11 12:12] - Add action slot for fight loop icon

### Changed
- File: `index.html`
  - Added fixed right-side action segment with divider for the fight loop icon
  - Updated context menu item layout to support consistent action slots

## [2026-02-11 12:05] - Add fight automation loop

### Changed
- File: `index.html`
  - Added fight loop icon button in the context menu
  - Added stop button next to Rest in the timers pane
- File: `src/main.ts`
  - Added fight automation loop that moves, fights, rests until stopped
  - Added start/stop handlers and automation status updates

## [2026-02-11 11:45] - Widen monster badges further

### Changed
- File: `index.html`
  - Increased monster badge width to 58% (max 68px)

## [2026-02-11 11:42] - Widen monster badges more

### Changed
- File: `index.html`
  - Increased monster badge width to 46% (max 52px)

## [2026-02-11 11:38] - Widen monster badges again

### Changed
- File: `index.html`
  - Increased monster badge width to better fit level text

## [2026-02-11 11:34] - Widen monster badges

### Changed
- File: `index.html`
  - Increased monster badge width to fit up to three characters

## [2026-02-11 11:30] - Add monster level to tile badge

### Changed
- File: `src/main.ts`
  - Fetch monster levels for tile badges with caching and de-duplication
- File: `index.html`
  - Adjusted monster badge font size to fit level text

## [2026-02-11 11:24] - Show monster icon on tiles

### Changed
- File: `index.html`
  - Added styling for a small monster icon badge on tiles
- File: `src/main.ts`
  - Render a monster icon in the top-left corner of monster tiles

## [2026-02-11 11:18] - Show monster stats in map info

### Changed
- File: `src/api.ts`
  - Added monster types and `getMonster()` API method
- File: `src/main.ts`
  - Fetch monster details for monster tiles and display them in a collapsible section
  - Added monster caching and request de-duplication

## [2026-02-11 11:05] - Auto-fight after move cooldown

### Changed
- File: `src/main.ts`
  - Schedule the fight automatically after moving and cooldown expiration
  - Added shared fight execution helper and pending timeout tracking

## [2026-02-11 10:58] - Add rest action to timers pane

### Changed
- File: `index.html`
  - Added a Rest button to the timers pane
  - Updated timers pane layout to align controls
- File: `src/api.ts`
  - Added rest response types and `restCharacter()` API method
- File: `src/main.ts`
  - Added rest action handler and cooldown/HP checks
  - Disabled Rest button when on cooldown or at full HP

## [2026-02-11 10:40] - Add fight status panel with logs

### Changed
- File: `index.html`
  - Added Fight Status panel and styles for fight summaries and logs
- File: `src/main.ts`
  - Render fight status during move and fight actions
  - Show fight summary details and logs after combat

## [2026-02-11 10:22] - Gate fight menu and auto-move before fight

### Changed
- File: `src/main.ts`
  - Hide fight option when no monster is present on the tile
  - Auto-move to the target tile before attempting the fight
  - Inform the user when movement cooldown prevents immediate fighting

## [2026-02-11 10:15] - Add fight action from map tiles

### Changed
- File: `src/api.ts`
  - Added fight response types and `fightCharacter()` API method
- File: `src/main.ts`
  - Added monster tile checks and fight action handler
  - Added context menu enable/disable logic for fighting
- File: `index.html`
  - Added "Fight Monster" item to the tile context menu
- File: `GAME_KNOWLEDGE.md`
  - Documented fight action request shape and tile requirement

## [2026-02-10 16:24] - Refresh status when cooldown expires

### Changed
- File: `src/main.ts`
  - Track cooldown state changes during timer updates
  - Refresh character info when cooldown flips to ready

## [2026-02-10 16:21] - Add timers pane with pie-style cooldown timer

### Added
- File: `index.html`
  - Added timers pane section above map-view-wrapper
  - Added timersContainer div for rendering timers
  - Added comprehensive CSS for timers pane styling
  - Added CSS for pie-style timer visualization using conic-gradient
  - Added timer states: active (red border), ready (green border)
  - Added timer-pie, timer-pie-inner, timer-info, timer-label, and timer-value styles

- File: `src/main.ts`
  - Added timersContainer DOM element reference
  - Added timerUpdateInterval variable for tracking update interval
  - Added getCooldownProgress() function to calculate 0-1 progress for pie chart
  - Added updateTimers() function to render cooldown timer with pie chart
  - Added startTimerUpdates() function to begin timer interval (updates every 100ms)
  - Added stopTimerUpdates() function to clear timer interval
  - Called startTimerUpdates() in loadMapAndCharacter() after loading character
  - Called updateTimers() in handleMoveAction() after character moves

### Notes
- Pie-style timer uses conic-gradient to create animated countdown visualization
- Timer updates 10 times per second for smooth animation
- Shows remaining seconds when on cooldown, checkmark when ready
- Timer displays "Ready" status in green when no cooldown
- Timer displays remaining seconds in red when on cooldown
- First timer implemented is cooldown timer; more timers can be added later

## [2026-02-10 10:10] - Fix cooldown logic to check expiration time

### Changed
- File: `src/api.ts`
  - Added `cooldown_expiration: string` field to Character interface
  
- File: `src/main.ts`
  - Added `isOnCooldown()` helper function that checks if cooldown_expiration is in the future
  - Added `getRemainingCooldown()` helper function that calculates remaining seconds
  - Updated all cooldown checks to use these helper functions instead of checking `character.cooldown > 0`
  - Fixed context menu disable logic
  - Fixed move action validation
  - Fixed character info display of cooldown badge
  
### Notes
- Previous logic incorrectly used `cooldown` field (total duration) instead of checking expiration time
- Now properly compares `cooldown_expiration` timestamp against current time
- Remaining cooldown is calculated dynamically from expiration time
- Character will no longer appear on cooldown after expiration time has passed

## [2026-02-10 10:05] - Rename Selected Cell Info to Selected Map Tile Info

### Changed
- File: `index.html`
  - Changed heading from "Selected Cell Info" to "Selected Map Tile Info"
  - Updated placeholder text from "Click on a map cell" to "Click on a map tile"

## [2026-02-10 10:00] - Move character info to right column

### Changed
- File: `index.html`
  - Moved character info panel into right column alongside cell info
  - Added `.panel-section` class for separating sections in right column
  - Updated `.cell-info-panel` to use flexbox column layout with vertical scrolling
  - Added `max-height` to both map container and info panel (calc(100vh - 180px))
  - Removed redundant `.info-panel` background/padding styles
  - Removed unused `.info-panel h2` and `.info-panel pre` CSS rules
  - Added border separator between panel sections
  
### Notes
- Character info and cell info now both appear in the right column
- Both columns have matching max-height to fit on one screen
- Right column scrolls vertically if content overflows
- Visual separator between the two info sections
- Entire layout now fits on one screen without scrolling the page

## [2026-02-10 09:55] - Fix collapsible sections in character info

### Changed
- File: `src/main.ts`
  - Removed `setupCollapsibleSections()` function
  - Replaced direct event listeners with event delegation
  - Added single document-level click handler for all `.info-section-header` elements
  - Removed calls to `setupCollapsibleSections()` from `showCellInfo()` and `updateCharacterInfo()`
  
### Notes
- Fixes bug where character info sections wouldn't open after clicking a map tile
- Event delegation approach prevents duplicate/conflicting event listeners
- Single listener handles all collapsible sections dynamically

## [2026-02-10 09:50] - Improve info views with collapsible tree structure

### Changed
- File: `index.html`
  - Added extensive CSS styling for tree view components
  - Added styles for collapsible sections with arrow indicators
  - Added progress bar styling for XP and task progress
  - Added cooldown badge styling
  - Changed cellInfo and characterInfo from `<pre>` to `<div>` tags
  
- File: `src/main.ts`
  - Completely rewrote `showCellInfo()` to render structured tree view
  - Completely rewrote `updateCharacterInfo()` to render structured tree view
  - Added `setupCollapsibleSections()` helper function
  - Changed element types from HTMLPreElement to HTMLDivElement
  
### Map Tile Info Structure
**Always Visible:**
- Name, Position (x, y), Layer

**Collapsible Sections:**
- Interactions (content type/code, transition details)
- Details (map_id, skin)

### Character Info Structure
**Always Visible:**
- Name, Level, XP (with progress bar), Gold, HP, Cooldown status, Current task (with progress)

**Collapsible Sections:**
- Combat Stats (attack, elemental stats, haste, crit)
- Skills (8 skills with levels and XP percentages)
- Equipment (12 equipment slots)
- Inventory (items with quantities)

### Notes
- Tree view has 2 levels maximum (section -> items)
- Progress bars for XP and task completion
- Cooldown displayed as red badge when active
- Click section headers to expand/collapse
- Sections remember their state during the session
- Much cleaner and more readable than raw JSON

## [2026-02-10 09:45] - Move configuration pane to bottom of page

### Changed
- File: `index.html`
  - Moved `.controls` div from top of page to bottom, after character info panel
  - Changed `.controls` CSS margin from `margin-bottom: 20px` to `margin-top: 20px`
  
### Notes
- Configuration section now appears at the bottom of the page for cleaner layout
- All map and character info is visible first
- Configuration still auto-collapses after successful load

## [2026-02-10 09:40] - Add right-click movement functionality

### Added
- File: `index.html`
  - Added context menu CSS styling with hover effects
  - Context menu shows "Move Here" option with disabled state support
  - Context menu HTML already existed, added styling
  
- File: `src/api.ts`
  - Added MovementData and MovementResponse interfaces
  - Added `moveCharacter()` method to call `/my/{name}/action/move` endpoint
  
- File: `src/main.ts`
  - Added context menu DOM references and target tracking
  - Added `showContextMenu()` and `hideContextMenu()` functions
  - Added `handleMoveAction()` async function to execute movement
  - Added contextmenu event listener to tiles (right-click)
  - Added move menu item click handler
  - Added document click handler to close context menu
  - Move button disabled when character is on cooldown
  
### Notes
- Right-click any tile to see "Move Here" option
- Move option is disabled/grayed out when character is on cooldown
- After successful move, map re-renders with updated character position
- Error messages displayed for cooldown violations or invalid moves
- Context menu closes automatically after action or when clicking outside

## [2026-02-10 09:30] - Add tile hover modal with interaction details

### Changed
- File: `src/api.ts`
  - Updated MapTile interface to include full interactions schema
  - Added InteractionSchema, MapContentSchema, and TransitionSchema interfaces
  - Now includes map_id in MapTile
  
- File: `index.html`
  - Changed hover effect from border to outline for better visibility
  - Added tile-modal styles for floating modal display
  - Added modal HTML structure with title, coordinates, and interactions sections
  
- File: `src/main.ts`
  - Added showTileModal() and hideTileModal() functions
  - Added mouseenter, mousemove, and mouseleave event listeners to tiles
  - Modal displays tile name, coordinates, and all available interactions
  - Shows content interactions (monster, resource, workshop, bank, etc.)
  - Shows transition interactions (portals to other map locations)
  
### Notes
- Tile modal follows cursor on hover
- Displays all interactions from the API's InteractionSchema
- Modal auto-hides when mouse leaves tile
- Replaces simple title attribute with rich interaction display

## [2026-02-10 09:25] - Remove gaps and fill width with map tiles

### Changed
- File: `index.html`
  - Changed `.map-grid` gap from 2px to 0
  - Removed padding and background from `.map-grid`
  - Changed map-grid to `display: grid` with `width: 100%`
  - Removed borders from `.map-cell`
  - Changed cell sizing to use `aspect-ratio: 1` instead of fixed width/height
  
- File: `src/main.ts`
  - Changed grid template from `repeat(${width}, 40px)` to `repeat(${width}, 1fr)`
  - Tiles now dynamically size to fill container width while maintaining square aspect ratio
  
### Notes
- Map tiles now have no gaps between them
- Map grid fills the full width of the container
- Tiles scale dynamically while maintaining square shape

## [2026-02-10 09:20] - Move cell details to side panel

### Changed
- File: `index.html`
  - Created two-column layout with map on left and cell details on right
  - Added `map-view-wrapper` flex container
  - Cell info panel now has fixed 400px width next to the map
  - Character info remains below the map view
  - Cell info panel has max-height of 600px with scroll
  
### Notes
- Improves visibility of tile details while browsing the map
- No need to scroll down to see selected cell information

## [2026-02-10 09:15] - Auto-load map when config is saved

### Changed
- File: `src/main.ts`
  - Automatically calls `loadMapAndCharacter()` on page load if saved config exists
  - Users no longer need to click "Load Map & Character" when returning to the page
  
### Notes
- If config is already saved, page loads map and character data immediately
- Improves UX by eliminating extra click for returning users

## [2026-02-10 09:00] - Made configuration section collapsible

### Changed
- File: `index.html`
  - Wrapped API token and character name inputs in a `<details>` element for collapsible functionality
  - Added CSS styling for collapsible section with arrow indicator
  - Section header displays "Configuration" with expand/collapse arrow
  
- File: `src/main.ts`
  - Added reference to configSection element
  - Auto-collapses config section when config is already saved on page load
  - Auto-collapses config section after user saves config
  
### Notes
- Config section starts open if no saved config exists, closed if config is already saved
- Uses native HTML `<details>` element for clean, accessible collapse/expand
- Section automatically collapses after "Save Config" is clicked

## [2026-02-10] - Fixed map layer filtering

### Changed
- File: `src/api.ts`
  - Added `layer` property to MapTile interface
  - Renamed `getAllMaps()` to `getMapsByLayer(layer: string)`
  - Updated to use `/maps/{layer}` endpoint for layer-specific map data

- File: `src/main.ts`
  - Changed loading order: fetch character first, then maps for character's layer
  - Now displays only maps for the same layer as the character

### Notes
- Character has a `layer` property (interior, overworld, underground)
- Maps are now filtered by layer so only relevant tiles are shown
- Fixes issue where wrong layer maps were being displayed

## [2026-02-09] - Corrected map tile image URL path

### Changed
- File: `src/main.ts`
  - Fixed image URL from `/images/tiles/` to `/images/maps/`
  - Correct URL format: `https://artifactsmmo.com/images/maps/{skin}.png`

## [2026-02-09] - Fixed map tile rendering to use images

### Changed
- File: `src/main.ts`
  - Updated renderMap() to create img elements for tile skins
  - Construct image URLs from skin identifiers: `https://artifactsmmo.com/images/tiles/{skin}.png`
  - Added fallback text display if image fails to load
  - Player icon now overlays as absolute positioned div

- File: `index.html`
  - Added overflow: hidden to .map-cell for proper image containment
  - Added image-rendering css for crisp pixel art display

### Notes
- API returns skin as string identifier, not URL
- Images are fetched from game's CDN based on skin value
- Player position shown as overlay to not hide tile underneath

## [2026-02-09] - Project initialized with map viewer SPA

### Added
- File: `package.json`
  - Initialized Node.js project with npm
  - Added dependencies: TypeScript, Vite, axios, @types/node
  - Added scripts: dev, build, preview

- File: `tsconfig.json`
  - Created TypeScript configuration for ES2022 with DOM support
  - Configured for bundler module resolution (Vite)

- File: `index.html`
  - Created SPA entry point with dark theme UI
  - Includes map grid display with player position
  - Character info panel and cell details panel
  - Config persistence with localStorage

- File: `src/config.ts`
  - Created config management for API token and character name
  - Uses localStorage for persistence

- File: `src/api.ts`
  - Created ArtifactsAPI client class
  - Implements getAllMaps() with pagination
  - Implements getCharacter() for fetching character data
  - Uses axios with Bearer token authentication

- File: `src/main.ts`
  - Main application logic for map viewer
  - Renders map grid with character position highlighted
  - Handles user input and API loading
  - Shows cell details on click

### Notes
- Map viewer displays entire game map as a grid
- Character position is highlighted with animated icon
- Config saved to localStorage for convenience
- Built with Vite for fast development
