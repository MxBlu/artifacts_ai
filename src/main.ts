import { ArtifactsAPI, MapTile, Character, FightData, Monster, Item, SimpleItem, BankDetails, Resource, NPCItem, TaskReward, TaskFull } from './api';
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
const toggleNpcLabels = document.getElementById('toggleNpcLabels') as HTMLInputElement;
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
const npcMenuItem = document.getElementById('npcMenuItem') as HTMLDivElement;
const taskMenuItem = document.getElementById('taskMenuItem') as HTMLDivElement;
const bankMenuItem = document.getElementById('bankMenuItem') as HTMLDivElement;
const craftModal = document.getElementById('craftModal') as HTMLDivElement;
const craftModalTitle = document.getElementById('craftModalTitle') as HTMLSpanElement;
const craftModalBody = document.getElementById('craftModalBody') as HTMLDivElement;
const craftModalClose = document.getElementById('craftModalClose') as HTMLButtonElement;
const bankModal = document.getElementById('bankModal') as HTMLDivElement;
const bankModalTitle = document.getElementById('bankModalTitle') as HTMLSpanElement;
const bankModalBody = document.getElementById('bankModalBody') as HTMLDivElement;
const bankModalClose = document.getElementById('bankModalClose') as HTMLButtonElement;
const npcModal = document.getElementById('npcModal') as HTMLDivElement;
const npcModalTitle = document.getElementById('npcModalTitle') as HTMLSpanElement;
const npcModalBody = document.getElementById('npcModalBody') as HTMLDivElement;
const npcModalClose = document.getElementById('npcModalClose') as HTMLButtonElement;
const taskModal = document.getElementById('taskModal') as HTMLDivElement;
const taskModalTitle = document.getElementById('taskModalTitle') as HTMLSpanElement;
const taskModalBody = document.getElementById('taskModalBody') as HTMLDivElement;
const taskModalClose = document.getElementById('taskModalClose') as HTMLButtonElement;
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
const resourceCache = new Map<string, Resource>();
const resourceRequests = new Set<string>();
const resourceDropCache = new Map<string, Resource[]>();
const resourceDropLoading = new Map<string, Promise<Resource[]>>();
let allItemsCache: Item[] | null = null;
let allItemsLoading: Promise<Item[]> | null = null;
let taskRewardsCache: TaskReward[] | null = null;
let taskRewardsLoading: Promise<TaskReward[]> | null = null;
let fightAutomationToken = 0;
let fightAutomationActive = false;
let fightAutomationTarget: MapTile | null = null;
let fightAutomationMonsterCode: string | null = null;
let fightAutomationStartedAt: number | null = null;
let fightAutomationStatus: string | null = null;
let fightAutomationLabel: string | null = null;
let lastCooldownReason: string | null = null;
let cooldownReadyAtMs: number | null = null;
let gatherAutomationToken = 0;
let gatherAutomationActive = false;
let gatherAutomationMode: 'woodcutting' | 'fishing' | 'mining' | 'alchemy' | null = null;
let gatherAutomationTarget: MapTile | null = null;
let gatherAutomationStartedAt: number | null = null;
let gatherAutomationLabel: string | null = null;
let craftAutomationToken = 0;
let craftAutomationActive = false;
let craftAutomationItemCode: string | null = null;
let craftAutomationWorkshopTile: MapTile | null = null;
let craftAutomationStartedAt: number | null = null;
let craftAutomationLabel: string | null = null;
let craftAutomationTargetRemaining: number | null = null;
let craftAutoEnabled = false;
let craftAutoItemCode: string | null = null;
const craftAutoTargetQuantities = new Map<string, number>();
let activeTileModalResourceRequestId = 0;
let activeTileModalResourceCode: string | null = null;
let bankDetails: BankDetails | null = null;
let bankItems: SimpleItem[] = [];
let craftModalState: { skill: string; workshopCode: string; items: Item[] } | null = null;
let npcModalState: { npcCode: string; items: NPCItem[] } | null = null;
let taskModalState: { tile: MapTile } | null = null;

// Helper function to check if character is on cooldown
function isOnCooldown(character: Character | null): boolean {
  if (!character) return false;
  const remainingMs = getRemainingCooldownMs(character);
  return remainingMs > 0;
}

function setCooldownFromResponse(
  cooldown: { remaining_seconds?: number; reason?: string } | null | undefined,
  fallbackReason: string
) {
  if (cooldown?.reason) {
    lastCooldownReason = cooldown.reason;
  } else {
    lastCooldownReason = fallbackReason;
  }

  if (typeof cooldown?.remaining_seconds === 'number') {
    const remainingMs = Math.max(0, cooldown.remaining_seconds * 1000);
    cooldownReadyAtMs = remainingMs > 0 ? Date.now() + remainingMs : null;
  } else {
    cooldownReadyAtMs = null;
  }
}

function getRemainingCooldownMs(character: Character | null): number {
  if (!character) return 0;
  if (cooldownReadyAtMs !== null) {
    return Math.max(0, cooldownReadyAtMs - Date.now());
  }
  if (!character.cooldown_expiration) return 0;
  const expirationTime = new Date(character.cooldown_expiration).getTime();
  return Math.max(0, expirationTime - Date.now());
}

// Helper function to get remaining cooldown in seconds
function getRemainingCooldown(character: Character | null): number {
  const remainingMs = getRemainingCooldownMs(character);
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
}

// Helper function to get cooldown progress (0-1)
function getCooldownProgress(character: Character | null): number {
  if (!character || !character.cooldown_expiration) return 1;
  if (!character.cooldown) return 1;

  const currentTime = Date.now();
  const totalCooldown = character.cooldown * 1000;
  const expirationTime = cooldownReadyAtMs ?? new Date(character.cooldown_expiration).getTime();
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
  if (normalized.includes('mining')) return 'mining';
  if (normalized.includes('wood')) return 'woodcutting';
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
    case 'mining':
      return character.mining_level || 0;
    case 'woodcutting':
      return character.woodcutting_level || 0;
    default:
      return 0;
  }
}

function getGatheringLevel(character: Character, skill: string): number {
  switch (skill) {
    case 'mining':
      return character.mining_level || 0;
    case 'woodcutting':
      return character.woodcutting_level || 0;
    case 'fishing':
      return character.fishing_level || 0;
    case 'alchemy':
      return character.alchemy_level || 0;
    default:
      return 0;
  }
}

