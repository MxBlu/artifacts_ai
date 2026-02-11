# Agentic Changes Log

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

## [2026-02-11 10:22] - Gate fight menu and auto-move before fight

### Changed
- File: `src/main.ts`
  - Hide fight option when no monster is present on the tile
  - Auto-move to the target tile before attempting the fight
  - Inform the user when movement cooldown prevents immediate fighting

## [2026-02-11 10:40] - Add fight status panel with logs

### Changed
- File: `index.html`
  - Added Fight Status panel and styles for fight summaries and logs
- File: `src/main.ts`
  - Render fight status during move and fight actions
  - Show fight summary details and logs after combat

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

## [2026-02-11 11:05] - Auto-fight after move cooldown

### Changed
- File: `src/main.ts`
  - Schedule the fight automatically after moving and cooldown expiration
  - Added shared fight execution helper and pending timeout tracking

## [2026-02-11 11:18] - Show monster stats in map info

### Changed
- File: `src/api.ts`
  - Added monster types and `getMonster()` API method
- File: `src/main.ts`
  - Fetch monster details for monster tiles and display them in a collapsible section
  - Added monster caching and request de-duplication

## [2026-02-11 11:24] - Show monster icon on tiles

### Changed
- File: `index.html`
  - Added styling for a small monster icon badge on tiles
- File: `src/main.ts`
  - Render a monster icon in the top-left corner of monster tiles

## [2026-02-11 11:30] - Add monster level to tile badge

### Changed
- File: `src/main.ts`
  - Fetch monster levels for tile badges with caching and de-duplication
- File: `index.html`
  - Adjusted monster badge font size to fit level text

## [2026-02-11 11:34] - Widen monster badges

### Changed
- File: `index.html`
  - Increased monster badge width to fit up to three characters

## [2026-02-11 11:38] - Widen monster badges again

### Changed
- File: `index.html`
  - Increased monster badge width to better fit level text

## [2026-02-11 11:42] - Widen monster badges more

### Changed
- File: `index.html`
  - Increased monster badge width to 46% (max 52px)

## [2026-02-11 11:45] - Widen monster badges further

### Changed
- File: `index.html`
  - Increased monster badge width to 58% (max 68px)

## [2026-02-11 12:05] - Add fight automation loop

### Changed
- File: `index.html`
  - Added fight loop icon button in the context menu
  - Added stop button next to Rest in the timers pane
- File: `src/main.ts`
  - Added fight automation loop that moves, fights, rests until stopped
  - Added start/stop handlers and automation status updates

## [2026-02-11 12:12] - Add action slot for fight loop icon

### Changed
- File: `index.html`
  - Added fixed right-side action segment with divider for the fight loop icon
  - Updated context menu item layout to support consistent action slots

## [2026-02-11 12:20] - Allow fight loop start during cooldown

### Changed
- File: `src/main.ts`
  - Only disable the fight menu when no character is loaded
  - Allow the loop icon to start automation even while on cooldown

## [2026-02-11 12:27] - Widen fight loop hitbox

### Changed
- File: `index.html`
  - Added an action slot id so the whole segment is clickable
- File: `src/main.ts`
  - Start automation when clicking the action slot segment

## [2026-02-11 12:33] - Separate fight menu hover highlights

### Changed
- File: `index.html`
  - Added separate hover styling for the fight label and automation action slot

## [2026-02-11 12:40] - Fix fight loop click target

### Changed
- File: `src/main.ts`
  - Preserve the selected tile before hiding the context menu when starting automation

## [2026-02-11 12:52] - Show automation timer in pane

### Changed
- File: `src/main.ts`
  - Track automation start time and status
  - Render automation action and elapsed time in the timers pane

## [2026-02-11 12:58] - Keep automation timer label constant

### Changed
- File: `src/main.ts`
  - Pin the automation timer label to the started action

## [2026-02-11 13:02] - Fix automation label source

### Changed
- File: `src/main.ts`
  - Use a constant automation label in the timer pane

## [2026-02-11 13:08] - Show cooldown action reason

### Changed
- File: `src/main.ts`
  - Track the last cooldown reason from actions
  - Display the cooldown reason in the timers pane when available

## [2026-02-11 13:12] - Simplify cooldown label text

### Changed
- File: `src/main.ts`
  - Removed remaining seconds from the cooldown label text

## [2026-02-11 13:18] - Add map label toggles

### Changed
- File: `index.html`
  - Added map label controls under the map
- File: `src/main.ts`
  - Toggle monster labels when rendering the map

## [2026-02-11 13:24] - Add resource label toggles

### Changed
- File: `index.html`
  - Added toggles for tree and fishing labels
  - Added resource label badge styling
- File: `src/main.ts`
  - Render tree and fishing labels based on resource codes
  - Added toggle handlers for resource labels

## [2026-02-11 13:33] - Add woodcut action on trees

### Changed
- File: `index.html`
  - Added Cut Wood option to the context menu
- File: `src/api.ts`
  - Added gathering response types and `gather()` API method
- File: `src/main.ts`
  - Added woodcut context menu visibility and action handling
  - Move to the tree tile if needed, then gather

## [2026-02-11 13:41] - Retry woodcut after move cooldown

### Changed
- File: `src/main.ts`
  - Persist target tile and auto-gather after move cooldown expires

## [2026-02-11 13:48] - Add fishing action

### Changed
- File: `index.html`
  - Added Fish option to the context menu
- File: `src/main.ts`
  - Added fishing context menu visibility and action handling
  - Move to the fishing tile if needed, then gather

## [2026-02-11 14:05] - Add gather automation loops

### Changed
- File: `index.html`
  - Added automation loop action slots for woodcutting and fishing
- File: `src/main.ts`
  - Added gather automation loop for woodcutting and fishing
  - Stop button now cancels any active automation

## [2026-02-11 14:12] - Add unequip buttons in equipment section

### Changed
- File: `index.html`
  - Added styling for unequip buttons in the equipment list
- File: `src/api.ts`
  - Added unequip response types and `unequipItem()` API method
- File: `src/main.ts`
  - Added unequip buttons in the equipment collapsible
  - Added handler to call unequip and refresh character info

## [2026-02-11 14:22] - Add equip buttons in inventory

### Changed
- File: `index.html`
  - Added equip button styling in inventory list
- File: `src/api.ts`
  - Added item fetch types and `equipItem()` API method
- File: `src/main.ts`
  - Added item cache and slot resolution for equippable items
  - Added equip buttons for inventory items and handler to equip

## [2026-02-11 14:30] - Hide non-equipable buttons

### Changed
- File: `src/main.ts`
  - Only render Equip buttons for items with a valid slot

## [2026-02-11 13:55] - Show action errors above map

### Changed
- File: `index.html`
  - Moved status message above the map area
- File: `src/main.ts`
  - Display error statuses for 15 seconds before hiding

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
- Tree view has 2 levels maximum (section → items)
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
