import { useMemo, useState } from "react";
import worldData from "./data/world_example.json";
import type { GameWorldFile, MapData, Location } from "./types/worldTypes";

function downloadJson(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

type TabKey = "world" | "maps" | "locations" | "preview";

export default function App() {
  const initialWorld = useMemo(() => {
    try {
      return structuredClone(worldData as GameWorldFile);
    } catch {
      return JSON.parse(JSON.stringify(worldData)) as GameWorldFile;
    }
  }, []);

  const [world, setWorld] = useState<GameWorldFile>(initialWorld);
  const [activeTab, setActiveTab] = useState<TabKey>("world");

  // ---- keep map.locations in sync based on world.locations.mapId ----
  const syncedWorld: GameWorldFile = useMemo(() => {
    const mapIdToLocIds = new Map<string, string[]>();

    for (const loc of world.locations) {
      const arr = mapIdToLocIds.get(loc.mapId) ?? [];
      arr.push(loc.id);
      mapIdToLocIds.set(loc.mapId, arr);
    }

    const maps = world.maps.map((m) => ({
      ...m,
      locations: mapIdToLocIds.get(m.id) ?? [],
    }));

    return { ...world, maps };
  }, [world]);

  // ---------------- MAPS ----------------
  const addMap = () => {
    const nextNumber = world.maps.length + 1;
    const newMapId = `map_${String(nextNumber).padStart(3, "0")}`;

    const newMap: MapData = {
      id: newMapId,
      name: "New Map",
      description: "Describe this region...",
      size: { width: 2000, height: 2000, unit: "meters" },
      locations: [],
    };

    setWorld({ ...world, maps: [...world.maps, newMap] });
  };

  const deleteMap = (mapId: string) => {
    const maps = world.maps.filter((m) => m.id !== mapId);

    // if locations pointed at this map, move them to first remaining map (or blank)
    const fallbackMapId = maps[0]?.id ?? "";
    const locations = world.locations.map((l) =>
      l.mapId === mapId ? { ...l, mapId: fallbackMapId } : l
    );

    setWorld({ ...world, maps, locations });
  };

  const updateMap = (index: number, patch: Partial<MapData>) => {
    const maps = [...world.maps];
    maps[index] = { ...maps[index], ...patch };
    setWorld({ ...world, maps });
  };

  // -------------- LOCATIONS --------------
  const addLocation = () => {
    const nextNumber = world.locations.length + 1;
    const newLocId = `loc_${String(nextNumber).padStart(3, "0")}`;
    const firstMapId = world.maps[0]?.id ?? "map_001";

    const newLocation: Location = {
      id: newLocId,
      mapId: firstMapId,
      name: "New Location",
      position: { x: 0, y: 0, z: 0 },
      radius: 10,
      tags: [],
    };

    setWorld({ ...world, locations: [...world.locations, newLocation] });
  };

  const deleteLocation = (locId: string) => {
    const locations = world.locations.filter((l) => l.id !== locId);
    setWorld({ ...world, locations });
  };

  const updateLocation = (index: number, patch: Partial<Location>) => {
    const locations = [...world.locations];
    locations[index] = { ...locations[index], ...patch };
    setWorld({ ...world, locations });
  };

  const tabs: Array<[TabKey, string]> = [
    ["world", "World"],
    ["maps", "Maps"],
    ["locations", "Locations"],
    ["preview", "Preview"],
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #444",
          padding: 16,
          height: "100vh",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Open World Toolkit</h2>

        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              marginBottom: 8,
              borderRadius: 10,
              border: "1px solid #666",
              cursor: "pointer",
              opacity: activeTab === key ? 1 : 0.8,
            }}
          >
            {activeTab === key ? "▶ " : ""}
            {label}
          </button>
        ))}
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: 24, maxWidth: 1000 }}>
        <h1 style={{ marginTop: 0 }}>Open World Toolkit (Editor)</h1>

        {/* WORLD EDITOR */}
        {activeTab === "world" && (
          <section
            style={{
              marginTop: 16,
              padding: 16,
              border: "1px solid #444",
              borderRadius: 8,
            }}
          >
            <h2>World</h2>

            <label style={{ display: "block", marginBottom: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>World Name</div>
              <input
                value={world.world.name}
                onChange={(e) =>
                  setWorld({
                    ...world,
                    world: { ...world.world, name: e.target.value },
                  })
                }
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #666",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Description</div>
              <textarea
                value={world.world.description}
                onChange={(e) =>
                  setWorld({
                    ...world,
                    world: { ...world.world, description: e.target.value },
                  })
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #666",
                }}
              />
            </label>

            <button
              onClick={() => downloadJson("world_export.json", syncedWorld)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #666",
                cursor: "pointer",
              }}
            >
              Export JSON
            </button>
          </section>
        )}

        {/* MAPS EDITOR */}
        {activeTab === "maps" && (
          <section
            style={{
              marginTop: 16,
              padding: 16,
              border: "1px solid #444",
              borderRadius: 8,
            }}
          >
            <h2>Maps Editor</h2>

            <button
              onClick={addMap}
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #666",
                cursor: "pointer",
              }}
            >
              + Add Map
            </button>

            {world.maps.map((map, index) => (
              <div
                key={map.id}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: "1px solid #555",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>{map.id}</strong>
                  <button
                    onClick={() => deleteMap(map.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #666",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>

                <div style={{ height: 10 }} />

                <label style={{ display: "block", marginBottom: 6 }}>
                  <div style={{ fontSize: 12 }}>Map Name</div>
                  <input
                    value={map.name}
                    onChange={(e) => updateMap(index, { name: e.target.value })}
                    style={{ width: "100%", padding: 8 }}
                  />
                </label>

                <label style={{ display: "block" }}>
                  <div style={{ fontSize: 12 }}>Description</div>
                  <input
                    value={map.description}
                    onChange={(e) =>
                      updateMap(index, { description: e.target.value })
                    }
                    style={{ width: "100%", padding: 8 }}
                  />
                </label>
              </div>
            ))}
          </section>
        )}

        {/* LOCATIONS EDITOR */}
        {activeTab === "locations" && (
          <section
            style={{
              marginTop: 16,
              padding: 16,
              border: "1px solid #444",
              borderRadius: 8,
            }}
          >
            <h2>Locations Editor</h2>

            <button
              onClick={addLocation}
              disabled={world.maps.length === 0}
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #666",
                cursor: world.maps.length === 0 ? "not-allowed" : "pointer",
                opacity: world.maps.length === 0 ? 0.6 : 1,
              }}
              title={
                world.maps.length === 0 ? "Add a map first" : "Add a location"
              }
            >
              + Add Location
            </button>

            {world.locations.map((loc, index) => (
              <div
                key={loc.id}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: "1px solid #555",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>{loc.id}</strong>
                  <button
                    onClick={() => deleteLocation(loc.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #666",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>

                <div style={{ height: 10 }} />

                <label style={{ display: "block", marginBottom: 8 }}>
                  <div style={{ fontSize: 12 }}>Location Name</div>
                  <input
                    value={loc.name}
                    onChange={(e) =>
                      updateLocation(index, { name: e.target.value })
                    }
                    style={{ width: "100%", padding: 8 }}
                  />
                </label>

                <label style={{ display: "block", marginBottom: 8 }}>
                  <div style={{ fontSize: 12 }}>Map</div>
                  <select
                    value={loc.mapId}
                    onChange={(e) =>
                      updateLocation(index, { mapId: e.target.value })
                    }
                    style={{ width: "100%", padding: 8 }}
                  >
                    {world.maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 12 }}>X</div>
                    <input
                      type="number"
                      value={loc.position.x}
                      onChange={(e) =>
                        updateLocation(index, {
                          position: {
                            ...loc.position,
                            x: Number(e.target.value),
                          },
                        })
                      }
                      style={{ width: "100%", padding: 8 }}
                    />
                  </label>

                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 12 }}>Y</div>
                    <input
                      type="number"
                      value={loc.position.y}
                      onChange={(e) =>
                        updateLocation(index, {
                          position: {
                            ...loc.position,
                            y: Number(e.target.value),
                          },
                        })
                      }
                      style={{ width: "100%", padding: 8 }}
                    />
                  </label>

                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 12 }}>Z</div>
                    <input
                      type="number"
                      value={loc.position.z}
                      onChange={(e) =>
                        updateLocation(index, {
                          position: {
                            ...loc.position,
                            z: Number(e.target.value),
                          },
                        })
                      }
                      style={{ width: "100%", padding: 8 }}
                    />
                  </label>
                </div>

                <label style={{ display: "block" }}>
                  <div style={{ fontSize: 12 }}>Radius</div>
                  <input
                    type="number"
                    value={loc.radius}
                    onChange={(e) =>
                      updateLocation(index, { radius: Number(e.target.value) })
                    }
                    style={{ width: "100%", padding: 8 }}
                  />
                </label>
              </div>
            ))}
          </section>
        )}

        {/* PREVIEW */}
        {activeTab === "preview" && (
          <section
            style={{
              marginTop: 16,
              padding: 16,
              border: "1px solid #444",
              borderRadius: 8,
            }}
          >
            <h2>Preview</h2>

            <h3 style={{ marginBottom: 4 }}>{world.world.name}</h3>
            <p style={{ marginTop: 0, opacity: 0.9 }}>
              {world.world.description}
            </p>

            <h3>Maps</h3>
            <ul>
              {syncedWorld.maps.map((m) => (
                <li key={m.id}>
                  <strong>{m.name}</strong> — {m.description} (locs:{" "}
                  {m.locations.length})
                </li>
              ))}
            </ul>

            <h3>Locations</h3>
            <ul>
              {world.locations.map((l) => (
                <li key={l.id}>
                  {l.name} @ ({l.position.x}, {l.position.y}, {l.position.z}) —
                  map: {l.mapId}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
