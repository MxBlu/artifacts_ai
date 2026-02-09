import { ArtifactsAPI, MapTile, Character } from './api';
import { saveConfig, loadConfig } from './config';

let currentMap: MapTile[] = [];
let currentCharacter: Character | null = null;
let api: ArtifactsAPI | null = null;

// DOM elements
const apiTokenInput = document.getElementById('apiToken') as HTMLInputElement;
const characterNameInput = document.getElementById('characterName') as HTMLInputElement;
const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const mapGrid = document.getElementById('mapGrid') as HTMLDivElement;
const characterInfo = document.getElementById('characterInfo') as HTMLPreElement;
const cellInfo = document.getElementById('cellInfo') as HTMLPreElement;

// Load saved config on startup
const savedConfig = loadConfig();
if (savedConfig) {
  apiTokenInput.value = savedConfig.apiToken;
  characterNameInput.value = savedConfig.characterName;
}

function showStatus(message: string, type: 'error' | 'success' | 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

function renderMap(maps: MapTile[], character: Character | null) {
  if (maps.length === 0) {
    mapGrid.innerHTML = '<p>No map data available</p>';
    return;
  }

  // Find map bounds
  const minX = Math.min(...maps.map(m => m.x));
  const maxX = Math.max(...maps.map(m => m.x));
  const minY = Math.min(...maps.map(m => m.y));
  const maxY = Math.max(...maps.map(m => m.y));

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Create map lookup
  const mapLookup = new Map<string, MapTile>();
  maps.forEach(tile => {
    mapLookup.set(`${tile.x},${tile.y}`, tile);
  });

  // Set grid dimensions
  mapGrid.style.gridTemplateColumns = `repeat(${width}, 40px)`;
  mapGrid.style.gridTemplateRows = `repeat(${height}, 40px)`;
  mapGrid.innerHTML = '';

  // Render cells (top to bottom, left to right)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = mapLookup.get(`${x},${y}`);
      const cell = document.createElement('div');
      cell.className = 'map-cell';
      
      if (tile) {
        cell.title = `${tile.name} (${x}, ${y})`;
        cell.textContent = tile.skin || '·';
        
        // Check if character is at this location
        if (character && character.x === x && character.y === y) {
          cell.classList.add('player');
          cell.textContent = '🧙';
        }
        
        cell.addEventListener('click', () => {
          showCellInfo(tile);
        });
      } else {
        cell.style.background = '#0a0a0a';
        cell.textContent = '?';
        cell.title = `Unknown (${x}, ${y})`;
      }
      
      const coords = document.createElement('span');
      coords.className = 'map-cell-coords';
      coords.textContent = `${x},${y}`;
      cell.appendChild(coords);
      
      mapGrid.appendChild(cell);
    }
  }
}

function showCellInfo(tile: MapTile) {
  cellInfo.textContent = JSON.stringify(tile, null, 2);
}

function updateCharacterInfo(character: Character) {
  characterInfo.textContent = JSON.stringify(character, null, 2);
}

async function loadMapAndCharacter() {
  const token = apiTokenInput.value.trim();
  const charName = characterNameInput.value.trim();

  if (!token || !charName) {
    showStatus('Please enter both API token and character name', 'error');
    return;
  }

  loadBtn.disabled = true;
  showStatus('Loading map and character data...', 'info');

  try {
    api = new ArtifactsAPI(token);
    
    // Load map data
    console.log('Fetching map data...');
    const maps = await api.getAllMaps();
    console.log(`Loaded ${maps.length} map tiles`);
    currentMap = maps;
    
    // Load character data
    console.log('Fetching character data...');
    const character = await api.getCharacter(charName);
    console.log('Character loaded:', character);
    currentCharacter = character;
    
    // Render everything
    renderMap(currentMap, currentCharacter);
    updateCharacterInfo(currentCharacter);
    
    showStatus(`Loaded ${maps.length} map tiles and character "${character.name}"`, 'success');
  } catch (error: any) {
    console.error('Error loading data:', error);
    const message = error.response?.data?.message || error.message || 'Unknown error';
    showStatus(`Error: ${message}`, 'error');
  } finally {
    loadBtn.disabled = false;
  }
}

function saveConfigToStorage() {
  const token = apiTokenInput.value.trim();
  const charName = characterNameInput.value.trim();

  if (!token || !charName) {
    showStatus('Please enter both API token and character name', 'error');
    return;
  }

  saveConfig({ apiToken: token, characterName: charName });
  showStatus('Configuration saved!', 'success');
}

// Event listeners
loadBtn.addEventListener('click', loadMapAndCharacter);
saveBtn.addEventListener('click', saveConfigToStorage);

// Allow Enter key to trigger load
characterNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loadMapAndCharacter();
  }
});
apiTokenInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loadMapAndCharacter();
  }
});
