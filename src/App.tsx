import { useMemo, useRef, useState } from "react";
import worldData from "./data/world_example.json";
import type {
  GameWorldFile,
  MapData,
  Location as WorldLocation,
} from "./types/worldTypes";

// ------------------------------
// helpers: import/export
// ------------------------------
function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function safeParseJson(text: string) {
  return JSON.parse(text) as unknown;
}

type TabKey = "world" | "maps" | "locations" | "preview";
type Issue = { level: "error" | "warning"; message: string };

// ------------------------------
// APP
// ------------------------------
export default function App() {
  // Start from a deep copy so we don't mutate imported JSON
  const initialWorld = useMemo(() => {
    try {
      return structuredClone(worldData as GameWorldFile);
    } catch {
      return JSON.parse(JSON.stringify(worldData)) as GameWorldFile;
    }
  }, []);

  const [world, setWorld] = useState<GameWorldFile>(initialWorld);
  const [activeTab, setActiveTab] = useState<TabKey>("world");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Tag drafts (each location remembers what you're typing)
  const [tagDraftByLocId, setTagDraftByLocId] = useState<
    Record<string, string>
  >({});

  // ------------------------------
  // Keep map.locations derived from world.locations (single source of truth)
  // ------------------------------
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

  // Lookup helper: location id -> Location
  const locationById = useMemo(() => {
    return new Map(syncedWorld.locations.map((l) => [l.id, l] as const));
  }, [syncedWorld.locations]);

  // ------------------------------
  // Validation (Preview Issues)
  // ------------------------------
  const previewIssues = useMemo(() => {
    const issues: Issue[] = [];

    const mapIds = new Set(syncedWorld.maps.map((m) => m.id));
    const locationIds = new Set(syncedWorld.locations.map((l) => l.id));

    // ERRORS: location points to a map that doesn't exist
    for (const l of syncedWorld.locations) {
      if (l.mapId !== "unassigned" && !mapIds.has(l.mapId)) {
        issues.push({
          level: "error",
          message: `Location "${l.id}" points to missing mapId "${l.mapId}"`,
        });
      }
    }

    // ERRORS: map references a locationId that doesn't exist
    for (const m of syncedWorld.maps) {
      for (const locId of m.locations ?? []) {
        if (!locationIds.has(locId)) {
          issues.push({
            level: "error",
            message: `Map "${m.id}" references missing locationId "${locId}"`,
          });
        }
      }
    }

    // WARNINGS: missing tags
    for (const l of syncedWorld.locations) {
      if (!l.tags || l.tags.length === 0) {
        issues.push({
          level: "warning",
          message: `Location "${l.id}" has no tags`,
        });
      }
    }

    // WARNINGS: unassigned mapId (allowed, but often a mistake)
    for (const l of syncedWorld.locations) {
      if (l.mapId === "unassigned") {
        issues.push({
          level: "warning",
          message: `Location "${l.id}" is unassigned to a map`,
        });
      }
    }

    return issues;
  }, [syncedWorld]);

  const errorIssues = useMemo(
    () => previewIssues.filter((i) => i.level === "error"),
    [previewIssues]
  );

  const warningIssues = useMemo(
    () => previewIssues.filter((i) => i.level === "warning"),
    [previewIssues]
  );

  const hasErrors = errorIssues.length > 0;

  // ------------------------------
  // World editor
  // ------------------------------
  function updateWorldInfo(patch: Partial<GameWorldFile["world"]>) {
    setWorld((prev) => ({
      ...prev,
      world: { ...prev.world, ...patch },
    }));
  }

  // ------------------------------
  // Maps editor
  // ------------------------------
  function addMap() {
    setWorld((prev) => {
      const nextNumber = prev.maps.length + 1;
      const newMapId = `map_${String(nextNumber).padStart(3, "0")}`;

      const newMap: MapData = {
        id: newMapId,
        name: "New Map",
        description: "Describe this region...",
        size: { width: 2000, height: 2000, unit: "meters" },
        locations: [],
      };

      return { ...prev, maps: [...prev.maps, newMap] };
    });
  }

  function updateMap(mapId: string, patch: Partial<MapData>) {
    setWorld((prev) => ({
      ...prev,
      maps: prev.maps.map((m) => (m.id === mapId ? { ...m, ...patch } : m)),
    }));
  }

  function deleteMap(mapId: string) {
    setWorld((prev) => {
      const maps = prev.maps.filter((m) => m.id !== mapId);

      // Any locations assigned to this map become unassigned
      const locations = prev.locations.map((l) =>
        l.mapId === mapId ? { ...l, mapId: "unassigned" } : l
      );

      return { ...prev, maps, locations };
    });
  }

  // ------------------------------
  // Locations editor (ID-based to avoid index bugs)
  // ------------------------------
  function addLocation() {
    setWorld((prev) => {
      const nextNumber = prev.locations.length + 1;
      const newLocId = `loc_${String(nextNumber).padStart(3, "0")}`;

      const newLoc: WorldLocation = {
        id: newLocId,
        name: "New Location",
        mapId: prev.maps[0]?.id ?? "unassigned",
        position: { x: 0, y: 0, z: 0 },
        radius: 5,
        tags: [],
      };

      return { ...prev, locations: [...prev.locations, newLoc] };
    });
  }

  function updateLocationById(locId: string, patch: Partial<WorldLocation>) {
    setWorld((prev) => ({
      ...prev,
      locations: prev.locations.map((l) =>
        l.id === locId ? { ...l, ...patch } : l
      ),
    }));
  }

  function deleteLocationById(locId: string) {
    setWorld((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l.id !== locId),
    }));

    // also clear any draft text for that location
    setTagDraftByLocId((prev) => {
      const next = { ...prev };
      delete next[locId];
      return next;
    });
  }

  // Tags helpers (ID-based)
  function addTagToLocation(locId: string, rawTag: string) {
    const clean = rawTag.trim();
    if (!clean) return;

    setWorld((prev) => ({
      ...prev,
      locations: prev.locations.map((l) => {
        if (l.id !== locId) return l;
        const existing = l.tags ?? [];
        if (existing.includes(clean)) return l;
        return { ...l, tags: [...existing, clean] };
      }),
    }));
  }

  function removeTagFromLocation(locId: string, tag: string) {
    setWorld((prev) => ({
      ...prev,
      locations: prev.locations.map((l) => {
        if (l.id !== locId) return l;
        return { ...l, tags: (l.tags ?? []).filter((t) => t !== tag) };
      }),
    }));
  }

  // ------------------------------
  // Import JSON
  // ------------------------------
  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = safeParseJson(text);
      setWorld(parsed as GameWorldFile);
      alert("Imported ✅");
    } catch {
      alert("Invalid JSON file");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

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
        background: "#222",
        color: "#eee",
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
              background: "transparent",
              color: "#eee",
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

        {/* WORLD */}
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
                onChange={(e) => updateWorldInfo({ name: e.target.value })}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #666",
                  background: "#333",
                  color: "#eee",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Description</div>
              <textarea
                value={world.world.description}
                onChange={(e) =>
                  updateWorldInfo({ description: e.target.value })
                }
                rows={4}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #666",
                  background: "#333",
                  color: "#eee",
                }}
              />
            </label>

            <div style={{ marginTop: 12 }}>
              <button
                disabled={hasErrors}
                onClick={() => {
                  if (hasErrors) {
                    alert("Fix errors before exporting.");
                    return;
                  }
                  downloadJson("world_export.json", syncedWorld);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1px solid ${hasErrors ? "#555" : "#666"}`,
                  background: "transparent",
                  color: hasErrors ? "#777" : "#eee",
                  cursor: hasErrors ? "not-allowed" : "pointer",
                  opacity: hasErrors ? 0.6 : 1,
                }}
              >
                Export JSON
              </button>

              <button
                onClick={() => importInputRef.current?.click()}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #666",
                  background: "transparent",
                  color: "#eee",
                  cursor: "pointer",
                  marginLeft: 10,
                }}
              >
                Import JSON
              </button>

              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportFile(file);
                }}
              />

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                Import replaces the current world state.
              </div>

              {(errorIssues.length > 0 || warningIssues.length > 0) && (
                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.9 }}>
                  Validation: {errorIssues.length} error(s),{" "}
                  {warningIssues.length} warning(s)
                </div>
              )}
            </div>
          </section>
        )}

        {/* MAPS */}
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
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #666",
                background: "transparent",
                color: "#eee",
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              + Add Map
            </button>

            {syncedWorld.maps.map((m) => (
              <div
                key={m.id}
                style={{
                  border: "1px solid #555",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{m.id}</div>
                  <button
                    onClick={() => deleteMap(m.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #666",
                      background: "transparent",
                      color: "#eee",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>

                <label style={{ display: "block", marginTop: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Map Name</div>
                  <input
                    value={m.name}
                    onChange={(e) => updateMap(m.id, { name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 6,
                      border: "1px solid #666",
                      background: "#333",
                      color: "#eee",
                    }}
                  />
                </label>

                <label style={{ display: "block", marginTop: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Description</div>
                  <input
                    value={m.description}
                    onChange={(e) =>
                      updateMap(m.id, { description: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 6,
                      border: "1px solid #666",
                      background: "#333",
                      color: "#eee",
                    }}
                  />
                </label>

                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Width</div>
                    <input
                      type="number"
                      value={m.size?.width ?? 0}
                      onChange={(e) =>
                        updateMap(m.id, {
                          size: {
                            ...(m.size ?? {
                              width: 0,
                              height: 0,
                              unit: "meters",
                            }),
                            width: Number(e.target.value),
                          },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #666",
                        background: "#333",
                        color: "#eee",
                      }}
                    />
                  </label>

                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Height</div>
                    <input
                      type="number"
                      value={m.size?.height ?? 0}
                      onChange={(e) =>
                        updateMap(m.id, {
                          size: {
                            ...(m.size ?? {
                              width: 0,
                              height: 0,
                              unit: "meters",
                            }),
                            height: Number(e.target.value),
                          },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #666",
                        background: "#333",
                        color: "#eee",
                      }}
                    />
                  </label>

                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Unit</div>
                    <input
                      value={m.size?.unit ?? "meters"}
                      onChange={(e) =>
                        updateMap(m.id, {
                          size: {
                            ...(m.size ?? {
                              width: 0,
                              height: 0,
                              unit: "meters",
                            }),
                            unit: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #666",
                        background: "#333",
                        color: "#eee",
                      }}
                    />
                  </label>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                  Locations assigned: {(m.locations ?? []).length}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* LOCATIONS */}
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
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #666",
                background: "transparent",
                color: "#eee",
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              + Add Location
            </button>

            {syncedWorld.locations.map((loc) => (
              <div
                key={loc.id}
                style={{
                  border: "1px solid #555",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{loc.id}</div>
                  <button
                    onClick={() => deleteLocationById(loc.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #666",
                      background: "transparent",
                      color: "#eee",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>

                <label style={{ display: "block", marginTop: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Location Name
                  </div>
                  <input
                    value={loc.name}
                    onChange={(e) =>
                      updateLocationById(loc.id, { name: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 6,
                      border: "1px solid #666",
                      background: "#333",
                      color: "#eee",
                    }}
                  />
                </label>

                <label style={{ display: "block", marginTop: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Map</div>
                  <select
                    value={loc.mapId}
                    onChange={(e) =>
                      updateLocationById(loc.id, { mapId: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 6,
                      border: "1px solid #666",
                      background: "#333",
                      color: "#eee",
                    }}
                  >
                    {syncedWorld.maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                    <option value="unassigned">Unassigned</option>
                  </select>
                </label>

                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>X</div>
                    <input
                      type="number"
                      value={loc.position.x}
                      onChange={(e) =>
                        updateLocationById(loc.id, {
                          position: {
                            ...loc.position,
                            x: Number(e.target.value),
                          },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #666",
                        background: "#333",
                        color: "#eee",
                      }}
                    />
                  </label>

                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Y</div>
                    <input
                      type="number"
                      value={loc.position.y}
                      onChange={(e) =>
                        updateLocationById(loc.id, {
                          position: {
                            ...loc.position,
                            y: Number(e.target.value),
                          },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #666",
                        background: "#333",
                        color: "#eee",
                      }}
                    />
                  </label>

                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Z</div>
                    <input
                      type="number"
                      value={loc.position.z}
                      onChange={(e) =>
                        updateLocationById(loc.id, {
                          position: {
                            ...loc.position,
                            z: Number(e.target.value),
                          },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #666",
                        background: "#333",
                        color: "#eee",
                      }}
                    />
                  </label>
                </div>

                <label style={{ display: "block", marginTop: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Radius</div>
                  <input
                    type="number"
                    value={loc.radius}
                    onChange={(e) =>
                      updateLocationById(loc.id, {
                        radius: Number(e.target.value),
                      })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 6,
                      border: "1px solid #666",
                      background: "#333",
                      color: "#eee",
                    }}
                  />
                </label>

                {/* TAGS */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                    Tags
                  </div>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      value={tagDraftByLocId[loc.id] ?? ""}
                      onChange={(e) =>
                        setTagDraftByLocId((prev) => ({
                          ...prev,
                          [loc.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTagToLocation(
                            loc.id,
                            tagDraftByLocId[loc.id] ?? ""
                          );
                          setTagDraftByLocId((prev) => ({
                            ...prev,
                            [loc.id]: "",
                          }));
                        }
                      }}
                      placeholder="type tag + Enter"
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #666",
                        background: "#333",
                        color: "#eee",
                      }}
                    />

                    <button
                      onClick={() => {
                        addTagToLocation(loc.id, tagDraftByLocId[loc.id] ?? "");
                        setTagDraftByLocId((prev) => ({
                          ...prev,
                          [loc.id]: "",
                        }));
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #666",
                        background: "transparent",
                        color: "#eee",
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {(loc.tags ?? []).map((t) => (
                      <button
                        key={t}
                        onClick={() => removeTagFromLocation(loc.id, t)}
                        title="Click to remove"
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "1px solid #666",
                          background: "transparent",
                          color: "#eee",
                          cursor: "pointer",
                          opacity: 0.9,
                        }}
                      >
                        {t} ✕
                      </button>
                    ))}

                    {(loc.tags ?? []).length === 0 && (
                      <div style={{ opacity: 0.7, fontSize: 12 }}>
                        No tags yet
                      </div>
                    )}
                  </div>
                </div>
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

            {(errorIssues.length > 0 || warningIssues.length > 0) && (
              <div style={{ marginTop: 12 }}>
                {errorIssues.length > 0 && (
                  <div
                    style={{
                      padding: 12,
                      border: "1px solid #ff4d4d",
                      borderRadius: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      Errors
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {errorIssues.map((e, idx) => (
                        <li key={idx} style={{ opacity: 0.95 }}>
                          {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {warningIssues.length > 0 && (
                  <div
                    style={{
                      padding: 12,
                      border: "1px solid #ffb020",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      Warnings
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {warningIssues.map((w, idx) => (
                        <li key={idx} style={{ opacity: 0.95 }}>
                          {w.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                padding: 12,
                border: "1px solid #555",
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                World
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {syncedWorld.world.name}
              </div>
              <div style={{ marginTop: 6, opacity: 0.9 }}>
                {syncedWorld.world.description}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Maps</h3>

              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {syncedWorld.maps.map((m) => {
                  const locs = (m.locations ?? [])
                    .map((id) => locationById.get(id))
                    .filter((x): x is NonNullable<typeof x> => Boolean(x));

                  return (
                    <li key={m.id} style={{ marginBottom: 10 }}>
                      <div>
                        <strong>{m.name}</strong> — {m.description} (locs:{" "}
                        {locs.length})
                      </div>

                      {locs.length > 0 ? (
                        <ul
                          style={{
                            marginTop: 6,
                            paddingLeft: 18,
                            opacity: 0.9,
                          }}
                        >
                          {locs.map((l) => (
                            <li key={l.id}>
                              {l.name} @ ({l.position.x}, {l.position.y},{" "}
                              {l.position.z}) — radius {l.radius}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ marginTop: 6, opacity: 0.7 }}>
                          No locations assigned yet
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div style={{ marginTop: 16 }}>
              <h3>All Locations</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {syncedWorld.locations.map((l) => (
                  <li key={l.id}>
                    {l.name} @ ({l.position.x}, {l.position.y}, {l.position.z})
                    — map: {l.mapId}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
