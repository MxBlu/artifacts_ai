# AI Agent Player Client Specification

## Overview

An autonomous MMO game client where an AI agent generates and executes scripts to achieve goals. The system reduces agent runtime costs by having the agent generate scripts that run independently, with periodic check-ins for monitoring and adjustments.

## Architecture Components

### 1. Script Language

A simple domain-specific language (DSL) for game actions.

#### Commands

**Navigation:**
- `goto <x> <y>` - Move to coordinates
- `goto <location_name>` - Move to named location (bank, workshop, etc.)

**Resource Gathering:**
- `gather` - Gather from resource at current tile
- `woodcut` - Alias for gathering wood
- `mine` - Alias for mining
- `fish` - Alias for fishing

**Combat:**
- `fight` - Attack monster at current tile
- `fight <monster_code>` - Fight specific monster (navigate if needed)

**Inventory/Banking:**
- `bank deposit <item_code>` - Deposit specific item
- `bank deposit allitems` - Deposit all items
- `bank withdraw <item_code> <quantity>` - Withdraw items
- `equip <item_code>` - Equip item from inventory
- `unequip <slot>` - Unequip item to inventory
- `recycle <item_code>` - Recycle item at workshop

**Crafting:**
- `craft <item_code> [quantity]` - Craft item(s) at current location

**Grand Exchange:**
- `ge buy <item_code> <quantity> <max_price>` - Place buy order
- `ge sell <item_code> <quantity> <min_price>` - Place sell order
- `ge collect` - Collect completed orders

**NPC Trading:**
- `npc buy <item_code> <quantity>` - Buy from NPC at current tile
- `npc sell <item_code> <quantity>` - Sell to NPC at current tile

**Task Management:**
- `task new` - Accept new task from Tasks Master
- `task complete` - Complete current task
- `task cancel` - Cancel current task (costs 1 task coin)
- `task exchange` - Exchange 6 task coins for random reward
- `task trade <item_code> <quantity>` - Trade items with Tasks Master

**Consumables:**
- `use <item_code>` - Use consumable item (potion, food, teleport scroll)

**Transitions:**
- `transition` - Use portal/transition at current tile to change layers

**Utility:**
- `rest` - Call the rest API endpoint to restore HP (has a cooldown proportional to HP restored)
- `sleep <seconds>` - Wait for specified time (no API call)
- `wait_cooldown` - Wait until character cooldown is 0
- `log <message>` - Log message to execution log

#### Control Flow

**Loops:**
```
loop <count>:
  <commands>

loop until <condition>:
  <commands>

loop while <condition>:
  <commands>

loop forever:
  <commands>
```

**Conditionals:**
```
if <condition>:
  <commands>
else:
  <commands>
```

**Conditions:**
- `inventory_full` / `inventory_space > <n>`
- `has_item <item_code> [quantity]`
- `skill_level <skill> >= <level>`
- `hp < <value>` / `hp_percent < <value>`
- `gold > <value>`
- `at_location <x> <y>`
- `has_task` - Character has active task
- `task_progress_complete` - Current task requirements met
- `task_coins >= <value>` - Has enough task coins

**Variables:**
```
set <var_name> = <value>
set <var_name> = <expression>
```

#### Script Examples

**Example 1: Train woodcutting to level 5**
```
# Train woodcutting to level 5
set ash_tree_x = 2
set ash_tree_y = -1
set bank_x = 4
set bank_y = 1

goto {{bank_x}} {{bank_y}}
bank deposit allitems

goto {{ash_tree_x}} {{ash_tree_y}}

loop until woodcutting_level >= 5:
  woodcut
  wait_cooldown
  
  if inventory_full:
    goto {{bank_x}} {{bank_y}}
    bank deposit allitems
    goto {{ash_tree_x}} {{ash_tree_y}}

log "Woodcutting level 5 achieved!"
```

**Example 2: Complete task and buy gear**
```
# Accept and complete a task, then buy equipment
goto 5 1  # Tasks Master location
task new
wait_cooldown

goto 2 -1  # Go to resource location
loop until task_progress_complete:
  gather
  wait_cooldown
  if hp < 50:
    use life_potion

# Complete task
goto 5 1
task complete
wait_cooldown

# Buy equipment with rewards
goto 2 1  # NPC shop location
npc buy iron_sword 1
wait_cooldown
equip iron_sword

log "Task complete and equipped new weapon!"
```

