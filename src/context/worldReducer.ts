import type {
  GameWorldFile,
  MapData,
  Location,
  TagMeta,
  Npc,
  Quest,
  QuestObjective,
} from "../types/worldTypes";
import { generateFbmHeightmap, getBiome } from "../types/terrain";

// --------------------------------------------------------------
// Biome-based name generation
// --------------------------------------------------------------
const BIOME_NAMES: Record<string, string[]> = {
  deep_ocean: [
    "Sunken Depths",
    "The Abyss",
    "Dark Waters",
    "Drowned Reach",
    "The Deep",
  ],
  ocean: [
    "Coastal Shore",
    "Blue Bay",
    "Tidal Flats",
    "Sea Crossing",
    "Wave Point",
  ],
  beach: [
    "Sandy Cove",
    "Driftwood Beach",
    "The Shoreline",
    "Golden Sands",
    "Tide's End",
  ],
  plains: [
    "Open Plains",
    "Grassy Flats",
    "The Meadow",
    "Windswept Field",
    "Sunlit Vale",
  ],
  forest: [
    "Dark Wood",
    "Whispering Pines",
    "The Thicket",
    "Mossy Hollow",
    "Elder Grove",
  ],
  highland: [
    "Highland Pass",
    "The Bluffs",
    "Rocky Outlook",
    "Stony Ridge",
    "Cairn Hill",
  ],
  mountain: [
    "Mountain Peak",
    "Frostback Summit",
    "The Crags",
    "Eagle's Perch",
    "High Pass",
  ],
  snow: [
    "Frozen Wastes",
    "Blizzard's Edge",
    "The Icefield",
    "White Summit",
    "Frost Hollow",
  ],
};

