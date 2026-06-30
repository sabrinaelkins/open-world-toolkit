import { describe, it, expect } from "vitest";
import { worldReducer } from "../context/worldReducer";
import type { GameWorldFile } from "../types/worldTypes";

// ----------------------------------------------------------------
// Minimal world fixture
// ----------------------------------------------------------------
function makeWorld(): GameWorldFile {
  return {
    version: 1,
    world: {
      id: "world_test",
      name: "Test World",
      description: "A test world",
      settings: { defaultSpawnMapId: "map_001" },
    },
    maps: [
      {
        id: "map_001",
        name: "Region One",
        description: "First region",
        size: { width: 2000, height: 2000, unit: "meters" },
        locations: ["loc_001"],
      },
    ],
    locations: [
      {
        id: "loc_001",
        name: "Spawn",
        mapId: "map_001",
        position: { x: 100, y: 100, z: 0 },
        radius: 5,
        tags: ["spawn"],
      },
    ],
    tagMeta: {
      spawn: { description: "Spawn point", category: "system", color: "#22c55e" },
    },
    npcs: [],
    items: [],
    quests: [],
    triggers: [],
  };
}

// ----------------------------------------------------------------
// World info
// ----------------------------------------------------------------
describe("UPDATE_WORLD_INFO", () => {
  it("updates world name", () => {
    const state = worldReducer(makeWorld(), {
      type: "UPDATE_WORLD_INFO",
      patch: { name: "New Name" },
    });
    expect(state.world.name).toBe("New Name");
  });

  it("does not mutate other fields", () => {
    const before = makeWorld();
    const state = worldReducer(before, {
      type: "UPDATE_WORLD_INFO",
      patch: { name: "X" },
    });
    expect(state.world.id).toBe(before.world.id);
    expect(state.maps).toEqual(before.maps);
    expect(state.locations).toEqual(before.locations);
  });
});

