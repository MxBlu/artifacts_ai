# AI Agent Player Client - Tasks

Implementation roadmap for autonomous AI agent client based on SPEC.md.

## Phase 1: Script Executor Foundation ✅

### 1.1 DSL Parser
- [x] Define script AST (Abstract Syntax Tree) types
- [x] Implement tokenizer/lexer
- [x] Implement parser (commands, control flow, conditions)
- [x] Add variable substitution support
- [x] Write parser tests with sample scripts

### 1.2 Command Executor
- [x] Create execution context (state, variables, line tracking)
- [x] Implement navigation commands (goto)
- [x] Implement gathering commands (gather, woodcut, mine, fish)
- [x] Implement combat commands (fight)
- [x] Implement banking commands (deposit, withdraw)
- [x] Implement crafting commands (craft)
- [x] Implement equipment commands (equip, unequip)
- [x] Implement NPC trading commands (npc buy, npc sell)
- [x] Implement task commands (task new, task complete, task cancel, task exchange, task trade)
- [x] Implement consumable commands (use)
- [x] Implement transition command (transition)
- [x] Implement utility commands (rest, wait_cooldown, log)
  - Note: `rest` calls the REST endpoint for HP recovery; `sleep <seconds>` is the timed wait command

### 1.3 Control Flow
- [x] Implement if/else conditionals
- [x] Implement loop constructs (count, until, while, forever)
- [x] Add loop iteration limits (prevent infinite loops)
- [x] Implement condition evaluator (inventory_full, skill_level, etc.)
- [x] Add variable support (set, get, interpolation)

### 1.4 Persistence Layer
- [x] Design execution state schema
- [x] Implement save state to JSON
- [x] Implement load state from JSON
- [x] Add atomic write (temp + rename)
- [x] Keep last 3 state snapshots
- [x] Add auto-save after each action
- [x] Test crash recovery

### 1.5 Error Handling & Safety
- [x] Add retry logic for API failures (exponential backoff)
- [x] Implement cooldown auto-wait
- [x] Add stuck detection (no progress after N actions)
- [x] Implement max execution time limits
- [x] Add graceful shutdown on errors

## Phase 2: Agent Integration ✅

### 2.1 Information Tools
- [x] Implement get_game_state() tool
- [x] Implement get_execution_status() tool
- [x] Implement query_game_knowledge() (semantic search over GAME_KNOWLEDGE.md)
- [x] Implement lookup_item() tool
- [x] Implement lookup_monster() tool
- [x] Implement lookup_resource() tool
- [x] Implement find_location() tool
- [x] Implement get_market_prices() tool

### 2.2 Action Tools
- [x] Implement generate_script() tool (bootstrap.ts)
- [x] Implement start_script() tool (agent.ts)
- [x] Implement pause_script() tool (executor.stop())
- [x] Implement resume_script() tool (index.ts resume command)
- [x] Implement stop_script() tool (executor.stop())

### 2.3 Check-in System
- [x] Implement 10-minute timer
- [x] Create check-in prompt template
- [x] Parse agent responses (CONTINUE/MODIFY/STOP)
- [x] Handle script modifications
- [x] Log check-in history

### 2.4 Bootstrap System
- [x] Create initial agent prompt with game knowledge
- [x] Include DSL documentation in prompt
- [x] Add level 50 aspirational goal
- [x] Test initial agent script generation

## Phase 3: Web Interface ✅

### 3.1 Backend - WebSocket Server
- [x] Set up Node.js WebSocket server (ws library)
- [x] Define WebSocket message protocol (agent_log, execution_log, state_update, stats_update, script_update, error, hello)
- [x] Implement connection handling
- [x] Broadcast state updates to all clients
- [x] Handle client commands (agent_start, agent_stop, steer, script_run, get_state)
- [ ] Implement message queuing for reliability

### 3.2 Frontend - Core UI
- [x] Create HTML structure (4-panel grid layout)
- [x] Implement dark theme CSS (terminal aesthetic)
- [x] Set up WebSocket client connection
- [x] Handle reconnection on disconnect
- [x] Add auto-scroll for log panels

### 3.3 Agent Log Panel
- [x] Display AI agent responses in real-time
- [x] Show timestamps for each entry
- [x] Color-code message types (agent=purple, human=yellow, error=red, system=grey)
- [x] Add filtering options (toggle buttons: agent/human/sys/err)
- [x] Implement log size limit (keep last 500 entries)

### 3.4 Execution Log Panel
- [x] Display executed actions in real-time
- [x] Show command, result, and cooldown
- [x] Color-code human vs agent actions
- [ ] Add action icons (move, fight, gather, etc.)
- [x] Implement search/filter (live text filter input in panel header)

### 3.5 Stats Dashboard
- [x] Display current character state
- [x] Show skill XP gained with progress bars
- [x] Calculate and display XP/hr per skill
- [x] Calculate and display gold/hr
- [x] Show session statistics (runtime, actions, gold earned)
- [x] Level-up notifications (toast/flash in UI)
- [ ] Implement stats history graph (optional)