**Example 3: Transition to new area**
```
# Travel to underground layer
goto 3 2  # Portal location
transition
wait_cooldown

# Explore and gather in new layer
goto 5 -3
loop 10:
  mine
  wait_cooldown

# Return to surface
goto 3 2
transition
wait_cooldown
```

### 2. Script Executor

**Responsibilities:**
- Parse script into executable commands
- Maintain execution state (current line, variables, call stack)
- Execute commands sequentially
- Handle cooldowns automatically
- Track execution metrics

**State:**
```typescript
interface ExecutionState {
  script: string;
  currentLine: number;
  variables: Record<string, any>;
  callStack: number[];
  startTime: number;
  lastAgentCheckIn: number;
  status: 'running' | 'paused' | 'stopped' | 'error';
  errorMessage?: string;
  executionLog: string[];
}
```

**Features:**
- Automatic cooldown waiting between actions
- Error recovery (retry failed API calls)
- Execution limits (max iterations per loop)
- Stack overflow prevention
- Stuck detection (no progress after N actions)

### 3. AI Agent Interface

The AI agent should have access to these capabilities via function calling:

#### Information Retrieval Tools

**get_game_state()**
Returns current character state:
```typescript
{
  name: string;
  level: number;
  xp: number;
  hp: number;
  max_hp: number;
  gold: number;
  position: { x: number; y: number };
  inventory: Array<{ code: string; quantity: number }>;
  inventory_slots: { used: number; max: number };
  cooldown: number;
  cooldown_expiration: string;
  skills: Record<string, { level: number; xp: number; max_xp: number }>;
  equipment: Record<string, string | null>;
}
```

**get_execution_status()**
Returns current script execution state:
```typescript
{
  isRunning: boolean;
  script: string;
  currentLine: number;
  currentTask: string; // Human-readable description of current action
  executionLog: string[]; // Last 20 log entries
  uptime: number; // seconds since script started
  actionCount: number; // total actions executed
  lastError?: string;
}
```

**query_game_knowledge(query: string)**
Semantic search over GAME_KNOWLEDGE.md for game mechanics, locations, items, etc.

**query_api_docs(endpoint: string)**
Get API documentation for specific endpoint.

**lookup_item(search: string)**
Search for items by name/code, returns item details.

**lookup_monster(search: string)**
Search for monsters, returns stats and drops.

**lookup_resource(search: string)**
Search for resource nodes, returns location and skill.

**find_location(search: string)**
Find coordinates for banks, workshops, content codes.

**get_market_prices(item_code: string)**
Get current Grand Exchange buy/sell prices.

#### Action Tools

**generate_script(goal: string, script: string)**
Agent generates or updates a script to achieve specified goal.

**start_script(script: string)**
Start executing the provided script.

**pause_script()**
Pause script execution.

**resume_script()**
Resume paused script.

**stop_script()**
Terminate script execution.

**insert_command(line: number, command: string)**
Insert command at specific line in running script.

### 4. Web Interface

A web-based dashboard for monitoring and steering the autonomous agent.

**Architecture:**
- **Backend:** WebSocket server for real-time updates
- **Frontend:** Single-page app (React/Vue/vanilla JS)
- **Port:** Local server on http://localhost:3000

**UI Components:**

**1. Agent Log Panel**
```
┌─ AI Agent Responses ────────────────────────┐
│ [10:23:45] Analyzing current state...       │
│ [10:23:47] Woodcutting level is 4/5         │
│ [10:23:47] Inventory: 15/20 slots           │
│ [10:23:48] CONTINUE - Script is efficient   │
│ [10:33:52] Check-in: Level 5 reached!       │
│ [10:33:53] MODIFY - Switching to mining     │
│ [10:33:55] Generated new script (15 lines)  │
└─────────────────────────────────────────────┘
```