// ----------------------------------------------------------------
// Maps
// ----------------------------------------------------------------
describe("ADD_MAP", () => {
  it("adds a map", () => {
    const state = worldReducer(makeWorld(), { type: "ADD_MAP" });
    expect(state.maps).toHaveLength(2);
  });

  it("generates a collision-safe ID", () => {
    let state = makeWorld();
    for (let i = 0; i < 5; i++) {
      state = worldReducer(state, { type: "ADD_MAP" });
    }
    const ids = state.maps.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("new map starts with empty name template", () => {
    const state = worldReducer(makeWorld(), { type: "ADD_MAP" });
    const newMap = state.maps[state.maps.length - 1];
    expect(newMap.name).toBe("New Map");
  });
});

describe("UPDATE_MAP", () => {
  it("updates only the target map", () => {
    const state = worldReducer(makeWorld(), {
      type: "UPDATE_MAP",
      mapId: "map_001",
      patch: { name: "Updated Region" },
    });
    expect(state.maps[0].name).toBe("Updated Region");
  });

  it("ignores unknown mapId", () => {
    const before = makeWorld();
    const state = worldReducer(before, {
      type: "UPDATE_MAP",
      mapId: "map_999",
      patch: { name: "Ghost" },
    });
    expect(state.maps).toEqual(before.maps);
  });
});

describe("DELETE_MAP", () => {
  it("removes the map", () => {
    const state = worldReducer(makeWorld(), {
      type: "DELETE_MAP",
      mapId: "map_001",
    });
    expect(state.maps).toHaveLength(0);
  });

  it("reassigns locations to unassigned", () => {
    const state = worldReducer(makeWorld(), {
      type: "DELETE_MAP",
      mapId: "map_001",
    });
    expect(state.locations[0].mapId).toBe("unassigned");
  });
});

// ----------------------------------------------------------------
// Locations
// ----------------------------------------------------------------
describe("ADD_LOCATION", () => {
  it("adds a location", () => {
    const state = worldReducer(makeWorld(), { type: "ADD_LOCATION" });
    expect(state.locations).toHaveLength(2);
  });

  it("spawns near map center not at 0,0", () => {
    const state = worldReducer(makeWorld(), { type: "ADD_LOCATION" });
    const newLoc = state.locations[state.locations.length - 1];
    // Should be roughly centered (within 600 units of center)
    expect(newLoc.position.x).toBeGreaterThan(400);
    expect(newLoc.position.x).toBeLessThan(1600);
    expect(newLoc.position.y).toBeGreaterThan(400);
    expect(newLoc.position.y).toBeLessThan(1600);
  });

  it("generates collision-safe IDs when adding many", () => {
    let state = makeWorld();
    for (let i = 0; i < 10; i++) {
      state = worldReducer(state, { type: "ADD_LOCATION" });
    }
    const ids = state.locations.map((l) => l.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("UPDATE_LOCATION", () => {
  it("updates name", () => {
    const state = worldReducer(makeWorld(), {
      type: "UPDATE_LOCATION",
      locId: "loc_001",
      patch: { name: "New Spawn Name" },
    });
    expect(state.locations[0].name).toBe("New Spawn Name");
  });

  it("updates position", () => {
    const state = worldReducer(makeWorld(), {
      type: "UPDATE_LOCATION",
      locId: "loc_001",
      patch: { position: { x: 500, y: 600, z: 10 } },
    });
    expect(state.locations[0].position).toEqual({ x: 500, y: 600, z: 10 });
  });
});

describe("DELETE_LOCATION", () => {
  it("removes the location", () => {
    const state = worldReducer(makeWorld(), {
      type: "DELETE_LOCATION",
      locId: "loc_001",
    });
    expect(state.locations).toHaveLength(0);
  });

  it("ignores unknown locId", () => {
    const before = makeWorld();
    const state = worldReducer(before, {
      type: "DELETE_LOCATION",
      locId: "loc_999",
    });
    expect(state.locations).toHaveLength(before.locations.length);
  });
});

// ----------------------------------------------------------------
// Tags on locations
// ----------------------------------------------------------------
describe("ADD_TAG_TO_LOCATION", () => {
  it("adds a tag", () => {
    const state = worldReducer(makeWorld(), {
      type: "ADD_TAG_TO_LOCATION",
      locId: "loc_001",
      tag: "boss",
    });
    expect(state.locations[0].tags).toContain("boss");
  });

  it("does not duplicate tags", () => {
    const state = worldReducer(makeWorld(), {
      type: "ADD_TAG_TO_LOCATION",
      locId: "loc_001",
      tag: "spawn", // already exists
    });
    const spawnCount = state.locations[0].tags!.filter((t) => t === "spawn").length;
    expect(spawnCount).toBe(1);
  });

  it("ignores empty tags", () => {
    const before = makeWorld();
    const state = worldReducer(before, {
      type: "ADD_TAG_TO_LOCATION",
      locId: "loc_001",
      tag: "   ",
    });
    expect(state.locations[0].tags).toEqual(before.locations[0].tags);
  });
});

describe("REMOVE_TAG_FROM_LOCATION", () => {
  it("removes the tag", () => {
    const state = worldReducer(makeWorld(), {
      type: "REMOVE_TAG_FROM_LOCATION",
      locId: "loc_001",
      tag: "spawn",
    });
    expect(state.locations[0].tags).not.toContain("spawn");
  });
});

// ----------------------------------------------------------------
// Tag meta
// ----------------------------------------------------------------
describe("UPDATE_TAG_META", () => {
  it("updates description", () => {
    const state = worldReducer(makeWorld(), {
      type: "UPDATE_TAG_META",
      tag: "spawn",
      patch: { description: "Updated desc" },
    });
    expect(state.tagMeta!["spawn"].description).toBe("Updated desc");
  });

  it("creates meta for new tag", () => {
    const state = worldReducer(makeWorld(), {
      type: "UPDATE_TAG_META",
      tag: "dungeon",
      patch: { color: "#ff0000" },
    });
    expect(state.tagMeta!["dungeon"].color).toBe("#ff0000");
  });
});

describe("RENAME_TAG", () => {
  it("renames tag in all locations", () => {
    const state = worldReducer(makeWorld(), {
      type: "RENAME_TAG",
      from: "spawn",
      to: "start",
    });
    expect(state.locations[0].tags).toContain("start");
    expect(state.locations[0].tags).not.toContain("spawn");
  });

  it("migrates tagMeta to new key", () => {
    const state = worldReducer(makeWorld(), {
      type: "RENAME_TAG",
      from: "spawn",
      to: "start",
    });
    expect(state.tagMeta!["start"]).toBeDefined();
    expect(state.tagMeta!["spawn"]).toBeUndefined();
  });

  it("does nothing if from === to", () => {
    const before = makeWorld();
    const state = worldReducer(before, {
      type: "RENAME_TAG",
      from: "spawn",
      to: "spawn",
    });
    expect(state.locations).toEqual(before.locations);
  });
});

describe("DELETE_TAG", () => {
  it("removes tag from all locations", () => {
    const state = worldReducer(makeWorld(), {
      type: "DELETE_TAG",
      tag: "spawn",
    });
    expect(state.locations[0].tags).not.toContain("spawn");
  });

  it("removes tagMeta entry", () => {
    const state = worldReducer(makeWorld(), {
      type: "DELETE_TAG",
      tag: "spawn",
    });
    expect(state.tagMeta!["spawn"]).toBeUndefined();
  });
});

// ----------------------------------------------------------------
// LOAD_WORLD
// ----------------------------------------------------------------
describe("LOAD_WORLD", () => {
  it("replaces state entirely", () => {
    const newWorld = makeWorld();
    newWorld.world.name = "Imported World";
    const state = worldReducer(makeWorld(), {
      type: "LOAD_WORLD",
      world: newWorld,
    });
    expect(state.world.name).toBe("Imported World");
  });
});
