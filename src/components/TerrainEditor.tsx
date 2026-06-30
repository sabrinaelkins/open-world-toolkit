import { useEffect, useRef, useMemo } from "react";
import type { MapData, Location as WorldLocation } from "../types/worldTypes";
import type { TerrainGenOptions } from "../types/terrain";
import {
  generateFbmHeightmap,
  heightmapToImageData,
  BIOMES,
  getBiome,
} from "../types/terrain";

const CANVAS_W = 256;
const CANVAS_H = 256;

// ----------------------------------------------------------------
// Slider control
// ----------------------------------------------------------------
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 uppercase tracking-wide">
          {label}
        </label>
        <span className="text-xs font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 cursor-pointer"
      />
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

// ----------------------------------------------------------------
// Biome legend
// ----------------------------------------------------------------
function BiomeLegend({ heightmap }: { heightmap: number[] }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of heightmap) {
      const b = getBiome(h);
      map.set(b.id, (map.get(b.id) ?? 0) + 1);
    }
    return map;
  }, [heightmap]);

  const present = BIOMES.filter((b) => (counts.get(b.id) ?? 0) > 0);

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {present.map((b) => {
        const pct = Math.round(
          ((counts.get(b.id) ?? 0) / heightmap.length) * 100,
        );
        return (
          <div
            key={b.id}
            className="flex items-center gap-1.5 text-xs text-slate-300"
          >
            <span
              className="w-3 h-3 rounded-sm flex-none"
              style={{ background: b.color }}
            />
            {b.label} <span className="text-slate-500">({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------
// Canvas terrain map
// ----------------------------------------------------------------
function TerrainCanvas({
  heightmap,
  locations,
  mapWidth,
  mapHeight,
}: {
  heightmap: number[];
  locations: WorldLocation[];
  mapWidth: number;
  mapHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw terrain
    const imgData = heightmapToImageData(heightmap, CANVAS_W, CANVAS_H);
    ctx.putImageData(imgData, 0, 0);

    // Draw location pins
    for (const loc of locations) {
      const nx = mapWidth > 0 ? loc.position.x / mapWidth : 0;
      const ny = mapHeight > 0 ? loc.position.y / mapHeight : 0;
      const px = Math.max(4, Math.min(CANVAS_W - 4, Math.round(nx * CANVAS_W)));
      const py = Math.max(4, Math.min(CANVAS_H - 4, Math.round(ny * CANVAS_H)));

      // Outer glow
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239,68,68,0.4)";
      ctx.fill();

      // Pin dot
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px system-ui";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 3;
      ctx.fillText(loc.name, px + 6, py + 3);
      ctx.shadowBlur = 0;
    }
  }, [heightmap, locations, mapWidth, mapHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="rounded-lg border border-slate-600 w-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

// ----------------------------------------------------------------
// TerrainEditor
// ----------------------------------------------------------------
type Props = {
  map: MapData;
  locations: WorldLocation[];
  onUpdateMap: (mapId: string, patch: Partial<MapData>) => void;
};

export function TerrainEditor({ map, locations, onUpdateMap }: Props) {
  const tg: TerrainGenOptions = {
    algo: "fbm",
    seed: map.terrainGen?.seed ?? 42,
    scale: map.terrainGen?.scale ?? 18,
    octaves: map.terrainGen?.octaves ?? 4,
    lacunarity: map.terrainGen?.lacunarity ?? 2.0,
    gain: map.terrainGen?.gain ?? 0.5,
    warp: map.terrainGen?.warp ?? 0,
    grid: map.terrainGen?.grid ?? { width: CANVAS_W, height: CANVAS_H },
  };

  function update(patch: Partial<TerrainGenOptions>) {
    onUpdateMap(map.id, {
      terrainGen: {
        algo: "fbm" as const,
        seed: patch.seed ?? tg.seed ?? 42,
        scale: patch.scale ?? tg.scale ?? 18,
        octaves: patch.octaves ?? tg.octaves ?? 4,
        lacunarity: patch.lacunarity ?? tg.lacunarity ?? 2.0,
        gain: patch.gain ?? tg.gain ?? 0.5,
        warp: patch.warp ?? tg.warp ?? 0,
        grid: patch.grid ?? tg.grid ?? { width: 32, height: 32 },
      },
    });
  }

  const heightmap = useMemo(
    () => generateFbmHeightmap(CANVAS_W, CANVAS_H, tg),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tg.seed, tg.scale, tg.octaves, tg.lacunarity, tg.gain, tg.warp],
  );

  const mapLocations = locations.filter((l) => l.mapId === map.id);

  return (
    <div className="mt-4 border-t border-slate-700 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-200 m-0">
          🗺 Terrain Generator
        </h3>
        <button
          onClick={() => update({ seed: Math.floor(Math.random() * 999999) })}
          className="px-3 py-1.5 text-xs rounded-lg border border-blue-400/50 text-blue-300 bg-transparent hover:bg-blue-500/10 hover:border-blue-400 transition-all"
        >
          🎲 Random Seed
        </button>
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-6 items-start">
        {/* Controls */}
        <div className="flex flex-col gap-4">
          {/* Seed */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400 uppercase tracking-wide">
                Seed
              </label>
              <span className="text-xs font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">
                {tg.seed}
              </span>
            </div>
            <input
              type="number"
              value={tg.seed}
              onChange={(e) => update({ seed: Number(e.target.value) })}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <Slider
            label="Scale"
            value={tg.scale!}
            min={4}
            max={64}
            step={1}
            onChange={(v) => update({ scale: v })}
            hint="Higher = smoother, zoomed-out terrain"
          />

          <Slider
            label="Octaves"
            value={tg.octaves!}
            min={1}
            max={8}
            step={1}
            onChange={(v) => update({ octaves: v })}
            hint="More octaves = more fine detail"
          />

          <Slider
            label="Lacunarity"
            value={tg.lacunarity!}
            min={1}
            max={4}
            step={0.1}
            onChange={(v) => update({ lacunarity: v })}
            hint="How fast frequency increases per octave"
          />

          <Slider
            label="Gain"
            value={tg.gain!}
            min={0.1}
            max={0.9}
            step={0.05}
            onChange={(v) => update({ gain: v })}
            hint="Lower = smoother; higher = rougher, more contrast"
          />

          <Slider
            label="Warp"
            value={tg.warp!}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) => update({ warp: v })}
            hint="Domain warp — makes coastlines and rivers feel organic"
          />

          {/* Biome legend */}
          <BiomeLegend heightmap={heightmap} />
        </div>

        {/* Canvas preview */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400 m-0">
            Preview ({CANVAS_W}×{CANVAS_H})
          </p>
          <TerrainCanvas
            heightmap={heightmap}
            locations={mapLocations}
            mapWidth={map.size?.width ?? 1}
            mapHeight={map.size?.height ?? 1}
          />
          {mapLocations.length > 0 && (
            <p className="text-xs text-slate-500">
              📍 {mapLocations.length} location
              {mapLocations.length > 1 ? "s" : ""} pinned
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