**2. Execution Log Panel**
```
┌─ Action Log ────────────────────────────────┐
│ [10:30:12] goto 2 -1                        │
│ [10:30:18] woodcut (cooldown: 15s)          │
│ [10:30:33] woodcut (cooldown: 15s)          │
│ [10:30:48] woodcut (inventory full)         │
│ [10:30:48] goto 4 1                         │
│ [10:30:55] bank deposit allitems            │
│ [10:31:00] goto 2 -1                        │
└─────────────────────────────────────────────┘
```

**3. Stats Dashboard**
```
┌─ Character Stats ───────────────────────────┐
│ Name: Warrior123        Level: 15           │
│ HP: 85/100              Gold: 1,523         │
│ Position: (2, -1)       Cooldown: 12s       │
│                                              │
│ Skills (hover for XP/hr):                   │
│ ▓▓▓▓▓▓░░░░ Mining      Lv 5  (+120 XP/hr)  │
│ ▓▓▓▓▓░░░░░ Woodcutting Lv 5  (+0 XP/hr)    │
│ ▓▓▓░░░░░░░ Fishing     Lv 3  (+0 XP/hr)    │
│ ▓▓░░░░░░░░ Combat      Lv 2  (+0 XP/hr)    │
│                                              │
│ Session Stats:                               │
│ Runtime: 2h 15m                              │
│ Actions: 487                                 │
│ Gold Earned: +523                            │
│ Levels Gained: 2                             │
└─────────────────────────────────────────────┘
```

**4. Current Script View**
```
┌─ Active Script (Line 8/25) ─────────────────┐
│  5  goto 2 -1                               │
│  6  loop until mining_level >= 10:          │
│  7    mine                                   │
│→ 8    wait_cooldown                  ← HERE │
│  9    if inventory_full:                     │
│ 10      goto 4 1                             │
│ 11      bank deposit allitems                │
└─────────────────────────────────────────────┘
```

**5. Human Steering Input**
```
┌─ Steer Agent ───────────────────────────────┐
│ > Stop mining and go fight chickens         │
│                                     [Send]   │
│                                              │
│ Quick Actions:                               │
│ [Pause Script] [Resume] [Emergency Stop]    │
│ [Take Control] [Release Control]            │
└─────────────────────────────────────────────┘
```

**Real-time Metrics:**
```typescript
interface WebSocketMessage {
  type: 'agent_response' | 'action_executed' | 'stats_update' | 
        'script_update' | 'error' | 'check_in';
  timestamp: number;
  data: any;
}

// Stats update every action
{
  type: 'stats_update',
  data: {
    character: CharacterState;
    xpPerHour: Record<string, number>; // Per skill
    goldPerHour: number;
    actionsPerHour: number;
    sessionStats: {
      runtime: number;
      totalActions: number;
      goldEarned: number;
      levelsGained: number;
      xpGained: Record<string, number>;
    }
  }
}
```

**Human Interaction:**

**Text Commands:**
- Natural language input: "Go fight chickens until level 10"
- Agent interprets and generates new script
- Agent responds with plan before executing

**Quick Actions:**
- **Pause Script:** Stops execution, maintains state
- **Resume:** Continues from paused state
- **Emergency Stop:** Hard stop, saves state
- **Take Control:** Manual mode for human play
- **Release Control:** Return to autonomous mode

**State Synchronization:**
- WebSocket broadcasts state changes
- Human inputs queued and processed by agent
- Agent acknowledges instructions before acting
- Execution log shows human vs agent actions (different colors)

**Manual Play Mode:**
When user clicks "Take Control":
- Script execution pauses
- Character can be played manually via web UI
- Action buttons appear (Move, Fight, Gather, Bank, etc.)
- Grid-based map view for navigation
- Agent monitors and logs human actions
- Click "Release Control" to return to autonomous mode
- Agent receives context: "Human played for X minutes, performed Y actions"

**Use Cases:**
- **Steering:** Give agent new goals mid-execution
- **Raids/Dungeons:** Take control for complex mechanics
- **Trading:** Manual GE transactions or NPC negotiations  
- **Recovery:** Fix stuck states or errors
- **Learning:** Agent observes and adapts to human strategies

### 5. Persistence Layer

