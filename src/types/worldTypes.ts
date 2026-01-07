// Interface
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
// Types

export type TagMeta = {
  description?: string;
  category?: string;
  color?: string; // hex like "#22c55e"
};
export type GameWorldFile = {
  version: number;
  world: {
    id: string;
    name: string;
    description: string;
    settings?: {
      defaultSpawnMapId?: string;
    };
  };
  maps: MapData[];
  locations: Location[];
  tagMeta?: Record<string, TagMeta>;
  npcs?: unknown[];
  items?: unknown[];
  quests?: unknown[];
  triggers?: unknown[];
};
