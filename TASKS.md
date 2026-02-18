# AI Agent Player Client - Tasks

Implementation roadmap for autonomous AI agent client based on SPEC.md.

## Phase 1: Script Executor Foundation 🔄

### 1.1 DSL Parser
- [ ] Define script AST (Abstract Syntax Tree) types
- [ ] Implement tokenizer/lexer
- [ ] Implement parser (commands, control flow, conditions)
- [ ] Add variable substitution support
- [ ] Write parser tests with sample scripts

### 1.2 Command Executor
- [ ] Create execution context (state, variables, line tracking)
- [ ] Implement navigation commands (goto)
- [ ] Implement gathering commands (gather, woodcut, mine, fish)
- [ ] Implement combat commands (fight)
- [ ] Implement banking commands (deposit, withdraw)
- [ ] Implement crafting commands (craft)
- [ ] Implement equipment commands (equip, unequip)
- [ ] Implement NPC trading commands (npc buy, npc sell)
- [ ] Implement task commands (task new, task complete, task cancel, task exchange, task trade)
- [ ] Implement consumable commands (use)
- [ ] Implement transition command (transition)
- [ ] Implement utility commands (rest, wait_cooldown, log)

### 1.3 Control Flow
- [ ] Implement if/else conditionals
- [ ] Implement loop constructs (count, until, while, forever)
- [ ] Add loop iteration limits (prevent infinite loops)
- [ ] Implement condition evaluator (inventory_full, skill_level, etc.)
- [ ] Add variable support (set, get, interpolation)

### 1.4 Persistence Layer
- [ ] Design execution state schema
- [ ] Implement save state to JSON
- [ ] Implement load state from JSON
- [ ] Add atomic write (temp + rename)
- [ ] Keep last 3 state snapshots
- [ ] Add auto-save after each action
- [ ] Test crash recovery

### 1.5 Error Handling & Safety
- [ ] Add retry logic for API failures (exponential backoff)
- [ ] Implement cooldown auto-wait
- [ ] Add stuck detection (no progress after N actions)
- [ ] Implement max execution time limits
- [ ] Add graceful shutdown on errors

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

## Phase 3: Human Steering 🤝

### 3.1 Control Modes
- [ ] Implement autonomous mode (agent only)
- [ ] Implement collaborative mode (shared control)
- [ ] Implement manual mode (human only)

### 3.2 Takeover Mechanism
- [ ] Implement human_takeover() - pause script
- [ ] Implement human_release() - resume script
- [ ] Implement human_action() - single command execution
- [ ] Implement human_inject() - insert command into script

### 3.3 State Synchronization
- [ ] Log human actions to execution history
- [ ] Update agent context after human release
- [ ] Add "human intervention" notes to check-ins

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

## Current Sprint (Week 1)

**Goal:** Complete Phase 1.1-1.3 (Parser + Basic Executor)

- [ ] Set up project structure for script engine
- [ ] Define script AST types
- [ ] Implement basic parser
- [ ] Implement basic command execution
- [ ] Test with manual scripts (woodcutting loop)

## Backlog Ideas

- Web UI for monitoring agent progress
- Discord bot for notifications
- Multi-character coordination (future)
- Machine learning for strategy optimization
- Simulation mode (dry-run scripts)

## Completed ✅

_No items yet_

---

**Last Updated:** 2026-02-19
**Current Focus:** Script Executor Foundation
