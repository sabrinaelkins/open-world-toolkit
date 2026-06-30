import { useMemo, useRef, useEffect } from "react";
import type { GameWorldFile } from "../types/worldTypes";
import type { Issue } from "../context/worldContextDef";
import {
  generateFbmHeightmap,
  heightmapToImageData,
  getBiome,
  BIOMES,
} from "../types/terrain";

type Props = {
  world: GameWorldFile;
  locationById: Map<string, GameWorldFile["locations"][number]>;
  errorIssues: Issue[];
  warningIssues: Issue[];
};

// ----------------------------------------------------------------
// Mini terrain thumbnail (canvas)
// ----------------------------------------------------------------
const THUMB_W = 120;
const THUMB_H = 120;

function TerrainThumb({
  mapId,
  terrainGen,
}: {
  mapId: string;
  terrainGen: GameWorldFile["maps"][number]["terrainGen"];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const imageData = useMemo(() => {
    const opts = {
      seed: terrainGen?.seed ?? 42,
      scale: terrainGen?.scale ?? 18,
      octaves: terrainGen?.octaves ?? 4,
      lacunarity: terrainGen?.lacunarity ?? 2.0,
      gain: terrainGen?.gain ?? 0.5,
      warp: terrainGen?.warp ?? 0,
    };
    const hm = generateFbmHeightmap(THUMB_W, THUMB_H, opts);
    return heightmapToImageData(hm, THUMB_W, THUMB_H);
  }, [
    terrainGen?.seed,
    terrainGen?.scale,
    terrainGen?.octaves,
    terrainGen?.lacunarity,
    terrainGen?.gain,
    terrainGen?.warp,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  return (
    <canvas
      key={mapId}
      ref={canvasRef}
      width={THUMB_W}
      height={THUMB_H}
      className="rounded-lg border border-slate-600 flex-none"
      style={{ width: THUMB_W, height: THUMB_H, imageRendering: "pixelated" }}
    />
  );
}

// ----------------------------------------------------------------
// Biome breakdown bar
// ----------------------------------------------------------------
function BiomeBar({
  terrainGen,
}: {
  terrainGen: GameWorldFile["maps"][number]["terrainGen"];
}) {
  const breakdown = useMemo(() => {
    const opts = {
      seed: terrainGen?.seed ?? 42,
      scale: terrainGen?.scale ?? 18,
      octaves: terrainGen?.octaves ?? 4,
      lacunarity: terrainGen?.lacunarity ?? 2.0,
      gain: terrainGen?.gain ?? 0.5,
      warp: terrainGen?.warp ?? 0,
    };
    const hm = generateFbmHeightmap(64, 64, opts);
    const counts = new Map<string, number>();
    for (const h of hm) {
      const b = getBiome(h);
      counts.set(b.id, (counts.get(b.id) ?? 0) + 1);
    }
    return BIOMES.filter((b) => (counts.get(b.id) ?? 0) > 0).map((b) => ({
      ...b,
      pct: Math.round(((counts.get(b.id) ?? 0) / hm.length) * 100),
    }));
  }, [
    terrainGen?.seed,
    terrainGen?.scale,
    terrainGen?.octaves,
    terrainGen?.lacunarity,
    terrainGen?.gain,
    terrainGen?.warp,
  ]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 rounded-full overflow-hidden w-full">
        {breakdown.map((b) => (
          <div
            key={b.id}
            style={{ width: `${b.pct}%`, background: b.color }}
            title={`${b.label}: ${b.pct}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {breakdown.map((b) => (
          <span
            key={b.id}
            className="flex items-center gap-1 text-xs text-slate-400"
          >
            <span
              className="w-2 h-2 rounded-sm flex-none"
              style={{ background: b.color }}
            />
            {b.label} <span className="text-slate-500">{b.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Tag chip
// ----------------------------------------------------------------
function TagPill({ tag, color }: { tag: string; color?: string }) {
  return (
    <span className="owt-tag-chip">
      <span
        className="owt-tag-chip-dot"
        style={color ? { background: color } : undefined}
      />
      {tag}
    </span>
  );
}

// ----------------------------------------------------------------
// Stat badge
// ----------------------------------------------------------------
function Stat({
  label,
  value,
  color = "text-slate-200",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center bg-slate-800/60 rounded-xl px-4 py-3 min-w-[80px]">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-slate-400 mt-0.5">{label}</span>
    </div>
  );
}

// ----------------------------------------------------------------
// PreviewTab
// ----------------------------------------------------------------
export function PreviewTab({
  world,
  locationById,
  errorIssues,
  warningIssues,
}: Props) {
  const locations =
    world.locations.length > 0
      ? world.locations
      : Array.from(locationById.values());

  const tagMeta = world.tagMeta ?? {};
  const hasIssues = errorIssues.length > 0 || warningIssues.length > 0;

  // All unique tags + counts
  const tagStats = useMemo(() => {
    const m = new Map<string, number>();
    for (const loc of locations)
      for (const t of loc.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [locations]);

  return (
    <section className="owt-panel owt-panel-lifted mt-6 flex flex-col gap-6">
      <h2 className="text-xl font-bold text-slate-100 m-0">👁 World Preview</h2>

      {/* ── Validation panel ── */}
      {hasIssues ? (
        <div className="owt-subpanel border border-red-500/20">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-base">🚨</span>
            <h3 className="text-sm font-bold text-slate-200 m-0">
              Validation Issues
            </h3>
            <div className="ml-auto flex gap-3 text-xs">
              {errorIssues.length > 0 && (
                <span className="text-red-300 font-semibold">
                  {errorIssues.length} error{errorIssues.length > 1 ? "s" : ""}
                </span>
              )}
              {warningIssues.length > 0 && (
                <span className="text-yellow-300 font-semibold">
                  {warningIssues.length} warning
                  {warningIssues.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {[...errorIssues, ...warningIssues].map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span
                  className={`w-2 h-2 rounded-full mt-0.5 flex-none ${issue.level === "error" ? "bg-red-400" : "bg-yellow-400"}`}
                />
                <span
                  className={
                    issue.level === "error" ? "text-red-200" : "text-yellow-200"
                  }
                >
                  [{issue.level}] {issue.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="owt-subpanel border border-green-500/20 flex items-center gap-3">
          <span className="text-lg">✅</span>
          <span className="text-sm text-green-300 font-medium">
            No issues — world is valid and ready to export!
          </span>
        </div>
      )}

      {/* ── World summary ── */}
      <div className="owt-subpanel">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4 m-0">
          World Summary
        </h3>
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="text-2xl font-bold text-slate-100">
              {world.world.name}
            </div>
            {world.world.description && (
              <p className="text-sm text-slate-400 mt-1 max-w-lg">
                {world.world.description}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2 font-mono">
              ID: {world.world.id}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Stat
              label="Maps"
              value={world.maps.length}
              color="text-blue-300"
            />
            <Stat
              label="Locations"
              value={locations.length}
              color="text-green-300"
            />
            <Stat
              label="Errors"
              value={errorIssues.length}
              color={errorIssues.length > 0 ? "text-red-300" : "text-slate-400"}
            />
            <Stat
              label="Warnings"
              value={warningIssues.length}
              color={
                warningIssues.length > 0 ? "text-yellow-300" : "text-slate-400"
              }
            />
          </div>
        </div>

        {/* Top tags */}
        {tagStats.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
              Most used tags
            </p>
            <div className="flex flex-wrap gap-2">
              {tagStats.map(([tag, count]) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 owt-tag-chip"
                >
                  <span
                    className="owt-tag-chip-dot"
                    style={
                      tagMeta[tag]?.color
                        ? { background: tagMeta[tag].color }
                        : undefined
                    }
                  />
                  {tag}
                  <span className="text-slate-500 text-xs">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Map cards ── */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">
          Maps
        </h3>
        {world.maps.length === 0 ? (
          <p className="text-slate-500 text-sm">No maps yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {world.maps.map((m) => {
              const mapLocs = locations.filter((l) => l.mapId === m.id);
              return (
                <div key={m.id} className="owt-subpanel">
                  <div className="flex gap-4 items-start">
                    {/* Terrain thumbnail */}
                    <TerrainThumb mapId={m.id} terrainGen={m.terrainGen} />

                    {/* Map info */}
                    <div className="flex-1 flex flex-col gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">
                            {m.name}
                          </span>
                          <span className="text-xs font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                            {m.id}
                          </span>
                        </div>
                        {m.description && (
                          <p className="text-xs text-slate-400 mt-1">
                            {m.description}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-4 text-xs text-slate-400">
                        <span>
                          📐 {m.size?.width ?? "?"} × {m.size?.height ?? "?"}{" "}
                          {m.size?.unit ?? "units"}
                        </span>
                        <span>
                          📍 {mapLocs.length} location
                          {mapLocs.length !== 1 ? "s" : ""}
                        </span>
                        <span>🌱 Seed {m.terrainGen?.seed ?? "default"}</span>
                      </div>

                      {/* Biome bar */}
                      <BiomeBar terrainGen={m.terrainGen} />

                      {/* Location list */}
                      {mapLocs.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-1">
                          {mapLocs.map((loc) => (
                            <div
                              key={loc.id}
                              className="flex items-start gap-2 text-xs"
                            >
                              <span className="text-slate-500 mt-0.5">•</span>
                              <div className="flex-1">
                                <span className="text-slate-200 font-medium">
                                  {loc.name}
                                </span>
                                <span className="text-slate-500 ml-2">
                                  ({loc.position.x}, {loc.position.y},{" "}
                                  {loc.position.z}) r:{loc.radius}
                                </span>
                                {(loc.tags ?? []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(loc.tags ?? []).map((t) => (
                                      <TagPill
                                        key={t}
                                        tag={t}
                                        color={
                                          tagMeta[t.trim().toLowerCase()]?.color
                                        }
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Unassigned locations ── */}
      {locations.filter((l) => l.mapId === "unassigned").length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wide mb-3">
            ⚠ Unassigned Locations
          </h3>
          <div className="owt-subpanel border border-yellow-500/20 flex flex-col gap-2">
            {locations
              .filter((l) => l.mapId === "unassigned")
              .map((loc) => (
                <div key={loc.id} className="flex items-center gap-2 text-xs">
                  <span className="text-yellow-400">•</span>
                  <span className="text-slate-200">{loc.name}</span>
                  <span className="text-slate-500 font-mono">{loc.id}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── JSON preview ── */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">
          JSON Structure
        </h3>
        <pre className="owt-subpanel text-xs text-slate-400 overflow-auto max-h-64 font-mono leading-relaxed">
          {JSON.stringify(
            {
              version: world.version,
              world: world.world,
              maps: world.maps.map((m) => ({
                id: m.id,
                name: m.name,
                locations: m.locations,
              })),
              locations: world.locations.map((l) => ({
                id: l.id,
                name: l.name,
                mapId: l.mapId,
                tags: l.tags,
              })),
            },
            null,
            2,
          )}
        </pre>
      </div>
    </section>
  );
}
