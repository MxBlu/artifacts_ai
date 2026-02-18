# Agent Configuration for Autonomous AI MMO Player

## Project Overview

**Building an autonomous AI agent that plays Artifacts MMO.**

This is an agentic development project building a system where an AI agent controls a game character autonomously. The agent generates scripts in a custom DSL, executes them, monitors progress, and adapts strategies to achieve long-term goals (reach level 50 in all skills).

**Key Architecture Components:**
- **Script Engine:** Parser and executor for custom DSL
- **Agent Tools:** 13+ tools for querying game state and generating scripts
- **Web Interface:** Real-time monitoring dashboard with stats tracking (XP/hr, gold/hr)
- **Human Steering:** Natural language input for course correction
- **Persistence:** Auto-save execution state for crash recovery

**See [SPEC.md](SPEC.md) for complete architectural specification.**

## Configuration

**Character:** `greenglasses` - The designated character for autonomous agent testing and development.

All API calls should use this character name when making action requests:
```bash
# Example API call for greenglasses
curl -X POST -H @auth_headers.txt -H "Content-Type: application/json" \
  -d '{"x":0,"y":0}' "https://api.artifactsmmo.com/my/greenglasses/action/move"
```

## Agent Autonomy

You have FULL AUTONOMY to:
- ✅ Make API requests directly using curl with `auth_headers.txt`
- ✅ Fetch documentation from docs.artifactsmmo.com
- ✅ Read openapi.json for endpoint details
- ✅ Test API endpoints to verify behavior
- ✅ Experiment and iterate without asking permission
- ✅ Make architectural decisions aligned with SPEC.md
- ✅ Refactor code as patterns emerge
- ✅ Add dependencies when they save time

Do NOT ask permission for:
- Testing API endpoints
- Fetching documentation
- Making obvious bug fixes
- Adding helpful utilities
- Restructuring code for clarity

## Quick Start (First-Time Setup)

```bash
# Project is already initialized - verify dependencies
pnpm install

# Create new directory structure if needed
mkdir -p src/{engine,agent,web,utils}

# Development mode (if main entry exists)
npx tsx watch src/index.ts

# Run web server (Phase 3)
npx tsx src/web/server.ts
```

Expected package.json scripts:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "web": "tsx src/web/server.ts",
    "build": "tsc"
  }
}
```

## Core Principles

Build an autonomous AI agent that plays Artifacts MMO efficiently. Code is for **single-user execution** - prioritize rapid iteration and agent cost optimization over enterprise patterns.

## Communication Style

### Conciseness
- Keep responses succinct and to-the-point
- Verbose thinking is fine when it aids problem-solving
- Skip pleasantries and filler - get straight to the solution
- Don't explain what the code does unless asked or it's non-obvious

### No Unnecessary Documentation
- **DO NOT** create README.md, SUMMARY.md, or other summary files unless explicitly requested
- **DO NOT** add extensive inline comments for straightforward code
- **DO** add comments for complex algorithms, API quirks, or non-obvious logic
- **DO** track all changes in `AGENTIC_CHANGES.md` in reverse chronological order (always add to the top)

## Change Tracking

### AGENTIC_CHANGES.md Format
All modifications, additions, and deletions should be logged in a single `AGENTIC_CHANGES.md` file with this structure:

```markdown
# Agentic Changes Log

## [YYYY-MM-DD HH:MM] - Brief Description

### Changed
- File: `path/to/file.ts`
  - Modified function X to handle Y
  - Updated API endpoint Z

### Added
- File: `path/to/new_file.ts`
  - Created module for feature X
  - Implements A, B, C

### Removed
- File: `path/to/old_file.ts`
  - Deleted deprecated helper function
  
