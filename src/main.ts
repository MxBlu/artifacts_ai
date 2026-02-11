import { ArtifactsAPI, MapTile, Character, FightData, Monster, Item } from './api';
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
const toggleMonsterLabels = document.getElementById('toggleMonsterLabels') as HTMLInputElement;
const toggleTreeLabels = document.getElementById('toggleTreeLabels') as HTMLInputElement;
const toggleFishingLabels = document.getElementById('toggleFishingLabels') as HTMLInputElement;
const toggleMiningLabels = document.getElementById('toggleMiningLabels') as HTMLInputElement;
const toggleAlchemyLabels = document.getElementById('toggleAlchemyLabels') as HTMLInputElement;
const characterInfo = document.getElementById('characterInfo') as HTMLDivElement;
const cellInfo = document.getElementById('cellInfo') as HTMLDivElement;
const fightInfo = document.getElementById('fightInfo') as HTMLDivElement;
const configSection = document.getElementById('configSection') as HTMLDetailsElement;
const tileModal = document.getElementById('tileModal') as HTMLDivElement;
const tileModalTitle = document.getElementById('tileModalTitle') as HTMLHeadingElement;
const tileModalCoords = document.getElementById('tileModalCoords') as HTMLDivElement;
const tileModalInteractions = document.getElementById('tileModalInteractions') as HTMLDivElement;
const contextMenu = document.getElementById('contextMenu') as HTMLDivElement;
const moveMenuItem = document.getElementById('moveMenuItem') as HTMLDivElement;
const fightMenuItem = document.getElementById('fightMenuItem') as HTMLDivElement;
const fightLoopBtn = document.getElementById('fightLoopBtn') as HTMLButtonElement;
const fightLoopSlot = document.getElementById('fightLoopSlot') as HTMLSpanElement;
const woodcutMenuItem = document.getElementById('woodcutMenuItem') as HTMLDivElement;
const fishMenuItem = document.getElementById('fishMenuItem') as HTMLDivElement;
const woodcutLoopBtn = document.getElementById('woodcutLoopBtn') as HTMLButtonElement;
const woodcutLoopSlot = document.getElementById('woodcutLoopSlot') as HTMLSpanElement;
const miningMenuItem = document.getElementById('miningMenuItem') as HTMLDivElement;
const miningLoopBtn = document.getElementById('miningLoopBtn') as HTMLButtonElement;
const miningLoopSlot = document.getElementById('miningLoopSlot') as HTMLSpanElement;
const fishLoopBtn = document.getElementById('fishLoopBtn') as HTMLButtonElement;
const fishLoopSlot = document.getElementById('fishLoopSlot') as HTMLSpanElement;
const craftMenuItem = document.getElementById('craftMenuItem') as HTMLDivElement;
const craftModal = document.getElementById('craftModal') as HTMLDivElement;
const craftModalTitle = document.getElementById('craftModalTitle') as HTMLSpanElement;
const craftModalBody = document.getElementById('craftModalBody') as HTMLDivElement;
const craftModalClose = document.getElementById('craftModalClose') as HTMLButtonElement;
const timersContainer = document.getElementById('timersContainer') as HTMLDivElement;
const restBtn = document.getElementById('restBtn') as HTMLButtonElement;
const stopAutomationBtn = document.getElementById('stopAutomationBtn') as HTMLButtonElement;

let contextMenuTarget: { tile: MapTile } | null = null;
let timerUpdateInterval: number | null = null;
let lastCooldownState: boolean | null = null;
let pendingFightTimeout: number | null = null;
let pendingGatherTimeout: number | null = null;
let pendingGatherTarget: MapTile | null = null;
let pendingFishingTimeout: number | null = null;
let pendingFishingTarget: MapTile | null = null;
let pendingMiningTimeout: number | null = null;
let pendingMiningTarget: MapTile | null = null;
let activeMonsterRequestId = 0;
const monsterCache = new Map<string, Monster>();
const monsterRequests = new Set<string>();
const itemCache = new Map<string, Item>();
const itemRequests = new Set<string>();
let allItemsCache: Item[] | null = null;
let allItemsLoading: Promise<Item[]> | null = null;
let fightAutomationToken = 0;
let fightAutomationActive = false;
let fightAutomationTarget: MapTile | null = null;
let fightAutomationMonsterCode: string | null = null;
let fightAutomationStartedAt: number | null = null;
let fightAutomationStatus: string | null = null;
let fightAutomationLabel: string | null = null;
let lastCooldownReason: string | null = null;
let gatherAutomationToken = 0;
let gatherAutomationActive = false;
let gatherAutomationMode: 'woodcutting' | 'fishing' | 'mining' | null = null;
let gatherAutomationTarget: MapTile | null = null;
let gatherAutomationStartedAt: number | null = null;
let gatherAutomationLabel: string | null = null;

// Helper function to check if character is on cooldown
function isOnCooldown(character: Character | null): boolean {
  if (!character) return false;
  if (!character.cooldown_expiration) return false;
  const expirationTime = new Date(character.cooldown_expiration).getTime();
  const currentTime = Date.now();
  return expirationTime > currentTime;
}

// Helper function to get remaining cooldown in seconds
function getRemainingCooldown(character: Character | null): number {
  if (!character || !isOnCooldown(character)) return 0;
  const expirationTime = new Date(character.cooldown_expiration).getTime();
  const currentTime = Date.now();
  return Math.ceil((expirationTime - currentTime) / 1000);
}

