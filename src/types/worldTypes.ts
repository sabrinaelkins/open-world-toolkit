// --- Terrain / Biomes (procedural) -----------------------------

export type TerrainAlgo = "fbm";

export type TerrainGeneratorSettings = {
  algo: TerrainAlgo;
  seed: number;

  // resolution of the generated grid (separate from display size)
  grid: { width: number; height: number };

  // noise shaping
  scale: number; // bigger = smoother
  octaves: number;
  lacunarity: number;
  gain: number;

  // optional domain warp amount (0 = off)
  warp?: number;
};

export type TerrainData = {
  // length = grid.width * grid.height
  height: number[]; // 0..1
  moisture: number[]; // 0..1
};
export type BiomeId = "forest" | "desert" | "water" | "mountain" | "plains";

export type BiomeGrid = {
  biomes: BiomeId[];
  override?: (BiomeId | null)[];
};

// --------------------------------------------------------------
// Interface
// --------------------------------------------------------------

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

  // NEW (optional = backward compatible)
  terrainGen?: TerrainGeneratorSettings;
  terrain?: TerrainData;
  biomes?: BiomeGrid;
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
export type TagCategory =
  | "system"
  | "world"
  | "faction"
  | "gameplay"
  | "poi"
  | "biome"
  | "quest"
  | "location"
  | "combat"
  | "loot"
  | "custom";

export type TagMeta = {
  description?: string;
  category?: TagCategory;
  color?: string; // hex like "#22c55e"
};
export const tagMetaDefaults: Record<string, TagMeta> = {
  spawn: {
    description: "Spawn point for player or entities",
    category: "system",
    color: "#8ab4f8",
  },
  enemy: {
    description: "Enemy encounter zone",
    category: "combat",
    color: "#ff6b6b",
  },
  town: {
    description: "Town or settlement",
    category: "world",
    color: "#ffd166",
  },
  quest: {
    description: "Quest-related location",
    category: "quest",
    color: "#c7f464",
  },
  boss: {
    description: "Boss encounter area",
    category: "combat",
    color: "#f78fb3",
  },
  shop: {
    description: "Merchant or shop location",
    category: "poi",
    color: "#81ecec",
  },
  camp: {
    description: "Small rest or camp area",
    category: "world",
    color: "#fab1a0",
  },
  city: {
    description: "Large city hub",
    category: "world",
    color: "#74b9ff",
  },
  danger: {
    description: "Marked danger zone",
    category: "system",
    color: "#ff7675",
  },
  desert: {
    description: "Desert biome",
    category: "biome",
    color: "#ffeaa7",
  },
  dungeon: {
    description: "Dungeon interior / cave",
    category: "poi",
    color: "#a29bfe",
  },
  forest: {
    description: "Forest biome",
    category: "biome",
    color: "#55efc4",
  },
  mountain: {
    description: "Mountain biome",
    category: "biome",
    color: "#b2bec3",
  },
  poi: {
    description: "Point of interest",
    category: "poi",
    color: "#fdcb6e",
  },
  npc: {
    description: "NPC-related location",
    category: "world",
    color: "#00cec9",
  },
  safe: {
    description: "Safe zone",
    category: "system",
    color: "#6c5ce7",
  },
  water: {
    description: "Water biome",
    category: "biome",
    color: "#74b9ff",
  },
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
