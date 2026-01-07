import { useMemo, useRef, useState } from "react";
import { usePersistedWorld } from "./hooks/usePersistedWorld";
import worldData from "./data/world_example.json";
import type {
  GameWorldFile,
  MapData,
  Location as WorldLocation,
} from "./types/worldTypes";

import { Sidebar } from "./components/Sidebar";
import { WorldEditor } from "./components/WorldEditor";
import { MapsEditor } from "./components/MapsEditor";
import { LocationsEditor } from "./components/LocationsEditor";
import { PreviewTab } from "./components/PreviewTab";

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

// types
type TabKey = "world" | "maps" | "locations" | "preview";
type Issue = { level: "error" | "warning"; message: string };
// component
function isGameWorldFile(x: unknown): x is GameWorldFile {
  if (!x || typeof x !== "object") return false;

  const obj = x as Record<string, unknown>;

  return (
    Array.isArray(obj.maps) &&
    Array.isArray(obj.locations) &&
    typeof obj.world === "object" &&
    obj.world !== null
  );
}

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

  // Persisted world
  const { world, setWorld, resetSavedWorld } = usePersistedWorld(
    "open_world_toolkit_world",
    initialWorld
  );

  // UI state
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

  // Smart tag suggestions
  const tagSuggestions = useMemo(() => {
    const presets = [
      "spawn",
      "poi",
      "city",
      "town",
      "dungeon",
      "shop",
      "quest",
      "boss",
      "safe",
      "danger",
      "forest",
      "desert",
      "mountain",
      "water",
      "camp",
      "npc",
    ];

    const used = new Set<string>();
    for (const loc of syncedWorld.locations) {
      for (const t of loc.tags ?? []) used.add(t);
    }

    return Array.from(new Set([...presets, ...Array.from(used)]))
      .map((t) => t.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [syncedWorld.locations]);

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

    for (const l of syncedWorld.locations) {
      if (l.mapId !== "unassigned" && !mapIds.has(l.mapId)) {
        issues.push({
          level: "error",
          message: `Location "${l.id}" points to missing mapId "${l.mapId}"`,
        });
      }
    }

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

    for (const l of syncedWorld.locations) {
      if (!l.tags || l.tags.length === 0) {
        issues.push({
          level: "warning",
          message: `Location "${l.id}" has no tags`,
        });
      }
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
      const locations = prev.locations.map((l) =>
        l.mapId === mapId ? { ...l, mapId: "unassigned" } : l
      );
      return { ...prev, maps, locations };
    });
  }

  // ------------------------------
  // Locations editor
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

    setTagDraftByLocId((prev) => {
      const next = { ...prev };
      delete next[locId];
      return next;
    });
  }

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
      const parsed = JSON.parse(text) as unknown;

      if (!isGameWorldFile(parsed)) {
        throw new Error("Invalid world structure");
      }

      setWorld(parsed);
      alert("Imported successfully");
    } catch (err) {
      console.error("Import failed:", err);
      alert("Invalid or incompatible JSON file");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }
  // ------------------------------
  // Render
  // ------------------------------
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
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* HIDDEN IMPORT INPUT */}
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

      {/* MAIN */}
      <main style={{ flex: 1, padding: 24, maxWidth: 1000 }}>
        <h1 style={{ marginTop: 0 }}>Open World Toolkit (Editor)</h1>

        {/* WORLD */}
        {activeTab === "world" && (
          <>
            <button
              onClick={() => {
                if (
                  confirm("This will reset all saved world data. Continue?")
                ) {
                  resetSavedWorld();
                }
              }}
              style={{ marginBottom: 12 }}
            >
              Reset saved data
            </button>

            <WorldEditor
              world={world}
              onUpdateWorld={updateWorldInfo}
              onExport={() => {
                if (hasErrors) {
                  alert("Fix errors before exporting.");
                  return;
                }
                downloadJson("world_export.json", syncedWorld);
              }}
              onImportClick={() => importInputRef.current?.click()}
              hasErrors={hasErrors}
              errorCount={errorIssues.length}
              warningCount={warningIssues.length}
            />
          </>
        )}

        {/* MAPS */}
        {activeTab === "maps" && (
          <MapsEditor
            maps={syncedWorld.maps}
            onAddMap={addMap}
            onUpdateMap={updateMap}
            onDeleteMap={(mapId) => {
              if (
                confirm(
                  `Delete map "${mapId}"? Locations on that map will become unassigned.`
                )
              ) {
                deleteMap(mapId);
              }
            }}
          />
        )}

        {/* LOCATIONS */}
        {activeTab === "locations" && (
          <LocationsEditor
            locations={syncedWorld.locations}
            maps={syncedWorld.maps}
            tagDraftByLocId={tagDraftByLocId}
            setTagDraftByLocId={setTagDraftByLocId}
            tagSuggestions={tagSuggestions}
            onAddLocation={addLocation}
            onUpdateLocation={updateLocationById}
            onDeleteLocation={(locId) => {
              if (
                confirm(`Delete location "${locId}"? This cannot be undone.`)
              ) {
                deleteLocationById(locId);
              }
            }}
            onAddTag={addTagToLocation}
            onRemoveTag={removeTagFromLocation}
          />
        )}

        {/* PREVIEW */}
        {activeTab === "preview" && (
          <PreviewTab
            world={syncedWorld}
            locationById={locationById}
            errorIssues={errorIssues}
            warningIssues={warningIssues}
          />
        )}
      </main>
    </div>
  );
}
