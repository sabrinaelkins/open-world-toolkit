export interface WorldSettings {
  defaultSpawnMapId: string;
}

export interface World {
  id: string;
  name: string;
  description: string;
  settings: WorldSettings;
}

export interface MapData {
  id: string;
  name: string;
  description: string;
  size?: { width: number; height: number; unit?: string };
  locations: string[];
}

export interface Location {
  id: string;
  mapId: string;
  name: string;
  position: { x: number; y: number; z: number };
  radius: number;
  tags: string[];
}

export interface GameWorldFile {
  version: string;
  world: World;
  maps: MapData[];
  locations: Location[];
  npcs: unknown[];
  items: unknown[];
  quests: unknown[];
  triggers: unknown[];
}
