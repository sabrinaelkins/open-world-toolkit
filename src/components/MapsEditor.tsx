import { useState } from "react";
import type {
  MapData,
  Location as WorldLocation,
  TagMeta,
} from "../types/worldTypes";
import { TerrainEditor } from "./TerrainEditor";
import { MapCanvas } from "./MapCanvas";

type Props = {
  maps: MapData[];
  locations: WorldLocation[];
  tagMeta: Record<string, TagMeta>;
  onAddMap: () => void;
  onUpdateMap: (mapId: string, patch: Partial<MapData>) => void;
  onDeleteMap: (mapId: string) => void;
  onUpdateLocation: (locId: string, patch: Partial<WorldLocation>) => void;
  onAddLocation: () => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors";

type MapTab = "terrain" | "canvas";

export function MapsEditor({
  maps,
  locations,
  tagMeta,
  onAddMap,
  onUpdateMap,
  onDeleteMap,
  onUpdateLocation,
  onAddLocation,
}: Props) {
  const [activeTabByMap, setActiveTabByMap] = useState<Record<string, MapTab>>(
    {},
  );

  function getTab(mapId: string): MapTab {
    return activeTabByMap[mapId] ?? "canvas";
  }

  function setTab(mapId: string, tab: MapTab) {
    setActiveTabByMap((prev) => ({ ...prev, [mapId]: tab }));
  }

  return (
    <section className="owt-panel owt-panel-lifted mt-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-100 m-0">Maps Editor</h2>
        <button onClick={onAddMap} className="owt-glow-btn">
          + Add Map
        </button>
      </div>

      {maps.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-8">
          No maps yet — add one to get started.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {maps.map((m) => {
          const tab = getTab(m.id);
          const mapLocations = locations.filter((l) => l.mapId === m.id);

          return (
            <div key={m.id} className="owt-subpanel">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                  {m.id}
                </span>
                <button
                  onClick={() => onDeleteMap(m.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-400/50 text-red-300 bg-transparent hover:bg-red-500/10 hover:border-red-400 hover:shadow-[0_0_12px_rgba(248,113,113,0.4)] hover:-translate-y-0.5 transition-all"
                >
                  Delete
                </button>
              </div>

              {/* Name + Description */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="block">
                  <FieldLabel>Map Name</FieldLabel>
                  <input
                    value={m.name}
                    onChange={(e) =>
                      onUpdateMap(m.id, { name: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <FieldLabel>Description</FieldLabel>
                  <input
                    value={m.description}
                    onChange={(e) =>
                      onUpdateMap(m.id, { description: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
              </div>

              {/* Size row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {(["width", "height"] as const).map((dim) => (
                  <label key={dim} className="block">
                    <FieldLabel>
                      {dim.charAt(0).toUpperCase() + dim.slice(1)}
                    </FieldLabel>
                    <input
                      type="number"
                      value={m.size?.[dim] ?? 0}
                      onChange={(e) =>
                        onUpdateMap(m.id, {
                          size: {
                            ...(m.size ?? {
                              width: 0,
                              height: 0,
                              unit: "meters",
                            }),
                            [dim]: Number(e.target.value),
                          },
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                ))}
                <label className="block">
                  <FieldLabel>Unit</FieldLabel>
                  <input
                    value={m.size?.unit ?? "meters"}
                    onChange={(e) =>
                      onUpdateMap(m.id, {
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
                    className={inputClass}
                  />
                </label>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Locations assigned:{" "}
                <span className="text-slate-200">{mapLocations.length}</span>
              </p>

              {/* Tab toggle */}
              <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl w-fit mb-2">
                {(["canvas", "terrain"] as MapTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(m.id, t)}
                    className={[
                      "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      tab === t
                        ? "bg-blue-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200",
                    ].join(" ")}
                  >
                    {t === "canvas" ? "📍 Map Canvas" : "🏔 Terrain Editor"}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {tab === "canvas" ? (
                <MapCanvas
                  map={m}
                  locations={mapLocations}
                  tagMeta={tagMeta}
                  onUpdateLocation={onUpdateLocation}
                  onAddLocation={onAddLocation}
                />
              ) : (
                <TerrainEditor
                  map={m}
                  locations={locations}
                  onUpdateMap={onUpdateMap}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