function generateLocationName(
  x: number,
  y: number,
  mapW: number,
  mapH: number,
  terrainGen: MapData["terrainGen"],
  existingNames: Set<string>,
): string {
  // Sample the heightmap at the location's position
  const sampleW = 32;
  const sampleH = 32;
  const hm = generateFbmHeightmap(sampleW, sampleH, {
    seed: terrainGen?.seed ?? 42,
    scale: terrainGen?.scale ?? 18,
    octaves: terrainGen?.octaves ?? 4,
    lacunarity: terrainGen?.lacunarity ?? 2.0,
    gain: terrainGen?.gain ?? 0.5,
    warp: terrainGen?.warp ?? 0,
  });

  const px = Math.max(
    0,
    Math.min(sampleW - 1, Math.round((x / (mapW || 1)) * (sampleW - 1))),
  );
  const py = Math.max(
    0,
    Math.min(sampleH - 1, Math.round((y / (mapH || 1)) * (sampleH - 1))),
  );
  const height = hm[py * sampleW + px];
  const biome = getBiome(height);

  const names = BIOME_NAMES[biome.id] ?? BIOME_NAMES.plains;

  // Pick a name not already used, with a numeric suffix as fallback
  for (const name of names) {
    if (!existingNames.has(name)) return name;
  }

  let i = 2;
  const base = names[0];
  while (existingNames.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

// --------------------------------------------------------------
// Action types
// --------------------------------------------------------------
export type WorldAction =
  // World
  | { type: "UPDATE_WORLD_INFO"; patch: Partial<GameWorldFile["world"]> }

  // Maps
  | { type: "ADD_MAP" }
  | { type: "UPDATE_MAP"; mapId: string; patch: Partial<MapData> }
  | { type: "DELETE_MAP"; mapId: string }

  // Locations
  | { type: "ADD_LOCATION" }
  | { type: "UPDATE_LOCATION"; locId: string; patch: Partial<Location> }
  | { type: "DELETE_LOCATION"; locId: string }

  // Tags on locations
  | { type: "ADD_TAG_TO_LOCATION"; locId: string; tag: string }
  | { type: "REMOVE_TAG_FROM_LOCATION"; locId: string; tag: string }

  // Tag meta
  | { type: "UPDATE_TAG_META"; tag: string; patch: Partial<TagMeta> }
  | { type: "RENAME_TAG"; from: string; to: string }
  | { type: "DELETE_TAG"; tag: string }

  // NPCs
  | { type: "ADD_NPC" }
  | { type: "UPDATE_NPC"; npcId: string; patch: Partial<Npc> }
  | { type: "DELETE_NPC"; npcId: string }

  // Quests
  | { type: "ADD_QUEST" }
  | { type: "UPDATE_QUEST"; questId: string; patch: Partial<Quest> }
  | { type: "DELETE_QUEST"; questId: string }
  | { type: "ADD_OBJECTIVE"; questId: string }
  | {
      type: "UPDATE_OBJECTIVE";
      questId: string;
      objId: string;
      patch: Partial<QuestObjective>;
    }
  | { type: "DELETE_OBJECTIVE"; questId: string; objId: string }

  // Import
  | { type: "LOAD_WORLD"; world: GameWorldFile };

// --------------------------------------------------------------
// Helpers
// --------------------------------------------------------------
function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

function generateId(prefix: string, existing: string[]): string {
  const existingSet = new Set(existing);
  // Use timestamp + random suffix for collision-safe IDs
  let id: string;
  do {
    const suffix = Math.random().toString(36).slice(2, 7);
    id = `${prefix}_${suffix}`;
  } while (existingSet.has(id));
  return id;
}

// --------------------------------------------------------------
// Reducer
// --------------------------------------------------------------
export function worldReducer(
  state: GameWorldFile,
  action: WorldAction,
): GameWorldFile {
  switch (action.type) {
    // ---- World info ------------------------------------------
    case "UPDATE_WORLD_INFO":
      return { ...state, world: { ...state.world, ...action.patch } };

    // ---- Maps ------------------------------------------------
    case "ADD_MAP": {
      const newId = generateId(
        "map",
        state.maps.map((m) => m.id),
      );
      const newMap: MapData = {
        id: newId,
        name: "New Map",
        description: "Describe this region...",
        size: { width: 2000, height: 2000, unit: "meters" },
        locations: [],
      };
      return { ...state, maps: [...state.maps, newMap] };
    }

    case "UPDATE_MAP":
      return {
        ...state,
        maps: state.maps.map((m) =>
          m.id === action.mapId ? { ...m, ...action.patch } : m,
        ),
      };

    case "DELETE_MAP": {
      const maps = state.maps.filter((m) => m.id !== action.mapId);
      const locations = state.locations.map((l) =>
        l.mapId === action.mapId ? { ...l, mapId: "unassigned" } : l,
      );
      return { ...state, maps, locations };
    }

    // ---- Locations -------------------------------------------
    case "ADD_LOCATION": {
      const newId = generateId(
        "loc",
        state.locations.map((l) => l.id),
      );
      const firstMap = state.maps[0];
      const centerX = Math.round(
        (firstMap?.size?.width ?? 1000) / 2 + (Math.random() - 0.5) * 100,
      );
      const centerY = Math.round(
        (firstMap?.size?.height ?? 1000) / 2 + (Math.random() - 0.5) * 100,
      );

      const existingNames = new Set(state.locations.map((l) => l.name));
      const biomeName = firstMap
        ? generateLocationName(
            centerX,
            centerY,
            firstMap.size?.width ?? 1000,
            firstMap.size?.height ?? 1000,
            firstMap.terrainGen,
            existingNames,
          )
        : "New Location";

      const newLoc: Location = {
        id: newId,
        name: biomeName,
        mapId: firstMap?.id ?? "unassigned",
        position: { x: centerX, y: centerY, z: 0 },
        radius: 5,
        tags: [],
      };
      return { ...state, locations: [...state.locations, newLoc] };
    }

    case "UPDATE_LOCATION":
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.locId ? { ...l, ...action.patch } : l,
        ),
      };

    case "DELETE_LOCATION":
      return {
        ...state,
        locations: state.locations.filter((l) => l.id !== action.locId),
      };

    // ---- Tags on locations -----------------------------------
    case "ADD_TAG_TO_LOCATION": {
      const clean = action.tag.trim();
      if (!clean) return state;
      return {
        ...state,
        locations: state.locations.map((l) => {
          if (l.id !== action.locId) return l;
          const existing = l.tags ?? [];
          if (existing.includes(clean)) return l;
          return { ...l, tags: [...existing, clean] };
        }),
      };
    }

    case "REMOVE_TAG_FROM_LOCATION":
      return {
        ...state,
        locations: state.locations.map((l) => {
          if (l.id !== action.locId) return l;
          return { ...l, tags: (l.tags ?? []).filter((t) => t !== action.tag) };
        }),
      };

    // ---- Tag meta --------------------------------------------
    case "UPDATE_TAG_META": {
      const key = action.tag.trim().toLowerCase();
      if (!key) return state;
      const existing = state.tagMeta?.[key] ?? {};
      return {
        ...state,
        tagMeta: {
          ...(state.tagMeta ?? {}),
          [key]: { ...existing, ...action.patch },
        },
      };
    }

    case "RENAME_TAG": {
      const src = normalizeTag(action.from);
      const dstKey = normalizeTag(action.to);
      const dstLabel = action.to.trim();
      if (!src || !dstKey || !dstLabel || src === dstKey) return state;

      const nextLocations = state.locations.map((l) => {
        const tags = l.tags ?? [];
        const replaced = tags.map((t) =>
          normalizeTag(t) === src ? dstLabel : t,
        );
        const seen = new Set<string>();
        const deduped: string[] = [];
        for (const t of replaced) {
          const k = normalizeTag(t);
          if (seen.has(k)) continue;
          seen.add(k);
          deduped.push(t);
        }
        return { ...l, tags: deduped };
      });

      const nextTagMeta = { ...(state.tagMeta ?? {}) };
      if (nextTagMeta[src]) {
        nextTagMeta[dstKey] = {
          ...(nextTagMeta[dstKey] ?? {}),
          ...nextTagMeta[src],
        };
        delete nextTagMeta[src];
      }

      return { ...state, locations: nextLocations, tagMeta: nextTagMeta };
    }

    case "DELETE_TAG": {
      const kill = normalizeTag(action.tag);
      if (!kill) return state;

      const nextTagMeta = { ...(state.tagMeta ?? {}) };
      delete nextTagMeta[kill];

      return {
        ...state,
        locations: state.locations.map((l) => ({
          ...l,
          tags: (l.tags ?? []).filter((t) => normalizeTag(t) !== kill),
        })),
        tagMeta: nextTagMeta,
      };
    }

    // ---- NPCs -----------------------------------------------
    case "ADD_NPC": {
      const newId = generateId(
        "npc",
        (state.npcs ?? []).map((n) => n.id),
      );
      const newNpc: Npc = {
        id: newId,
        name: "New NPC",
        role: "villager",
        locationId: state.locations[0]?.id ?? "",
        mapId: state.maps[0]?.id ?? "",
        dialogue: "",
        tags: [],
        notes: "",
      };
      return { ...state, npcs: [...(state.npcs ?? []), newNpc] };
    }

    case "UPDATE_NPC":
      return {
        ...state,
        npcs: (state.npcs ?? []).map((n) =>
          n.id === action.npcId ? { ...n, ...action.patch } : n,
        ),
      };

    case "DELETE_NPC":
      return {
        ...state,
        npcs: (state.npcs ?? []).filter((n) => n.id !== action.npcId),
        // Clear quest givers pointing to this NPC
        quests: (state.quests ?? []).map((q) =>
          q.giverNpcId === action.npcId ? { ...q, giverNpcId: undefined } : q,
        ),
      };

    // ---- Quests ---------------------------------------------
    case "ADD_QUEST": {
      const newId = generateId(
        "quest",
        (state.quests ?? []).map((q) => q.id),
      );
      const newQuest: Quest = {
        id: newId,
        title: "New Quest",
        type: "side",
        status: "draft",
        description: "",
        objectives: [],
        tags: [],
        notes: "",
      };
      return { ...state, quests: [...(state.quests ?? []), newQuest] };
    }

    case "UPDATE_QUEST":
      return {
        ...state,
        quests: (state.quests ?? []).map((q) =>
          q.id === action.questId ? { ...q, ...action.patch } : q,
        ),
      };

    case "DELETE_QUEST":
      return {
        ...state,
        quests: (state.quests ?? []).filter((q) => q.id !== action.questId),
      };

    case "ADD_OBJECTIVE": {
      const objId = generateId(
        "obj",
        (state.quests ?? []).flatMap((q) => q.objectives.map((o) => o.id)),
      );
      return {
        ...state,
        quests: (state.quests ?? []).map((q) => {
          if (q.id !== action.questId) return q;
          const newObj: QuestObjective = {
            id: objId,
            description: "New objective",
            completed: false,
          };
          return { ...q, objectives: [...q.objectives, newObj] };
        }),
      };
    }

    case "UPDATE_OBJECTIVE":
      return {
        ...state,
        quests: (state.quests ?? []).map((q) => {
          if (q.id !== action.questId) return q;
          return {
            ...q,
            objectives: q.objectives.map((o) =>
              o.id === action.objId ? { ...o, ...action.patch } : o,
            ),
          };
        }),
      };

    case "DELETE_OBJECTIVE":
      return {
        ...state,
        quests: (state.quests ?? []).map((q) => {
          if (q.id !== action.questId) return q;
          return {
            ...q,
            objectives: q.objectives.filter((o) => o.id !== action.objId),
          };
        }),
      };

    // ---- Import ----------------------------------------------
    case "LOAD_WORLD":
      return action.world;

    default:
      return state;
  }
}
