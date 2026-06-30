import { useEffect, useRef, useMemo } from "react";
import { useWorld } from "../context/useWorld";
import { generateFbmHeightmap, heightmapToImageData } from "../types/terrain";

type TabKey =
  | "world"
  | "maps"
  | "locations"
  | "tags"
  | "npcs"
  | "quests"
  | "preview";

type Props = {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
};

// ----------------------------------------------------------------
// Minimap
// ----------------------------------------------------------------
const MINI_W = 172;
const MINI_H = 96;

function Minimap() {
  const { syncedWorld } = useWorld();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const map = syncedWorld.maps[0] ?? null;
  const locations = syncedWorld.locations;

  const terrainKey = map
    ? JSON.stringify({
        seed: map.terrainGen?.seed ?? 42,
        scale: map.terrainGen?.scale ?? 18,
        octaves: map.terrainGen?.octaves ?? 4,
        lacunarity: map.terrainGen?.lacunarity ?? 2,
        gain: map.terrainGen?.gain ?? 0.5,
        warp: map.terrainGen?.warp ?? 0,
      })
    : "";

  const imageData = useMemo(() => {
    if (!map) return null;
    const opts = {
      seed: map.terrainGen?.seed ?? 42,
      scale: map.terrainGen?.scale ?? 18,
      octaves: map.terrainGen?.octaves ?? 4,
      lacunarity: map.terrainGen?.lacunarity ?? 2,
      gain: map.terrainGen?.gain ?? 0.5,
      warp: map.terrainGen?.warp ?? 0,
    };
    const hm = generateFbmHeightmap(MINI_W, MINI_H, opts);
    return heightmapToImageData(hm, MINI_W, MINI_H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrainKey, !!map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData || !map) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(imageData, 0, 0);

    // Draw location pins
    const mapW = map.size?.width ?? 1000;
    const mapH = map.size?.height ?? 1000;
    const mapLocs = locations.filter((l) => l.mapId === map.id);

    for (const loc of mapLocs) {
      const px = (loc.position.x / mapW) * MINI_W;
      const py = (loc.position.y / mapH) * MINI_H;

      // Glow
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239,68,68,0.3)";
      ctx.fill();

      // Pin
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Map count indicator if multiple maps
    if (syncedWorld.maps.length > 1) {
      ctx.fillStyle = "rgba(15,23,42,0.7)";
      ctx.fillRect(MINI_W - 40, MINI_H - 18, 38, 16);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(
        `+${syncedWorld.maps.length - 1} more`,
        MINI_W - 4,
        MINI_H - 6,
      );
    }
  }, [imageData, locations, map, syncedWorld.maps.length]);

  if (!map)
    return (
      <div
        className="rounded-lg border border-slate-700 bg-slate-900/60 flex items-center justify-center text-xs text-slate-500 mb-3"
        style={{ width: MINI_W, height: MINI_H }}
      >
        No maps yet
      </div>
    );

  return (
    <div className="mb-3 relative">
      <canvas
        ref={canvasRef}
        width={MINI_W}
        height={MINI_H}
        className="rounded-lg border border-slate-700 w-full"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="absolute bottom-1 left-1.5 text-xs text-white/70 font-medium drop-shadow">
        {map.name}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Sidebar
// ----------------------------------------------------------------
export function Sidebar({ activeTab, setActiveTab }: Props) {
  const { undo, redo, canUndo, canRedo, syncedWorld } = useWorld();

  const tabs: Array<[TabKey, string, string]> = [
    ["world", "World", "🌍"],
    ["maps", "Maps", "🗺️"],
    ["locations", "Locations", "📍"],
    ["tags", "Tags", "🏷️"],
    ["npcs", "NPCs", "🧑"],
    ["quests", "Quests", "📜"],
    ["preview", "Preview", "👁️"],
  ];

  const totalLocations = syncedWorld.locations.length;
  const totalMaps = syncedWorld.maps.length;
  const totalNpcs = (syncedWorld.npcs ?? []).length;
  const totalQuests = (syncedWorld.quests ?? []).length;

  return (
    <aside className="w-56 min-h-screen p-4 bg-gradient-to-b from-slate-950 to-slate-900 border-r border-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.6)] relative z-10 flex flex-col">
      <h2 className="mt-1 mb-4 text-sm font-bold tracking-wide text-slate-300 uppercase">
        Open World Toolkit
      </h2>

      {/* Minimap */}
      <Minimap />

      {/* World stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-800/60 rounded-lg px-2 py-1.5 text-center">
          <div className="text-sm font-bold text-blue-300">{totalMaps}</div>
          <div className="text-xs text-slate-500">
            map{totalMaps !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-lg px-2 py-1.5 text-center">
          <div className="text-sm font-bold text-green-300">
            {totalLocations}
          </div>
          <div className="text-xs text-slate-500">
            loc{totalLocations !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-lg px-2 py-1.5 text-center">
          <div className="text-sm font-bold text-purple-300">{totalNpcs}</div>
          <div className="text-xs text-slate-500">
            npc{totalNpcs !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-lg px-2 py-1.5 text-center">
          <div className="text-sm font-bold text-yellow-300">{totalQuests}</div>
          <div className="text-xs text-slate-500">
            quest{totalQuests !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-2">
        {tabs.map(([key, label, icon]) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-150 cursor-pointer border",
                isActive
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 font-bold border-blue-400 shadow-[0_0_0_1px_rgba(56,189,248,0.6),0_10px_24px_rgba(15,23,42,0.9)] translate-x-0.5"
                  : "bg-slate-900/90 text-slate-300 border-blue-900/70 hover:bg-blue-900/50 hover:translate-x-0.5",
              ].join(" ")}
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          );
        })}
      </nav>

      {/* Undo / Redo */}
      <div className="mt-auto pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">
          History
        </p>
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Cmd+Z)"
            className={[
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all",
              canUndo
                ? "border-slate-600 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500"
                : "border-slate-800 text-slate-600 cursor-not-allowed",
            ].join(" ")}
          >
            ↩ Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Cmd+Shift+Z)"
            className={[
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all",
              canRedo
                ? "border-slate-600 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500"
                : "border-slate-800 text-slate-600 cursor-not-allowed",
            ].join(" ")}
          >
            ↪ Redo
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">⌘Z · ⌘⇧Z</p>
      </div>
    </aside>
  );
}