### Notes
- Any important context or reasoning
- Breaking changes or migration steps
```

### When to Update
- After every code modification session
- When adding new files or modules
- When removing or deprecating code
- When changing API integrations or data structures

### Git

- Changes should also be committed to git after each request is completed

## Implementation Phases

Follow the phases outlined in [TASKS.md](TASKS.md) and update as you progress:

**Phase 1: Script Executor** (Current Priority)
- DSL parser (tokenizer, AST, command execution)
- Control flow (loops, conditionals, variables)
- Persistence (auto-save state, crash recovery)
- Safety (execution limits, retry logic, stuck detection)

**Phase 2: Agent Integration**
- Agent tools (get_game_state, query_game_knowledge, lookup_*, etc.)
- Check-in system (10-minute intervals)
- Bootstrap prompt (level 50 goal)

**Phase 3: Web Interface**
- WebSocket server
- Real-time dashboard (agent log, execution log, stats, script viewer)
- Human steering input
- Manual play mode

**Phase 4-5: Optimization & Advanced Features**
- Pathfinding, caching, metrics
- Crafting chains, quest support, death recovery

## Code Style

### Optimization Focus
- **Cost Efficiency:** Agent generates scripts (expensive), executor runs them (cheap API calls)
- **Simple State Management:** Single character, flat state structure
- **Persistence First:** Save state after every action for crash recovery
- **Real-time Updates:** WebSocket broadcasts for web UI
- **Respect Cooldowns:** Wait automatically between actions
- **Cache Static Data:** Items, monsters, resources, maps (don't re-fetch)

### Practical Patterns
- Direct and simple over abstracted and flexible
- Flat structure over deep hierarchies
- Few files over many small modules
- Module-level constants/state is acceptable if it simplifies code
- Optimize for readability and modification speed
- Use types where they help, skip them where they don't
- Prefer `interface` for data shapes, `type` for unions/utilities

### When Complexity is Warranted
- DSL parser (needs proper AST and execution model)
- Agent tool interface (will be called repeatedly)
- WebSocket message protocol (needs clear contract)
- State persistence (atomic writes, recovery logic)
- Execution safety (stuck detection, retry logic)

## Project Structure Expectations

```
project/
├── SPEC.md              # Architecture specification
├── TASKS.md             # Implementation roadmap
├── GAME_KNOWLEDGE.md    # Game mechanics and data
├── AGENTIC_CHANGES.md   # All changes tracked here
├── auth_headers.txt     # Auth token for curl testing
├── openapi.json         # API specification
├── src/
│   ├── engine/          # Script parser and executor
│   │   ├── parser.ts    # DSL parser (tokenizer, AST)
│   │   ├── executor.ts  # Command execution engine
│   │   ├── state.ts     # Execution state management
│   │   └── commands/    # Individual command implementations
│   ├── agent/           # AI agent integration
│   │   ├── tools.ts     # Agent tools (get_game_state, etc.)
│   │   ├── checkin.ts   # 10-minute check-in system
│   │   └── bootstrap.ts # Initial agent prompt
│   ├── web/             # Web interface
│   │   ├── server.ts    # WebSocket server
│   │   ├── index.html   # Dashboard UI
│   │   └── client.js    # Frontend WebSocket client
│   ├── api.ts           # API client wrapper
│   ├── config.ts        # Configuration
│   └── index.ts         # Main entry point
├── package.json
└── tsconfig.json
```

## Response Format

### For Code Changes
1. Show the code
2. Brief explanation if non-obvious
3. Update AGENTIC_CHANGES.md
4. Done

### For Questions
- Answer directly
- Provide code examples when relevant
- Skip the "here's what we could do" - just do it or suggest one clear path

### For Debugging
- Show the fix
- Explain why it was broken if it's not obvious
- Move on

## API Details

### Base Configuration
- **Base URL:** `https://api.artifactsmmo.com`
- **Documentation:** https://docs.artifactsmmo.com/
- **OpenAPI Spec:** `openapi.json` (downloaded in workspace)
- **Authentication:** Bearer token (use `Authorization: Bearer <token>` header)
- **HTTP Client:** axios (preferred)

### Agent API Testing (cURL)
- Use `auth_headers.txt` only as a header source for curl, not as a file to read in code.
- Example (GET account details):
  - `curl -H "$(cat auth_headers.txt)" "https://api.artifactsmmo.com/my/details"`
