// src/types/worldIO.ts
import type {
  GameWorldFile,
  MapData,
  Location,
  TagMeta,
  TagCategory,
} from "./worldTypes";
import { tagMetaDefaults } from "./worldTypes";

// --------------------------------------------------------------
// Versioning
// --------------------------------------------------------------
export const GAME_WORLD_FILE_VERSION = 1 as const;

// --------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);
}

const TAG_CATEGORIES = new Set<TagCategory>([
  "system",
  "world",
  "faction",
  "gameplay",
  "poi",
  "biome",
  "quest",
  "location",
  "combat",
  "loot",
  "custom",
]);

function asTagCategory(v: unknown): TagCategory | undefined {
  return typeof v === "string" && TAG_CATEGORIES.has(v as TagCategory)
    ? (v as TagCategory)
    : undefined;
}

// Merge tag meta defaults + file meta (file wins)
function mergeTagMeta(fileMeta: unknown): Record<string, TagMeta> {
  const base: Record<string, TagMeta> = { ...tagMetaDefaults };

  if (!isRecord(fileMeta)) return base;

  for (const [k, v] of Object.entries(fileMeta)) {
    const key = k.trim().toLowerCase();
    if (!key) continue;
    if (!isRecord(v)) continue;

    const patch: TagMeta = {};

    if (typeof v.description === "string") patch.description = v.description;
    patch.category = asTagCategory(v.category);
    if (typeof v.color === "string") patch.color = v.color;

    base[key] = { ...(base[key] ?? {}), ...patch };
  }

  return base;
}

// --------------------------------------------------------------
// Normalizers (unknown -> typed)
// --------------------------------------------------------------
function normalizeMap(m: unknown): MapData {
  const r = isRecord(m) ? m : {};

  const id = toStr(r.id, "").trim();
  return {
    id,
    name: toStr(r.name, id || "Untitled Map"),
    description: toStr(r.description, ""),
    size: isRecord(r.size)
      ? {
          width: toNum(r.size.width, 0),
          height: toNum(r.size.height, 0),
          unit: typeof r.size.unit === "string" ? r.size.unit : undefined,
        }
      : undefined,
    locations: Array.isArray(r.locations) ? r.locations.map(String) : [],

    // optional terrain fields (pass-through)
    terrainGen: r.terrainGen as MapData["terrainGen"],
    terrain: r.terrain as MapData["terrain"],
    biomes: r.biomes as MapData["biomes"],
  };
}

function normalizeLocation(l: unknown): Location {
  const r = isRecord(l) ? l : {};
  const pos = isRecord(r.position) ? r.position : {};

  const id = toStr(r.id, "").trim();
  return {
    id,
    mapId: toStr(r.mapId, "unassigned"),
    name: toStr(r.name, id || "Untitled Location"),
    position: {
      x: toNum(pos.x, 0),
      y: toNum(pos.y, 0),
      z: toNum(pos.z, 0),
    },
    radius: toNum(r.radius, 10),
    tags: normalizeTags(r.tags),
  };
}

// --------------------------------------------------------------
// Public: migrate + normalize + defaults
// --------------------------------------------------------------
export function loadGameWorldFile(input: unknown): GameWorldFile {
  const migrated = migrateGameWorldFile(input);

  const worldSettings = migrated.world.settings ?? {};
  const defaultSpawnMapId =
    typeof worldSettings.defaultSpawnMapId === "string"
      ? worldSettings.defaultSpawnMapId
      : "unassigned";

  const maps: MapData[] = (migrated.maps ?? []).map(normalizeMap);
  const locations: Location[] = (migrated.locations ?? []).map(
    normalizeLocation,
  );

  return {
    version: GAME_WORLD_FILE_VERSION,
    world: {
      id: toStr(migrated.world.id, "world"),
      name: toStr(migrated.world.name, "World"),
      description: toStr(migrated.world.description, ""),
      settings: { defaultSpawnMapId },
    },
    maps,
    locations,
    tagMeta: mergeTagMeta(migrated.tagMeta),
    npcs: Array.isArray(migrated.npcs) ? migrated.npcs : [],
    quests: Array.isArray(migrated.quests) ? migrated.quests : [],
    items: migrated.items,
    triggers: migrated.triggers,
  };
}

/**
 * Migrates older schema versions to something "current-ish".
 * (We still normalize fully in loadGameWorldFile.)
 */
export function migrateGameWorldFile(input: unknown): GameWorldFile {
  // totally unusable input -> minimal blank
  if (!isRecord(input)) {
    return {
      version: GAME_WORLD_FILE_VERSION,
      world: { id: "world", name: "World", description: "", settings: {} },
      maps: [],
      locations: [],
      tagMeta: {},
      npcs: [],
      quests: [],
    };
  }

  const rawVersion =
    typeof input.version === "number"
      ? input.version
      : typeof input.version === "string"
        ? Number(input.version)
        : 0;

  // already current (or newer) -> return as-is (loadGameWorldFile will normalize)
  if (rawVersion >= GAME_WORLD_FILE_VERSION) {
    return input as GameWorldFile;
  }

  // v0 -> v1
  const worldRaw = isRecord(input.world) ? input.world : {};
  const settingsRaw = isRecord(worldRaw.settings) ? worldRaw.settings : {};

  const defaultSpawnMapId =
    typeof settingsRaw.defaultSpawnMapId === "string"
      ? settingsRaw.defaultSpawnMapId
      : "unassigned";

  return {
    version: GAME_WORLD_FILE_VERSION,
    world: {
      id: toStr(worldRaw.id, "world"),
      name: toStr(worldRaw.name, "World"),
      description: toStr(worldRaw.description, ""),
      settings: { defaultSpawnMapId },
    },
    maps: Array.isArray(input.maps) ? (input.maps as unknown as MapData[]) : [],
    locations: Array.isArray(input.locations)
      ? (input.locations as unknown as Location[])
      : [],
    tagMeta: isRecord(input.tagMeta)
      ? (input.tagMeta as Record<string, TagMeta>)
      : {},
    npcs: Array.isArray(input.npcs)
      ? (input.npcs as GameWorldFile["npcs"])
      : [],
    quests: Array.isArray(input.quests)
      ? (input.quests as GameWorldFile["quests"])
      : [],
    items: Array.isArray(input.items) ? input.items : undefined,
    triggers: Array.isArray(input.triggers) ? input.triggers : undefined,
  };
}