// Helper function to get cooldown progress (0-1)
function getCooldownProgress(character: Character | null): number {
  if (!character || !character.cooldown_expiration) return 1;
  if (!character.cooldown) return 1;
  
  const expirationTime = new Date(character.cooldown_expiration).getTime();
  const currentTime = Date.now();
  const totalCooldown = character.cooldown * 1000; // Convert to ms
  const startTime = expirationTime - totalCooldown;
  const elapsed = currentTime - startTime;
  
  const progress = Math.min(Math.max(elapsed / totalCooldown, 0), 1);
  return progress;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getEquipSlotForItem(item: Item, character: Character): string | null {
  switch (item.type) {
    case 'weapon':
      return 'weapon';
    case 'shield':
      return 'shield';
    case 'helmet':
      return 'helmet';
    case 'body_armor':
      return 'body_armor';
    case 'leg_armor':
      return 'leg_armor';
    case 'boots':
      return 'boots';
    case 'amulet':
      return 'amulet';
    case 'ring':
      if (!character.ring1_slot) return 'ring1';
      if (!character.ring2_slot) return 'ring2';
      return null;
    case 'artifact':
      if (!character.artifact1_slot) return 'artifact1';
      if (!character.artifact2_slot) return 'artifact2';
      if (!character.artifact3_slot) return 'artifact3';
      return null;
    case 'utility':
      if (!character.utility1_slot) return 'utility1';
      if (!character.utility2_slot) return 'utility2';
      return null;
    case 'bag':
      return 'bag';
    case 'rune':
      return 'rune';
    default:
      return null;
  }
}

function isConsumableItem(item: Item): boolean {
  return item.type === 'consumable';
}

function getCraftSkillFromWorkshop(code: string): string | null {
  const normalized = code.toLowerCase();
  if (normalized.includes('weapon')) return 'weaponcrafting';
  if (normalized.includes('gear')) return 'gearcrafting';
  if (normalized.includes('jewel')) return 'jewelrycrafting';
  if (normalized.includes('cook')) return 'cooking';
  if (normalized.includes('alch')) return 'alchemy';
  return null;
}

function getSkillLevel(character: Character, skill: string): number {
  switch (skill) {
    case 'weaponcrafting':
      return character.weaponcrafting_level || 0;
    case 'gearcrafting':
      return character.gearcrafting_level || 0;
    case 'jewelrycrafting':
      return character.jewelrycrafting_level || 0;
    case 'cooking':
      return character.cooking_level || 0;
    case 'alchemy':
      return character.alchemy_level || 0;
    default:
      return 0;
  }
}

function getMaxCraftable(item: Item, character: Character): number {
  const requirements = item.craft?.items || [];
  if (requirements.length === 0) {
    return 1;
  }

  const inventoryMap = new Map<string, number>();
  if (character.inventory) {
    character.inventory.forEach((entry: any) => {
      inventoryMap.set(entry.code, entry.quantity);
    });
  }

  let maxCraftable = Number.POSITIVE_INFINITY;
  requirements.forEach(req => {
    const available = inventoryMap.get(req.code) || 0;
    const possible = Math.floor(available / req.quantity);
    maxCraftable = Math.min(maxCraftable, possible);
  });

  if (!Number.isFinite(maxCraftable)) {
    return 0;
  }

  return Math.max(0, maxCraftable);
}

async function ensureAllItems(): Promise<Item[]> {
  if (allItemsCache) {
    return allItemsCache;
  }

  if (!allItemsLoading && api) {
    allItemsLoading = api.getAllItems();
  }

  if (!allItemsLoading) {
    return [];
  }

  const items = await allItemsLoading;
  allItemsCache = items;
  allItemsLoading = null;
  return items;
}

function openCraftModal(skill: string, workshopCode: string, items: Item[], character: Character) {
  const skillLevel = getSkillLevel(character, skill);
  const filtered = items
    .filter(item => item.craft && item.craft.skill === skill)
    .sort((a, b) => (a.craft?.level || 0) - (b.craft?.level || 0));

  craftModalTitle.textContent = `Crafting: ${skill} (${workshopCode})`;

  if (filtered.length === 0) {
    craftModalBody.innerHTML = '<div class="fight-empty">No craftable items found</div>';
  } else {
    craftModalBody.innerHTML = filtered.map(item => {
      const craftLevel = item.craft?.level || 0;
      const locked = craftLevel > skillLevel;
      const ingredients = item.craft?.items?.length
        ? item.craft?.items.map(req => `${req.code} x${req.quantity}`).join(', ')
        : 'None';
      const quantity = item.craft?.quantity || 1;
      const maxCraftable = getMaxCraftable(item, character);
      const canCraft = !locked && maxCraftable > 0;

      const quantityControl = maxCraftable > 1
        ? `<select class="craft-qty" data-code="${item.code}">
            ${Array.from({ length: maxCraftable }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('')}
          </select>`
        : `<span class="craft-qty-single">${canCraft ? '1x' : '0x'}</span>`;

      return `
        <div class="craft-item ${locked ? 'locked' : ''}">
          <div class="craft-item-header">
            <span>${item.name} (${item.code})</span>
            <span class="craft-item-controls">
              ${quantityControl}
              Lvl ${craftLevel}
              <button class="craft-btn" data-code="${item.code}" ${canCraft ? '' : 'disabled'}>Craft</button>
            </span>
          </div>
          <div class="craft-item-meta">Makes: ${quantity} · Requires: ${ingredients}</div>
        </div>
      `;
    }).join('');
  }

  craftModal.classList.add('visible');
}

function closeCraftModal() {
  craftModal.classList.remove('visible');
}

async function ensureItemDetails(code: string) {
  if (!api || itemCache.has(code) || itemRequests.has(code)) {
    return;
  }

  itemRequests.add(code);

  try {
    const item = await api.getItem(code);
    itemCache.set(code, item);
    if (currentCharacter) {
      updateCharacterInfo(currentCharacter);
    }
  } catch (error) {
    console.error('Item fetch error:', error);
  } finally {
    itemRequests.delete(code);
  }
}

function renderFightState(message: string, state: 'info' | 'error' = 'info') {
  fightInfo.innerHTML = `<div class="fight-state ${state}">${escapeHtml(message)}</div>`;
}

function renderFightResult(fightData: FightData, monsterLabel: string) {
  const resultClass = fightData.fight.result === 'win' ? 'win' : 'loss';
  const cooldown = fightData.cooldown.total_seconds;
  const turns = fightData.fight.turns;
  const baseCooldown = turns * 2;
  const participants = fightData.characters?.map(c => c.name).join(', ') || 'Unknown';
  const logs = fightData.fight.logs || [];

  const logsHtml = logs.length
    ? `<ul class="fight-logs">${logs.map(log => `<li>${escapeHtml(log)}</li>`).join('')}</ul>`
    : '<div class="fight-empty">No logs returned</div>';

  fightInfo.innerHTML = `
    <div class="fight-summary">
      <div class="fight-label">Opponent</div>
      <div class="fight-value">${escapeHtml(monsterLabel)}</div>
      <div class="fight-label">Result</div>
      <div class="fight-result ${resultClass}">${escapeHtml(fightData.fight.result)}</div>
      <div class="fight-label">Turns</div>
      <div class="fight-value">${turns}</div>
      <div class="fight-label">Cooldown</div>
      <div class="fight-value">${cooldown}s (base ${baseCooldown}s)</div>
      <div class="fight-label">Participants</div>
      <div class="fight-value">${escapeHtml(participants)}</div>
    </div>
    ${logsHtml}
  `;
}

function renderMonsterInfo(monster: Monster): string {
  const effects = monster.effects && monster.effects.length > 0
    ? monster.effects.map(effect => `${effect.code} (${effect.value})`).join(', ')
    : 'None';

  const drops = monster.drops && monster.drops.length > 0
    ? monster.drops.map(drop => {
        const qtyMin = drop.quantity_min ?? 1;
        const qtyMax = drop.quantity_max ?? qtyMin;
        const qtyLabel = qtyMin === qtyMax ? `${qtyMin}` : `${qtyMin}-${qtyMax}`;
        return `${drop.code} (${qtyLabel}, ${drop.rate}%)`;
      }).join(', ')
    : 'None';

  return [
    `<div class="info-item"><span class="info-label">Name:</span> <span class="info-value">${escapeHtml(monster.name)}</span></div>`,
    `<div class="info-item"><span class="info-label">Type:</span> <span class="info-value">${escapeHtml(monster.type)}</span></div>`,
    `<div class="info-item"><span class="info-label">Level:</span> <span class="info-value">${monster.level}</span></div>`,
    `<div class="info-item"><span class="info-label">HP:</span> <span class="info-value">${monster.hp}</span></div>`,
    `<div class="info-item"><span class="info-label">Attacks:</span> <span class="info-value">F ${monster.attack_fire} / E ${monster.attack_earth} / W ${monster.attack_water} / A ${monster.attack_air}</span></div>`,
    `<div class="info-item"><span class="info-label">Resists:</span> <span class="info-value">F ${monster.res_fire}% / E ${monster.res_earth}% / W ${monster.res_water}% / A ${monster.res_air}%</span></div>`,
    `<div class="info-item"><span class="info-label">Crit:</span> <span class="info-value">${monster.critical_strike}%</span></div>`,
    `<div class="info-item"><span class="info-label">Initiative:</span> <span class="info-value">${monster.initiative}</span></div>`,
    `<div class="info-item"><span class="info-label">Gold:</span> <span class="info-value">${monster.min_gold}-${monster.max_gold}</span></div>`,
    `<div class="info-item"><span class="info-label">Effects:</span> <span class="info-value">${escapeHtml(effects)}</span></div>`,
    `<div class="info-item"><span class="info-label">Drops:</span> <span class="info-value">${escapeHtml(drops)}</span></div>`,
  ].join('');
}

async function loadMonsterDetails(code: string) {
  if (!api) return;

  const section = document.getElementById('section-tile-monster');
  if (!section) return;

  if (monsterCache.has(code)) {
    section.innerHTML = renderMonsterInfo(monsterCache.get(code) as Monster);
    return;
  }

  const requestId = ++activeMonsterRequestId;
  section.innerHTML = '<div class="info-item"><span class="info-value" style="color: #666;">Loading monster details...</span></div>';

  try {
    const monster = await api.getMonster(code);
    monsterCache.set(code, monster);
    monsterRequests.delete(code);
    if (requestId !== activeMonsterRequestId) {
      return;
    }
    section.innerHTML = renderMonsterInfo(monster);
  } catch (error: any) {
    console.error('Monster fetch error:', error);
    monsterRequests.delete(code);
    if (requestId !== activeMonsterRequestId) {
      return;
    }
    const message = error.response?.data?.error?.message || error.message || 'Failed to load monster';
    section.innerHTML = `<div class="info-item"><span class="info-value" style="color: #ff6b6b;">${escapeHtml(message)}</span></div>`;
  }
}

async function ensureMonsterLevelBadge(code: string) {
  if (monsterCache.has(code) || monsterRequests.has(code) || !api) {
    return;
  }

  monsterRequests.add(code);

  try {
    const monster = await api.getMonster(code);
    monsterCache.set(code, monster);
    const badges = document.querySelectorAll(`.monster-icon[data-monster-code="${code}"]`);
    badges.forEach(badge => {
      badge.textContent = `M${monster.level}`;
    });
  } catch (error) {
    console.error('Monster badge fetch error:', error);
  } finally {
    monsterRequests.delete(code);
  }
}

function isMonsterTile(tile: MapTile): boolean {
  const content = tile.interactions.content;
  if (!content || !content.type) return false;
  return content.type.toLowerCase() === 'monster';
}

function isTreeResource(tile: MapTile): boolean {
  const content = tile.interactions.content;
  if (!content || !content.code) return false;
  return content.code.toLowerCase().endsWith('_tree');
}

function isFishingSpot(tile: MapTile): boolean {
  const content = tile.interactions.content;
  if (!content || !content.code) return false;
  return content.code.toLowerCase().endsWith('_spot');
}

function isMiningNode(tile: MapTile): boolean {
  const content = tile.interactions.content;
  if (!content || !content.code) return false;
  return content.code.toLowerCase().endsWith('_rocks');
}

function isAlchemyField(tile: MapTile): boolean {
  const content = tile.interactions.content;
  if (!content || !content.code) return false;
  if (content.type?.toLowerCase() === 'monster') return false;
  if (content.type?.toLowerCase() === 'workshop') return false;
  if (isTreeResource(tile)) return false;
  if (isFishingSpot(tile)) return false;
  if (isMiningNode(tile)) return false;
  return true;
}

function isCharacterOnTile(character: Character | null, tile: MapTile): boolean {
  if (!character) return false;
  return character.x === tile.x && character.y === tile.y && character.layer === tile.layer;
}

function canRest(character: Character | null): boolean {
  if (!character) return false;
  if (isOnCooldown(character)) return false;
  return character.hp < character.max_hp;
}

function updateAutomationControls() {
  stopAutomationBtn.disabled = !fightAutomationActive && !gatherAutomationActive;
}

function setAutomationStatus(status: string | null) {
  fightAutomationStatus = status;
  updateTimers();
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForCooldownReady(token: number, reason: string) {
  if (!currentCharacter) return;
  const remaining = getRemainingCooldown(currentCharacter);
  if (remaining <= 0) return;
  renderFightState(`${reason} Waiting ${remaining}s...`, 'info');
  setAutomationStatus(`${reason} waiting ${remaining}s`);
  await sleep(remaining * 1000 + 50);
}

async function runFightAutomation(token: number) {
  if (!fightAutomationTarget || !fightAutomationMonsterCode) {
    return;
  }

  while (fightAutomationActive && token === fightAutomationToken) {
    if (!api || !currentCharacter) {
      break;
    }

    if (isOnCooldown(currentCharacter)) {
      await waitForCooldownReady(token, 'Cooldown active.');
      if (token !== fightAutomationToken || !fightAutomationActive) {
        break;
      }
    }

    const tile = fightAutomationTarget;
    const monsterCode = fightAutomationMonsterCode;

    if (!isCharacterOnTile(currentCharacter, tile)) {
      try {
        renderFightState(`Auto-fight: moving to (${tile.x}, ${tile.y})...`, 'info');
        setAutomationStatus(`Moving to (${tile.x}, ${tile.y})`);
        showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
        const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
        currentCharacter = moveData.character;
          lastCooldownReason = moveData.cooldown.reason || 'move';

        renderMap(currentMap, currentCharacter);
        updateCharacterInfo(currentCharacter);
        updateTimers();

        if (isOnCooldown(currentCharacter)) {
          await waitForCooldownReady(token, 'Move complete.');
        }
      } catch (error: any) {
        console.error('Auto-fight move error:', error);
        const message = error.response?.data?.error?.message || error.message || 'Move failed';
        renderFightState(`Auto-fight stopped: ${message}`, 'error');
        showStatus(`Error: ${message}`, 'error');
        break;
      }
    }

    if (token !== fightAutomationToken || !fightAutomationActive) {
      break;
    }

    try {
      renderFightState(`Auto-fight: fighting ${monsterCode}...`, 'info');
      setAutomationStatus(`Fighting ${monsterCode}`);
      showStatus(`Fighting ${monsterCode}...`, 'info');
      const fightData = await api.fightCharacter(currentCharacter.name);
      const updatedCharacter = fightData.characters.find(c => c.name === currentCharacter?.name) || fightData.characters[0];

      if (updatedCharacter) {
        currentCharacter = updatedCharacter;
      }
        lastCooldownReason = fightData.cooldown.reason || 'fight';

      renderFightResult(fightData, monsterCode);
      updateCharacterInfo(currentCharacter);
      updateTimers();
    } catch (error: any) {
      console.error('Auto-fight error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Fight failed';
      renderFightState(`Auto-fight stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      break;
    }

    if (token !== fightAutomationToken || !fightAutomationActive) {
      break;
    }

    if (currentCharacter && currentCharacter.hp < currentCharacter.max_hp) {
      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Post-fight cooldown.');
      }

      if (token !== fightAutomationToken || !fightAutomationActive) {
        break;
      }

      try {
        renderFightState('Auto-fight: resting...', 'info');
        setAutomationStatus('Resting');
        showStatus('Resting...', 'info');
        const restData = await api.restCharacter(currentCharacter.name);
        currentCharacter = restData.character;
          lastCooldownReason = restData.cooldown.reason || 'rest';

        updateCharacterInfo(currentCharacter);
        updateTimers();
      } catch (error: any) {
        console.error('Auto-fight rest error:', error);
        const message = error.response?.data?.error?.message || error.message || 'Rest failed';
        renderFightState(`Auto-fight stopped: ${message}`, 'error');
        showStatus(`Error: ${message}`, 'error');
        break;
      }
    }
  }

  fightAutomationActive = false;
  fightAutomationStartedAt = null;
  fightAutomationLabel = null;
  setAutomationStatus(null);
  updateAutomationControls();
}

async function runGatherAutomation(token: number) {
  if (!gatherAutomationTarget || !gatherAutomationMode) {
    return;
  }

  while (gatherAutomationActive && token === gatherAutomationToken) {
    if (!api || !currentCharacter) {
      break;
    }

    if (isOnCooldown(currentCharacter)) {
      await waitForCooldownReady(token, 'Cooldown active.');
      if (token !== gatherAutomationToken || !gatherAutomationActive) {
        break;
      }
    }

    const tile = gatherAutomationTarget;
    const isValidTarget = gatherAutomationMode === 'woodcutting'
      ? isTreeResource(tile)
      : gatherAutomationMode === 'mining'
      ? isMiningNode(tile)
      : isFishingSpot(tile);

    if (!isValidTarget) {
      renderFightState('Auto-gather stopped: invalid target', 'error');
      break;
    }

    if (!isCharacterOnTile(currentCharacter, tile)) {
      try {
        renderFightState(`Auto-gather: moving to (${tile.x}, ${tile.y})...`, 'info');
        showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
        const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
        currentCharacter = moveData.character;
        lastCooldownReason = moveData.cooldown.reason || 'move';

        renderMap(currentMap, currentCharacter);
        updateCharacterInfo(currentCharacter);
        updateTimers();

        if (isOnCooldown(currentCharacter)) {
          await waitForCooldownReady(token, 'Move complete.');
        }
      } catch (error: any) {
        console.error('Auto-gather move error:', error);
        const message = error.response?.data?.error?.message || error.message || 'Move failed';
        renderFightState(`Auto-gather stopped: ${message}`, 'error');
        showStatus(`Error: ${message}`, 'error');
        break;
      }
    }

    if (token !== gatherAutomationToken || !gatherAutomationActive) {
      break;
    }

    try {
      const actionLabel = gatherAutomationMode === 'woodcutting'
        ? 'Gathering wood...'
        : gatherAutomationMode === 'mining'
        ? 'Mining...'
        : 'Fishing...';
      renderFightState(`Auto-gather: ${actionLabel}`, 'info');
      showStatus(actionLabel, 'info');
      const gatherData = await api.gather(currentCharacter.name);
      currentCharacter = gatherData.character;
      lastCooldownReason = gatherData.cooldown.reason || gatherAutomationMode;

      updateCharacterInfo(currentCharacter);
      updateTimers();
    } catch (error: any) {
      console.error('Auto-gather error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Gathering failed';
      renderFightState(`Auto-gather stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      break;
    }
  }

  gatherAutomationActive = false;
  gatherAutomationStartedAt = null;
  gatherAutomationLabel = null;
  gatherAutomationMode = null;
  updateAutomationControls();
}


function startFightAutomation(tile: MapTile) {
  if (!api || !currentCharacter) {
    showStatus('Load a character first', 'error');
    return;
  }

  if (!isMonsterTile(tile)) {
    showStatus('No monster on this tile', 'error');
    return;
  }

  if (fightAutomationActive) {
    showStatus('Fight automation already running', 'info');
    return;
  }

  if (pendingFightTimeout) {
    clearTimeout(pendingFightTimeout);
    pendingFightTimeout = null;
  }

  fightAutomationActive = true;
  fightAutomationTarget = tile;
  fightAutomationMonsterCode = tile.interactions.content?.code || 'monster';
  fightAutomationToken += 1;
  fightAutomationStartedAt = Date.now();
  fightAutomationLabel = `Auto: Fighting ${fightAutomationMonsterCode}`;
  updateAutomationControls();

  renderFightState(`Auto-fight started for ${fightAutomationMonsterCode}.`, 'info');
  setAutomationStatus(`Starting ${fightAutomationMonsterCode}`);
  showStatus('Auto-fight started', 'success');

  runFightAutomation(fightAutomationToken);
}

function startGatherAutomation(tile: MapTile, mode: 'woodcutting' | 'fishing' | 'mining') {
  if (!api || !currentCharacter) {
    showStatus('Load a character first', 'error');
    return;
  }

  if (fightAutomationActive || gatherAutomationActive) {
    showStatus('Automation already running', 'info');
    return;
  }

  const isValidTarget = mode === 'woodcutting'
    ? isTreeResource(tile)
    : mode === 'mining'
    ? isMiningNode(tile)
    : isFishingSpot(tile);
  if (!isValidTarget) {
    showStatus('No matching resource on this tile', 'error');
    return;
  }

  gatherAutomationActive = true;
  gatherAutomationMode = mode;
  gatherAutomationTarget = tile;
  gatherAutomationToken += 1;
  gatherAutomationStartedAt = Date.now();

  const resourceCode = tile.interactions.content?.code || mode;
  gatherAutomationLabel = mode === 'woodcutting'
    ? `Auto: Woodcutting ${resourceCode}`
    : mode === 'mining'
    ? `Auto: Mining ${resourceCode}`
    : `Auto: Fishing ${resourceCode}`;

  updateAutomationControls();
  renderFightState(`${gatherAutomationLabel} started.`, 'info');
  showStatus('Auto-gather started', 'success');

  runGatherAutomation(gatherAutomationToken);
}


function stopFightAutomation(message: string) {
  if (!fightAutomationActive) {
    return;
  }
  fightAutomationActive = false;
  fightAutomationStartedAt = null;
  fightAutomationLabel = null;
  fightAutomationToken += 1;
  updateAutomationControls();
  setAutomationStatus(null);
  renderFightState(message, 'info');
  showStatus(message, 'info');
}

function stopGatherAutomation(message: string) {
  if (!gatherAutomationActive) {
    return;
  }
  gatherAutomationActive = false;
  gatherAutomationStartedAt = null;
  gatherAutomationLabel = null;
  gatherAutomationMode = null;
  gatherAutomationToken += 1;
  updateAutomationControls();
  renderFightState(message, 'info');
  showStatus(message, 'info');
}


function stopAllAutomation(message: string) {
  if (fightAutomationActive) {
    stopFightAutomation(message);
  }
  if (gatherAutomationActive) {
    stopGatherAutomation(message);
  }
}

function scheduleFightAfterCooldown(monsterCode: string) {
  if (!currentCharacter) return;
  if (pendingFightTimeout) {
    clearTimeout(pendingFightTimeout);
    pendingFightTimeout = null;
  }

  const delayMs = Math.max(getRemainingCooldown(currentCharacter) * 1000, 0);

  renderFightState(`Moved. Waiting ${Math.ceil(delayMs / 1000)}s to fight ${monsterCode}...`, 'info');
  showStatus(`Moved. Waiting ${Math.ceil(delayMs / 1000)}s before fighting ${monsterCode}...`, 'info');

  pendingFightTimeout = window.setTimeout(() => {
    pendingFightTimeout = null;
    handleFightAfterMove(monsterCode);
  }, delayMs);
}

async function handleFightAfterMove(monsterCode: string) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    scheduleFightAfterCooldown(monsterCode);
    return;
  }

  try {
    renderFightState(`Fighting ${monsterCode}...`, 'info');
    showStatus(`Fighting ${monsterCode}...`, 'info');
    const fightData = await api.fightCharacter(currentCharacter.name);
    const updatedCharacter = fightData.characters.find(c => c.name === currentCharacter?.name) || fightData.characters[0];

    if (updatedCharacter) {
      currentCharacter = updatedCharacter;
    }

    lastCooldownReason = fightData.cooldown.reason || 'fight';

    renderFightResult(fightData, monsterCode);
    updateCharacterInfo(currentCharacter);
    updateTimers();

    const cooldown = fightData.cooldown.total_seconds;
    const result = fightData.fight.result;
    const turns = fightData.fight.turns;
    showStatus(`Fight ${result} vs ${fightData.fight.opponent} in ${turns} turns. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Fight error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Fight failed';
    renderFightState(`Fight failed: ${message}`, 'error');
    showStatus(`Error: ${message}`, 'error');
  }
}

// Update timers display
function updateTimers() {
  if (!currentCharacter) {
    timersContainer.innerHTML = '<div style="color: #666; font-style: italic;">No character loaded</div>';
    restBtn.disabled = true;
    stopAutomationBtn.disabled = true;
    return;
  }

  const onCooldown = isOnCooldown(currentCharacter);
  const isReady = !onCooldown;
  const remaining = getRemainingCooldown(currentCharacter);
  const progress = getCooldownProgress(currentCharacter);
  const degrees = Math.floor(progress * 360);

  if (lastCooldownState === null) {
    lastCooldownState = onCooldown;
  } else if (lastCooldownState !== onCooldown) {
    lastCooldownState = onCooldown;
    updateCharacterInfo(currentCharacter);
  }
  
  let html = '<div class="timer ' + (isReady ? 'ready' : 'active') + '">';
  
  // Pie chart
  html += '<div class="timer-pie" style="background: conic-gradient(#00d9ff ' + degrees + 'deg, #0f3460 ' + degrees + 'deg)">';
  html += '<div class="timer-pie-inner">';
  if (isReady) {
    html += '✓';
  } else {
    html += remaining + 's';
  }
  html += '</div></div>';
  
  // Info
  html += '<div class="timer-info">';
  html += '<div class="timer-label">Cooldown</div>';
  html += '<div class="timer-value ' + (isReady ? 'ready' : 'cooldown') + '">';
  if (isReady) {
    html += 'Ready';
  } else {
    const reasonText = lastCooldownReason ? ` · ${lastCooldownReason}` : '';
    html += 'Cooldown' + reasonText;
  }
  html += '</div></div></div>';

  if (fightAutomationActive && fightAutomationStartedAt) {
    const elapsedSeconds = Math.floor((Date.now() - fightAutomationStartedAt) / 1000);
    const actionLabel = fightAutomationLabel ? fightAutomationLabel : 'Auto: Running';
    html += '<div class="timer active">';
    html += '<div class="timer-pie" style="background: conic-gradient(#51cf66 360deg, #0f3460 0deg)">';
    html += '<div class="timer-pie-inner">∞</div></div>';
    html += '<div class="timer-info">';
    html += '<div class="timer-label">Auto</div>';
    html += '<div class="timer-value cooldown">' + actionLabel + '</div>';
    html += '<div class="timer-value">' + elapsedSeconds + 's</div>';
    html += '</div></div>';
  } else if (gatherAutomationActive && gatherAutomationStartedAt) {
    const elapsedSeconds = Math.floor((Date.now() - gatherAutomationStartedAt) / 1000);
    const actionLabel = gatherAutomationLabel ? gatherAutomationLabel : 'Auto: Gathering';
    html += '<div class="timer active">';
    html += '<div class="timer-pie" style="background: conic-gradient(#51cf66 360deg, #0f3460 0deg)">';
    html += '<div class="timer-pie-inner">∞</div></div>';
    html += '<div class="timer-info">';
    html += '<div class="timer-label">Auto</div>';
    html += '<div class="timer-value cooldown">' + actionLabel + '</div>';
    html += '<div class="timer-value">' + elapsedSeconds + 's</div>';
    html += '</div></div>';
  }
  
  timersContainer.innerHTML = html;

  restBtn.disabled = !canRest(currentCharacter);
  updateAutomationControls();
}

// Start timer updates
function startTimerUpdates() {
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
  }
  
  updateTimers();
  timerUpdateInterval = window.setInterval(updateTimers, 100); // Update every 100ms for smooth animation
}

// Stop timer updates
function stopTimerUpdates() {
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
    timerUpdateInterval = null;
  }
}

// Load saved config on startup
const savedConfig = loadConfig();
if (savedConfig) {
  apiTokenInput.value = savedConfig.apiToken;
  characterNameInput.value = savedConfig.characterName;
  // Collapse the config section if config exists
  configSection.open = false;
  // Auto-load map and character data
  loadMapAndCharacter();
}

function showStatus(message: string, type: 'error' | 'success' | 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';

  const timeoutMs = type === 'error' ? 15000 : 5000;
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, timeoutMs);
}

function showTileModal(tile: MapTile, event: MouseEvent) {
  tileModalTitle.textContent = tile.name;
  tileModalCoords.textContent = `Position: (${tile.x}, ${tile.y}) | Layer: ${tile.layer}`;
  
  // Build interactions list
  const interactions: string[] = [];
  
  if (tile.interactions.content) {
    const content = tile.interactions.content;
    interactions.push(`<div class="interaction-item"><span class="interaction-type">${content.type}</span>: ${content.code}</div>`);
  }
  
  if (tile.interactions.transition) {
    const trans = tile.interactions.transition;
    interactions.push(`<div class="interaction-item"><span class="interaction-type">transition</span>: to (${trans.x}, ${trans.y}) layer ${trans.layer}</div>`);
  }
  
  if (interactions.length === 0) {
    tileModalInteractions.innerHTML = '<div class="no-interactions">No interactions available</div>';
  } else {
    tileModalInteractions.innerHTML = interactions.join('');
  }
  
  // Position modal near cursor
  tileModal.style.left = `${event.clientX + 15}px`;
  tileModal.style.top = `${event.clientY + 15}px`;
  tileModal.classList.add('visible');
}

function hideTileModal() {
  tileModal.classList.remove('visible');
}

function showContextMenu(tile: MapTile, event: MouseEvent) {
  event.preventDefault();
  contextMenuTarget = { tile };
  contextMenu.style.left = `${event.clientX}px`;
  contextMenu.style.top = `${event.clientY}px`;
  contextMenu.classList.add('visible');
  
  // Disable move if no character loaded or character is on cooldown
  if (!currentCharacter || isOnCooldown(currentCharacter)) {
    moveMenuItem.classList.add('disabled');
  } else {
    moveMenuItem.classList.remove('disabled');
  }

  const hasMonster = isMonsterTile(tile);
  fightMenuItem.style.display = hasMonster ? 'flex' : 'none';

  if (hasMonster) {
    const hasCharacter = !!currentCharacter;
    if (!hasCharacter) {
      fightMenuItem.classList.add('disabled');
    } else {
      fightMenuItem.classList.remove('disabled');
    }
  }

  const hasTree = isTreeResource(tile);
  woodcutMenuItem.style.display = hasTree ? 'flex' : 'none';

  if (hasTree) {
    if (!currentCharacter || isOnCooldown(currentCharacter)) {
      woodcutMenuItem.classList.add('disabled');
    } else {
      woodcutMenuItem.classList.remove('disabled');
    }
  }

  const hasFishing = isFishingSpot(tile);
  fishMenuItem.style.display = hasFishing ? 'flex' : 'none';

  if (hasFishing) {
    if (!currentCharacter || isOnCooldown(currentCharacter)) {
      fishMenuItem.classList.add('disabled');
    } else {
      fishMenuItem.classList.remove('disabled');
    }
  }

  const isWorkshop = tile.interactions.content?.type?.toLowerCase() === 'workshop';
  craftMenuItem.style.display = isWorkshop ? 'flex' : 'none';

  if (isWorkshop) {
    if (!currentCharacter || isOnCooldown(currentCharacter)) {
      craftMenuItem.classList.add('disabled');
    } else {
      craftMenuItem.classList.remove('disabled');
    }
  }
}

function hideContextMenu() {
  contextMenu.classList.remove('visible');
  contextMenuTarget = null;
}

async function handleMoveAction() {
  if (!contextMenuTarget || !currentCharacter || !api) {
    return;
  }
  
  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }
  
  const { tile } = contextMenuTarget;
  hideContextMenu();
  
  try {
    showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
    const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
    currentCharacter = moveData.character;
    lastCooldownReason = moveData.cooldown.reason || 'move';
    
    // Re-render map to update character position
    renderMap(currentMap, currentCharacter);
    updateCharacterInfo(currentCharacter);
    updateTimers(); // Update timers immediately after action
    
    const cooldown = moveData.cooldown.total_seconds;
    showStatus(`Moved to ${moveData.destination.name}. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Move error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Move failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleFightAction() {
  if (!contextMenuTarget || !currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  const { tile } = contextMenuTarget;

  if (!isMonsterTile(tile)) {
    showStatus('No monster on this tile', 'error');
    return;
  }

  const monsterCode = tile.interactions.content?.code || 'monster';

  hideContextMenu();

  if (!isCharacterOnTile(currentCharacter, tile)) {
    try {
      renderFightState(`Moving to (${tile.x}, ${tile.y})...`, 'info');
      showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
      currentCharacter = moveData.character;
      lastCooldownReason = moveData.cooldown.reason || 'move';

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        scheduleFightAfterCooldown(monsterCode);
        return;
      }
    } catch (error: any) {
      console.error('Move before fight error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      renderFightState(`Move failed: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return;
    }
  }

  handleFightAfterMove(monsterCode);
}

async function handleRestAction() {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  if (currentCharacter.hp >= currentCharacter.max_hp) {
    showStatus('HP is already full', 'info');
    return;
  }

  try {
    showStatus('Resting...', 'info');
    const restData = await api.restCharacter(currentCharacter.name);
    currentCharacter = restData.character;
    lastCooldownReason = restData.cooldown.reason || 'rest';

    updateCharacterInfo(currentCharacter);
    updateTimers();

    const cooldown = restData.cooldown.total_seconds;
    showStatus(`Rested +${restData.hp_restored} HP. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Rest error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Rest failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleUnequipAction(slot: string) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus(`Unequipping ${slot}...`, 'info');
    const equipData = await api.unequipItem(currentCharacter.name, slot);
    currentCharacter = equipData.character;
    lastCooldownReason = equipData.cooldown.reason || 'unequip';

    updateCharacterInfo(currentCharacter);
    updateTimers();

    const cooldown = equipData.cooldown.total_seconds;
    showStatus(`Unequipped ${slot}. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Unequip error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Unequip failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleEquipAction(code: string) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  const item = itemCache.get(code);
  if (!item) {
    showStatus('Item details not loaded yet', 'error');
    return;
  }

  const slot = getEquipSlotForItem(item, currentCharacter);
  if (!slot) {
    showStatus('No available slot for this item', 'error');
    return;
  }

  try {
    showStatus(`Equipping ${code}...`, 'info');
    const equipData = await api.equipItem(currentCharacter.name, code, slot);
    currentCharacter = equipData.character;
    lastCooldownReason = equipData.cooldown.reason || 'equip';

    updateCharacterInfo(currentCharacter);
    updateTimers();

    const cooldown = equipData.cooldown.total_seconds;
    showStatus(`Equipped ${code}. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Equip error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Equip failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleUseItem(code: string, quantity: number) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus(`Using ${code} x${quantity}...`, 'info');
    const useData = await api.useItem(currentCharacter.name, code, quantity);
    currentCharacter = useData.character;
    lastCooldownReason = useData.cooldown.reason || 'use';

    updateCharacterInfo(currentCharacter);
    updateTimers();

    const cooldown = useData.cooldown.total_seconds;
    showStatus(`Used ${code} x${quantity}. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Use item error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Use failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

function scheduleGatherAfterCooldown(tile: MapTile) {
  if (!currentCharacter || !api) return;
  if (pendingGatherTimeout) {
    clearTimeout(pendingGatherTimeout);
    pendingGatherTimeout = null;
  }

  pendingGatherTarget = tile;

  const delayMs = Math.max(getRemainingCooldown(currentCharacter) * 1000, 0);
  showStatus(`Waiting ${Math.ceil(delayMs / 1000)}s to gather...`, 'info');

  pendingGatherTimeout = window.setTimeout(() => {
    pendingGatherTimeout = null;
    if (pendingGatherTarget) {
      handleGatherAfterMove(pendingGatherTarget);
    }
  }, delayMs);
}

function scheduleMiningAfterCooldown(tile: MapTile) {
  if (!currentCharacter || !api) return;
  if (pendingMiningTimeout) {
    clearTimeout(pendingMiningTimeout);
    pendingMiningTimeout = null;
  }

  pendingMiningTarget = tile;

  const delayMs = Math.max(getRemainingCooldown(currentCharacter) * 1000, 0);
  showStatus(`Waiting ${Math.ceil(delayMs / 1000)}s to mine...`, 'info');

  pendingMiningTimeout = window.setTimeout(() => {
    pendingMiningTimeout = null;
    if (pendingMiningTarget) {
      handleMiningAfterMove(pendingMiningTarget);
    }
  }, delayMs);
}

function scheduleFishingAfterCooldown(tile: MapTile) {
  if (!currentCharacter || !api) return;
  if (pendingFishingTimeout) {
    clearTimeout(pendingFishingTimeout);
    pendingFishingTimeout = null;
  }

  pendingFishingTarget = tile;

  const delayMs = Math.max(getRemainingCooldown(currentCharacter) * 1000, 0);
  showStatus(`Waiting ${Math.ceil(delayMs / 1000)}s to fish...`, 'info');

  pendingFishingTimeout = window.setTimeout(() => {
    pendingFishingTimeout = null;
    if (pendingFishingTarget) {
      handleFishingAfterMove(pendingFishingTarget);
    }
  }, delayMs);
}

async function handleFishingAfterMove(tile: MapTile) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    scheduleFishingAfterCooldown(tile);
    return;
  }

  if (!isFishingSpot(tile)) {
    showStatus('No fishing spot on this tile', 'error');
    return;
  }

  try {
    showStatus('Fishing...', 'info');
    const gatherData = await api.gather(currentCharacter.name);
    currentCharacter = gatherData.character;
    lastCooldownReason = gatherData.cooldown.reason || 'fishing';

    updateCharacterInfo(currentCharacter);
    updateTimers();

    const cooldown = gatherData.cooldown.total_seconds;
    showStatus(`Fishing complete. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Fishing error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Fishing failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleGatherAfterMove(tile: MapTile) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    scheduleGatherAfterCooldown(tile);
    return;
  }

  if (!isTreeResource(tile)) {
    showStatus('No tree on this tile', 'error');
    return;
  }

  try {
    showStatus('Gathering wood...', 'info');
    const gatherData = await api.gather(currentCharacter.name);
    currentCharacter = gatherData.character;
    lastCooldownReason = gatherData.cooldown.reason || 'woodcutting';

    updateCharacterInfo(currentCharacter);
    updateTimers();

    const cooldown = gatherData.cooldown.total_seconds;
    showStatus(`Woodcutting complete. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Gather error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Gathering failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleMiningAfterMove(tile: MapTile) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    scheduleMiningAfterCooldown(tile);
    return;
  }

  if (!isMiningNode(tile)) {
    showStatus('No mining node on this tile', 'error');
    return;
  }

  try {
    showStatus('Mining...', 'info');
    const gatherData = await api.gather(currentCharacter.name);
    currentCharacter = gatherData.character;
    lastCooldownReason = gatherData.cooldown.reason || 'mining';

    updateCharacterInfo(currentCharacter);
    updateTimers();

    const cooldown = gatherData.cooldown.total_seconds;
    showStatus(`Mining complete. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Mining error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Mining failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleGatherAction() {
  if (!contextMenuTarget || !currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    scheduleGatherAfterCooldown(contextMenuTarget.tile);
    return;
  }

  const { tile } = contextMenuTarget;

  if (!isTreeResource(tile)) {
    showStatus('No tree on this tile', 'error');
    return;
  }

  hideContextMenu();

  if (!isCharacterOnTile(currentCharacter, tile)) {
    try {
      showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
      currentCharacter = moveData.character;
      lastCooldownReason = moveData.cooldown.reason || 'move';

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        scheduleGatherAfterCooldown(tile);
        return;
      }
    } catch (error: any) {
      console.error('Move before gather error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      showStatus(`Error: ${message}`, 'error');
      return;
    }
  }

  handleGatherAfterMove(tile);
}

async function handleFishingAction() {
  if (!contextMenuTarget || !currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    scheduleFishingAfterCooldown(contextMenuTarget.tile);
    return;
  }

  const { tile } = contextMenuTarget;

  if (!isFishingSpot(tile)) {
    showStatus('No fishing spot on this tile', 'error');
    return;
  }

  hideContextMenu();

  if (!isCharacterOnTile(currentCharacter, tile)) {
    try {
      showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
      currentCharacter = moveData.character;
      lastCooldownReason = moveData.cooldown.reason || 'move';

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        scheduleFishingAfterCooldown(tile);
        return;
      }
    } catch (error: any) {
      console.error('Move before fishing error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      showStatus(`Error: ${message}`, 'error');
      return;
    }
  }

  handleFishingAfterMove(tile);
}

async function handleMiningAction() {
  if (!contextMenuTarget || !currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    scheduleMiningAfterCooldown(contextMenuTarget.tile);
    return;
  }

  const { tile } = contextMenuTarget;

  if (!isMiningNode(tile)) {
    showStatus('No mining node on this tile', 'error');
    return;
  }

  hideContextMenu();

  if (!isCharacterOnTile(currentCharacter, tile)) {
    try {
      showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
      currentCharacter = moveData.character;
      lastCooldownReason = moveData.cooldown.reason || 'move';

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        scheduleMiningAfterCooldown(tile);
        return;
      }
    } catch (error: any) {
      console.error('Move before mining error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      showStatus(`Error: ${message}`, 'error');
      return;
    }
  }

  handleMiningAfterMove(tile);
}

async function handleCraftAction() {
  if (!contextMenuTarget || !currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  const { tile } = contextMenuTarget;
  const content = tile.interactions.content;
  if (!content || content.type.toLowerCase() !== 'workshop') {
    showStatus('No workshop on this tile', 'error');
    return;
  }

  const skill = getCraftSkillFromWorkshop(content.code);
  if (!skill) {
    showStatus(`Unknown workshop type: ${content.code}`, 'error');
    return;
  }

  hideContextMenu();

  if (!isCharacterOnTile(currentCharacter, tile)) {
    try {
      showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
      currentCharacter = moveData.character;
      lastCooldownReason = moveData.cooldown.reason || 'move';

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();
    } catch (error: any) {
      console.error('Move before craft error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      showStatus(`Error: ${message}`, 'error');
      return;
    }
  }

  const items = await ensureAllItems();
  openCraftModal(skill, content.code, items, currentCharacter);
}

async function handleCraftItem(code: string, quantity: number) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    closeCraftModal();
    showStatus(`Crafting ${code} x${quantity}...`, 'info');
    const craftData = await api.craftItem(currentCharacter.name, code, quantity);
    currentCharacter = craftData.character;
    lastCooldownReason = craftData.cooldown.reason || 'crafting';

    updateCharacterInfo(currentCharacter);
    updateTimers();

    const cooldown = craftData.cooldown.total_seconds;
    showStatus(`Crafted ${code} x${quantity}. Cooldown: ${cooldown}s`, 'success');
  } catch (error: any) {
    console.error('Craft error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Craft failed';
    showStatus(`Error: ${message}`, 'error');
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
  mapGrid.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  mapGrid.style.gridTemplateRows = `repeat(${height}, 1fr)`;
  mapGrid.innerHTML = '';

  // Render cells (top to bottom, left to right)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = mapLookup.get(`${x},${y}`);
      const cell = document.createElement('div');
      cell.className = 'map-cell';
      
      if (tile) {
        cell.title = `${tile.name} (${x}, ${y})`;
        
        // Create tile image
        const img = document.createElement('img');
        img.src = `https://artifactsmmo.com/images/maps/${tile.skin}.png`;
        img.alt = tile.skin;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.onerror = () => {
          // Fallback if image doesn't load
          img.style.display = 'none';
          cell.textContent = tile.skin?.substring(0, 3) || '·';
        };
        cell.appendChild(img);

        if (isMonsterTile(tile) && toggleMonsterLabels.checked) {
          const monsterIcon = document.createElement('div');
          monsterIcon.className = 'monster-icon';
          const monsterCode = tile.interactions.content?.code || 'monster';
          monsterIcon.dataset.monsterCode = monsterCode;
          const cachedMonster = monsterCache.get(monsterCode);
          monsterIcon.textContent = cachedMonster ? `M${cachedMonster.level}` : 'M?';
          cell.appendChild(monsterIcon);
          ensureMonsterLevelBadge(monsterCode);
        }

        if (toggleTreeLabels.checked && isTreeResource(tile)) {
          const treeIcon = document.createElement('div');
          treeIcon.className = 'resource-icon tree';
          treeIcon.textContent = 'Tree';
          cell.appendChild(treeIcon);
        }

        if (toggleFishingLabels.checked && isFishingSpot(tile)) {
          const fishingIcon = document.createElement('div');
          fishingIcon.className = 'resource-icon fish';
          fishingIcon.textContent = 'Fish';
          cell.appendChild(fishingIcon);
        }

        if (toggleMiningLabels.checked && isMiningNode(tile)) {
          const miningIcon = document.createElement('div');
          miningIcon.className = 'resource-icon rocks';
          miningIcon.textContent = 'Rock';
          cell.appendChild(miningIcon);
        }

        if (toggleAlchemyLabels.checked && isAlchemyField(tile)) {
          const fieldIcon = document.createElement('div');
          fieldIcon.className = 'resource-icon field';
          fieldIcon.textContent = 'Field';
          cell.appendChild(fieldIcon);
        }
        
        // Check if character is at this location
        if (character && character.x === x && character.y === y) {
          cell.classList.add('player');
          // Add player overlay
          const playerIcon = document.createElement('div');
          playerIcon.textContent = '🧙';
          playerIcon.style.position = 'absolute';
          playerIcon.style.top = '50%';
          playerIcon.style.left = '50%';
          playerIcon.style.transform = 'translate(-50%, -50%)';
          playerIcon.style.fontSize = '24px';
          playerIcon.style.filter = 'drop-shadow(0 0 2px black)';
          cell.appendChild(playerIcon);
        }
        
        cell.addEventListener('click', () => {
          showCellInfo(tile);
        });
        
        cell.addEventListener('contextmenu', (e: MouseEvent) => {
          showContextMenu(tile, e);
        });
        
        cell.addEventListener('mouseenter', (e: MouseEvent) => {
          showTileModal(tile, e);
        });
        
        cell.addEventListener('mousemove', (e: MouseEvent) => {
          tileModal.style.left = `${e.clientX + 15}px`;
          tileModal.style.top = `${e.clientY + 15}px`;
        });
        
        cell.addEventListener('mouseleave', () => {
          hideTileModal();
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
  let html = '<div class="info-content">';
  
  // Always visible info
  html += `<div class="info-item"><span class="info-label">Name:</span> <span class="info-value">${tile.name}</span></div>`;
  html += `<div class="info-item"><span class="info-label">Position:</span> <span class="info-value">(${tile.x}, ${tile.y})</span></div>`;
  html += `<div class="info-item"><span class="info-label">Layer:</span> <span class="info-value">${tile.layer}</span></div>`;
  
  // Interactions section (collapsible)
  html += '<div class="info-section">';
  html += '<div class="info-section-header" data-section="tile-interactions">Interactions</div>';
  html += '<div class="info-section-content" id="section-tile-interactions">';
  
  if (tile.interactions.content) {
    const content = tile.interactions.content;
    html += '<div class="info-subsection">';
    html += '<div class="info-subsection-header">Content</div>';
    html += `<div class="info-item"><span class="info-label">Type:</span> <span class="info-value">${content.type}</span></div>`;
    html += `<div class="info-item"><span class="info-label">Code:</span> <span class="info-value">${content.code}</span></div>`;
    html += '</div>';
  }
  
  if (tile.interactions.transition) {
    const trans = tile.interactions.transition;
    html += '<div class="info-subsection">';
    html += '<div class="info-subsection-header">Transition</div>';
    html += `<div class="info-item"><span class="info-label">To:</span> <span class="info-value">(${trans.x}, ${trans.y})</span></div>`;
    html += `<div class="info-item"><span class="info-label">Layer:</span> <span class="info-value">${trans.layer}</span></div>`;
    html += `<div class="info-item"><span class="info-label">Map ID:</span> <span class="info-value">${trans.map_id}</span></div>`;
    html += '</div>';
  }
  
  if (!tile.interactions.content && !tile.interactions.transition) {
    html += '<div class="info-item"><span class="info-value" style="color: #666;">No interactions available</span></div>';
  }
  
  html += '</div></div>';

  if (tile.interactions.content && tile.interactions.content.type.toLowerCase() === 'monster') {
    html += '<div class="info-section">';
    html += '<div class="info-section-header" data-section="tile-monster">Monster</div>';
    html += '<div class="info-section-content" id="section-tile-monster">';
    html += '<div class="info-item"><span class="info-value" style="color: #666;">Loading monster details...</span></div>';
    html += '</div></div>';
  }
  
  // Details section (collapsible)
  html += '<div class="info-section">';
  html += '<div class="info-section-header" data-section="tile-details">Details</div>';
  html += '<div class="info-section-content" id="section-tile-details">';
  html += `<div class="info-item"><span class="info-label">Map ID:</span> <span class="info-value">${tile.map_id}</span></div>`;
  html += `<div class="info-item"><span class="info-label">Skin:</span> <span class="info-value">${tile.skin}</span></div>`;
  html += '</div></div>';
  
  html += '</div>';
  cellInfo.innerHTML = html;

  if (tile.interactions.content && tile.interactions.content.type.toLowerCase() === 'monster') {
    loadMonsterDetails(tile.interactions.content.code);
  }
}

function updateCharacterInfo(character: Character) {
  let html = '<div class="info-content">';
  
  // Always visible info
  html += `<div class="info-item"><span class="info-label">Name:</span> <span class="info-value">${character.name}</span></div>`;
  html += `<div class="info-item"><span class="info-label">Level:</span> <span class="info-value">${character.level}</span></div>`;
  
  // XP with progress bar
  const xpPercent = (character.xp / character.max_xp * 100).toFixed(1);
  html += `<div class="info-item"><span class="info-label">XP:</span> <span class="info-value">${character.xp.toLocaleString()} / ${character.max_xp.toLocaleString()} (${xpPercent}%)</span>`;
  html += `<div class="progress-bar"><div class="progress-fill" style="width: ${xpPercent}%"></div></div>`;
  html += '</div>';
  
  html += `<div class="info-item"><span class="info-label">Gold:</span> <span class="info-value">${character.gold.toLocaleString()}</span></div>`;
  html += `<div class="info-item"><span class="info-label">HP:</span> <span class="info-value">${character.hp} / ${character.max_hp}</span></div>`;
  
  // Cooldown badge if active
  if (isOnCooldown(character)) {
    const remaining = getRemainingCooldown(character);
    html += `<div class="info-item"><span class="info-label">Status:</span><span class="cooldown-badge">Cooldown: ${remaining}s</span></div>`;
  }
  
  // Task info
  if (character.task) {
    const taskPercent = (character.task_progress / character.task_total * 100).toFixed(1);
    html += `<div class="info-item"><span class="info-label">Task:</span> <span class="info-value">${character.task}</span></div>`;
    html += `<div class="info-item"><span class="info-label">Progress:</span> <span class="info-value">${character.task_progress} / ${character.task_total} (${taskPercent}%)</span>`;
    html += `<div class="progress-bar"><div class="progress-fill" style="width: ${taskPercent}%"></div></div>`;
    html += '</div>';
  }
  
  // Combat Stats (collapsible)
  html += '<div class="info-section">';
  html += '<div class="info-section-header" data-section="char-combat">Combat Stats</div>';
  html += '<div class="info-section-content" id="section-char-combat">';
  html += `<div class="info-item"><span class="info-label">Attack:</span> <span class="info-value">${character.dmg}</span></div>`;
  html += `<div class="info-item"><span class="info-label">Fire:</span> <span class="info-value">${character.attack_fire} / ${character.dmg_fire} dmg / ${character.res_fire} res</span></div>`;
  html += `<div class="info-item"><span class="info-label">Earth:</span> <span class="info-value">${character.attack_earth} / ${character.dmg_earth} dmg / ${character.res_earth} res</span></div>`;
  html += `<div class="info-item"><span class="info-label">Water:</span> <span class="info-value">${character.attack_water} / ${character.dmg_water} dmg / ${character.res_water} res</span></div>`;
  html += `<div class="info-item"><span class="info-label">Air:</span> <span class="info-value">${character.attack_air} / ${character.dmg_air} dmg / ${character.res_air} res</span></div>`;
  html += `<div class="info-item"><span class="info-label">Haste:</span> <span class="info-value">${character.haste}</span></div>`;
  html += `<div class="info-item"><span class="info-label">Crit Strike:</span> <span class="info-value">${character.critical_strike}</span></div>`;
  html += '</div></div>';
  
  // Skills (collapsible)
  html += '<div class="info-section">';
  html += '<div class="info-section-header" data-section="char-skills">Skills</div>';
  html += '<div class="info-section-content" id="section-char-skills">';
  
  const skills = [
    { name: 'Mining', level: character.mining_level, xp: character.mining_xp, max_xp: character.mining_max_xp },
    { name: 'Woodcutting', level: character.woodcutting_level, xp: character.woodcutting_xp, max_xp: character.woodcutting_max_xp },
    { name: 'Fishing', level: character.fishing_level, xp: character.fishing_xp, max_xp: character.fishing_max_xp },
    { name: 'Weaponcrafting', level: character.weaponcrafting_level, xp: character.weaponcrafting_xp, max_xp: character.weaponcrafting_max_xp },
    { name: 'Gearcrafting', level: character.gearcrafting_level, xp: character.gearcrafting_xp, max_xp: character.gearcrafting_max_xp },
    { name: 'Jewelrycrafting', level: character.jewelrycrafting_level, xp: character.jewelrycrafting_xp, max_xp: character.jewelrycrafting_max_xp },
    { name: 'Cooking', level: character.cooking_level, xp: character.cooking_xp, max_xp: character.cooking_max_xp },
    { name: 'Alchemy', level: character.alchemy_level, xp: character.alchemy_xp, max_xp: character.alchemy_max_xp },
  ];
  
  skills.forEach(skill => {
    const percent = (skill.xp / skill.max_xp * 100).toFixed(0);
    html += `<div class="info-item"><span class="info-label">${skill.name}:</span> <span class="info-value">Lvl ${skill.level} (${percent}%)</span></div>`;
  });
  
  html += '</div></div>';
  
  // Equipment (collapsible)
  html += '<div class="info-section">';
  html += '<div class="info-section-header" data-section="char-equipment">Equipment</div>';
  html += '<div class="info-section-content" id="section-char-equipment">';
  
  const equipment = [
    { label: 'Weapon', slot: 'weapon', value: character.weapon_slot },
    { label: 'Shield', slot: 'shield', value: character.shield_slot },
    { label: 'Helmet', slot: 'helmet', value: character.helmet_slot },
    { label: 'Body Armor', slot: 'body_armor', value: character.body_armor_slot },
    { label: 'Leg Armor', slot: 'leg_armor', value: character.leg_armor_slot },
    { label: 'Boots', slot: 'boots', value: character.boots_slot },
    { label: 'Ring 1', slot: 'ring1', value: character.ring1_slot },
    { label: 'Ring 2', slot: 'ring2', value: character.ring2_slot },
    { label: 'Amulet', slot: 'amulet', value: character.amulet_slot },
    { label: 'Artifact 1', slot: 'artifact1', value: character.artifact1_slot },
    { label: 'Artifact 2', slot: 'artifact2', value: character.artifact2_slot },
    { label: 'Artifact 3', slot: 'artifact3', value: character.artifact3_slot },
  ];
  
  equipment.forEach(item => {
    if (item.value) {
      html += '<div class="info-item">';
      html += `<span class="info-label">${item.label}:</span> <span class="info-value">${item.value}</span>`;
      html += `<button class="unequip-btn" data-slot="${item.slot}">Unequip</button>`;
      html += '</div>';
    }
  });
  
  html += '</div></div>';
  
  // Inventory (collapsible)
  html += '<div class="info-section">';
  html += '<div class="info-section-header" data-section="char-inventory">Inventory</div>';
  html += '<div class="info-section-content" id="section-char-inventory">';
  html += `<div class="info-item"><span class="info-label">Slots:</span> <span class="info-value">${character.inventory?.length || 0} / ${character.inventory_max_items}</span></div>`;
  
  if (character.inventory && character.inventory.length > 0) {
    character.inventory.forEach((item: any) => {
      const itemDetails = itemCache.get(item.code);
      const equipSlot = itemDetails ? getEquipSlotForItem(itemDetails, character) : null;
      const isConsumable = itemDetails ? isConsumableItem(itemDetails) : false;
      html += '<div class="info-item">';
      html += `<span class="info-value">${item.code} x${item.quantity}</span>`;
      if (itemDetails && equipSlot) {
        html += `<button class="equip-btn" data-code="${item.code}">Equip</button>`;
      }
      if (itemDetails && isConsumable) {
        if (item.quantity > 1) {
          html += `<select class="use-qty" data-code="${item.code}">`;
          for (let i = 1; i <= item.quantity; i += 1) {
            html += `<option value="${i}">${i}x</option>`;
          }
          html += '</select>';
        } else {
          html += '<span class="use-qty-single">1x</span>';
        }
        const disabled = isOnCooldown(character) ? 'disabled' : '';
        html += `<button class="use-btn" data-code="${item.code}" ${disabled}>Use</button>`;
      }
      html += '</div>';

      if (!itemDetails) {
        ensureItemDetails(item.code);
      }
    });
  } else {
    html += '<div class="info-item"><span class="info-value" style="color: #666;">Empty</span></div>';
  }
  
  html += '</div></div>';
  
  html += '</div>';
  characterInfo.innerHTML = html;
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
    
    // Load character data first to get the layer
    console.log('Fetching character data...');
    const character = await api.getCharacter(charName);
    console.log('Character loaded:', character);
    currentCharacter = character;
    
    // Load map data for character's layer
    console.log(`Fetching map data for layer: ${character.layer}...`);
    const maps = await api.getMapsByLayer(character.layer);
    console.log(`Loaded ${maps.length} map tiles`);
    currentMap = maps;
    
    // Render everything
    renderMap(currentMap, currentCharacter);
    updateCharacterInfo(currentCharacter);
    startTimerUpdates();
    
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
  
  // Collapse the config section after saving
  configSection.open = false;
}

// Event listeners
loadBtn.addEventListener('click', loadMapAndCharacter);
saveBtn.addEventListener('click', saveConfigToStorage);

toggleMonsterLabels.addEventListener('change', () => {
  renderMap(currentMap, currentCharacter);
});

toggleTreeLabels.addEventListener('change', () => {
  renderMap(currentMap, currentCharacter);
});

toggleFishingLabels.addEventListener('change', () => {
  renderMap(currentMap, currentCharacter);
});

toggleMiningLabels.addEventListener('change', () => {
  renderMap(currentMap, currentCharacter);
});

toggleAlchemyLabels.addEventListener('change', () => {
  renderMap(currentMap, currentCharacter);
});

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

// Context menu handlers
moveMenuItem.addEventListener('click', () => {
  if (!moveMenuItem.classList.contains('disabled')) {
    handleMoveAction();
  }
});

fightMenuItem.addEventListener('click', () => {
  if (!fightMenuItem.classList.contains('disabled')) {
    handleFightAction();
  }
});

fightLoopBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!contextMenuTarget) {
    return;
  }
  const targetTile = contextMenuTarget.tile;
  if (!isMonsterTile(targetTile)) {
    return;
  }
  hideContextMenu();
  startFightAutomation(targetTile);
});

fightLoopSlot.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!contextMenuTarget) {
    return;
  }
  const targetTile = contextMenuTarget.tile;
  if (!isMonsterTile(targetTile)) {
    return;
  }
  hideContextMenu();
  startFightAutomation(targetTile);
});

woodcutLoopBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!contextMenuTarget) {
    return;
  }
  const targetTile = contextMenuTarget.tile;
  if (!isTreeResource(targetTile)) {
    return;
  }
  hideContextMenu();
  startGatherAutomation(targetTile, 'woodcutting');
});

woodcutLoopSlot.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!contextMenuTarget) {
    return;
  }
  const targetTile = contextMenuTarget.tile;
  if (!isTreeResource(targetTile)) {
    return;
  }
  hideContextMenu();
  startGatherAutomation(targetTile, 'woodcutting');
});

miningLoopBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!contextMenuTarget) {
    return;
  }
  const targetTile = contextMenuTarget.tile;
  if (!isMiningNode(targetTile)) {
    return;
  }
  hideContextMenu();
  startGatherAutomation(targetTile, 'mining');
});