- Example (GET maps by layer):
  - `curl -H "$(cat auth_headers.txt)" "https://api.artifactsmmo.com/maps/surface?page=1&size=5"`
- Example (POST move action):
  - `curl -X POST -H @auth_headers.txt -H "Content-Type: application/json" \
    -d '{"x":0,"y":0}' "https://api.artifactsmmo.com/my/<name>/action/move"`

### Core Endpoints
- **Character Actions:** `/my/{name}/action/move`, `/action/fight`, `/action/gathering`, `/action/crafting`
- **Account Management:** `/my/details`, `/my/characters`, `/my/bank`
- **Game Data:** `/items`, `/monsters`, `/resources`, `/maps`, `/npcs`
- **Grand Exchange:** `/grandexchange/orders` (marketplace for trading)
- **Token Generation:** `/token` (use HTTPBasic auth with username/password)

### Game Mechanics
- **Skills:** mining, woodcutting, fishing, weaponcrafting, gearcrafting, jewelrycrafting, cooking, alchemy
- **Character Limit:** Up to 5 characters per account
- **Cooldowns:** All actions have cooldowns (seconds), returned in response
- **Inventory:** Limited slots, can be expanded
- **Banking:** Centralized bank for storing items/gold across characters

## API Integration Guidelines

- API is well-documented via OpenAPI - trust the spec
- Add defensive checks for API responses
- Handle cooldowns properly - don't spam requests
- Cache static data (items, monsters, resources, maps)
- Use console.log for API calls during development
- Keep API client separate from game logic
- Use axios with proper TypeScript types
- Define response types based on OpenAPI schemas
- You are free to make sample requests to the API to check possible values and debug situations

## Testing Philosophy

- Manual testing is fine
- Add automated tests only for complex logic you'll change frequently
- Test scripts over test frameworks
- Make it easy to test specific functions in isolation

## Dependencies

- **Package Manager:** pnpm (preferred)
- **HTTP Client:** axios
- Prefer minimal dependencies when possible
- Add dependencies freely if they save significant time
- Don't write your own HTTP client, JSON parser, etc.
- Keep track of dependencies (package.json handles this)
- Don't worry about bundle size - this isn't a web app

## Iteration Speed

The goal is rapid iteration:
- Make changes fast
- Test manually
- Refactor when patterns emerge, not speculatively
- Delete code without ceremony
- Keep AGENTIC_CHANGES.md updated for context

## What NOT to Do

- ❌ Don't create architecture documents
- ❌ Don't write extensive JSDoc comments
- ❌ Don't add strict type annotations everywhere (use them where helpful)
- ❌ Don't create interfaces for single implementations
- ❌ Don't ask permission to make obvious fixes
- ❌ Don't write defensive code for impossible states
- ❌ Don't create README files for obvious directories
- ❌ Don't set up complex build pipelines - keep it simple

## What TO Do

- ✅ Write working code quickly
- ✅ Keep AGENTIC_CHANGES.md current
- ✅ Update GAME_KNOWLEDGE.md with discovered mechanics and data
- ✅ Track goals and progress in TASKS.md
- ✅ Make code easy to modify
- ✅ Add comments for "why" not "what"
- ✅ Think through edge cases for API interactions
- ✅ Optimize hot paths
- ✅ Make debugging easy (console.log, clear variable names)
- ✅ Use TypeScript's type inference - let it do the work

## Example Interaction

**User:** "Add support for the 'goto' command in the script executor"

**Good Response:**
```typescript
// src/engine/commands/movement.ts
import { apiPost } from '../../api';

export async function executeGoto(x: number, y: number, characterName: string) {
  const response = await apiPost(`/my/${characterName}/action/move`, { x, y });
  const cooldown = response.data.cooldown;
  return { success: true, cooldown };
}
```

Updated AGENTIC_CHANGES.md

**Bad Response:**
"I'll help you add goto support! First, let me create a comprehensive movement module with proper error handling, logging, pathfinding, and a full test suite. We should also create an abstract Command class for future flexibility..."

---

Remember: This is a game client for personal use. Optimize for getting it working and making it fun to develop, not for production deployment or team collaboration.