import { describe, it, expect } from "vitest";
import { loadGameWorldFile } from "../types/worldIO";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function validRaw() {
  return {
    version: 1,
    world: { id: "w1", name: "Test", description: "desc" },
    maps: [
      {
        id: "map_001",
        name: "Region",
        description: "A region",
        size: { width: 1000, height: 1000, unit: "meters" },
        locations: ["loc_001"],
      },
    ],
    locations: [
      {
        id: "loc_001",
        name: "Spawn",
        mapId: "map_001",
        position: { x: 0, y: 0, z: 0 },
        radius: 5,
        tags: ["spawn"],
      },
    ],
    tagMeta: {},
    npcs: [],
    items: [],
    quests: [],
    triggers: [],
  };
}

// ----------------------------------------------------------------
// loadGameWorldFile — happy path
// ----------------------------------------------------------------
describe("loadGameWorldFile — valid input", () => {
  it("loads a valid world file", () => {
    const result = loadGameWorldFile(validRaw());
    expect(result.world.name).toBe("Test");
    expect(result.maps).toHaveLength(1);
    expect(result.locations).toHaveLength(1);
  });

  it("preserves location tags", () => {
    const result = loadGameWorldFile(validRaw());
    expect(result.locations[0].tags).toContain("spawn");
  });

  it("sets version field", () => {
    const result = loadGameWorldFile(validRaw());
    expect(result.version).toBe(1);
  });
});

// ----------------------------------------------------------------
// loadGameWorldFile — defensive normalization
// ----------------------------------------------------------------
describe("loadGameWorldFile — bad input", () => {
  it("does not throw on null", () => {
    expect(() => loadGameWorldFile(null)).not.toThrow();
  });

  it("does not throw on empty object", () => {
    expect(() => loadGameWorldFile({})).not.toThrow();
  });

  it("does not throw on string", () => {
    expect(() => loadGameWorldFile("bad input")).not.toThrow();
  });

  it("does not throw on array", () => {
    expect(() => loadGameWorldFile([])).not.toThrow();
  });

  it("returns a valid GameWorldFile even for empty input", () => {
    const result = loadGameWorldFile({});
    expect(result.maps).toBeDefined();
    expect(Array.isArray(result.maps)).toBe(true);
    expect(result.locations).toBeDefined();
    expect(Array.isArray(result.locations)).toBe(true);
  });

  it("fills in missing world name with fallback", () => {
    const result = loadGameWorldFile({});
    expect(typeof result.world.name).toBe("string");
  });

  it("normalizes maps with missing fields", () => {
    const raw = validRaw();
    // @ts-expect-error intentionally bad data
    raw.maps[0].name = undefined;
    const result = loadGameWorldFile(raw);
    expect(typeof result.maps[0].name).toBe("string");
  });

  it("normalizes locations with missing tags", () => {
    const raw = validRaw();
    // @ts-expect-error intentionally bad data
    delete raw.locations[0].tags;
    const result = loadGameWorldFile(raw);
    expect(Array.isArray(result.locations[0].tags)).toBe(true);
  });

  it("normalizes locations with missing position", () => {
    const raw = validRaw();
    // @ts-expect-error intentionally bad data
    delete raw.locations[0].position;
    const result = loadGameWorldFile(raw);
    expect(result.locations[0].position).toBeDefined();
    expect(typeof result.locations[0].position.x).toBe("number");
  });

  it("filters out non-string tags", () => {
    const raw = validRaw();
    // @ts-expect-error intentionally bad data
    raw.locations[0].tags = ["spawn", 42, null, undefined, "boss"];
    const result = loadGameWorldFile(raw);
    expect(result.locations[0].tags).toEqual(["spawn", "boss"]);
  });

  it("handles extra unknown fields without throwing", () => {
    const raw = { ...validRaw(), unknownField: "surprise", nested: { a: 1 } };
    expect(() => loadGameWorldFile(raw)).not.toThrow();
  });
});

// ----------------------------------------------------------------
// Round-trip: serialize → deserialize
// ----------------------------------------------------------------
describe("round-trip", () => {
  it("survives JSON stringify/parse", () => {
    const original = loadGameWorldFile(validRaw());
    const serialized = JSON.parse(JSON.stringify(original));
    const restored = loadGameWorldFile(serialized);
    expect(restored.world.name).toBe(original.world.name);
    expect(restored.maps).toHaveLength(original.maps.length);
    expect(restored.locations).toHaveLength(original.locations.length);
  });

  it("tags survive round-trip", () => {
    const original = loadGameWorldFile(validRaw());
    const restored = loadGameWorldFile(JSON.parse(JSON.stringify(original)));
    expect(restored.locations[0].tags).toContain("spawn");
  });
});