miningLoopSlot.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!contextMenuTarget) {
    return;
  }
  const targetTile = contextMenuTarget.tile;
  if (!isMiningNode(targetTile)) {
    return;
  }
  hideContextMenu();
  startGatherAutomation(targetTile, 'mining');
});

fishLoopBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!contextMenuTarget) {
    return;
  }
  const targetTile = contextMenuTarget.tile;
  if (!isFishingSpot(targetTile)) {
    return;
  }
  hideContextMenu();
  startGatherAutomation(targetTile, 'fishing');
});

fishLoopSlot.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!contextMenuTarget) {
    return;
  }
  const targetTile = contextMenuTarget.tile;
  if (!isFishingSpot(targetTile)) {
    return;
  }
  hideContextMenu();
  startGatherAutomation(targetTile, 'fishing');
});

woodcutMenuItem.addEventListener('click', () => {
  if (!woodcutMenuItem.classList.contains('disabled')) {
    handleGatherAction();
  }
});

fishMenuItem.addEventListener('click', () => {
  if (!fishMenuItem.classList.contains('disabled')) {
    handleFishingAction();
  }
});

miningMenuItem.addEventListener('click', () => {
  if (!miningMenuItem.classList.contains('disabled')) {
    handleMiningAction();
  }
});

craftMenuItem.addEventListener('click', () => {
  if (!craftMenuItem.classList.contains('disabled')) {
    handleCraftAction();
  }
});

