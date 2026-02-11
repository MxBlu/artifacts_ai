import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://api.artifactsmmo.com';

export interface MapContentSchema {
  type: string;
  code: string;
}

export interface TransitionSchema {
  map_id: number;
  x: number;
  y: number;
  layer: string;
  conditions?: any[];
}

export interface InteractionSchema {
  content: MapContentSchema | null;
  transition: TransitionSchema | null;
}

export interface MapTile {
  map_id: number;
  name: string;
  skin: string;
  x: number;
  y: number;
  layer: string;
  interactions: InteractionSchema;
}

export interface Character {
  name: string;
  account: string;
  skin: string;
  level: number;
  x: number;
  y: number;
  cooldown: number;
  cooldown_expiration: string;
  hp: number;
  max_hp: number;
  [key: string]: any;
}

export interface MapResponse {
  data: MapTile[];
}

export interface CharacterResponse {
  data: Character;
}

export interface MovementData {
  cooldown: {
    total_seconds: number;
    remaining_seconds: number;
    started_at: string;
    expiration: string;
    reason: string;
  };
  destination: {
    name: string;
    x: number;
    y: number;
    layer: string;
  };
  character: Character;
}

export interface MovementResponse {
  data: MovementData;
}

export interface FightData {
  cooldown: {
    total_seconds: number;
    remaining_seconds: number;
    started_at: string;
    expiration: string;
    reason: string;
  };
  fight: {
    result: 'win' | 'loss';
    turns: number;
    opponent: string;
    logs: string[];
    characters: any[];
  };
  characters: Character[];
}

export interface FightResponse {
  data: FightData;
}

export interface RestData {
  cooldown: {
    total_seconds: number;
    remaining_seconds: number;
    started_at: string;
    expiration: string;
    reason: string;
  };
  hp_restored: number;
  character: Character;
}

export interface RestResponse {
  data: RestData;
}

export interface GatheringData {
  cooldown: {
    total_seconds: number;
    remaining_seconds: number;
    started_at: string;
    expiration: string;
    reason: string;
  };
  details: {
    xp: number;
    items: Array<{ code: string; quantity: number }>;
  };
  character: Character;
}

export interface GatheringResponse {
  data: GatheringData;
}

export interface MonsterEffect {
  code: string;
  value: number;
}

export interface MonsterDrop {
  code: string;
  rate: number;
  quantity_min?: number;
  quantity_max?: number;
}

export interface Monster {
  name: string;
  code: string;
  level: number;
  type: 'normal' | 'elite' | 'boss';
  hp: number;
  attack_fire: number;
  attack_earth: number;
  attack_water: number;
  attack_air: number;
  res_fire: number;
  res_earth: number;
  res_water: number;
  res_air: number;
  critical_strike: number;
  initiative: number;
  effects?: MonsterEffect[];
  min_gold: number;
  max_gold: number;
  drops: MonsterDrop[];
}

export interface MonsterResponse {
  data: Monster;
}

export interface Item {
  name: string;
  code: string;
  level: number;
  type: string;
  subtype: string;
  description: string;
  craft?: {
    skill?: string;
    level?: number;
    items?: Array<{ code: string; quantity: number }>;
    quantity?: number;
  };
  tradeable: boolean;
}

export interface ItemResponse {
  data: Item;
}

export interface ItemsResponse {
  data: Item[];
}

export interface CraftingData {
  cooldown: {
    total_seconds: number;
    remaining_seconds: number;
    started_at: string;
    expiration: string;
    reason: string;
  };
  details: {
    xp: number;
    items: Array<{ code: string; quantity: number }>;
  };
  character: Character;
}

export interface CraftingResponse {
  data: CraftingData;
}

export interface EquipmentData {
  cooldown: {
    total_seconds: number;
    remaining_seconds: number;
    started_at: string;
    expiration: string;
    reason: string;
  };
  slot: string;
  item: any;
  character: Character;
}

export interface EquipmentResponse {
  data: EquipmentData;
}

export class ArtifactsAPI {
  private client: AxiosInstance;

  constructor(apiToken: string) {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async getMapsByLayer(layer: string): Promise<MapTile[]> {
    const maps: MapTile[] = [];
    let page = 1;
    const size = 100;
    
    while (true) {
      const response = await this.client.get<MapResponse>(`/maps/${layer}`, {
        params: { page, size }
      });
      
      if (!response.data.data || response.data.data.length === 0) {
        break;
      }
      
      maps.push(...response.data.data);
      
      if (response.data.data.length < size) {
        break;
      }
      
      page++;
    }
    
    return maps;
  }

  async getCharacter(name: string): Promise<Character> {
    const response = await this.client.get<CharacterResponse>(`/characters/${name}`);
    return response.data.data;
  }

  async moveCharacter(characterName: string, x: number, y: number): Promise<MovementData> {
    const response = await this.client.post<MovementResponse>(
      `/my/${characterName}/action/move`,
      { x, y }
    );
    return response.data.data;
  }

  async fightCharacter(characterName: string, participants: string[] = []): Promise<FightData> {
    const response = await this.client.post<FightResponse>(
      `/my/${characterName}/action/fight`,
      { participants }
    );
    return response.data.data;
  }

  async restCharacter(characterName: string): Promise<RestData> {
    const response = await this.client.post<RestResponse>(
      `/my/${characterName}/action/rest`
    );
    return response.data.data;
  }

  async gather(characterName: string): Promise<GatheringData> {
    const response = await this.client.post<GatheringResponse>(
      `/my/${characterName}/action/gathering`
    );
    return response.data.data;
  }

  async getMonster(code: string): Promise<Monster> {
    const response = await this.client.get<MonsterResponse>(`/monsters/${code}`);
    return response.data.data;
  }

  async getItem(code: string): Promise<Item> {
    const response = await this.client.get<ItemResponse>(`/items/${code}`);
    return response.data.data;
  }

  async getAllItems(): Promise<Item[]> {
    const items: Item[] = [];
    let page = 1;
    const size = 100;

    while (true) {
      const response = await this.client.get<ItemsResponse>(`/items`, {
        params: { page, size }
      });

      if (!response.data.data || response.data.data.length === 0) {
        break;
      }

      items.push(...response.data.data);

      if (response.data.data.length < size) {
        break;
      }

      page++;
    }

    return items;
  }

  async craftItem(characterName: string, code: string, quantity = 1): Promise<CraftingData> {
    const response = await this.client.post<CraftingResponse>(
      `/my/${characterName}/action/crafting`,
      { code, quantity }
    );
    return response.data.data;
  }

  async unequipItem(characterName: string, slot: string, quantity = 1): Promise<EquipmentData> {
    const response = await this.client.post<EquipmentResponse>(
      `/my/${characterName}/action/unequip`,
      { slot, quantity }
    );
    return response.data.data;
  }

  async equipItem(characterName: string, code: string, slot: string): Promise<EquipmentData> {
    const response = await this.client.post<EquipmentResponse>(
      `/my/${characterName}/action/equip`,
      { code, slot }
    );
    return response.data.data;
  }
}
