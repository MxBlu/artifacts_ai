import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://api.artifactsmmo.com';

export interface MapTile {
  name: string;
  skin: string;
  x: number;
  y: number;
  layer: string;
  content: {
    type: string;
    code: string;
  } | null;
}

export interface Character {
  name: string;
  account: string;
  skin: string;
  level: number;
  x: number;
  y: number;
  cooldown: number;
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
}
