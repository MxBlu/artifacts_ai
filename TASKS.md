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

## Phase 2: Agent Integration 🎯

### 2.1 Information Tools
- [ ] Implement get_game_state() tool
- [ ] Implement get_execution_status() tool
- [ ] Implement query_game_knowledge() (semantic search over GAME_KNOWLEDGE.md)
- [ ] Implement lookup_item() tool
- [ ] Implement lookup_monster() tool
- [ ] Implement lookup_resource() tool
- [ ] Implement find_location() tool
- [ ] Implement get_market_prices() tool

### 2.2 Action Tools
- [ ] Implement generate_script() tool
- [ ] Implement start_script() tool
- [ ] Implement pause_script() tool
- [ ] Implement resume_script() tool
- [ ] Implement stop_script() tool

### 2.3 Check-in System
- [ ] Implement 10-minute timer
- [ ] Create check-in prompt template
- [ ] Parse agent responses (CONTINUE/MODIFY/STOP)
- [ ] Handle script modifications
- [ ] Log check-in history

### 2.4 Bootstrap System
- [ ] Create initial agent prompt with game knowledge
- [ ] Include DSL documentation in prompt
- [ ] Add level 50 aspirational goal
- [ ] Test initial agent script generation

## Phase 3: Web Interface 🌐

### 3.1 Backend - WebSocket Server
- [ ] Set up Node.js WebSocket server (ws library)
- [ ] Define WebSocket message protocol
- [ ] Implement connection handling
- [ ] Broadcast state updates to all clients
- [ ] Handle client commands (pause, resume, stop, steering)
- [ ] Implement message queuing for reliability

### 3.2 Frontend - Core UI
- [ ] Create HTML structure (split panes layout)
- [ ] Implement dark theme CSS (terminal aesthetic)
- [ ] Set up WebSocket client connection
- [ ] Handle reconnection on disconnect
- [ ] Add auto-scroll for log panels

### 3.3 Agent Log Panel
- [ ] Display AI agent responses in real-time
- [ ] Show timestamps for each entry
- [ ] Color-code message types (thinking, decision, error)
- [ ] Add filtering options (show/hide types)
- [ ] Implement log size limit (keep last N entries)

### 3.4 Execution Log Panel
- [ ] Display executed actions in real-time
- [ ] Show command, result, and cooldown
- [ ] Color-code human vs agent actions
- [ ] Add action icons (move, fight, gather, etc.)
- [ ] Implement search/filter

### 3.5 Stats Dashboard
- [ ] Display current character state
- [ ] Show skill levels with progress bars
- [ ] Calculate and display XP/hr per skill
- [ ] Calculate and display gold/hr
- [ ] Show session statistics (runtime, actions, gold earned)
- [ ] Add level-up notifications (toast/flash)
- [ ] Implement stats history graph (optional)

### 3.6 Script Viewer
- [ ] Display current script with line numbers
- [ ] Highlight current execution line
- [ ] Show loop depth with indentation
- [ ] Syntax highlighting for commands
- [ ] Add expand/collapse for large scripts

### 3.7 Human Steering Input
- [ ] Create text input field
- [ ] Implement send button and Enter key handling
- [ ] Show agent acknowledgment of input
- [ ] Display steering history (past commands)
- [ ] Add quick action buttons (pause, resume, emergency stop)

### 3.8 Manual Play Mode
- [ ] Implement "Take Control" button
- [ ] Create action button panel (Move, Fight, Gather, etc.)
- [ ] Add grid-based map view for navigation
- [ ] Show available actions at current tile
- [ ] Implement "Release Control" to return to agent
- [ ] Log human actions with special marking

### 3.9 Testing & Polish
- [ ] Test real-time updates under load
- [ ] Test reconnection scenarios
- [ ] Mobile responsive layout (optional)
- [ ] Add keyboard shortcuts
- [ ] Performance optimization (virtualized logs)

## Phase 4: Optimization & Polish ⚡

### 4.1 Path Finding
- [ ] Implement A* pathfinding algorithm
- [ ] Cache map data for navigation
- [ ] Optimize multi-tile movement

### 4.2 Resource Caching
- [ ] Cache item database
- [ ] Cache monster database
- [ ] Cache resource locations
- [ ] Cache map tiles

### 4.3 Metrics & Monitoring
- [ ] Track actions executed
- [ ] Track XP gains per skill
- [ ] Track gold earned/spent
- [ ] Track items gathered
- [ ] Calculate efficiency metrics (XP/hour, gold/hour)
- [ ] Add progress visualization

### 4.4 Strategy Learning
- [ ] Log successful strategies
- [ ] Analyze execution history for patterns
- [ ] Provide strategy recommendations to agent

## Phase 5: Advanced Features 🚀

### 5.1 Complex Crafting
- [ ] Analyze crafting chains (dependencies)
- [ ] Optimize material gathering order
- [ ] Calculate crafting profitability

### 5.2 Quest Support
- [ ] Add quest tracking
- [ ] Generate quest completion scripts
- [ ] Handle quest rewards

### 5.3 Death Recovery
- [ ] Detect death events
- [ ] Return to safe location
- [ ] Re-equip from bank
- [ ] Resume interrupted task

## Current Sprint (Week 2)

**Goal:** Complete Phase 2 (Agent Integration) + Phase 3 (Web Interface)

- [ ] Implement agent tools (get_game_state, lookup_*, etc.)
- [ ] Build check-in system (10-minute timer + prompt)
- [ ] Create bootstrap prompt with level 50 goal
- [ ] Set up WebSocket server
- [ ] Build web dashboard (logs, stats, script viewer, steering)

## Backlog Ideas

- Discord bot for notifications
- Multi-character coordination (future)
- Machine learning for strategy optimization
- Simulation mode (dry-run scripts)

## Completed ✅

- Phase 1: Script Executor Foundation (parser, executor, persistence, error handling)
  - DSL parser with full AST, tokenizer, all commands, conditions, control flow
  - ScriptExecutor class with live API integration
  - Atomic persistence with snapshot rotation
  - Retry logic, cooldown handling, stuck detection
  - CLI entry point: run, resume, status, stop
  - Smoke tested against live API (greenglasses character)

---

**Last Updated:** 2026-02-19
**Current Focus:** Phase 2 - Agent Integration
