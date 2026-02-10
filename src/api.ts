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
}
