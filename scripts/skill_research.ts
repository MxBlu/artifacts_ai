import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';

type MapContent = {
  type: string;
  code: string;
};

type MapTile = {
  map_id: number;
  name: string;
  skin: string;
  x: number;
  y: number;
  layer: string;
  interactions: {
    content: MapContent | null;
    transition: any | null;
  };
};

type Character = {
  name: string;
  level: number;
  x: number;
  y: number;
  layer: string;
  cooldown_expiration?: string | null;
  inventory_max_items: number;
  inventory?: Array<{ slot: number; code: string; quantity: number }>;
  mining_level?: number;
  woodcutting_level?: number;
  fishing_level?: number;
  alchemy_level?: number;
  weaponcrafting_level?: number;
  gearcrafting_level?: number;
  jewelrycrafting_level?: number;
  cooking_level?: number;
};

type Cooldown = {
  total_seconds?: number;
  remaining_seconds?: number;
  started_at?: string;
  expiration?: string;
  reason?: string;
};

type SkillDetails = {
  xp?: number;
  items?: Array<{ code: string; quantity: number }>;
};

type SkillResponse = {
  data: {
    cooldown: Cooldown;
    details: SkillDetails;
    character: Character;
  };
};

type MovementResponse = {
  data: {
    cooldown: Cooldown;
    destination: { x: number; y: number; layer: string; name: string };
    character: Character;
  };
};

type Resource = {
  name: string;
  code: string;
  skill: 'mining' | 'woodcutting' | 'fishing' | 'alchemy';
  level: number;
  drops: Array<{ code: string; rate: number; min_quantity?: number; max_quantity?: number }>;
};

type Item = {
  name: string;
  code: string;
  level: number;
  type: string;
  subtype: string;
  craft?: {
    skill?: string;
    level?: number;
    items?: Array<{ code: string; quantity: number }>;
    quantity?: number;
  };
};

type Monster = {
  name: string;
  code: string;
  level: number;
  drops: Array<{ code: string; rate: number; quantity_min?: number; quantity_max?: number }>;
};

type ActionLog = {
  time: string;
  action: string;
  skill: string;
  target: string;
  xp: number | null;
  cooldown: number | null;
  items: string;
  location: string;
};

const BASE_URL = 'https://api.artifactsmmo.com';
const LOG_FILE = path.resolve(process.cwd(), 'SKILL_XP_LOG.md');
const PROGRESS_FILE = path.resolve(process.cwd(), 'skill_research_progress.json');