restBtn.addEventListener('click', () => {
  if (!restBtn.disabled) {
    handleRestAction();
  }
});

stopAutomationBtn.addEventListener('click', () => {
  stopAllAutomation('Automation stopped');
});

craftModalClose.addEventListener('click', closeCraftModal);
craftModal.addEventListener('click', (event) => {
  if (event.target === craftModal) {
    closeCraftModal();
  }
});

craftModalBody.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest('.craft-btn') as HTMLButtonElement | null;
  if (!button) {
    return;
  }
  const code = button.dataset.code;
  if (code) {
    const container = button.closest('.craft-item');
    const quantitySelect = container?.querySelector('.craft-qty') as HTMLSelectElement | null;
    const rawQuantity = quantitySelect?.value ? Number.parseInt(quantitySelect.value, 10) : 1;
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
    handleCraftItem(code, quantity);
  }
});

// Close context menu when clicking outside
document.addEventListener('click', () => {
  hideContextMenu();
});

// Prevent context menu from closing when clicking inside it
contextMenu.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Event delegation for collapsible sections in info panels
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('info-section-header')) {
    const sectionId = target.getAttribute('data-section');
    const content = document.getElementById(`section-${sectionId}`);
    
    if (content) {
      content.classList.toggle('visible');
      target.classList.toggle('expanded');
    }
  }
});

characterInfo.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const button = target.closest('.unequip-btn') as HTMLButtonElement | null;
  if (!button) {
    const equipButton = target.closest('.equip-btn') as HTMLButtonElement | null;
    if (equipButton) {
      const code = equipButton.dataset.code;
      if (code) {
        handleEquipAction(code);
      }
    }
    const useButton = target.closest('.use-btn') as HTMLButtonElement | null;
    if (useButton) {
      const code = useButton.dataset.code;
      if (code) {
        const container = useButton.closest('.info-item');
        const quantitySelect = container?.querySelector('.use-qty') as HTMLSelectElement | null;
        const rawQuantity = quantitySelect?.value ? Number.parseInt(quantitySelect.value, 10) : 1;
        const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
        handleUseItem(code, quantity);
      }
    }
    return;
  }
  const slot = button.dataset.slot;
  if (slot) {
    handleUnequipAction(slot);
  }
});
