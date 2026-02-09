# Agentic Changes Log

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