**State File (`execution_state.json`):**
```typescript
{
  script: string;
  currentLine: number;
  variables: Record<string, any>;
  callStack: number[];
  startTime: number;
  lastAgentCheckIn: number;
  status: 'running' | 'paused' | 'stopped' | 'error';
  errorMessage?: string;
  executionLog: string[];
  metrics: {
    actionsExecuted: number;
    xpGains: Record<string, number>;
    goldGained: number;
    itemsGathered: Record<string, number>;
  };
}
```

**Save Strategy:**
- Auto-save after every action
- Atomic writes (write to temp, then rename)
- Keep last 3 states for recovery
- Compress old logs (>1000 entries)

**Recovery:**
```typescript
// On startup
if (existsExecutionState()) {
  const state = loadExecutionState();
  if (state.status === 'running') {
    // Resume from last known good state
    resumeExecution(state);
  }
}
```

### 7. Agent Check-In System

**Trigger:** Every 10 minutes of real time (configurable)

**Agent Prompt:**
```
[SCRIPT EXECUTION CHECK-IN]

Current Script:
---
<script with line numbers>
---

Execution Status:
- Current Line: <line_number>
- Current Task: <task_description>
- Uptime: <duration>
- Actions Executed: <count>

Character State:
- Name: <name>
- Level: <level> (XP: <xp>/<max_xp>)
- HP: <hp>/<max_hp>
- Position: (<x>, <y>)
- Gold: <gold>
- Inventory: <used>/<max> slots
- Cooldown: <seconds>

Recent Logs:
<last 10 log entries>

Skills (only changed skills shown):
- <skill>: Level <level> (<xp>/<max_xp>)

Instructions:
Review the execution status. Respond with ONE of:
1. "CONTINUE" - Script is executing correctly
2. "MODIFY" - Provide updated script
3. "STOP" - Provide reason and next steps

Consider:
- Is progress being made toward the goal?
- Are resources being used efficiently?
- Should strategy change based on current state?
- Are there errors or stuck conditions?
```

**Agent Response Handling:**
- CONTINUE: Resume execution, set next check-in time
- MODIFY: Stop current script, start new script, reset check-in timer
- STOP: Halt execution, wait for new goal from agent or user

### 8. Bootstrap System

**Initial Agent Prompt:**

```markdown
You are an autonomous player for an MMO game called Artifacts MMO.

# Game Overview
<Include from GAME_KNOWLEDGE.md:>
- Game mechanics (skills, combat, gathering, crafting)
- Resource locations and types
- Monster locations and difficulties
- Crafting recipes and requirements
- Banking and inventory management
- Grand Exchange trading

# Available Skills
<List all skills and how to level them>

# Your Character
<Current character state>

# Tools Available
You have access to these tools:
- Information retrieval (query_game_knowledge, lookup_item, lookup_monster, etc.)
- Script generation (generate_script, start_script, pause_script, stop_script)
- Market data (get_market_prices)

# Script Language
<Full DSL documentation>

# Your Goal
Your aspirational goal is to reach level 50 in all skills and base level.

This is a long-term goal that will take many hours of gameplay. Break it down into achievable milestones:
1. Train basic combat and gathering skills to level 10
2. Accumulate resources and gold for better equipment
3. Gradually increase all skills toward level 30
4. Optimize for efficiency based on what you learn
5. Push toward level 50 across all skills

Choose your own path - there's no single correct strategy.

# How to Proceed
1. Review your character state
2. Query game knowledge to understand available resources
3. Generate a script to achieve short-term goals (e.g., train combat to level 5)
4. Start the script
5. Monitor progress during check-ins
6. Adapt strategy as needed

Generate your first script now.
```

### 9. Safety & Error Handling

**Execution Limits:**
- Max loop iterations: 10,000 (prevent infinite loops)
- Max script runtime: 24 hours (require agent re-approval)
- Max retry attempts: 3 per command
- Stuck detection: If no state change after 50 actions, pause and alert agent

**Error Recovery:**
- API errors: Retry with exponential backoff
- Cooldown errors: Automatically wait
- Invalid location errors: Alert agent in next check-in
- Death: Log event, return to safe location, alert agent