function formatSkillName(skill: string): string {
  if (!skill) return 'Skill';
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

function getMaxCraftable(item: Item, character: Character): number {
  const inventoryMap = buildInventoryQuantityMap(character);
  return getMaxCraftableFromMap(item, inventoryMap);
}

function buildInventoryQuantityMap(character: Character): Map<string, number> {
  const inventoryMap = new Map<string, number>();
  if (character.inventory) {
    character.inventory.forEach((entry: any) => {
      inventoryMap.set(entry.code, entry.quantity);
    });
  }
  return inventoryMap;
}

function getInventoryQuantity(character: Character | null, code: string): number {
  if (!character || !character.inventory) return 0;
  const entry = character.inventory.find((item: any) => item?.code === code);
  return entry?.quantity || 0;
}

function buildBankQuantityMap(items: SimpleItem[]): Map<string, number> {
  const bankMap = new Map<string, number>();
  items.forEach(entry => {
    bankMap.set(entry.code, entry.quantity);
  });
  return bankMap;
}

function mergeQuantityMaps(...maps: Map<string, number>[]): Map<string, number> {
  const merged = new Map<string, number>();
  maps.forEach(map => {
    map.forEach((value, key) => {
      merged.set(key, (merged.get(key) || 0) + value);
    });
  });
  return merged;
}

function getMaxCraftableFromMap(item: Item, quantities: Map<string, number>): number {
  const requirements = item.craft?.items || [];
  if (requirements.length === 0) {
    return 1;
  }

  let maxCraftable = Number.POSITIVE_INFINITY;
  requirements.forEach(req => {
    const available = quantities.get(req.code) || 0;
    const possible = Math.floor(available / req.quantity);
    maxCraftable = Math.min(maxCraftable, possible);
  });

  if (!Number.isFinite(maxCraftable)) {
    return 0;
  }

  return Math.max(0, maxCraftable);
}

function getMaxCraftableWithBank(item: Item, character: Character): number {
  const inventoryMap = buildInventoryQuantityMap(character);
  const bankMap = buildBankQuantityMap(bankItems);
  const combined = mergeQuantityMaps(inventoryMap, bankMap);
  return getMaxCraftableFromMap(item, combined);
}

function getCraftOutputQuantity(item: Item | null): number {
  return item?.craft?.quantity || 1;
}

function getItemByCode(code: string): Item | null {
  if (craftModalState) {
    const found = craftModalState.items.find(item => item.code === code);
    if (found) return found;
  }
  if (itemCache.has(code)) {
    return itemCache.get(code) || null;
  }
  if (allItemsCache) {
    return allItemsCache.find(item => item.code === code) || null;
  }
  return null;
}

function isCraftableItem(item: Item | null): boolean {
  return !!item?.craft?.items?.length;
}

function hasMissingBaseForCraft(
  code: string,
  quantity: number,
  available: Map<string, number>,
  visiting = new Set<string>()
): boolean {
  if (quantity <= 0) return false;
  const have = available.get(code) || 0;
  if (have >= quantity) {
    available.set(code, have - quantity);
    return false;
  }

  const remaining = quantity - have;
  available.set(code, 0);

  const item = getItemByCode(code);
  if (!isCraftableItem(item)) {
    return true;
  }

  if (visiting.has(code)) {
    return true;
  }

  visiting.add(code);
  const outputQty = getCraftOutputQuantity(item);
  const craftCount = Math.ceil(remaining / outputQty);
  const requirements = item?.craft?.items || [];

  for (const req of requirements) {
    const reqQuantity = req.quantity * craftCount;
    if (hasMissingBaseForCraft(req.code, reqQuantity, available, visiting)) {
      return true;
    }
  }

  visiting.delete(code);
  return false;
}

function getRequirementFlags(
  reqCode: string,
  reqQuantity: number,
  available: Map<string, number>
): { needsCraft: boolean; needsGather: boolean } {
  const have = available.get(reqCode) || 0;
  const missing = Math.max(0, reqQuantity - have);
  if (missing <= 0) {
    return { needsCraft: false, needsGather: false };
  }

  const item = getItemByCode(reqCode);
  const needsCraft = isCraftableItem(item);
  const needsGather = needsCraft
    ? hasMissingBaseForCraft(reqCode, missing, new Map(available))
    : true;

  return { needsCraft, needsGather };
}

function getMissingCraftRequirements(item: Item, quantities: Map<string, number>) {
  const requirements = item.craft?.items || [];
  return requirements.map(req => {
    const available = quantities.get(req.code) || 0;
    const missing = Math.max(0, req.quantity - available);
    return { code: req.code, required: req.quantity, missing };
  });
}

function getMissingCraftRequirementsForActions(item: Item, quantities: Map<string, number>, actions: number) {
  const requirements = item.craft?.items || [];
  return requirements.map(req => {
    const needed = req.quantity * actions;
    const available = quantities.get(req.code) || 0;
    const missing = Math.max(0, needed - available);
    return { code: req.code, required: needed, missing };
  });
}

function getMaxCraftableFromBankWithCapacity(item: Item, items: SimpleItem[], capacity: number): number {
  const requirements = item.craft?.items || [];
  const outputQuantity = item.craft?.quantity || 1;
  if (requirements.length === 0 || capacity <= 0 || outputQuantity <= 0) {
    return 0;
  }

  const bankMap = buildBankQuantityMap(items);
  let maxCraftable = Number.POSITIVE_INFINITY;
  requirements.forEach(req => {
    const available = bankMap.get(req.code) || 0;
    const possible = Math.floor(available / req.quantity);
    maxCraftable = Math.min(maxCraftable, possible);
  });

  const totalIngredientsPerCraft = requirements.reduce((sum, req) => sum + req.quantity, 0);
  if (totalIngredientsPerCraft > 0) {
    maxCraftable = Math.min(maxCraftable, Math.floor(capacity / totalIngredientsPerCraft));
  }

  maxCraftable = Math.min(maxCraftable, Math.floor(capacity / outputQuantity));

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

async function ensureTaskRewardsLoaded(): Promise<TaskReward[]> {
  if (taskRewardsCache) {
    return taskRewardsCache;
  }

  if (!taskRewardsLoading && api) {
    taskRewardsLoading = api.getAllTaskRewards();
  }

  if (!taskRewardsLoading) {
    return [];
  }

  const rewards = await taskRewardsLoading;
  taskRewardsCache = rewards;
  taskRewardsLoading = null;
  return rewards;
}

async function ensureBankItemsLoaded(): Promise<boolean> {
  if (!api || !currentCharacter) {
    return false;
  }

  if (bankDetails) {
    return true;
  }

  try {
    showStatus('Loading bank items...', 'info');
    const [details, items] = await Promise.all([
      api.getBankDetails(),
      api.getAllBankItems()
    ]);
    bankDetails = details;
    bankItems = items;
    updateCharacterInfo(currentCharacter);
    return true;
  } catch (error: any) {
    console.error('Bank load error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Failed to load bank';
    showStatus(`Error: ${message}`, 'error');
    return false;
  }
}

function openCraftModal(skill: string, workshopCode: string, items: Item[], character: Character) {
  craftModalState = { skill, workshopCode, items };
  renderCraftModal(character);
}

function renderCraftModal(character: Character) {
  if (!craftModalState) {
    return;
  }

  const { skill, workshopCode, items } = craftModalState;
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
      const inventoryMap = buildInventoryQuantityMap(character);
      const bankMap = buildBankQuantityMap(bankItems);
      const combinedMap = mergeQuantityMaps(inventoryMap, bankMap);
      const missingRequirements = craftAutoEnabled && bankDetails
        ? getMissingCraftRequirements(item, bankMap)
        : getMissingCraftRequirements(item, combinedMap);
      const ingredients = item.craft?.items?.length
        ? item.craft?.items.map(req => {
            const missing = missingRequirements.find(entry => entry.code === req.code)?.missing || 0;
            const flags = craftAutoEnabled && bankDetails && missing > 0
              ? getRequirementFlags(req.code, req.quantity, bankMap)
              : { needsCraft: false, needsGather: false };
            const craftLabel = flags.needsCraft ? ' (c)' : '';
            const gatherLabel = flags.needsGather ? ' (g)' : '';
            return `${req.code} x${req.quantity}${craftLabel}${gatherLabel}`;
          }).join(', ')
        : 'None';
      const quantity = item.craft?.quantity || 1;
      const autoActive = craftAutoEnabled && craftAutoItemCode === item.code;
      const maxCraftableFromInventory = getMaxCraftable(item, character);
      const maxCraftableFromBank = bankDetails ? getMaxCraftableWithBank(item, character) : maxCraftableFromInventory;
      const maxCraftable = autoActive && bankDetails
        ? maxCraftableFromBank
        : maxCraftableFromInventory;
      const canCraft = !locked && maxCraftable > 0;
      const autoDisabled = locked || (craftAutomationActive && !autoActive);

      const autoTargetMax = 99;
      const autoTargetSelected = craftAutoTargetQuantities.get(item.code) || Math.max(1, maxCraftableFromBank || 1);
      const shouldShowAutoTargets = autoActive && bankDetails;
      const quantityControl = shouldShowAutoTargets
        ? `<select class="craft-qty" data-code="${item.code}" data-auto="true">
            ${Array.from({ length: autoTargetMax }, (_, i) => {
              const value = i + 1;
              const label = value > maxCraftableFromBank ? `${value}x (g)` : `${value}x`;
              const selected = value === autoTargetSelected ? 'selected' : '';
              return `<option value="${value}" ${selected}>${label}</option>`;
            }).join('')}
          </select>`
        : maxCraftable > 1
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
              <button class="craft-auto-btn ${autoActive ? 'active' : ''}" data-code="${item.code}" ${autoDisabled ? 'disabled' : ''}>Auto</button>
            </span>
          </div>
          <div class="craft-item-meta">Makes: ${quantity} · Requires: ${ingredients}</div>
        </div>
      `;
    }).join('');
  }

  craftModal.classList.add('visible');
}

function openBankModal() {
  bankModal.classList.add('visible');
}

function closeBankModal() {
  bankModal.classList.remove('visible');
}

function closeCraftModal() {
  craftModal.classList.remove('visible');
}

function openNpcModal(npcCode: string, items: NPCItem[], character: Character) {
  npcModalState = { npcCode, items };
  renderNpcModal(character);
}

function closeNpcModal() {
  npcModal.classList.remove('visible');
}

function renderNpcModal(character: Character) {
  if (!npcModalState) {
    return;
  }

  const { npcCode, items } = npcModalState;
  const isCoolingDown = isOnCooldown(character);
  const buyItems = items.filter(item => item.buy_price !== null && item.buy_price !== undefined);
  const sellItems = items.filter(item => item.sell_price !== null && item.sell_price !== undefined);

  npcModalTitle.textContent = `NPC: ${npcCode}`;

  const buyHtml = buyItems.length
    ? buyItems.map(item => {
        const itemDetails = itemCache.get(item.code);
        const name = itemDetails ? `${itemDetails.name} (${item.code})` : item.code;
        const currencyLabel = item.currency === 'gold' ? 'gold' : item.currency;
        const price = item.buy_price ?? 0;
        const disabled = isCoolingDown ? 'disabled' : '';
        const qtyControl = `<select class="npc-qty" data-code="${item.code}" data-action="buy">
          ${Array.from({ length: 100 }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('')}
        </select>`;
        return `
          <div class="npc-item">
            <div class="npc-item-meta">
              <span class="npc-item-name">${escapeHtml(name)}</span>
              <span class="npc-item-sub">Price: ${price} ${escapeHtml(currencyLabel)}</span>
            </div>
            <div class="npc-item-actions">
              ${qtyControl}
              <button class="npc-btn" data-action="buy" data-code="${item.code}" ${disabled}>Buy</button>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="fight-empty">No items for sale</div>';

  const sellHtml = sellItems.length
    ? sellItems.map(item => {
        const itemDetails = itemCache.get(item.code);
        const name = itemDetails ? `${itemDetails.name} (${item.code})` : item.code;
        const currencyLabel = item.currency === 'gold' ? 'gold' : item.currency;
        const price = item.sell_price ?? 0;
        const inventoryQty = getInventoryQuantity(character, item.code);
        const maxSell = Math.min(100, inventoryQty);
        const disabled = isCoolingDown || maxSell <= 0 ? 'disabled' : '';
        const qtyControl = maxSell > 1
          ? `<select class="npc-qty" data-code="${item.code}" data-action="sell">
              ${Array.from({ length: maxSell }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('')}
            </select>`
          : `<span class="craft-qty-single">${maxSell}x</span>`;
        const haveLabel = `Have: ${inventoryQty}`;
        return `
          <div class="npc-item">
            <div class="npc-item-meta">
              <span class="npc-item-name">${escapeHtml(name)}</span>
              <span class="npc-item-sub">${haveLabel} · Price: ${price} ${escapeHtml(currencyLabel)}</span>
            </div>
            <div class="npc-item-actions">
              ${qtyControl}
              <button class="npc-btn secondary" data-action="sell" data-code="${item.code}" ${disabled}>Sell</button>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="fight-empty">No items wanted</div>';

  npcModalBody.innerHTML = `
    <div class="npc-section">
      <h4>NPC Sells</h4>
      ${buyHtml}
    </div>
    <div class="npc-section">
      <h4>NPC Buys</h4>
      ${sellHtml}
    </div>
  `;

  npcModal.classList.add('visible');
}

function openTaskModal(tile: MapTile, character: Character) {
  taskModalState = { tile };
  renderTaskModal(character);
}

function closeTaskModal() {
  taskModal.classList.remove('visible');
}

function renderTaskModal(character: Character) {
  const rewards = taskRewardsCache || [];
  const hasTask = !!character.task;
  const taskProgress = character.task_progress || 0;
  const taskTotal = character.task_total || 0;
  const taskPercent = hasTask && taskTotal > 0
    ? Math.min(100, (taskProgress / taskTotal) * 100)
    : 0;
  const isCoolingDown = isOnCooldown(character);
  const canComplete = hasTask && taskTotal > 0 && taskProgress >= taskTotal && !isCoolingDown;
  const canCancel = hasTask && !isCoolingDown;
  const canStart = !hasTask && !isCoolingDown;
  const canExchange = !isCoolingDown;

  taskModalTitle.textContent = 'Tasks Master';

  const currentTaskHtml = hasTask
    ? `
      <div class="task-grid">
        <div><span class="info-label">Objective:</span> <span class="info-value">${escapeHtml(character.task)}</span></div>
        <div><span class="info-label">Type:</span> <span class="info-value">${escapeHtml(character.task_type || 'Unknown')}</span></div>
        <div><span class="info-label">Progress:</span> <span class="info-value">${taskProgress} / ${taskTotal}</span></div>
      </div>
      <div class="progress-bar" style="margin-top: 6px;"><div class="progress-fill" style="width: ${taskPercent}%;"></div></div>
    `
    : '<div class="fight-empty">No active task</div>';

  const rewardsHtml = rewards.length
    ? rewards.map(reward => {
        const itemDetails = itemCache.get(reward.code);
        const name = itemDetails ? `${itemDetails.name} (${reward.code})` : reward.code;
        const qtyLabel = reward.min_quantity === reward.max_quantity
          ? `${reward.min_quantity}`
          : `${reward.min_quantity}-${reward.max_quantity}`;
        return `
          <div class="task-reward">
            <span>${escapeHtml(name)}</span>
            <span>${qtyLabel} @ 1/${reward.rate}</span>
          </div>
        `;
      }).join('')
    : '<div class="fight-empty">No rewards loaded</div>';

  taskModalBody.innerHTML = `
    <div class="task-section">
      <h4>Current Task</h4>
      ${currentTaskHtml}
    </div>
    <div class="task-section">
      <h4>Actions</h4>
      <div class="task-actions">
        <button class="task-btn" data-action="new" ${canStart ? '' : 'disabled'}>New Task</button>
        <button class="task-btn secondary" data-action="complete" ${canComplete ? '' : 'disabled'}>Complete Task</button>
        <button class="task-btn warn" data-action="cancel" ${canCancel ? '' : 'disabled'}>Cancel Task</button>
        <button class="task-btn" data-action="exchange" ${canExchange ? '' : 'disabled'}>Exchange 6 Coins</button>
      </div>
    </div>
    <div class="task-section">
      <h4>Trade Items</h4>
      <div class="task-actions">
        <input id="taskTradeCode" class="task-input" type="text" placeholder="Item code" />
        <input id="taskTradeQty" class="task-input" type="number" min="1" value="1" />
        <button class="task-btn secondary" data-action="trade" ${isCoolingDown ? 'disabled' : ''}>Trade</button>
      </div>
    </div>
    <div class="task-section">
      <h4>Exchange Rewards</h4>
      ${rewardsHtml}
    </div>
  `;

  taskModal.classList.add('visible');
}

function renderBankModal(details: BankDetails, items: SimpleItem[], character: Character) {
  bankModalTitle.textContent = 'Bank';

  const inventoryItems = (character.inventory || []).filter((entry: any) => entry && entry.code && entry.quantity > 0);
  const depositAllDisabled = inventoryItems.length === 0 || isOnCooldown(character) ? 'disabled' : '';
  const inventoryHtml = inventoryItems.length
    ? inventoryItems.map((entry: any) => {
        const qtyControl = entry.quantity > 1
          ? `<select class="bank-qty" data-code="${entry.code}">
              ${Array.from({ length: entry.quantity }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('')}
            </select>`
          : '<span class="bank-qty-single">1x</span>';
        const disabled = isOnCooldown(character) ? 'disabled' : '';
        return `
          <div class="bank-item">
            <span>${entry.code} x${entry.quantity}</span>
            <span>
              ${qtyControl}
              <button class="bank-btn" data-action="deposit-item" data-code="${entry.code}" ${disabled}>Deposit</button>
            </span>
          </div>
        `;
      }).join('')
    : '<div class="fight-empty">Inventory is empty</div>';

  const bankItemsHtml = items.length
    ? items.map(entry => {
        const qtyControl = entry.quantity > 1
          ? `<select class="bank-qty" data-code="${entry.code}" data-scope="bank">
              ${Array.from({ length: entry.quantity }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('')}
            </select>`
          : '<span class="bank-qty-single">1x</span>';
        const disabled = isOnCooldown(character) ? 'disabled' : '';
        return `
          <div class="bank-item">
            <span>${entry.code} x${entry.quantity}</span>
            <span>
              ${qtyControl}
              <button class="bank-btn secondary" data-action="withdraw-item" data-code="${entry.code}" ${disabled}>Withdraw</button>
            </span>
          </div>
        `;
      }).join('')
    : '<div class="fight-empty">Bank is empty</div>';

  bankModalBody.innerHTML = `
    <div class="bank-section">
      <h4>Bank Summary</h4>
      <div class="bank-grid">
        <div class="bank-row"><span>Gold</span><span>${details.gold.toLocaleString()}</span></div>
        <div class="bank-row"><span>Slots</span><span>${details.slots}</span></div>
        <div class="bank-row"><span>Expansions</span><span>${details.expansions}</span></div>
        <div class="bank-row"><span>Next Expansion</span><span>${details.next_expansion_cost.toLocaleString()} gold</span></div>
      </div>
      <div class="bank-actions" style="margin-top: 10px;">
        <input id="bankDepositGold" class="bank-input" type="number" min="1" placeholder="Deposit gold" />
        <button class="bank-btn" data-action="deposit-gold">Deposit</button>
        <input id="bankWithdrawGold" class="bank-input" type="number" min="1" placeholder="Withdraw gold" />
        <button class="bank-btn secondary" data-action="withdraw-gold">Withdraw</button>
        <button class="bank-btn" data-action="buy-expansion">Buy Expansion</button>
      </div>
    </div>
    <div class="bank-grid">
      <div class="bank-section">
          <div class="bank-section-header">
            <h4>Inventory</h4>
            <button class="bank-btn" data-action="deposit-all" ${depositAllDisabled}>Deposit All</button>
          </div>
        <div class="bank-item-list">${inventoryHtml}</div>
      </div>
      <div class="bank-section">
        <h4>Bank Items</h4>
        <div class="bank-item-list">${bankItemsHtml}</div>
      </div>
    </div>
  `;
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

function isBankTile(tile: MapTile): boolean {
  const content = tile.interactions.content;
  if (!content) return false;
  const type = content.type?.toLowerCase();
  if (type === 'bank') return true;
  if (content.code && content.code.toLowerCase().includes('bank')) return true;
  return false;
}

function isTasksMasterTile(tile: MapTile): boolean {
  const content = tile.interactions.content;
  if (!content) return false;
  const type = content.type?.toLowerCase();
  if (type === 'tasks_master') return true;
  const code = content.code?.toLowerCase() || '';
  return code.includes('tasks_master') || code.includes('task_master');
}

function isNpcNode(tile: MapTile): boolean {
  const content = tile.interactions.content;
  if (!content || !content.type) return false;
  return content.type.toLowerCase() === 'npc';
}

function isAlchemyField(tile: MapTile): boolean {
  const content = tile.interactions.content;
  if (!content || !content.code) return false;
  if (content.type?.toLowerCase() !== 'resource') return false;
  if (isTreeResource(tile)) return false;
  if (isFishingSpot(tile)) return false;
  if (isMiningNode(tile)) return false;
  return true;
}

function meetsResourceRequirement(tile: MapTile, character: Character | null): boolean {
  if (!character) return false;
  const content = tile.interactions.content;
  if (!content || content.type?.toLowerCase() !== 'resource') return true;
  const resource = resourceCache.get(content.code);
  if (!resource) return true;
  const level = getGatheringLevel(character, resource.skill);
  return level >= resource.level;
}

async function ensureResourceDetails(code: string) {
  if (!api || resourceCache.has(code) || resourceRequests.has(code)) {
    return;
  }

  resourceRequests.add(code);
  try {
    const resource = await api.getResource(code);
    resourceCache.set(code, resource);
  } catch (error) {
    console.error('Resource fetch error:', error);
  } finally {
    resourceRequests.delete(code);
  }
}

function getGatherModeFromResource(resource: Resource): 'woodcutting' | 'mining' | 'fishing' | 'alchemy' | null {
  switch (resource.skill) {
    case 'woodcutting':
      return 'woodcutting';
    case 'mining':
      return 'mining';
    case 'fishing':
      return 'fishing';
    case 'alchemy':
      return 'alchemy';
    default:
      return null;
  }
}

async function getResourcesForDrop(dropCode: string): Promise<Resource[]> {
  if (resourceDropCache.has(dropCode)) {
    return resourceDropCache.get(dropCode) || [];
  }

  if (resourceDropLoading.has(dropCode)) {
    return resourceDropLoading.get(dropCode) || [];
  }

  if (!api) {
    return [];
  }

  const loadPromise = api.getAllResources({ drop: dropCode }).then(resources => {
    resourceDropCache.set(dropCode, resources);
    resourceDropLoading.delete(dropCode);
    return resources;
  }).catch(error => {
    console.error('Resource drop lookup error:', error);
    resourceDropLoading.delete(dropCode);
    return [] as Resource[];
  });

  resourceDropLoading.set(dropCode, loadPromise);
  return loadPromise;
}

async function findGatherTargetForDrop(dropCode: string, character: Character | null) {
  const resources = await getResourcesForDrop(dropCode);
  if (!resources.length || !character) {
    return null;
  }

  const eligible = resources.filter(resource => getGatheringLevel(character, resource.skill) >= resource.level);
  if (!eligible.length) {
    return null;
  }

  const tiles = currentMap.filter(tile => {
    const content = tile.interactions.content;
    return content && content.type?.toLowerCase() === 'resource' && eligible.some(resource => resource.code === content.code);
  });

  if (!tiles.length) {
    return null;
  }

  let bestTile = tiles[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  if (!character) {
    return { tile: bestTile, resource: eligible.find(res => res.code === bestTile.interactions.content?.code) || eligible[0] };
  }

  tiles.forEach(tile => {
    const distance = Math.abs(character.x - tile.x) + Math.abs(character.y - tile.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTile = tile;
    }
  });

  const resource = eligible.find(res => res.code === bestTile.interactions.content?.code) || eligible[0];
  return { tile: bestTile, resource };
}

function updateGatherMenuState(tile: MapTile) {
  const meetsRequirement = meetsResourceRequirement(tile, currentCharacter);

  if (isTreeResource(tile)) {
    const disabled = !currentCharacter || isOnCooldown(currentCharacter) || !meetsRequirement;
    woodcutMenuItem.classList.toggle('disabled', disabled);
    woodcutLoopBtn.disabled = disabled;
  }

  if (isFishingSpot(tile)) {
    const disabled = !currentCharacter || isOnCooldown(currentCharacter) || !meetsRequirement;
    fishMenuItem.classList.toggle('disabled', disabled);
    fishLoopBtn.disabled = disabled;
  }

  if (isMiningNode(tile)) {
    const disabled = !currentCharacter || isOnCooldown(currentCharacter) || !meetsRequirement;
    miningMenuItem.classList.toggle('disabled', disabled);
    miningLoopBtn.disabled = disabled;
  }
}

function isCharacterOnTile(character: Character | null, tile: MapTile): boolean {
  if (!character) return false;
  return character.x === tile.x && character.y === tile.y && character.layer === tile.layer;
}

function getInventoryTotal(character: Character): number {
  if (!character.inventory) return 0;
  return character.inventory.reduce((total: number, entry: any) => total + (entry.quantity || 0), 0);
}

function isInventoryFull(character: Character): boolean {
  if (!character.inventory_max_items) return false;
  return getInventoryTotal(character) >= character.inventory_max_items;
}

function getBankTile(): MapTile | null {
  const bankTile = currentMap.find(tile => isBankTile(tile));
  return bankTile || null;
}

function findWorkshopTileForSkill(skill: string): MapTile | null {
  if (!currentCharacter) return null;
  const character = currentCharacter;
  const workshops = currentMap.filter(tile => {
    const content = tile.interactions.content;
    if (!content || content.type?.toLowerCase() !== 'workshop') return false;
    const workshopSkill = getCraftSkillFromWorkshop(content.code || '');
    return workshopSkill === skill;
  });

  if (!workshops.length) {
    return null;
  }

  let bestTile = workshops[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  workshops.forEach(tile => {
    const distance = Math.abs(character.x - tile.x) + Math.abs(character.y - tile.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTile = tile;
    }
  });

  return bestTile;
}

function canRest(character: Character | null): boolean {
  if (!character) return false;
  if (isOnCooldown(character)) return false;
  return character.hp < character.max_hp;
}

function updateAutomationControls() {
  stopAutomationBtn.disabled = !fightAutomationActive && !gatherAutomationActive && !craftAutomationActive;
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
  const remainingMs = getRemainingCooldownMs(currentCharacter);
  if (remainingMs <= 0) return;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  renderFightState(`${reason} Waiting ${remainingSeconds}s...`, 'info');
  setAutomationStatus(`${reason} waiting ${remainingSeconds}s`);
  await sleep(remainingMs + 50);
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
        setCooldownFromResponse(moveData.cooldown, 'move');

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
      setCooldownFromResponse(fightData.cooldown, 'fight');

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
        setCooldownFromResponse(restData.cooldown, 'rest');

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

    if (isInventoryFull(currentCharacter)) {
      const deposited = await runAutoBankDeposit(token, tile, 'gather');
      if (!deposited) {
        break;
      }
      if (token !== gatherAutomationToken || !gatherAutomationActive) {
        break;
      }
      continue;
    }
    const isValidTarget = gatherAutomationMode === 'woodcutting'
      ? isTreeResource(tile)
      : gatherAutomationMode === 'mining'
      ? isMiningNode(tile)
      : gatherAutomationMode === 'fishing'
      ? isFishingSpot(tile)
      : isAlchemyField(tile);

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
        setCooldownFromResponse(moveData.cooldown, 'move');

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
        : gatherAutomationMode === 'fishing'
        ? 'Fishing...'
        : 'Gathering herbs...';
      renderFightState(`Auto-gather: ${actionLabel}`, 'info');
      showStatus(actionLabel, 'info');
      const gatherData = await api.gather(currentCharacter.name);
      currentCharacter = gatherData.character;
      setCooldownFromResponse(gatherData.cooldown, gatherAutomationMode || 'gather');

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

async function runCraftAutomation(token: number, item: Item) {
  if (!craftAutomationWorkshopTile) {
    stopCraftAutomation('Auto-craft stopped: no workshop selected');
    return;
  }

  if (craftAutomationTargetRemaining !== null && craftAutomationTargetRemaining <= 0) {
    stopCraftAutomation('Auto-craft stopped: target reached');
    return;
  }

  while (craftAutomationActive && token === craftAutomationToken) {
    if (!api || !currentCharacter) {
      break;
    }

    if (isOnCooldown(currentCharacter)) {
      await waitForCooldownReady(token, 'Cooldown active.');
      if (token !== craftAutomationToken || !craftAutomationActive) {
        break;
      }
    }

    const workshopTile = craftAutomationWorkshopTile;
    if (!isCharacterOnTile(currentCharacter, workshopTile)) {
      try {
        renderFightState(`Auto-craft: moving to (${workshopTile.x}, ${workshopTile.y})...`, 'info');
        showStatus(`Moving to (${workshopTile.x}, ${workshopTile.y})...`, 'info');
        const moveData = await api.moveCharacter(currentCharacter.name, workshopTile.x, workshopTile.y);
        currentCharacter = moveData.character;
        setCooldownFromResponse(moveData.cooldown, 'move');

        renderMap(currentMap, currentCharacter);
        updateCharacterInfo(currentCharacter);
        updateTimers();

        if (isOnCooldown(currentCharacter)) {
          await waitForCooldownReady(token, 'Move complete.');
        }
      } catch (error: any) {
        console.error('Auto-craft move error:', error);
        const message = error.response?.data?.error?.message || error.message || 'Move failed';
        renderFightState(`Auto-craft stopped: ${message}`, 'error');
        showStatus(`Error: ${message}`, 'error');
        break;
      }
    }

    if (token !== craftAutomationToken || !craftAutomationActive) {
      break;
    }

    const outputQuantity = item.craft?.quantity || 1;
    const remainingActions = craftAutomationTargetRemaining !== null
      ? Math.ceil(craftAutomationTargetRemaining / outputQuantity)
      : Number.POSITIVE_INFINITY;
    const maxInventoryCrafts = Math.min(getMaxCraftable(item, currentCharacter), remainingActions);
    if (maxInventoryCrafts > 0) {
      try {
        renderFightState(`Auto-craft: crafting ${item.code} x${maxInventoryCrafts}...`, 'info');
        showStatus(`Crafting ${item.code} x${maxInventoryCrafts}...`, 'info');
        const craftData = await api.craftItem(currentCharacter.name, item.code, maxInventoryCrafts);
        currentCharacter = craftData.character;
        setCooldownFromResponse(craftData.cooldown, 'crafting');

        updateCharacterInfo(currentCharacter);
        updateTimers();

        if (craftAutomationTargetRemaining !== null) {
          craftAutomationTargetRemaining -= maxInventoryCrafts * outputQuantity;
          if (craftAutomationTargetRemaining <= 0) {
            stopCraftAutomation('Auto-craft stopped: target reached');
            break;
          }
        }

        if (isOnCooldown(currentCharacter)) {
          await waitForCooldownReady(token, 'Crafting complete.');
        }
      } catch (error: any) {
        console.error('Auto-craft error:', error);
        const message = error.response?.data?.error?.message || error.message || 'Craft failed';
        renderFightState(`Auto-craft stopped: ${message}`, 'error');
        showStatus(`Error: ${message}`, 'error');
        break;
      }
    }

    if (token !== craftAutomationToken || !craftAutomationActive) {
      break;
    }

    const cycled = await runAutoCraftBankCycle(token, item, workshopTile);
    if (!cycled) {
      const supported = await runAutoCraftSupportCycle(token, item, workshopTile);
      if (!supported) {
        break;
      }
    }
  }

  craftAutomationActive = false;
  craftAutomationItemCode = null;
  craftAutomationStartedAt = null;
  craftAutomationLabel = null;
  craftAutomationTargetRemaining = null;
  updateAutomationControls();
}

async function runAutoCraftSupportCycle(token: number, item: Item, returnTile: MapTile): Promise<boolean> {
  if (!api || !currentCharacter) {
    return false;
  }

  const outputQuantity = item.craft?.quantity || 1;
  const remainingActions = craftAutomationTargetRemaining !== null
    ? Math.ceil(craftAutomationTargetRemaining / outputQuantity)
    : 1;
  if (remainingActions <= 0) {
    return true;
  }

  const inventoryMap = buildInventoryQuantityMap(currentCharacter);
  const bankMap = buildBankQuantityMap(bankItems);
  const combined = mergeQuantityMaps(inventoryMap, bankMap);
  const missing = getMissingCraftRequirementsForActions(item, combined, 1).filter(req => req.missing > 0);

  if (!missing.length) {
    return true;
  }

  const missingTarget = missing[0];
  const missingItem = getItemByCode(missingTarget.code);
  if (isCraftableItem(missingItem)) {
    return runAutoCraftNestedCraftCycle(token, missingItem as Item, missingTarget.missing, returnTile);
  }

  return runAutoCraftGatherCycle(token, item, returnTile, {
    code: missingTarget.code,
    quantity: missingTarget.missing
  });
}

async function runAutoCraftGatherCycle(
  token: number,
  item: Item,
  returnTile: MapTile,
  gatherTarget?: { code: string; quantity: number }
): Promise<boolean> {
  if (!api || !currentCharacter) {
    return false;
  }

  const capacity = currentCharacter.inventory_max_items || 0;
  if (capacity <= 0) {
    return false;
  }

  const outputQuantity = item.craft?.quantity || 1;
  const remainingActions = craftAutomationTargetRemaining !== null
    ? Math.ceil(craftAutomationTargetRemaining / outputQuantity)
    : 1;
  if (remainingActions <= 0) {
    return true;
  }

  const targetActions = Math.min(1, remainingActions);
  const inventoryMap = buildInventoryQuantityMap(currentCharacter);
  const bankMap = buildBankQuantityMap(bankItems);
  const combined = mergeQuantityMaps(inventoryMap, bankMap);
  const missing = getMissingCraftRequirementsForActions(item, combined, targetActions).filter(req => req.missing > 0);

  if (!missing.length) {
    return true;
  }

  const missingTarget = gatherTarget || missing[0];
  const target = await findGatherTargetForDrop(missingTarget.code, currentCharacter);
  if (!target) {
    renderFightState(`Auto-craft stopped: no gather target for ${missingTarget.code}`, 'info');
    showStatus(`Auto-craft stopped: no gather target for ${missingTarget.code}`, 'info');
    return false;
  }

  const gatherMode = getGatherModeFromResource(target.resource);
  if (!gatherMode) {
    renderFightState(`Auto-craft stopped: unsupported gather skill for ${missingTarget.code}`, 'info');
    showStatus(`Auto-craft stopped: unsupported gather skill for ${missingTarget.code}`, 'info');
    return false;
  }

  if (!isCharacterOnTile(currentCharacter, target.tile)) {
    try {
      renderFightState(`Auto-craft: moving to (${target.tile.x}, ${target.tile.y})...`, 'info');
      showStatus(`Moving to (${target.tile.x}, ${target.tile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, target.tile.x, target.tile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Move complete.');
      }
    } catch (error: any) {
      console.error('Auto-craft gather move error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      renderFightState(`Auto-craft stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  const requiredQuantity = gatherTarget ? gatherTarget.quantity : missing[0].missing;
  if (requiredQuantity <= 0) {
    return true;
  }

  while (craftAutomationActive && token === craftAutomationToken) {
    if (!currentCharacter) {
      return false;
    }

    if (isOnCooldown(currentCharacter)) {
      await waitForCooldownReady(token, 'Cooldown active.');
      if (token !== craftAutomationToken || !craftAutomationActive) {
        return false;
      }
    }

    if (isInventoryFull(currentCharacter)) {
      const deposited = await runAutoBankDeposit(token, target.tile, 'craft');
      if (!deposited) {
        return false;
      }
      if (token !== craftAutomationToken || !craftAutomationActive) {
        return false;
      }
    }

    const gatheredSoFar = getInventoryQuantity(currentCharacter, missingTarget.code);
    if (gatheredSoFar >= requiredQuantity) {
      break;
    }

    try {
      const remaining = requiredQuantity - gatheredSoFar;
      renderFightState(`Auto-craft: gathering ${missingTarget.code} (${remaining} remaining)...`, 'info');
      showStatus(`Gathering ${missingTarget.code}...`, 'info');
      const gatherData = await api.gather(currentCharacter.name);
      currentCharacter = gatherData.character;
      setCooldownFromResponse(gatherData.cooldown, gatherMode);

      updateCharacterInfo(currentCharacter);
      updateTimers();
    } catch (error: any) {
      console.error('Auto-craft gather error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Gathering failed';
      renderFightState(`Auto-craft stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  if (token !== craftAutomationToken || !craftAutomationActive) {
    return false;
  }

  if (!isCharacterOnTile(currentCharacter, returnTile)) {
    try {
      renderFightState(`Auto-craft: returning to (${returnTile.x}, ${returnTile.y})...`, 'info');
      showStatus(`Returning to (${returnTile.x}, ${returnTile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, returnTile.x, returnTile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Return to workshop complete.');
      }
    } catch (error: any) {
      console.error('Auto-craft return from gather error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      renderFightState(`Auto-craft stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  return true;
}

async function runAutoCraftNestedCraftCycle(
  token: number,
  item: Item,
  quantityNeeded: number,
  returnTile: MapTile
): Promise<boolean> {
  if (!api || !currentCharacter) {
    return false;
  }

  const skill = item.craft?.skill || '';
  const workshopTile = skill ? findWorkshopTileForSkill(skill) : null;
  if (!workshopTile) {
    renderFightState(`Auto-craft stopped: no workshop for ${item.code}`, 'info');
    showStatus(`Auto-craft stopped: no workshop for ${item.code}`, 'info');
    return false;
  }

  const outputQuantity = getCraftOutputQuantity(item);
  let remaining = quantityNeeded;

  while (craftAutomationActive && token === craftAutomationToken && remaining > 0) {
    if (!currentCharacter) {
      return false;
    }

    if (isOnCooldown(currentCharacter)) {
      await waitForCooldownReady(token, 'Cooldown active.');
      if (token !== craftAutomationToken || !craftAutomationActive) {
        return false;
      }
    }

    const inventoryMap = buildInventoryQuantityMap(currentCharacter);
    const bankMap = buildBankQuantityMap(bankItems);
    const combined = mergeQuantityMaps(inventoryMap, bankMap);
    const missing = getMissingCraftRequirementsForActions(item, combined, 1).filter(req => req.missing > 0);

    if (missing.length > 0) {
      const missingTarget = missing[0];
      const missingItem = getItemByCode(missingTarget.code);
      if (isCraftableItem(missingItem)) {
        const crafted = await runAutoCraftNestedCraftCycle(
          token,
          missingItem as Item,
          missingTarget.missing,
          workshopTile
        );
        if (!crafted) {
          return false;
        }
        continue;
      }

      const gathered = await runAutoCraftGatherCycle(token, item, workshopTile, {
        code: missingTarget.code,
        quantity: missingTarget.missing
      });
      if (!gathered) {
        return false;
      }
      continue;
    }

    const requirements = item.craft?.items || [];
    const toWithdraw: Array<{ code: string; quantity: number }> = [];
    requirements.forEach(req => {
      const have = inventoryMap.get(req.code) || 0;
      const need = Math.max(0, req.quantity - have);
      if (need > 0) {
        toWithdraw.push({ code: req.code, quantity: need });
      }
    });

    if (toWithdraw.length > 0) {
      const bankTile = getBankTile();
      if (!bankTile) {
        renderFightState('Auto-craft stopped: no bank found on this map', 'error');
        showStatus('No bank found on this map', 'error');
        return false;
      }

      if (!isCharacterOnTile(currentCharacter, bankTile)) {
        try {
          renderFightState(`Auto-craft: moving to bank (${bankTile.x}, ${bankTile.y})...`, 'info');
          showStatus(`Moving to bank (${bankTile.x}, ${bankTile.y})...`, 'info');
          const moveData = await api.moveCharacter(currentCharacter.name, bankTile.x, bankTile.y);
          currentCharacter = moveData.character;
          setCooldownFromResponse(moveData.cooldown, 'move');

          renderMap(currentMap, currentCharacter);
          updateCharacterInfo(currentCharacter);
          updateTimers();

          if (isOnCooldown(currentCharacter)) {
            await waitForCooldownReady(token, 'Move to bank complete.');
          }
        } catch (error: any) {
          console.error('Auto-craft bank move error:', error);
          const message = error.response?.data?.error?.message || error.message || 'Move failed';
          renderFightState(`Auto-craft stopped: ${message}`, 'error');
          showStatus(`Error: ${message}`, 'error');
          return false;
        }
      }

      for (let i = 0; i < toWithdraw.length; i += 20) {
        if (token !== craftAutomationToken || !craftAutomationActive) {
          return false;
        }

        try {
          showStatus('Withdrawing crafting ingredients...', 'info');
          const chunk = toWithdraw.slice(i, i + 20);
          const result = await api.withdrawBankItems(currentCharacter.name, chunk);
          currentCharacter = result.character;
          bankItems = result.bank;
          setCooldownFromResponse(result.cooldown, 'bank withdraw');

          updateCharacterInfo(currentCharacter);
          updateTimers();

          if (isOnCooldown(currentCharacter)) {
            await waitForCooldownReady(token, 'Bank withdraw complete.');
          }
        } catch (error: any) {
          console.error('Auto-craft bank withdraw error:', error);
          const message = error.response?.data?.error?.message || error.message || 'Withdraw failed';
          renderFightState(`Auto-craft stopped: ${message}`, 'error');
          showStatus(`Error: ${message}`, 'error');
          return false;
        }
      }
    }

    if (!isCharacterOnTile(currentCharacter, workshopTile)) {
      try {
        renderFightState(`Auto-craft: moving to (${workshopTile.x}, ${workshopTile.y})...`, 'info');
        showStatus(`Moving to (${workshopTile.x}, ${workshopTile.y})...`, 'info');
        const moveData = await api.moveCharacter(currentCharacter.name, workshopTile.x, workshopTile.y);
        currentCharacter = moveData.character;
        setCooldownFromResponse(moveData.cooldown, 'move');

        renderMap(currentMap, currentCharacter);
        updateCharacterInfo(currentCharacter);
        updateTimers();

        if (isOnCooldown(currentCharacter)) {
          await waitForCooldownReady(token, 'Move complete.');
        }
      } catch (error: any) {
        console.error('Auto-craft move error:', error);
        const message = error.response?.data?.error?.message || error.message || 'Move failed';
        renderFightState(`Auto-craft stopped: ${message}`, 'error');
        showStatus(`Error: ${message}`, 'error');
        return false;
      }
    }

    try {
      renderFightState(`Auto-craft: crafting ${item.code} x1...`, 'info');
      showStatus(`Crafting ${item.code} x1...`, 'info');
      const craftData = await api.craftItem(currentCharacter.name, item.code, 1);
      currentCharacter = craftData.character;
      setCooldownFromResponse(craftData.cooldown, 'crafting');

      updateCharacterInfo(currentCharacter);
      updateTimers();

      remaining -= outputQuantity;

      if (isInventoryFull(currentCharacter)) {
        const deposited = await runAutoBankDeposit(token, workshopTile, 'craft');
        if (!deposited) {
          return false;
        }
      }

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Crafting complete.');
      }
    } catch (error: any) {
      console.error('Auto-craft error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Craft failed';
      renderFightState(`Auto-craft stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  if (!isCharacterOnTile(currentCharacter, returnTile)) {
    try {
      renderFightState(`Auto-craft: returning to (${returnTile.x}, ${returnTile.y})...`, 'info');
      showStatus(`Returning to (${returnTile.x}, ${returnTile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, returnTile.x, returnTile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Return to workshop complete.');
      }
    } catch (error: any) {
      console.error('Auto-craft return move error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      renderFightState(`Auto-craft stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  return true;
}

async function runAutoCraftBankCycle(token: number, item: Item, returnTile: MapTile): Promise<boolean> {
  if (!api || !currentCharacter) {
    return false;
  }

  const bankTile = getBankTile();
  if (!bankTile) {
    renderFightState('Auto-craft stopped: no bank found on this map', 'error');
    showStatus('No bank found on this map', 'error');
    return false;
  }

  if (!isCharacterOnTile(currentCharacter, bankTile)) {
    try {
      renderFightState(`Auto-craft: moving to bank (${bankTile.x}, ${bankTile.y})...`, 'info');
      showStatus(`Moving to bank (${bankTile.x}, ${bankTile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, bankTile.x, bankTile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Move to bank complete.');
      }
    } catch (error: any) {
      console.error('Auto-craft bank move error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      renderFightState(`Auto-craft stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  if (token !== craftAutomationToken || !craftAutomationActive) {
    return false;
  }

  const inventoryItems = (currentCharacter.inventory || [])
    .filter((entry: any) => entry && entry.code && entry.quantity > 0)
    .map((entry: any) => ({ code: entry.code, quantity: entry.quantity }));

  for (let i = 0; i < inventoryItems.length; i += 20) {
    if (token !== craftAutomationToken || !craftAutomationActive) {
      return false;
    }

    try {
      showStatus('Depositing inventory items...', 'info');
      const chunk = inventoryItems.slice(i, i + 20);
      const result = await api.depositBankItems(currentCharacter.name, chunk);
      currentCharacter = result.character;
      bankItems = result.bank;
      setCooldownFromResponse(result.cooldown, 'bank deposit');

      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Bank deposit complete.');
      }
    } catch (error: any) {
      console.error('Auto-craft bank deposit error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Deposit failed';
      renderFightState(`Auto-craft stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  if (token !== craftAutomationToken || !craftAutomationActive) {
    return false;
  }

  const capacity = currentCharacter.inventory_max_items || 0;
  const outputQuantity = item.craft?.quantity || 1;
  const remainingActions = craftAutomationTargetRemaining !== null
    ? Math.ceil(craftAutomationTargetRemaining / outputQuantity)
    : Number.POSITIVE_INFINITY;
  const maxCrafts = Math.min(getMaxCraftableFromBankWithCapacity(item, bankItems, capacity), remainingActions);
  if (maxCrafts <= 0) {
    return false;
  }

  const requirements = item.craft?.items || [];
  const withdrawal = requirements.map(req => ({
    code: req.code,
    quantity: req.quantity * maxCrafts
  }));

  for (let i = 0; i < withdrawal.length; i += 20) {
    if (token !== craftAutomationToken || !craftAutomationActive) {
      return false;
    }

    try {
      showStatus('Withdrawing crafting ingredients...', 'info');
      const chunk = withdrawal.slice(i, i + 20);
      const result = await api.withdrawBankItems(currentCharacter.name, chunk);
      currentCharacter = result.character;
      bankItems = result.bank;
      setCooldownFromResponse(result.cooldown, 'bank withdraw');

      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Bank withdraw complete.');
      }
    } catch (error: any) {
      console.error('Auto-craft bank withdraw error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Withdraw failed';
      renderFightState(`Auto-craft stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  if (token !== craftAutomationToken || !craftAutomationActive) {
    return false;
  }

  if (!isCharacterOnTile(currentCharacter, returnTile)) {
    try {
      renderFightState(`Auto-craft: returning to (${returnTile.x}, ${returnTile.y})...`, 'info');
      showStatus(`Returning to (${returnTile.x}, ${returnTile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, returnTile.x, returnTile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Return to workshop complete.');
      }
    } catch (error: any) {
      console.error('Auto-craft return move error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      renderFightState(`Auto-craft stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  return true;
}

async function runAutoBankDeposit(
  token: number,
  returnTile: MapTile,
  context: 'gather' | 'craft' = 'gather'
): Promise<boolean> {
  if (!api || !currentCharacter) {
    return false;
  }

  const isActive = context === 'craft' ? craftAutomationActive : gatherAutomationActive;
  const activeToken = context === 'craft' ? craftAutomationToken : gatherAutomationToken;
  const label = context === 'craft' ? 'Auto-craft' : 'Auto-gather';

  const bankTile = getBankTile();
  if (!bankTile) {
    renderFightState('Auto-gather stopped: no bank found on this map', 'error');
    showStatus('No bank found on this map', 'error');
    return false;
  }

  if (!isCharacterOnTile(currentCharacter, bankTile)) {
    try {
      renderFightState(`${label}: moving to bank (${bankTile.x}, ${bankTile.y})...`, 'info');
      if (context === 'gather') {
        setAutomationStatus('Moving to bank');
      }
      showStatus(`Moving to bank (${bankTile.x}, ${bankTile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, bankTile.x, bankTile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Move to bank complete.');
      }
    } catch (error: any) {
      console.error(`${label} bank move error:`, error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      renderFightState(`${label} stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  if (token !== activeToken || !isActive) {
    return false;
  }

  const inventoryItems = (currentCharacter.inventory || [])
    .filter((entry: any) => entry && entry.code && entry.quantity > 0)
    .map((entry: any) => ({ code: entry.code, quantity: entry.quantity }));

  if (inventoryItems.length === 0) {
    return true;
  }

  for (let i = 0; i < inventoryItems.length; i += 20) {
    if (token !== activeToken || !isActive) {
      return false;
    }

    try {
      if (context === 'gather') {
        setAutomationStatus('Depositing items');
      }
      showStatus('Depositing inventory items...', 'info');
      const chunk = inventoryItems.slice(i, i + 20);
      const result = await api.depositBankItems(currentCharacter.name, chunk);
      currentCharacter = result.character;
      bankItems = result.bank;
      setCooldownFromResponse(result.cooldown, 'bank deposit');

      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Bank deposit complete.');
      }
    } catch (error: any) {
      console.error(`${label} bank deposit error:`, error);
      const message = error.response?.data?.error?.message || error.message || 'Deposit failed';
      renderFightState(`${label} stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  if (token !== activeToken || !isActive) {
    return false;
  }

  if (!isCharacterOnTile(currentCharacter, returnTile)) {
    try {
      renderFightState(`${label}: returning to (${returnTile.x}, ${returnTile.y})...`, 'info');
      if (context === 'gather') {
        setAutomationStatus('Returning to resource');
      }
      showStatus(`Returning to (${returnTile.x}, ${returnTile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, returnTile.x, returnTile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();

      if (isOnCooldown(currentCharacter)) {
        await waitForCooldownReady(token, 'Return to resource complete.');
      }
    } catch (error: any) {
      console.error(`${label} return move error:`, error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      renderFightState(`${label} stopped: ${message}`, 'error');
      showStatus(`Error: ${message}`, 'error');
      return false;
    }
  }

  return true;
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

function startGatherAutomation(tile: MapTile, mode: 'woodcutting' | 'fishing' | 'mining' | 'alchemy') {
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
    : mode === 'fishing'
    ? isFishingSpot(tile)
    : isAlchemyField(tile);
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
    : mode === 'fishing'
    ? `Auto: Fishing ${resourceCode}`
    : `Auto: Gathering ${resourceCode}`;

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

function stopCraftAutomation(message: string) {
  if (!craftAutomationActive) {
    return;
  }
  craftAutomationActive = false;
  craftAutomationItemCode = null;
  craftAutomationStartedAt = null;
  craftAutomationLabel = null;
  craftAutomationTargetRemaining = null;
  craftAutomationToken += 1;
  updateAutomationControls();
  renderFightState(message, 'info');
  showStatus(message, 'info');

  if (currentCharacter && craftModal.classList.contains('visible')) {
    renderCraftModal(currentCharacter);
  }
}


function stopAllAutomation(message: string) {
  if (fightAutomationActive) {
    stopFightAutomation(message);
  }
  if (gatherAutomationActive) {
    stopGatherAutomation(message);
  }
  if (craftAutomationActive) {
    stopCraftAutomation(message);
  }
}

function scheduleFightAfterCooldown(monsterCode: string) {
  if (!currentCharacter) return;
  if (pendingFightTimeout) {
    clearTimeout(pendingFightTimeout);
    pendingFightTimeout = null;
  }

  const delayMs = Math.max(getRemainingCooldownMs(currentCharacter), 0);

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

    setCooldownFromResponse(fightData.cooldown, 'fight');

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
    if (bankModal.classList.contains('visible') && bankDetails && currentCharacter) {
      renderBankModal(bankDetails, bankItems, currentCharacter);
    }
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
  } else if (craftAutomationActive && craftAutomationStartedAt) {
    const elapsedSeconds = Math.floor((Date.now() - craftAutomationStartedAt) / 1000);
    const actionLabel = craftAutomationLabel ? craftAutomationLabel : 'Auto: Crafting';
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
  
  tileModalInteractions.innerHTML = buildTileModalInteractions(tile);

  const content = tile.interactions.content;
  if (content && content.type?.toLowerCase() === 'resource') {
    activeTileModalResourceCode = content.code;
    const cachedResource = resourceCache.get(content.code);
    if (cachedResource) {
      tileModalInteractions.innerHTML = buildTileModalInteractions(tile, cachedResource);
    } else {
      loadTileModalResourceRequirement(tile, content.code);
    }
  } else {
    activeTileModalResourceCode = null;
  }
  
  // Position modal near cursor
  tileModal.style.left = `${event.clientX + 15}px`;
  tileModal.style.top = `${event.clientY + 15}px`;
  tileModal.classList.add('visible');
}

function hideTileModal() {
  tileModal.classList.remove('visible');
}

function buildTileModalInteractions(tile: MapTile, resource?: Resource): string {
  const interactions: string[] = [];

  if (tile.interactions.content) {
    const content = tile.interactions.content;
    interactions.push(`<div class="interaction-item"><span class="interaction-type">${content.type}</span>: ${content.code}</div>`);

    if (
      resource &&
      content.type?.toLowerCase() === 'resource' &&
      currentCharacter &&
      getGatheringLevel(currentCharacter, resource.skill) < resource.level
    ) {
      const skillName = formatSkillName(resource.skill);
      interactions.push(`<div class="interaction-item"><span class="interaction-type">Requires</span> Lv ${resource.level} ${skillName}</div>`);
    }
  }

  if (tile.interactions.transition) {
    const trans = tile.interactions.transition;
    interactions.push(`<div class="interaction-item"><span class="interaction-type">transition</span>: to (${trans.x}, ${trans.y}) layer ${trans.layer}</div>`);
  }

  if (interactions.length === 0) {
    return '<div class="no-interactions">No interactions available</div>';
  }

  return interactions.join('');
}

async function loadTileModalResourceRequirement(tile: MapTile, code: string) {
  if (!api || resourceCache.has(code) || resourceRequests.has(code)) {
    return;
  }

  resourceRequests.add(code);
  const requestId = ++activeTileModalResourceRequestId;

  try {
    const resource = await api.getResource(code);
    resourceCache.set(code, resource);
    if (requestId !== activeTileModalResourceRequestId) {
      return;
    }
    if (activeTileModalResourceCode === code) {
      tileModalInteractions.innerHTML = buildTileModalInteractions(tile, resource);
    }
  } catch (error) {
    console.error('Resource fetch error:', error);
  } finally {
    resourceRequests.delete(code);
  }
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
    updateGatherMenuState(tile);
  }

  const hasFishing = isFishingSpot(tile);
  fishMenuItem.style.display = hasFishing ? 'flex' : 'none';

  if (hasFishing) {
    updateGatherMenuState(tile);
  }

  const hasMining = isMiningNode(tile);
  miningMenuItem.style.display = hasMining ? 'flex' : 'none';

  if (hasMining) {
    updateGatherMenuState(tile);
  }

  const hasBank = isBankTile(tile);
  bankMenuItem.style.display = hasBank ? 'flex' : 'none';

  if (hasBank) {
    if (!currentCharacter || isOnCooldown(currentCharacter)) {
      bankMenuItem.classList.add('disabled');
    } else {
      bankMenuItem.classList.remove('disabled');
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

  const isNpc = isNpcNode(tile);
  npcMenuItem.style.display = isNpc ? 'flex' : 'none';

  if (isNpc) {
    if (!currentCharacter || isOnCooldown(currentCharacter)) {
      npcMenuItem.classList.add('disabled');
    } else {
      npcMenuItem.classList.remove('disabled');
    }
  }

  const isTasksMaster = isTasksMasterTile(tile);
  taskMenuItem.style.display = isTasksMaster ? 'flex' : 'none';

  if (isTasksMaster) {
    if (!currentCharacter || isOnCooldown(currentCharacter)) {
      taskMenuItem.classList.add('disabled');
    } else {
      taskMenuItem.classList.remove('disabled');
    }
  }

  const content = tile.interactions.content;
  if (content && content.type?.toLowerCase() === 'resource') {
    ensureResourceDetails(content.code).then(() => {
      if (contextMenuTarget?.tile === tile && contextMenu.classList.contains('visible')) {
        updateGatherMenuState(tile);
      }
    });
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
    setCooldownFromResponse(moveData.cooldown, 'move');
    
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
      setCooldownFromResponse(moveData.cooldown, 'move');

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
    setCooldownFromResponse(restData.cooldown, 'rest');

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
    setCooldownFromResponse(equipData.cooldown, 'unequip');

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
    setCooldownFromResponse(equipData.cooldown, 'equip');

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
    setCooldownFromResponse(useData.cooldown, 'use');

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

  const delayMs = Math.max(getRemainingCooldownMs(currentCharacter), 0);
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

  const delayMs = Math.max(getRemainingCooldownMs(currentCharacter), 0);
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

  const delayMs = Math.max(getRemainingCooldownMs(currentCharacter), 0);
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
    setCooldownFromResponse(gatherData.cooldown, 'fishing');

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
    setCooldownFromResponse(gatherData.cooldown, 'woodcutting');

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
    setCooldownFromResponse(gatherData.cooldown, 'mining');

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
      setCooldownFromResponse(moveData.cooldown, 'move');

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
      setCooldownFromResponse(moveData.cooldown, 'move');

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
      setCooldownFromResponse(moveData.cooldown, 'move');

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

  craftAutomationWorkshopTile = tile;

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
      setCooldownFromResponse(moveData.cooldown, 'move');

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

  showStatus('Loading workshop items...', 'info');
  const items = await ensureAllItems();
  openCraftModal(skill, content.code, items, currentCharacter);
}

async function handleNpcAction() {
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
  if (!content || content.type?.toLowerCase() !== 'npc') {
    showStatus('No NPC on this tile', 'error');
    return;
  }

  hideContextMenu();

  if (!isCharacterOnTile(currentCharacter, tile)) {
    try {
      showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();
    } catch (error: any) {
      console.error('Move before NPC error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      showStatus(`Error: ${message}`, 'error');
      return;
    }
  }

  npcModalBody.innerHTML = '<div class="fight-empty">Loading NPC items...</div>';
  npcModal.classList.add('visible');

  try {
    showStatus('Loading NPC items...', 'info');
    const items = await api.getNpcItems(content.code);
    openNpcModal(content.code, items, currentCharacter);
  } catch (error: any) {
    console.error('NPC items load error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Failed to load NPC items';
    showStatus(`Error: ${message}`, 'error');
    npcModalBody.innerHTML = `<div class="fight-empty">${escapeHtml(message)}</div>`;
  }
}

async function handleNpcBuyItem(code: string, quantity: number) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus(`Buying ${code} x${quantity}...`, 'info');
    const result = await api.buyNpcItem(currentCharacter.name, code, quantity);
    currentCharacter = result.character;
    setCooldownFromResponse(result.cooldown, 'npc buy');

    updateCharacterInfo(currentCharacter);
    updateTimers();
    if (npcModalState) {
      renderNpcModal(currentCharacter);
    }

    showStatus(`Bought ${code} x${quantity}.`, 'success');
  } catch (error: any) {
    console.error('NPC buy error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Buy failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleNpcSellItem(code: string, quantity: number) {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  if (getInventoryQuantity(currentCharacter, code) < quantity) {
    showStatus('Not enough items to sell', 'error');
    return;
  }

  try {
    showStatus(`Selling ${code} x${quantity}...`, 'info');
    const result = await api.sellNpcItem(currentCharacter.name, code, quantity);
    currentCharacter = result.character;
    setCooldownFromResponse(result.cooldown, 'npc sell');

    updateCharacterInfo(currentCharacter);
    updateTimers();
    if (npcModalState) {
      renderNpcModal(currentCharacter);
    }

    showStatus(`Sold ${code} x${quantity}.`, 'success');
  } catch (error: any) {
    console.error('NPC sell error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Sell failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleTaskAction() {
  if (!contextMenuTarget || !currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  const { tile } = contextMenuTarget;
  if (!isTasksMasterTile(tile)) {
    showStatus('No Tasks Master on this tile', 'error');
    return;
  }

  hideContextMenu();

  if (!isCharacterOnTile(currentCharacter, tile)) {
    try {
      showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();
    } catch (error: any) {
      console.error('Move before tasks error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      showStatus(`Error: ${message}`, 'error');
      return;
    }
  }

  taskModalBody.innerHTML = '<div class="fight-empty">Loading tasks...</div>';
  taskModal.classList.add('visible');
  taskModalState = { tile };

  try {
    showStatus('Loading task rewards...', 'info');
    await ensureTaskRewardsLoaded();
    renderTaskModal(currentCharacter);
  } catch (error: any) {
    console.error('Task rewards load error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Failed to load task rewards';
    showStatus(`Error: ${message}`, 'error');
    taskModalBody.innerHTML = `<div class="fight-empty">${escapeHtml(message)}</div>`;
  }
}

function formatRewardSummary(rewards: { items: SimpleItem[]; gold: number }): string {
  const parts: string[] = [];
  if (rewards.gold) {
    parts.push(`${rewards.gold} gold`);
  }
  if (rewards.items && rewards.items.length > 0) {
    const itemLabel = rewards.items.map(item => `${item.code} x${item.quantity}`).join(', ');
    parts.push(itemLabel);
  }
  return parts.length ? parts.join(' · ') : 'No rewards';
}

function renderAvailableTasks(tasks: TaskFull[]) {
  const rows = tasks.length
    ? tasks.map(task => {
        const skillLabel = task.skill ? ` · ${task.skill}` : '';
        const quantityLabel = `${task.min_quantity}-${task.max_quantity}`;
        const rewardsLabel = formatRewardSummary(task.rewards);
        return `
          <div class="task-reward">
            <div>
              <div><strong>${escapeHtml(task.code)}</strong></div>
              <div class="npc-item-sub">Lvl ${task.level} · ${escapeHtml(task.type)} · ${quantityLabel}${escapeHtml(skillLabel)}</div>
            </div>
            <div class="npc-item-sub">${escapeHtml(rewardsLabel)}</div>
          </div>
        `;
      }).join('')
    : '<div class="fight-empty">No tasks found</div>';

  taskModalTitle.textContent = 'Available Tasks';
  taskModalBody.innerHTML = `
    <div class="task-section">
      <h4>Task List</h4>
      ${rows}
    </div>
  `;
  taskModal.classList.add('visible');
}

async function handleViewTasks() {
  if (!api) {
    showStatus('Load map and character first', 'error');
    return;
  }

  taskModalTitle.textContent = 'Available Tasks';
  taskModalBody.innerHTML = '<div class="fight-empty">Loading tasks...</div>';
  taskModal.classList.add('visible');

  try {
    showStatus('Loading tasks list...', 'info');
    const tasks = await api.getAllTasks();
    renderAvailableTasks(tasks);
  } catch (error: any) {
    console.error('Task list error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Failed to load tasks';
    showStatus(`Error: ${message}`, 'error');
    taskModalBody.innerHTML = `<div class="fight-empty">${escapeHtml(message)}</div>`;
  }
}

async function handleTaskNew() {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus('Requesting new task...', 'info');
    const result = await api.acceptNewTask(currentCharacter.name);
    currentCharacter = result.character;
    setCooldownFromResponse(result.cooldown, 'task new');

    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderTaskModal(currentCharacter);

    showStatus(`New task: ${result.task.code} (${result.task.total})`, 'success');
  } catch (error: any) {
    console.error('Task new error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Task request failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleTaskComplete() {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus('Completing task...', 'info');
    const result = await api.completeTask(currentCharacter.name);
    currentCharacter = result.character;
    setCooldownFromResponse(result.cooldown, 'task complete');

    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderTaskModal(currentCharacter);

    showStatus(`Task completed. Rewards: ${formatRewardSummary(result.rewards)}`, 'success');
  } catch (error: any) {
    console.error('Task complete error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Task complete failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleTaskCancel() {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus('Cancelling task...', 'info');
    const result = await api.cancelTask(currentCharacter.name);
    currentCharacter = result.character;
    setCooldownFromResponse(result.cooldown, 'task cancel');

    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderTaskModal(currentCharacter);

    showStatus('Task cancelled.', 'success');
  } catch (error: any) {
    console.error('Task cancel error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Task cancel failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleTaskExchange() {
  if (!currentCharacter || !api) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus('Exchanging task coins...', 'info');
    const result = await api.exchangeTaskCoins(currentCharacter.name);
    currentCharacter = result.character;
    setCooldownFromResponse(result.cooldown, 'task exchange');

    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderTaskModal(currentCharacter);

    showStatus(`Exchanged coins. Rewards: ${formatRewardSummary(result.rewards)}`, 'success');
  } catch (error: any) {
    console.error('Task exchange error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Task exchange failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleTaskTrade(code: string, quantity: number) {
  if (!currentCharacter || !api) {
    return;
  }

  if (!code || quantity <= 0) {
    showStatus('Enter item code and quantity', 'error');
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus(`Trading ${code} x${quantity}...`, 'info');
    const result = await api.tradeTaskItems(currentCharacter.name, code, quantity);
    currentCharacter = result.character;
    setCooldownFromResponse(result.cooldown, 'task trade');

    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderTaskModal(currentCharacter);

    showStatus(`Traded ${result.trade.code} x${result.trade.quantity}.`, 'success');
  } catch (error: any) {
    console.error('Task trade error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Task trade failed';
    showStatus(`Error: ${message}`, 'error');
  }
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
    setCooldownFromResponse(craftData.cooldown, 'crafting');

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

function getCraftModalItem(code: string): Item | null {
  if (craftModalState) {
    const found = craftModalState.items.find(item => item.code === code);
    if (found) {
      return found;
    }
  }

  if (itemCache.has(code)) {
    return itemCache.get(code) || null;
  }

  if (allItemsCache) {
    return allItemsCache.find(item => item.code === code) || null;
  }

  return null;
}

async function toggleCraftAutomation(code: string) {
  if (!currentCharacter || !api) {
    showStatus('Load a character first', 'error');
    return;
  }

  if (craftAutomationActive) {
    if (craftAutomationItemCode === code) {
      craftAutoEnabled = false;
      craftAutoItemCode = null;
      stopCraftAutomation('Auto-craft stopped');
    } else {
      showStatus('Automation already running', 'info');
    }
    return;
  }

  if (craftAutoEnabled && craftAutoItemCode === code) {
    craftAutoEnabled = false;
    craftAutoItemCode = null;
    if (craftModal.classList.contains('visible')) {
      renderCraftModal(currentCharacter);
    }
    return;
  }

  if (fightAutomationActive || gatherAutomationActive) {
    showStatus('Automation already running', 'info');
    return;
  }

  const item = getCraftModalItem(code);
  if (!item || !item.craft) {
    showStatus('Craft item data not found', 'error');
    return;
  }

  if (!craftAutomationWorkshopTile) {
    showStatus('No workshop selected for auto-craft', 'error');
    return;
  }

  const loaded = await ensureBankItemsLoaded();
  if (!loaded) {
    return;
  }

  craftAutoEnabled = true;
  craftAutoItemCode = code;

  if (!craftAutoTargetQuantities.has(code)) {
    const defaultTarget = Math.max(1, getMaxCraftableWithBank(item, currentCharacter));
    craftAutoTargetQuantities.set(code, defaultTarget);
  }

  if (craftModal.classList.contains('visible')) {
    renderCraftModal(currentCharacter);
  }
}

async function startCraftAutomation(code: string) {
  if (!currentCharacter || !api) {
    showStatus('Load a character first', 'error');
    return;
  }

  if (!craftAutoEnabled || craftAutoItemCode !== code) {
    showStatus('Enable Auto before starting', 'info');
    return;
  }

  if (fightAutomationActive || gatherAutomationActive || craftAutomationActive) {
    showStatus('Automation already running', 'info');
    return;
  }

  const item = getCraftModalItem(code);
  if (!item || !item.craft) {
    showStatus('Craft item data not found', 'error');
    return;
  }

  if (!craftAutomationWorkshopTile) {
    showStatus('No workshop selected for auto-craft', 'error');
    return;
  }

  const loaded = await ensureBankItemsLoaded();
  if (!loaded) {
    return;
  }

  const targetQuantity = craftAutoTargetQuantities.get(code) || Math.max(1, getMaxCraftableWithBank(item, currentCharacter));
  craftAutomationTargetRemaining = targetQuantity;

  craftAutomationActive = true;
  craftAutomationItemCode = code;
  craftAutomationStartedAt = Date.now();
  craftAutomationLabel = `Auto: Crafting ${code} x${targetQuantity}`;
  craftAutomationToken += 1;
  updateAutomationControls();

  closeCraftModal();
  renderFightState(`Auto-craft started for ${code}.`, 'info');
  showStatus(`Auto-craft started for ${code}`, 'success');

  runCraftAutomation(craftAutomationToken, item);
}

async function handleBankAction() {
  if (!contextMenuTarget || !currentCharacter || !api) {
    return;
  }

  const { tile } = contextMenuTarget;
  if (!isBankTile(tile)) {
    showStatus('No bank on this tile', 'error');
    return;
  }

  hideContextMenu();

  if (!isCharacterOnTile(currentCharacter, tile)) {
    try {
      showStatus(`Moving to (${tile.x}, ${tile.y})...`, 'info');
      const moveData = await api.moveCharacter(currentCharacter.name, tile.x, tile.y);
      currentCharacter = moveData.character;
      setCooldownFromResponse(moveData.cooldown, 'move');

      renderMap(currentMap, currentCharacter);
      updateCharacterInfo(currentCharacter);
      updateTimers();
    } catch (error: any) {
      console.error('Move before bank error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Move failed';
      showStatus(`Error: ${message}`, 'error');
      return;
    }
  }

  openBankModal();
  bankModalBody.innerHTML = '<div class="fight-empty">Loading bank...</div>';

  try {
    showStatus('Loading bank details...', 'info');
    const [details, items] = await Promise.all([
      api.getBankDetails(),
      api.getAllBankItems()
    ]);
    bankDetails = details;
    bankItems = items;
    updateCharacterInfo(currentCharacter);
    renderBankModal(bankDetails, bankItems, currentCharacter);
  } catch (error: any) {
    console.error('Bank load error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Failed to load bank';
    showStatus(`Error: ${message}`, 'error');
    bankModalBody.innerHTML = `<div class="fight-empty">${message}</div>`;
  }
}

async function handleBankDepositItem(code: string, quantity: number) {
  if (!currentCharacter || !api || !bankDetails) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus(`Depositing ${code} x${quantity}...`, 'info');
    const result = await api.depositBankItems(currentCharacter.name, [{ code, quantity }]);
    currentCharacter = result.character;
    bankItems = result.bank;
    setCooldownFromResponse(result.cooldown, 'bank deposit');
    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderBankModal(bankDetails, bankItems, currentCharacter);
    showStatus(`Deposited ${code} x${quantity}.`, 'success');
  } catch (error: any) {
    console.error('Bank deposit error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Deposit failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleBankDepositAll() {
  if (!currentCharacter || !api || !bankDetails) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  const items = (currentCharacter.inventory || [])
    .filter((entry: any) => entry && entry.code && entry.quantity > 0)
    .map((entry: any) => ({ code: entry.code, quantity: entry.quantity }));

  if (items.length === 0) {
    showStatus('Inventory is empty', 'info');
    return;
  }

  try {
    showStatus('Depositing all inventory items...', 'info');
    const result = await api.depositBankItems(currentCharacter.name, items);
    currentCharacter = result.character;
    bankItems = result.bank;
    setCooldownFromResponse(result.cooldown, 'bank deposit');
    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderBankModal(bankDetails, bankItems, currentCharacter);
    showStatus('Deposited all inventory items.', 'success');
  } catch (error: any) {
    console.error('Bank deposit all error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Deposit failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleBankWithdrawItem(code: string, quantity: number) {
  if (!currentCharacter || !api || !bankDetails) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus(`Withdrawing ${code} x${quantity}...`, 'info');
    const result = await api.withdrawBankItems(currentCharacter.name, [{ code, quantity }]);
    currentCharacter = result.character;
    bankItems = result.bank;
    setCooldownFromResponse(result.cooldown, 'bank withdraw');
    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderBankModal(bankDetails, bankItems, currentCharacter);
    showStatus(`Withdrew ${code} x${quantity}.`, 'success');
  } catch (error: any) {
    console.error('Bank withdraw error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Withdraw failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleBankDepositGold(quantity: number) {
  if (!currentCharacter || !api || !bankDetails) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus(`Depositing ${quantity} gold...`, 'info');
    const result = await api.depositBankGold(currentCharacter.name, quantity);
    currentCharacter = result.character;
    bankDetails = { ...bankDetails, gold: result.bank.quantity };
    setCooldownFromResponse(result.cooldown, 'bank deposit');
    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderBankModal(bankDetails, bankItems, currentCharacter);
    showStatus(`Deposited ${quantity} gold.`, 'success');
  } catch (error: any) {
    console.error('Bank gold deposit error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Deposit failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleBankWithdrawGold(quantity: number) {
  if (!currentCharacter || !api || !bankDetails) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus(`Withdrawing ${quantity} gold...`, 'info');
    const result = await api.withdrawBankGold(currentCharacter.name, quantity);
    currentCharacter = result.character;
    bankDetails = { ...bankDetails, gold: result.bank.quantity };
    setCooldownFromResponse(result.cooldown, 'bank withdraw');
    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderBankModal(bankDetails, bankItems, currentCharacter);
    showStatus(`Withdrew ${quantity} gold.`, 'success');
  } catch (error: any) {
    console.error('Bank gold withdraw error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Withdraw failed';
    showStatus(`Error: ${message}`, 'error');
  }
}

async function handleBankBuyExpansion() {
  if (!currentCharacter || !api || !bankDetails) {
    return;
  }

  if (isOnCooldown(currentCharacter)) {
    const remaining = getRemainingCooldown(currentCharacter);
    showStatus(`Character is on cooldown for ${remaining} seconds`, 'error');
    return;
  }

  try {
    showStatus('Buying bank expansion...', 'info');
    const result = await api.buyBankExpansion(currentCharacter.name);
    currentCharacter = result.character;
    setCooldownFromResponse(result.cooldown, 'bank expansion');
    bankDetails = await api.getBankDetails();
    updateCharacterInfo(currentCharacter);
    updateTimers();
    renderBankModal(bankDetails, bankItems, currentCharacter);
    showStatus(`Bank expansion bought (${result.transaction.price} gold).`, 'success');
  } catch (error: any) {
    console.error('Bank expansion error:', error);
    const message = error.response?.data?.error?.message || error.message || 'Expansion failed';
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

        if (toggleNpcLabels.checked && isNpcNode(tile)) {
          const npcIcon = document.createElement('div');
          npcIcon.className = 'resource-icon npc';
          npcIcon.textContent = 'NPC';
          cell.appendChild(npcIcon);
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

  if (bankDetails) {
    const bankTotal = bankItems.reduce((total, entry) => total + entry.quantity, 0);
    html += `<div class="info-item"><span class="info-label">Bank Items:</span> <span class="info-value">${bankTotal.toLocaleString()}</span></div>`;
  }
  
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

  html += '<div class="info-item">';
  html += '<button id="viewTasksInlineBtn" class="task-btn">View Tasks</button>';
  html += '</div>';
  
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

  if (bankDetails) {
    html += '<div class="info-section">';
    html += '<div class="info-section-header" data-section="char-bank">Bank Items</div>';
    html += '<div class="info-section-content" id="section-char-bank">';

    if (bankItems.length > 0) {
      bankItems.forEach((entry) => {
        html += `<div class="info-item"><span class="info-value">${entry.code} x${entry.quantity}</span></div>`;
      });
    } else {
      html += '<div class="info-item"><span class="info-value" style="color: #666;">Empty</span></div>';
    }

    html += '</div></div>';
  }
  
  html += '</div>';
  characterInfo.innerHTML = html;

  const viewTasksInlineBtn = document.getElementById('viewTasksInlineBtn') as HTMLButtonElement | null;
  if (viewTasksInlineBtn) {
    viewTasksInlineBtn.disabled = !api;
    viewTasksInlineBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handleViewTasks();
    });
  }
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

toggleNpcLabels.addEventListener('change', () => {
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
  if (!meetsResourceRequirement(targetTile, currentCharacter)) {
    showStatus('Requires higher woodcutting level', 'error');
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
  if (!meetsResourceRequirement(targetTile, currentCharacter)) {
    showStatus('Requires higher woodcutting level', 'error');
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
  if (!meetsResourceRequirement(targetTile, currentCharacter)) {
    showStatus('Requires higher mining level', 'error');
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
  if (!meetsResourceRequirement(targetTile, currentCharacter)) {
    showStatus('Requires higher mining level', 'error');
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
  if (!meetsResourceRequirement(targetTile, currentCharacter)) {
    showStatus('Requires higher fishing level', 'error');
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
  if (!meetsResourceRequirement(targetTile, currentCharacter)) {
    showStatus('Requires higher fishing level', 'error');
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
npcMenuItem.addEventListener('click', () => {
  if (!npcMenuItem.classList.contains('disabled')) {
    handleNpcAction();
  }
});
taskMenuItem.addEventListener('click', () => {
  if (!taskMenuItem.classList.contains('disabled')) {
    handleTaskAction();
  }
});
bankMenuItem.addEventListener('click', () => {
  if (!bankMenuItem.classList.contains('disabled')) {
    handleBankAction();
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
bankModalClose.addEventListener('click', closeBankModal);
bankModal.addEventListener('click', (event) => {
  if (event.target === bankModal) {
    closeBankModal();
  }
});
npcModalClose.addEventListener('click', closeNpcModal);
npcModal.addEventListener('click', (event) => {
  if (event.target === npcModal) {
    closeNpcModal();
  }
});
taskModalClose.addEventListener('click', closeTaskModal);
taskModal.addEventListener('click', (event) => {
  if (event.target === taskModal) {
    closeTaskModal();
  }
});

craftModalBody.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const autoButton = target.closest('.craft-auto-btn') as HTMLButtonElement | null;
  if (autoButton) {
    const code = autoButton.dataset.code;
    if (code) {
      toggleCraftAutomation(code);
    }
    return;
  }
  const button = target.closest('.craft-btn') as HTMLButtonElement | null;
  if (!button) {
    return;
  }
  const code = button.dataset.code;
  if (code) {
    if (craftAutoEnabled && craftAutoItemCode === code) {
      startCraftAutomation(code);
      return;
    }
    const container = button.closest('.craft-item');
    const quantitySelect = container?.querySelector('.craft-qty') as HTMLSelectElement | null;
    const rawQuantity = quantitySelect?.value ? Number.parseInt(quantitySelect.value, 10) : 1;
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
    handleCraftItem(code, quantity);
  }
});

craftModalBody.addEventListener('change', (event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target || !target.classList.contains('craft-qty')) {
    return;
  }
  const code = target.dataset.code;
  if (!code) {
    return;
  }
  if (craftAutoEnabled && craftAutoItemCode === code && target.dataset.auto === 'true') {
    const rawQuantity = Number.parseInt(target.value, 10);
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
    craftAutoTargetQuantities.set(code, quantity);
  }
});

bankModalBody.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest('.bank-btn') as HTMLButtonElement | null;
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  if (!action) {
    return;
  }

  if (action === 'deposit-item' || action === 'withdraw-item') {
    const code = button.dataset.code;
    if (!code) {
      return;
    }
    const container = button.closest('.bank-item');
    const qtySelect = container?.querySelector('.bank-qty') as HTMLSelectElement | null;
    const rawQuantity = qtySelect?.value ? Number.parseInt(qtySelect.value, 10) : 1;
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
    if (action === 'deposit-item') {
      handleBankDepositItem(code, quantity);
    } else {
      handleBankWithdrawItem(code, quantity);
    }
    return;
  }

  if (action === 'deposit-all') {
    handleBankDepositAll();
    return;
  }

  if (action === 'deposit-gold') {
    const input = bankModalBody.querySelector('#bankDepositGold') as HTMLInputElement | null;
    const rawQuantity = input?.value ? Number.parseInt(input.value, 10) : 0;
    const quantity = Number.isFinite(rawQuantity) ? rawQuantity : 0;
    if (quantity > 0) {
      handleBankDepositGold(quantity);
    }
    return;
  }

  if (action === 'withdraw-gold') {
    const input = bankModalBody.querySelector('#bankWithdrawGold') as HTMLInputElement | null;
    const rawQuantity = input?.value ? Number.parseInt(input.value, 10) : 0;
    const quantity = Number.isFinite(rawQuantity) ? rawQuantity : 0;
    if (quantity > 0) {
      handleBankWithdrawGold(quantity);
    }
    return;
  }

  if (action === 'buy-expansion') {
    handleBankBuyExpansion();
  }
});

npcModalBody.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest('.npc-btn') as HTMLButtonElement | null;
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const code = button.dataset.code;
  if (!action || !code) {
    return;
  }

  const container = button.closest('.npc-item');
  const qtySelect = container?.querySelector('.npc-qty') as HTMLSelectElement | null;
  const rawQuantity = qtySelect?.value ? Number.parseInt(qtySelect.value, 10) : 1;
  const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;

  if (action === 'buy') {
    handleNpcBuyItem(code, quantity);
    return;
  }

  if (action === 'sell') {
    handleNpcSellItem(code, quantity);
  }
});

taskModalBody.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest('.task-btn') as HTMLButtonElement | null;
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  if (!action) {
    return;
  }

  if (action === 'new') {
    handleTaskNew();
    return;
  }

  if (action === 'complete') {
    handleTaskComplete();
    return;
  }

  if (action === 'cancel') {
    handleTaskCancel();
    return;
  }

  if (action === 'exchange') {
    handleTaskExchange();
    return;
  }

  if (action === 'trade') {
    const codeInput = taskModalBody.querySelector('#taskTradeCode') as HTMLInputElement | null;
    const qtyInput = taskModalBody.querySelector('#taskTradeQty') as HTMLInputElement | null;
    const code = codeInput?.value?.trim() || '';
    const rawQuantity = qtyInput?.value ? Number.parseInt(qtyInput.value, 10) : 0;
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 0;
    handleTaskTrade(code, quantity);
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