type ProgressState = {
  sampledResources: string[];
};

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Missing required env var: ${name}`);
}

function readAuthHeaders(): Record<string, string> {
  const headerPath = path.resolve(process.cwd(), 'auth_headers.txt');
  if (!fs.existsSync(headerPath)) {
    throw new Error('auth_headers.txt not found in repo root.');
  }

  const raw = fs.readFileSync(headerPath, 'utf8');
  const headers: Record<string, string> = {};
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const idx = trimmed.indexOf(':');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && value) {
      headers[key] = value;
    }
  });

  if (!headers.Authorization) {
    throw new Error('auth_headers.txt must include an Authorization header.');
  }

  return headers;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logStatus(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function getCooldownMsFromCharacter(character: Character | null): number {
  if (!character?.cooldown_expiration) return 0;
  const expiration = new Date(character.cooldown_expiration).getTime();
  const remaining = expiration - Date.now();
  return remaining > 0 ? remaining : 0;
}

async function waitForCooldown(cooldown?: Cooldown | null): Promise<void> {
  if (!cooldown) return;
  const remaining = cooldown.remaining_seconds ?? cooldown.total_seconds ?? 0;
  if (remaining > 0) {
    await sleep((remaining + 0.1) * 1000);
  }
}

async function waitForCharacterCooldown(character: Character | null): Promise<void> {
  const remainingMs = getCooldownMsFromCharacter(character);
  if (remainingMs > 0) {
    await sleep(remainingMs + 150);
  }
}

function loadProgress(): ProgressState {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return { sampledResources: [] };
  }
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as ProgressState;
    return {
      sampledResources: Array.isArray(parsed.sampledResources) ? parsed.sampledResources : []
    };
  } catch {
    return { sampledResources: [] };
  }
}

function saveProgress(state: ProgressState): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function isCooldownError(error: any): boolean {
  const code = error?.response?.data?.error?.code;
  return code === 499;
}

function isAlreadyThereError(error: any): boolean {
  const code = error?.response?.data?.error?.code;
  return code === 490;
}

async function withCooldownRetry<T>(
  label: string,
  characterName: string,
  client: AxiosInstance,
  action: () => Promise<T>
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await action();
    } catch (error: any) {
      attempt += 1;
      if (!isCooldownError(error) || attempt > 5) {
        throw error;
      }
      logStatus(`${label} hit cooldown (499). Waiting before retry ${attempt}.`);
      const character = await getCharacter(client, characterName);
      await waitForCharacterCooldown(character);
    }
  }
}

function buildClient(): AxiosInstance {
  const headers = readAuthHeaders();
  return axios.create({
    baseURL: BASE_URL,
    headers
  });
}

async function getMyCharacters(client: AxiosInstance): Promise<Character[]> {
  const response = await client.get('/my/characters');
  return response.data.data || [];
}

async function getCharacter(client: AxiosInstance, name: string): Promise<Character> {
  const response = await client.get(`/characters/${name}`);
  return response.data.data;
}

async function getMapsByLayer(client: AxiosInstance, layer: string): Promise<MapTile[]> {
  const results: MapTile[] = [];
  let page = 1;
  const size = 100;
  while (true) {
    logStatus(`Fetching map page ${page} for layer ${layer}...`);
    const response = await client.get(`/maps/${layer}`, { params: { page, size } });
    const data: MapTile[] = response.data.data || [];
    if (!data.length) break;
    results.push(...data);
    if (data.length < size) break;
    page += 1;
  }
  return results;
}

async function getAllResources(client: AxiosInstance): Promise<Resource[]> {
  const results: Resource[] = [];
  let page = 1;
  const size = 100;
  while (true) {
    logStatus(`Fetching resources page ${page}...`);
    const response = await client.get('/resources', { params: { page, size } });
    const data: Resource[] = response.data.data || [];
    if (!data.length) break;
    results.push(...data);
    if (data.length < size) break;
    page += 1;
  }
  return results;
}

async function getAllItems(client: AxiosInstance): Promise<Item[]> {
  const results: Item[] = [];
  let page = 1;
  const size = 100;
  while (true) {
    logStatus(`Fetching items page ${page}...`);
    const response = await client.get('/items', { params: { page, size } });
    const data: Item[] = response.data.data || [];
    if (!data.length) break;
    results.push(...data);
    if (data.length < size) break;
    page += 1;
  }
  return results;
}

async function getAllMonsters(client: AxiosInstance): Promise<Monster[]> {
  const results: Monster[] = [];
  let page = 1;
  const size = 100;
  while (true) {
    logStatus(`Fetching monsters page ${page}...`);
    const response = await client.get('/monsters', { params: { page, size } });
    const data: Monster[] = response.data.data || [];
    if (!data.length) break;
    results.push(...data);
    if (data.length < size) break;
    page += 1;
  }
  return results;
}

async function ensureReady(client: AxiosInstance, characterName: string, character: Character | null): Promise<Character> {
  if (character) {
    await waitForCharacterCooldown(character);
    return character;
  }
  const refreshed = await getCharacter(client, characterName);
  await waitForCharacterCooldown(refreshed);
  return refreshed;
}

async function moveTo(client: AxiosInstance, name: string, x: number, y: number, character: Character | null): Promise<Character> {
  await ensureReady(client, name, character);
  logStatus(`Moving to (${x},${y})...`);
  try {
    const response = await withCooldownRetry('move', name, client, () =>
      client.post<MovementResponse>(`/my/${name}/action/move`, { x, y })
    );
    await waitForCooldown(response.data.data.cooldown);
    return response.data.data.character;
  } catch (error: any) {
    if (isAlreadyThereError(error)) {
      logStatus('Already at destination.');
      const refreshed = await getCharacter(client, name);
      return refreshed;
    }
    throw error;
  }
}

async function gather(client: AxiosInstance, name: string, character: Character | null): Promise<SkillResponse> {
  await ensureReady(client, name, character);
  logStatus('Gathering...');
  const response = await withCooldownRetry('gather', name, client, () =>
    client.post<SkillResponse>(`/my/${name}/action/gathering`)
  );
  return response.data;
}

async function craft(client: AxiosInstance, name: string, code: string, character: Character | null, quantity = 1): Promise<SkillResponse> {
  await ensureReady(client, name, character);
  logStatus(`Crafting ${code} x${quantity}...`);
  const response = await withCooldownRetry('craft', name, client, () =>
    client.post<SkillResponse>(`/my/${name}/action/crafting`, { code, quantity })
  );
  return response.data;
}

async function fight(client: AxiosInstance, name: string, character: Character | null, participants: string[] = []): Promise<any> {
  await ensureReady(client, name, character);
  logStatus('Fighting...');
  const response = await withCooldownRetry('fight', name, client, () =>
    client.post(`/my/${name}/action/fight`, { participants })
  );
  return response.data;
}

async function depositAllInventory(client: AxiosInstance, name: string, character: Character): Promise<Character> {
  const items = (character.inventory || []).map(entry => ({ code: entry.code, quantity: entry.quantity }));
  if (!items.length) return character;
  await ensureReady(client, name, character);
  logStatus('Depositing inventory to bank...');
  const response = await withCooldownRetry('bank-deposit', name, client, () =>
    client.post(`/my/${name}/action/bank/deposit/item`, items)
  );
  await waitForCooldown(response.data.data.cooldown);
  return response.data.data.character;
}

function isInventoryFull(character: Character): boolean {
  const current = character.inventory?.length || 0;
  return current >= character.inventory_max_items;
}

function getSkillLevel(character: Character, skill: string): number {
  switch (skill) {
    case 'mining':
      return character.mining_level || 0;
    case 'woodcutting':
      return character.woodcutting_level || 0;
    case 'fishing':
      return character.fishing_level || 0;
    case 'alchemy':
      return character.alchemy_level || 0;
    case 'weaponcrafting':
      return character.weaponcrafting_level || 0;
    case 'gearcrafting':
      return character.gearcrafting_level || 0;
    case 'jewelrycrafting':
      return character.jewelrycrafting_level || 0;
    case 'cooking':
      return character.cooking_level || 0;
    default:
      return 0;
  }
}

function formatItems(items?: Array<{ code: string; quantity: number }>): string {
  if (!items || !items.length) return '-';
  return items.map(item => `${item.code} x${item.quantity}`).join(', ');
}

function buildInventoryMap(character: Character): Map<string, number> {
  const map = new Map<string, number>();
  (character.inventory || []).forEach(entry => {
    map.set(entry.code, (map.get(entry.code) || 0) + entry.quantity);
  });
  return map;
}

function hasCraftMaterials(item: Item, character: Character): boolean {
  const requirements = item.craft?.items || [];
  if (!requirements.length) return true;
  const inventory = buildInventoryMap(character);
  return requirements.every(req => (inventory.get(req.code) || 0) >= req.quantity);
}

function ensureLogFile(): void {
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '# Skill XP Research Log\n', 'utf8');
  }
}

function initLogRun(headerInfo: string): void {
  ensureLogFile();
  const lines: string[] = [];
  lines.push(`\n## ${new Date().toISOString()} - Skill XP Research`);
  lines.push('');
  lines.push(headerInfo);
  lines.push('');
  lines.push('| Time | Action | Skill | Target | XP | Cooldown | Items | Location |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  fs.appendFileSync(LOG_FILE, lines.join('\n') + '\n', 'utf8');
}

