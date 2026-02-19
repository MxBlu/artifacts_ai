/**
 * GameCache — loads and caches static game data to disk.
 * Data is refreshed when the cache file is older than CACHE_TTL_MS.
 *
 * Cached: map tiles (overworld), items, monsters (index by code), resources.
 * Used by: AgentTools (find_location, lookup_*) and executor (LOCATION_ALIASES).
 */

import * as fs from 'fs';
import * as path from 'path';
import { ArtifactsAPI, MapTile, Item, Monster, Resource } from './api';

const CACHE_DIR = path.resolve(process.cwd(), 'state', 'cache');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function cacheFile(name: string) {
  return path.join(CACHE_DIR, `${name}.json`);
}

function isFresh(file: string): boolean {
  try {
    const stat = fs.statSync(file);
    return Date.now() - stat.mtimeMs < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

function readCache<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeCache(file: string, data: any): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
}

// ─── Map tiles ────────────────────────────────────────────────────────────────

let _mapTiles: MapTile[] | null = null;

export async function getMapTiles(api: ArtifactsAPI, layer = 'overworld'): Promise<MapTile[]> {
  if (_mapTiles) return _mapTiles;

  const file = cacheFile(`map_${layer}`);
  if (isFresh(file)) {
    const cached = readCache<MapTile[]>(file);
    if (cached) {
      _mapTiles = cached;
      return cached;
    }
  }

  console.log(`[cache] Fetching map tiles (layer=${layer})…`);
  const tiles = await api.getMapsByLayer(layer);
  writeCache(file, tiles);
  _mapTiles = tiles;
  return tiles;
}

/** Find tiles matching content type/code, optionally sorted by distance from (cx,cy). */
export async function findTiles(
  api: ArtifactsAPI,
  search: string,
  cx?: number,
  cy?: number,
): Promise<Array<{ tile: MapTile; distance: number }>> {
  const tiles = await getMapTiles(api);
  const s = search.toLowerCase();
  const matches: Array<{ tile: MapTile; distance: number }> = [];

  for (const tile of tiles) {
    const content = tile.interactions?.content;
    const matches_name = tile.name?.toLowerCase().includes(s);
    const matches_content = content && (
      content.code?.toLowerCase().includes(s) ||
      content.type?.toLowerCase().includes(s)
    );
    if (matches_name || matches_content) {
      const dx = cx !== undefined ? tile.x - cx : 0;
      const dy = cy !== undefined ? tile.y - cy : 0;
      const distance = Math.abs(dx) + Math.abs(dy); // Manhattan
      matches.push({ tile, distance });
    }
  }

  return matches.sort((a, b) => a.distance - b.distance);
}

// ─── Items ────────────────────────────────────────────────────────────────────

let _items: Item[] | null = null;
let _itemByCode: Map<string, Item> | null = null;

export async function getAllItems(api: ArtifactsAPI): Promise<Item[]> {
  if (_items) return _items;

  const file = cacheFile('items');
  if (isFresh(file)) {
    const cached = readCache<Item[]>(file);
    if (cached) {
      _items = cached;
      _itemByCode = new Map(cached.map(i => [i.code, i]));
      return cached;
    }
  }

  console.log('[cache] Fetching all items…');
  const items = await api.getAllItems();
  writeCache(file, items);
  _items = items;
  _itemByCode = new Map(items.map(i => [i.code, i]));
  return items;
}

export async function getItemByCode(api: ArtifactsAPI, code: string): Promise<Item | undefined> {
  await getAllItems(api);
  return _itemByCode?.get(code);
}

export async function searchItems(api: ArtifactsAPI, query: string): Promise<Item[]> {
  const items = await getAllItems(api);
  const q = query.toLowerCase();
  return items.filter(i =>
    i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
  );
}

// ─── Monsters ─────────────────────────────────────────────────────────────────

let _monsterByCode: Map<string, Monster> | null = null;

async function loadMonsters(api: ArtifactsAPI): Promise<Map<string, Monster>> {
  if (_monsterByCode) return _monsterByCode;

  const file = cacheFile('monsters');
  if (isFresh(file)) {
    const cached = readCache<Monster[]>(file);
    if (cached) {
      _monsterByCode = new Map(cached.map(m => [m.code, m]));
      return _monsterByCode;
    }
  }

  // Build monster index by fetching all monster tiles and looking them up
  console.log('[cache] Fetching monster data…');
  const tiles = await getMapTiles(api);
  const monsterCodes = new Set<string>();
  for (const tile of tiles) {
    if (tile.interactions?.content?.type === 'monster') {
      monsterCodes.add(tile.interactions.content.code);
    }
  }

  const monsters: Monster[] = [];
  for (const code of monsterCodes) {
    try {
      const m = await api.getMonster(code);
      monsters.push(m);
    } catch {
      // ignore unknown codes
    }
  }

  writeCache(file, monsters);
  _monsterByCode = new Map(monsters.map(m => [m.code, m]));
  return _monsterByCode;
}

export async function getMonsterByCode(api: ArtifactsAPI, code: string): Promise<Monster | undefined> {
  const map = await loadMonsters(api);
  return map.get(code);
}

export async function searchMonsters(api: ArtifactsAPI, query: string): Promise<Monster[]> {
  const map = await loadMonsters(api);
  const q = query.toLowerCase();
  return [...map.values()].filter(m =>
    m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
  );
}

// ─── Resources ────────────────────────────────────────────────────────────────

let _resources: Resource[] | null = null;

export async function getAllResources(api: ArtifactsAPI): Promise<Resource[]> {
  if (_resources) return _resources;

  const file = cacheFile('resources');
  if (isFresh(file)) {
    const cached = readCache<Resource[]>(file);
    if (cached) {
      _resources = cached;
      return cached;
    }
  }

  console.log('[cache] Fetching all resources…');
  const resources = await api.getAllResources();
  writeCache(file, resources);
  _resources = resources;
  return resources;
}

export async function searchResources(api: ArtifactsAPI, query: string): Promise<Resource[]> {
  const resources = await getAllResources(api);
  const q = query.toLowerCase();
  return resources.filter(r =>
    r.code.toLowerCase().includes(q) ||
    r.name.toLowerCase().includes(q) ||
    r.skill.toLowerCase().includes(q)
  );
}

// ─── Nearest tile helper (for executor) ──────────────────────────────────────

/**
 * Find the nearest tile by content code, type, or tile name.
 * Returns {x, y} or null if not found.
 */
export async function nearestTile(
  api: ArtifactsAPI,
  search: string,
  cx: number,
  cy: number,
): Promise<{ x: number; y: number } | null> {
  const results = await findTiles(api, search, cx, cy);
  if (results.length === 0) return null;
  return { x: results[0].tile.x, y: results[0].tile.y };
}

/** Force-refresh all caches (call after level-up or major game event). */
export function invalidateCache(): void {
  _mapTiles = null;
  _items = null;
  _itemByCode = null;
  _monsterByCode = null;
  _resources = null;
  console.log('[cache] All in-memory caches invalidated');
}
