# Agentic Changes Log

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