function appendLogEntry(entry: ActionLog): void {
  const line = `| ${entry.time} | ${entry.action} | ${entry.skill} | ${entry.target} | ${entry.xp ?? '-'} | ${entry.cooldown ?? '-'} | ${entry.items} | ${entry.location} |`;
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

function getWorkshopSkill(code: string): string | null {
  const normalized = code.toLowerCase();
  if (normalized.includes('weapon')) return 'weaponcrafting';
  if (normalized.includes('gear')) return 'gearcrafting';
  if (normalized.includes('jewel')) return 'jewelrycrafting';
  if (normalized.includes('cook')) return 'cooking';
  if (normalized.includes('alch')) return 'alchemy';
  return null;
}

function chooseCraftTargets(items: Item[], skill: string, level: number, maxTargets: number): Item[] {
  return items
    .filter(item => item.craft?.skill === skill && (item.craft?.level || 0) <= level)
    .sort((a, b) => (a.craft?.level || 0) - (b.craft?.level || 0))
    .slice(0, maxTargets);
}

function buildResourceIndex(resources: Resource[]): Map<string, Resource[]> {
  const index = new Map<string, Resource[]>();
  resources.forEach(resource => {
    resource.drops.forEach(drop => {
      const list = index.get(drop.code) || [];
      list.push(resource);
      index.set(drop.code, list);
    });
  });
  return index;
}

function findMonsterForDrop(monsters: Monster[], itemCode: string, minLevel: number, maxLevel: number): Monster | null {
  const candidates = monsters.filter(monster => {
    const hasDrop = monster.drops.some(drop => drop.code === itemCode);
    return hasDrop && monster.level >= minLevel && monster.level <= maxLevel;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.level - b.level);
  return candidates[0];
}

async function gatherResourceSamples(
  client: AxiosInstance,
  characterName: string,
  character: Character,
  maps: MapTile[],
  resources: Resource[],
  attemptsPerNode: number,
  logs: ActionLog[],
  progress: ProgressState
): Promise<Character> {
  const nodes = maps.filter(tile => tile.interactions?.content?.type === 'resource');
  const resourceByCode = new Map(resources.map(resource => [resource.code, resource] as const));
  const sampled = new Set(progress.sampledResources);

  for (const node of nodes) {
    const resource = resourceByCode.get(node.interactions.content!.code);
    if (!resource) continue;
    if (sampled.has(resource.code)) {
      continue;
    }
    const skillLevel = getSkillLevel(character, resource.skill);
    if (resource.level > skillLevel) continue;

    logStatus(`Sampling ${resource.code} (${resource.skill}) at ${node.layer} (${node.x},${node.y})...`);
    character = await moveTo(client, characterName, node.x, node.y, character);

    for (let i = 0; i < attemptsPerNode; i += 1) {
      if (isInventoryFull(character)) {
        const bankTile = maps.find(tile => tile.interactions?.content?.type === 'bank');
        if (!bankTile) {
          console.log('Inventory full and no bank on this layer. Stopping gather loop.');
          return character;
        }
        character = await moveTo(client, characterName, bankTile.x, bankTile.y);
        character = await depositAllInventory(client, characterName, character);
        character = await moveTo(client, characterName, node.x, node.y);
      }

      const response = await gather(client, characterName, character);
      const details = response.data.details || {};
      logs.push({
        time: new Date().toISOString(),
        action: 'gather',
        skill: resource.skill,
        target: resource.code,
        xp: details.xp ?? null,
        cooldown: response.data.cooldown?.total_seconds ?? response.data.cooldown?.remaining_seconds ?? null,
        items: formatItems(details.items),
        location: `${node.layer} (${node.x},${node.y})`
      });
      appendLogEntry(logs[logs.length - 1]);
      character = response.data.character;
      await waitForCooldown(response.data.cooldown);
    }

    sampled.add(resource.code);
    progress.sampledResources = Array.from(sampled.values()).sort();
    saveProgress(progress);
  }

  return character;
}

async function gatherForItem(
  client: AxiosInstance,
  characterName: string,
  character: Character,
  maps: MapTile[],
  resourceIndex: Map<string, Resource[]>,
  itemCode: string,
  quantity: number,
  logs: ActionLog[]
): Promise<Character> {
  const sources = resourceIndex.get(itemCode) || [];
  const viable = sources.filter(resource => resource.level <= getSkillLevel(character, resource.skill));
  if (!viable.length) {
    console.log(`No gatherable source for ${itemCode}.`);
    return character;
  }

  const targetResource = viable.sort((a, b) => a.level - b.level)[0];
  const node = maps.find(tile => tile.interactions?.content?.type === 'resource' && tile.interactions.content.code === targetResource.code);
  if (!node) {
    console.log(`No node found for resource ${targetResource.code}.`);
    return character;
  }

  logStatus(`Gathering ${itemCode} from ${targetResource.code} at ${node.layer} (${node.x},${node.y})...`);
  let remaining = quantity;
  character = await moveTo(client, characterName, node.x, node.y, character);

  if (remaining > 0) {
    if (isInventoryFull(character)) {
      const bankTile = maps.find(tile => tile.interactions?.content?.type === 'bank');
      if (!bankTile) {
        console.log('Inventory full and no bank on this layer.');
        return character;
      }
      character = await moveTo(client, characterName, bankTile.x, bankTile.y, character);
      character = await depositAllInventory(client, characterName, character);
      character = await moveTo(client, characterName, node.x, node.y, character);
    }

    const response = await gather(client, characterName, character);
    const details = response.data.details || {};
    logs.push({
      time: new Date().toISOString(),
      action: 'gather',
      skill: targetResource.skill,
      target: targetResource.code,
      xp: details.xp ?? null,
      cooldown: response.data.cooldown?.total_seconds ?? response.data.cooldown?.remaining_seconds ?? null,
      items: formatItems(details.items),
      location: `${node.layer} (${node.x},${node.y})`
    });
    appendLogEntry(logs[logs.length - 1]);
    character = response.data.character;
    const collected = details.items?.find(item => item.code === itemCode)?.quantity || 0;
    remaining -= collected;
    await waitForCooldown(response.data.cooldown);
  }

  return character;
}

async function fightForItem(
  client: AxiosInstance,
  characterName: string,
  character: Character,
  maps: MapTile[],
  monster: Monster,
  itemCode: string,
  quantity: number,
  logs: ActionLog[]
): Promise<Character> {
  const node = maps.find(tile => tile.interactions?.content?.type === 'monster' && tile.interactions.content.code === monster.code);
  if (!node) {
    console.log(`No node found for monster ${monster.code}.`);
    return character;
  }

  logStatus(`Fighting ${monster.code} for ${itemCode} at ${node.layer} (${node.x},${node.y})...`);
  character = await moveTo(client, characterName, node.x, node.y, character);
  if (isInventoryFull(character)) {
    const bankTile = maps.find(tile => tile.interactions?.content?.type === 'bank');
    if (!bankTile) {
      console.log('Inventory full and no bank on this layer.');
      return character;
    }
    character = await moveTo(client, characterName, bankTile.x, bankTile.y, character);
    character = await depositAllInventory(client, characterName, character);
    character = await moveTo(client, characterName, node.x, node.y, character);
  }

  const response = await fight(client, characterName, character);
  const data = response.data;
  const xp = data?.fight?.characters?.[0]?.xp ?? data?.fight?.xp ?? null;
  const items = data?.fight?.drops || [];
  logs.push({
    time: new Date().toISOString(),
    action: 'fight',
    skill: 'combat',
    target: monster.code,
    xp,
    cooldown: data?.cooldown?.total_seconds ?? data?.cooldown?.remaining_seconds ?? null,
    items: formatItems(items),
    location: `${node.layer} (${node.x},${node.y})`
  });
  appendLogEntry(logs[logs.length - 1]);
  character = data?.characters?.[0] || data?.character || character;
  await waitForCooldown(data?.cooldown);

  return character;
}

async function craftSamples(
  client: AxiosInstance,
  characterName: string,
  character: Character,
  maps: MapTile[],
  items: Item[],
  resources: Resource[],
  monsters: Monster[],
  maxTargets: number,
  logs: ActionLog[]
): Promise<Character> {
  const skills = ['weaponcrafting', 'gearcrafting', 'jewelrycrafting', 'cooking', 'alchemy'];
  const resourceIndex = buildResourceIndex(resources);
  const minMonsterLevelEnv = process.env.MONSTER_LEVEL_MIN;
  const maxMonsterLevelEnv = process.env.MONSTER_LEVEL_MAX;
  const minMonsterLevel = minMonsterLevelEnv ? Number(minMonsterLevelEnv) : character.level;
  const maxMonsterLevel = maxMonsterLevelEnv ? Number(maxMonsterLevelEnv) : character.level;

  for (const skill of skills) {
    const skillLevel = getSkillLevel(character, skill);
    const targets = chooseCraftTargets(items, skill, skillLevel, maxTargets);
    if (!targets.length) continue;

    const workshopTile = maps.find(tile => tile.interactions?.content?.type === 'workshop' && getWorkshopSkill(tile.interactions.content.code) === skill);
    if (!workshopTile) {
      console.log(`No workshop found for ${skill} on this layer.`);
      continue;
    }

    for (const item of targets) {
      const requirements = item.craft?.items || [];
      let missingMaterials = false;

      if (!hasCraftMaterials(item, character)) {
        for (const requirement of requirements) {
          const quantity = requirement.quantity;
          const inventory = buildInventoryMap(character);
          if ((inventory.get(requirement.code) || 0) >= quantity) {
            continue;
          }

          if (resourceIndex.has(requirement.code)) {
            character = await gatherForItem(client, characterName, character, maps, resourceIndex, requirement.code, quantity, logs);
          } else {
            const monster = findMonsterForDrop(monsters, requirement.code, minMonsterLevel, maxMonsterLevel);
            if (monster) {
              character = await fightForItem(client, characterName, character, maps, monster, requirement.code, quantity, logs);
            } else {
              console.log(`No gatherable or fightable source for ${requirement.code} (needed for ${item.code}).`);
              missingMaterials = true;
            }
          }
        }

        if (!hasCraftMaterials(item, character)) {
          missingMaterials = true;
        }
      }

      if (missingMaterials) {
        logStatus(`Skipping craft ${item.code} due to missing materials.`);
        continue;
      }

      logStatus(`Moving to workshop for ${skill} at ${workshopTile.layer} (${workshopTile.x},${workshopTile.y})...`);
      character = await moveTo(client, characterName, workshopTile.x, workshopTile.y, character);
      const response = await craft(client, characterName, item.code, character, 1);
      const details = response.data.details || {};
      logs.push({
        time: new Date().toISOString(),
        action: 'craft',
        skill,
        target: item.code,
        xp: details.xp ?? null,
        cooldown: response.data.cooldown?.total_seconds ?? response.data.cooldown?.remaining_seconds ?? null,
        items: formatItems(details.items),
        location: `${workshopTile.layer} (${workshopTile.x},${workshopTile.y})`
      });
      appendLogEntry(logs[logs.length - 1]);
      character = response.data.character;
      await waitForCooldown(response.data.cooldown);
    }
  }

  return character;
}

async function main(): Promise<void> {
  const characterName = getEnv('CHARACTER_NAME', 'mxblue');
  const attemptsPerNode = 1;
  const craftTargets = 1;

  const client = buildClient();
  const characters = await getMyCharacters(client);
  const selected = characters.find(entry => entry.name === characterName);
  if (!selected) {
    throw new Error(`Character ${characterName} not found in /my/characters.`);
  }

  logStatus(`Starting skill research for ${characterName}...`);
  let character = await getCharacter(client, characterName);
  await waitForCharacterCooldown(character);
  const maps = await getMapsByLayer(client, character.layer);
  const resources = await getAllResources(client);
  const items = await getAllItems(client);
  const monsters = await getAllMonsters(client);

  const progress = loadProgress();
  logStatus(`Loaded progress: ${progress.sampledResources.length} resources already sampled.`);
  logStatus(`Loaded ${maps.length} map tiles, ${resources.length} resources, ${items.length} items, ${monsters.length} monsters.`);
  const logs: ActionLog[] = [];

  const headerInfo = `Character: ${character.name} | Layer: ${character.layer} | Gather attempts: ${attemptsPerNode} | Craft targets per skill: ${craftTargets}`;
  initLogRun(headerInfo);

  character = await gatherResourceSamples(client, characterName, character, maps, resources, attemptsPerNode, logs, progress);
  character = await craftSamples(client, characterName, character, maps, items, resources, monsters, craftTargets, logs);

  logStatus(`Logged ${logs.length} actions to SKILL_XP_LOG.md`);
}

main().catch(error => {
  console.error('Skill research failed:', error?.message || error);
  process.exit(1);
});
