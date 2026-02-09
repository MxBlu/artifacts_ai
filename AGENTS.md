# Agent Configuration for MMO Game Client Development

## Project Status

**Greenfield project** - workspace requires initialization. No code exists yet.

## Quick Start (First-Time Setup)

When initializing this project, follow this sequence:

```bash
# Initialize Node.js project
pnpm init

# Install TypeScript and essential dependencies
pnpm add -D typescript @types/node tsx
pnpm add axios

# Create TypeScript config
npx tsc --init --target ES2022 --module NodeNext --moduleResolution NodeNext --outDir dist --rootDir src

# Create directory structure
mkdir -p src/{client,game,strategies,utils}

# Create entry point
touch src/index.ts AGENTIC_CHANGES.md

# Create initial AGENTIC_CHANGES.md entry
echo "# Agentic Changes Log\n\n## [$(date '+%Y-%m-%d %H:%M')] - Project initialized\n\n### Added\n- Created project structure and configuration\n" > AGENTIC_CHANGES.md
```

## Build and Test

```bash
# Development mode (watch and recompile)
npx tsx watch src/index.ts

# Run once
npx tsx src/index.ts

# Compile TypeScript (if needed)
npx tsc

# Run compiled code
node dist/index.js
```

Add these scripts to package.json for convenience:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc"
  }
}
```

## Core Principles

This agent assists in building a game player and client for an API-driven MMO using **TypeScript**. Code is written for **single-user execution** - no need for enterprise patterns, extensive documentation, or multi-user considerations.

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
- **DO** track all changes in `AGENTIC_CHANGES.md`

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

## Code Style

### Single-User Optimization
- **Authentication required** - API uses Bearer tokens, implement simple token management
- **No multi-threading safety** - async/await is fine, complex concurrency isn't needed
- **Config object** - store API token and base URL in a simple config object or env
- **No input validation** beyond what prevents crashes
- **No logging frameworks** - simple console.log statements are fine
- **No error recovery** for user errors - let it crash and fix it
- **Respect cooldowns** - track and wait for character cooldowns before next action

### Practical Patterns
- Direct and simple over abstracted and flexible
- Flat structure over deep hierarchies
- Few files over many small modules
- Module-level constants/state is acceptable if it simplifies code
- Optimize for readability and modification speed
- Use types where they help, skip them where they don't
- Prefer `interface` for data shapes, `type` for unions/utilities

### When Complexity is Warranted
- API client abstractions (you'll use them repeatedly)
- Game state management (central to functionality)
- Type definitions for API responses (clarity and autocomplete)
- Performance-critical loops or calculations

## Project Structure Expectations

```
project/
├── AGENTIC_CHANGES.md    # All changes tracked here
├── src/
│   ├── client/           # API client code
│   ├── game/             # Game logic and state
│   ├── strategies/       # AI/bot strategies
│   ├── utils/            # Helper functions
│   └── index.ts          # Entry point
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

**User:** "Add support for the combat API endpoint"

**Good Response:**
```typescript
// src/client/combat.ts
interface AttackResponse {
  damage: number;
  target_hp: number;
}

export async function attack(targetId: string, weaponId: string): Promise<AttackResponse> {
  const response = await apiPost('/combat/attack', {
    target: targetId,
    weapon: weaponId
  });
  return response;
}
```

Updated AGENTIC_CHANGES.md

**Bad Response:**
"I'll help you add combat support! First, let me create a comprehensive combat module with proper error handling, logging, and a full test suite. We should also create an abstract CombatStrategy class for future flexibility..."

---

Remember: This is a game client for personal use. Optimize for getting it working and making it fun to develop, not for production deployment or team collaboration.