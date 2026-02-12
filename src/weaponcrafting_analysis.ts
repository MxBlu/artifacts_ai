import { ArtifactsAPI, Character, Item, LogEntry, Resource } from './api';

type Stat = {
  actionCount: number;
  totalOutput: number;
  totalCooldown: number;
  totalXp: number;
  xpActionCount: number;
};

type YieldInfo = {
  expectedPerAction: number;
  skill: string;
  resource: Resource;
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

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function extractItems(log: LogEntry): Array<{ code: string; quantity: number }> {
  const content = log.content as any;
  const items = content?.details?.items ?? content?.items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item: any) => ({ code: item?.code, quantity: item?.quantity }))
    .filter(entry => typeof entry.code === 'string' && typeof entry.quantity === 'number');
}

function extractXp(log: LogEntry): number | null {
  const content = log.content as any;
  const direct = toNumber(content?.details?.xp ?? content?.xp);
  if (direct !== null) {
    return direct;
  }
  if (typeof log.description === 'string') {
    const match = log.description.match(/(\d+)\s*xp/i);
    if (match) {
      return Number(match[1]);
    }
  }
  return null;
}

function updateStats(
  stats: Map<string, Stat>,
  log: LogEntry,
  items: Array<{ code: string; quantity: number }>
): void {
  if (items.length === 0) {
    return;
  }

  const totalOutput = items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalOutput <= 0) {
    return;
  }

  const xp = extractXp(log);
  const cooldown = typeof log.cooldown === 'number' ? log.cooldown : 0;

  items.forEach(item => {
    const weight = item.quantity / totalOutput;
    const stat = stats.get(item.code) ?? {
      actionCount: 0,
      totalOutput: 0,
      totalCooldown: 0,
      totalXp: 0,
      xpActionCount: 0
    };

    stat.actionCount += weight;
    stat.totalOutput += item.quantity;
    stat.totalCooldown += cooldown * weight;

    if (xp !== null) {
      stat.totalXp += xp * weight;
      stat.xpActionCount += weight;
    }

    stats.set(item.code, stat);
  });
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }
  return value.toFixed(digits);
}

