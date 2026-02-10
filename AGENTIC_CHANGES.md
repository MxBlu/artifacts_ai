# Agentic Changes Log

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