### 3.6 Script Viewer
- [x] Display current script with line numbers
- [x] Highlight current execution line
- [x] Show loop depth with indentation
- [x] Syntax highlighting for commands (keywords, numbers, strings, comments)
- [ ] Add expand/collapse for large scripts

### 3.7 Human Steering Input
- [x] Create text input field
- [x] Implement send button and Enter key handling
- [x] Show agent acknowledgment of input (echoed to agent log)
- [x] Display steering history (arrow-up/down recall, last 50 commands)
- [x] Add quick action buttons (Start, Resume, Stop)

### 3.8 Manual Play Mode
- [x] Implement "Take Control" button (header)
- [x] Quick action buttons (Fight, Gather, Rest, Move, Bank Deposit, Withdraw Gold)
- [x] Free-form DSL command input
- [x] Character snapshot refresh after each manual action
- [x] Implement "Release Control" to return to agent mode
- [x] Log human actions with special marking (`[MANUAL]` prefix)

### 3.9 Testing & Polish
- [ ] Test real-time updates under load
- [ ] Test reconnection scenarios
- [ ] Mobile responsive layout (optional)
- [x] Add keyboard shortcuts (S=Start, R=Resume, Esc=Stop, T=Take Control, /=focus search)
- [ ] Performance optimization (virtualized logs)

## Phase 4: Optimization & Polish ⚡

### 4.1 Path Finding
- [x] Dynamic location lookup via cache (nearestTile) — replaces A* since API moves directly
- [x] Fixed LOCATION_ALIASES with correct coordinates

### 4.2 Resource Caching
- [x] Cache item database (`state/cache/items.json`, 6h TTL)
- [x] Cache monster database (`state/cache/monsters.json`)
- [x] Cache resource locations (`state/cache/resources.json`)
- [x] Cache map tiles (`state/cache/map_overworld.json`)

### 4.3 Metrics & Monitoring
- [x] Track actions executed
- [x] Track XP gains per skill (correct skill keys: woodcutting/mining/fishing/alchemy/combat/craft skills)
- [x] Track gold earned
- [x] Track items gathered
- [x] Calculate XP/hr per skill (server-side, broadcast in stats_update)
- [x] Calculate gold/hr
- [x] Live character snapshot on WS connect (skill levels, raw XP for progress bars)
- [x] Skills dashboard: shows Lv, session XP gained, XP/hr, within-level progress bar
- [x] Level-up notifications (toast/flash in UI)
- [ ] Stats history graph (optional)

### 4.4 Strategy Learning
- [x] Log successful strategies to `state/strategies.json`
- [x] Include strategy history in check-in context so agent learns from past decisions
- [x] Track: script, reasoning, duration, XP gained, gold gained, outcome

## Phase 5: Advanced Features 🚀

### 5.1 Complex Crafting
- [x] Add `craft_chain(item_code, qty)` tool — resolves full ingredient tree (2 hops deep), returns raw materials needed
- [x] Add `get_craftable_items(inventory, skillLevels)` tool — given stock + skill levels, list what can be crafted right now
- [x] Update `bootstrap.ts` `KNOWN_LOCATIONS` with level 5+ recipes, ash_plank, woodcutting workshop coords
- [x] Update bootstrap system prompt to mention crafting chains and item tasks

### 5.2 Quest Support
- [x] Add `get_available_tasks(characterLevel, skillLevels)` tool — fetches /tasks/list, filters by character readiness
- [x] Add task loop DSL example to `KNOWN_LOCATIONS` in bootstrap.ts
- [x] Update bootstrap prompt: task integration guidance, item vs monster task masters, tasks_coin exchange
  - [x] Add tasks_coin exchange tracking to stats dashboard

### 5.3 Death Recovery
- [x] Detect death events (fight.result === 'loss')
- [x] Return to safe location (bank at 4,1)
- [x] Re-equip from bank (withdraw + equip any gear lost on death)
- [x] Resume interrupted task (recovery is inline — script continues after)

## Current Sprint

**Goal:** Phase 5 — Advanced Features

- [x] Death recovery: auto re-equip from bank after death, resume script inline
- [x] Strategy learning: log strategies to `state/strategies.json`, include in check-in context
  - [x] GE command: implement grand exchange buy/sell in executor

## Backlog Ideas

- Discord bot for notifications
- Multi-character coordination (future)
- Machine learning for strategy optimization
- Simulation mode (dry-run scripts)

## Completed ✅

- Phase 1: Script Executor Foundation (parser, executor, persistence, error handling)
- Phase 2: Agent Integration (tools, check-in, bootstrap, agent loop, CLI)
- Phase 3: Web Interface (WebSocket server, 4-panel dashboard, steering, script viewer, stats)

---

**Last Updated:** 2026-02-19
**Current Focus:** Phase 4 - Optimization & Polish