function getGatheringSkillLevel(character: Character, skill: string): number {
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

function averageQuantity(drop: { min_quantity?: number; max_quantity?: number }): number {
  const min = drop.min_quantity ?? 1;
  const max = drop.max_quantity ?? min;
  return (min + max) / 2;
}

function buildBestYieldMap(resources: Resource[], character: Character): Map<string, YieldInfo> {
  const best = new Map<string, YieldInfo>();
  resources.forEach(resource => {
    const skillLevel = getGatheringSkillLevel(character, resource.skill);
    if (resource.level > skillLevel) {
      return;
    }
    resource.drops.forEach(drop => {
      const avgQty = averageQuantity(drop);
      const expectedPerAction = avgQty / Math.max(1, drop.rate);
      if (expectedPerAction <= 0) {
        return;
      }
      const existing = best.get(drop.code);
      if (!existing || expectedPerAction > existing.expectedPerAction) {
        best.set(drop.code, {
          expectedPerAction,
          skill: resource.skill,
          resource
        });
      }
    });
  });
  return best;
}

function expandToBaseItems(
  itemCode: string,
  quantity: number,
  itemsByCode: Map<string, Item>,
  stack: Set<string> = new Set()
): Map<string, number> {
  const result = new Map<string, number>();
  const item = itemsByCode.get(itemCode);
  if (!item || !item.craft || !item.craft.items || item.craft.items.length === 0) {
    result.set(itemCode, (result.get(itemCode) || 0) + quantity);
    return result;
  }

  if (stack.has(itemCode)) {
    return result;
  }

  stack.add(itemCode);
  const outputQty = item.craft.quantity || 1;
  const multiplier = quantity / outputQty;

  item.craft.items.forEach(req => {
    const sub = expandToBaseItems(req.code, req.quantity * multiplier, itemsByCode, stack);
    sub.forEach((value, code) => {
      result.set(code, (result.get(code) || 0) + value);
    });
  });

  stack.delete(itemCode);
  return result;
}

function getCraftableWeaponItems(items: Item[], weaponLevel: number): Item[] {
  return items.filter(item => item.craft?.skill === 'weaponcrafting' && (item.craft?.level || 0) <= weaponLevel);
}

async function main(): Promise<void> {
  const token = getEnv('ARTIFACTS_TOKEN');
  const selectedCharacter = process.env.ARTIFACTS_CHARACTER;
  const logLimit = Number(process.env.LOG_LIMIT || 500);

  const api = new ArtifactsAPI(token);
  let characterName = selectedCharacter;

  if (!characterName) {
    const characters = await api.getMyCharacters();
    if (!characters.length) {
      throw new Error('No characters found for this account.');
    }
    characterName = characters[0].name;
  }

  const character = await api.getCharacter(characterName);
  const allItems = await api.getAllItems();
  const resources = await api.getAllResources();

  const logs = await api.getAllCharacterLogs(characterName, logLimit);
  const craftLogs = logs.filter(log => log.type === 'crafting');
  const gatherLogs = logs.filter(log => log.type === 'gathering');

  const craftStats = new Map<string, Stat>();
  craftLogs.forEach(log => updateStats(craftStats, log, extractItems(log)));

  const gatherStats = new Map<string, Stat>();
  gatherLogs.forEach(log => updateStats(gatherStats, log, extractItems(log)));

  const gatherCooldowns = Array.from(gatherStats.values())
    .filter(stat => stat.actionCount > 0)
    .map(stat => stat.totalCooldown / stat.actionCount);
  const globalGatherCooldown = gatherCooldowns.length
    ? gatherCooldowns.reduce((sum, value) => sum + value, 0) / gatherCooldowns.length
    : null;

  const itemsByCode = new Map(allItems.map(item => [item.code, item] as const));
  const weaponcraftingLevel = character.weaponcrafting_level || 0;
  const weaponItems = getCraftableWeaponItems(allItems, weaponcraftingLevel);
  const bestYieldByItem = buildBestYieldMap(resources, character);

  console.log(`Character: ${character.name}`);
  console.log(`Weaponcrafting level: ${weaponcraftingLevel}`);
  console.log(`Weaponcrafting XP: ${character.weaponcrafting_xp ?? '?'} / ${character.weaponcrafting_max_xp ?? '?'}`);
  console.log(`Craft logs analyzed: ${craftLogs.length}`);
  console.log(`Gather logs analyzed: ${gatherLogs.length}`);
  console.log('');

  console.log('Observed weaponcrafting XP per action (from logs):');
  const craftRows = Array.from(craftStats.entries())
    .map(([code, stat]) => {
      const xpPerAction = stat.xpActionCount > 0 ? stat.totalXp / stat.xpActionCount : null;
      const cooldown = stat.actionCount > 0 ? stat.totalCooldown / stat.actionCount : null;
      const outputPerAction = stat.actionCount > 0 ? stat.totalOutput / stat.actionCount : null;
      return { code, xpPerAction, cooldown, outputPerAction };
    })
    .sort((a, b) => (b.xpPerAction ?? 0) - (a.xpPerAction ?? 0))
    .slice(0, 20);

  craftRows.forEach(row => {
    console.log(
      `${row.code.padEnd(24)} xp/action=${formatNumber(row.xpPerAction, 2).padStart(8)} ` +
      `cooldown=${formatNumber(row.cooldown, 2).padStart(6)}s ` +
      `output/action=${formatNumber(row.outputPerAction, 2).padStart(6)}`
    );
  });

  console.log('');
  console.log('Estimated best weaponcrafting items (craft + prerequisite gathering):');

  const report = weaponItems.map(item => {
    const craftStat = craftStats.get(item.code);
    const craftXp = craftStat && craftStat.xpActionCount > 0
      ? craftStat.totalXp / craftStat.xpActionCount
      : null;
    const craftCooldown = craftStat && craftStat.actionCount > 0
      ? craftStat.totalCooldown / craftStat.actionCount
      : null;

    const outputPerAction = craftStat && craftStat.actionCount > 0
      ? craftStat.totalOutput / craftStat.actionCount
      : (item.craft?.quantity || 1);

    const baseNeeds = expandToBaseItems(item.code, outputPerAction, itemsByCode);

    let gatherActions = 0;
    let gatherCooldown = 0;
    const missing: string[] = [];

    baseNeeds.forEach((quantity, code) => {
      const observed = gatherStats.get(code);
      const observedPerAction = observed && observed.actionCount > 0
        ? observed.totalOutput / observed.actionCount
        : null;
      const observedCooldown = observed && observed.actionCount > 0
        ? observed.totalCooldown / observed.actionCount
        : null;

      const yieldInfo = bestYieldByItem.get(code);
      const expectedPerAction = observedPerAction ?? yieldInfo?.expectedPerAction ?? null;
      if (!expectedPerAction || expectedPerAction <= 0) {
        missing.push(code);
        return;
      }

      const actionsNeeded = quantity / expectedPerAction;
      gatherActions += actionsNeeded;
      const cooldownPerAction = observedCooldown ?? globalGatherCooldown;
      if (cooldownPerAction !== null) {
        gatherCooldown += actionsNeeded * cooldownPerAction;
      }
    });

    const totalCooldown = craftCooldown !== null
      ? craftCooldown + gatherCooldown
      : null;
    const xpPerSecond = craftXp !== null && totalCooldown && totalCooldown > 0
      ? craftXp / totalCooldown
      : null;
    const xpPerTotalAction = craftXp !== null
      ? craftXp / (1 + gatherActions)
      : null;

    return {
      code: item.code,
      level: item.craft?.level || 0,
      craftXp,
      craftCooldown,
      gatherActions,
      totalCooldown,
      xpPerSecond,
      xpPerTotalAction,
      missing
    };
  });

  report
    .sort((a, b) => (b.xpPerSecond ?? b.xpPerTotalAction ?? 0) - (a.xpPerSecond ?? a.xpPerTotalAction ?? 0))
    .slice(0, 20)
    .forEach(entry => {
      const missingNote = entry.missing.length ? ` missing=${entry.missing.join(',')}` : '';
      console.log(
        `${entry.code.padEnd(24)} lvl=${String(entry.level).padStart(2)} ` +
        `xp/action=${formatNumber(entry.craftXp, 2).padStart(7)} ` +
        `gatherActions=${formatNumber(entry.gatherActions, 2).padStart(7)} ` +
        `xp/sec=${formatNumber(entry.xpPerSecond, 4).padStart(8)} ` +
        `xp/act=${formatNumber(entry.xpPerTotalAction, 4).padStart(8)}${missingNote}`
      );
    });

  console.log('');
  console.log('Notes:');
  console.log('- Craft XP uses logs. Run a few crafts if values are missing.');
  console.log('- Gather estimates use observed logs when available, else resource drop rates.');
  console.log('- Use LOG_LIMIT to increase sample size, and ARTIFACTS_CHARACTER to pick a character.');
}

main().catch(error => {
  console.error('Weaponcrafting analysis failed:', error?.message || error);
  process.exit(1);
});