**Resource Safeguards:**
- Prevent depositing equipped items
- Prevent recycling quest items
- Warn if gold drops below 100
- Warn if inventory constantly full (may need larger bag)

### 10. Monitoring & Metrics

Track and report to agent:
- Total runtime
- Actions executed
- XP gained per skill
- Gold earned/spent
- Items gathered/crafted
- Monsters defeated
- Success rate per action type
- Average cooldown wait time

### 11. Implementation Phases

**Phase 1: Script Executor**
- Implement DSL parser
- Build command executor
- Handle cooldowns and basic errors
- Implement persistence layer (save/load state)
- Test with manual scripts

**Phase 2: Agent Integration**
- Implement agent tools (get_game_state, query_game_knowledge, etc.)
- Build check-in system
- Create bootstrap prompt with level 50 goal
- Test agent script generation

**Phase 3: Web Interface**
- Set up WebSocket server
- Create HTML/CSS/JS frontend
- Implement real-time log streaming (agent responses, actions)
- Build stats dashboard with XP/hr tracking
- Add current script viewer with line highlighting
- Implement human steering text input
- Add quick action buttons (pause, resume, stop)
- Build manual play mode (take control/release)
- Test real-time updates and commands

**Phase 4: Optimization**
- Path finding for efficient navigation
- Resource caching
- Performance tuning
- Metrics and progress tracking
- Strategy learning from execution history

**Phase 5: Advanced Features**
- Complex crafting chains analysis
- Adaptive strategies based on market
- Quest completion support
- Death recovery optimization

## Key Design Decisions

### Why Scripts Instead of Direct Agent Control?
- **Cost:** Agent inference is expensive; scripts run cheaply
- **Latency:** Actions need to execute immediately after cooldowns
- **Simplicity:** Scripts are easier to debug and validate
- **Control:** Agent can review and modify scripts before execution

### Why 10-Minute Check-ins?
- Balance between autonomy and oversight
- Most gathering/crafting loops take 30-60 minutes
- Allows course correction without excessive cost
- Configurable based on task complexity

### Why DSL Instead of JavaScript?
- **Safety:** No arbitrary code execution
- **Simplicity:** Easier for agent to generate correctly
- **Validation:** Can validate scripts before execution
- **Debugging:** Clear execution model

## Design Decisions

### Web Interface
- **Real-time Dashboard:** WebSocket-based UI for monitoring and steering
- **Dual Logs:** Separate views for AI reasoning and action execution
- **Metrics Tracking:** XP/hr, gold/hr, session stats with live updates
- **Natural Language Steering:** Text input for giving agent new instructions
- **Manual Play Mode:** Take control for raids or complex content
- **Technology:** Node.js + WebSocket backend, vanilla JS frontend

### Goal Structure
- **Aspirational Goal:** Reach level 50 in all skills and base level
- **Path Planning:** Agent decides optimal path and intermediate goals
- **Autonomy:** Agent breaks down long-term goal into achievable milestones

### Character Control
- **Single Character:** Agent controls one character at a time
- **Focus:** Simplifies state management and decision making
- **Future:** Multi-character support could be added later if needed

### Trading Strategy
- **Grand Exchange:** Available but not prioritized
- **Use Cases:** Buy missing materials, sell excess resources
- **Focus:** Gathering and crafting over market arbitrage

### Persistence
- **State Saving:** Execution state saved to disk after each action
- **Recovery:** Resume from last saved state after crashes
- **History:** Maintain execution logs for analysis

### Human Interaction
- **Collaborative Mode:** Human can take control for raids/dungeons
- **Steering:** Human can inject commands or pause agent
- **Handoff:** Smooth transition between agent and human control
- **Use Case:** Complex content requiring coordination or real-time decisions

## Success Metrics

The system is successful if:
- Agent can operate autonomously for 24+ hours
- Makes consistent progress toward level 50 goals
- Adapts strategy based on efficiency metrics
- Recovers from errors and deaths gracefully
- Supports smooth human takeover for collaborative content
- Operates at <10% the cost of continuous agent control
- Maintains detailed logs for progress analysis
