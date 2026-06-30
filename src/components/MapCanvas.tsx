import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type {
  MapData,
  Location as WorldLocation,
  TagMeta,
} from "../types/worldTypes";
import { generateFbmHeightmap, heightmapToImageData } from "../types/terrain";
import type { TerrainGenOptions } from "../types/terrain";
import { TagChip } from "./TagChip";

const CANVAS_W = 600;
const CANVAS_H = 600;
const PIN_RADIUS = 8;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

type Props = {
  map: MapData;
  locations: WorldLocation[];
  tagMeta: Record<string, TagMeta>;
  onUpdateLocation: (locId: string, patch: Partial<WorldLocation>) => void;
  onAddLocation: () => void;
};

// ----------------------------------------------------------------
// Coordinate helpers (zoom/pan aware)
// ----------------------------------------------------------------
function worldToCanvas(
  wx: number,
  wy: number,
  mapW: number,
  mapH: number,
  zoom: number,
  panX: number,
  panY: number,
): [number, number] {
  return [
    (wx / (mapW || 1)) * CANVAS_W * zoom + panX,
    (wy / (mapH || 1)) * CANVAS_H * zoom + panY,
  ];
}

function canvasToWorld(
  cx: number,
  cy: number,
  mapW: number,
  mapH: number,
  zoom: number,
  panX: number,
  panY: number,
): [number, number] {
  return [
    Math.round(((cx - panX) / (CANVAS_W * zoom)) * (mapW || 1)),
    Math.round(((cy - panY) / (CANVAS_H * zoom)) * (mapH || 1)),
  ];
}

function getCanvasXY(
  canvas: HTMLCanvasElement,
  e: MouseEvent,
): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
}

function hitTest(
  cx: number,
  cy: number,
  locs: WorldLocation[],
  mapW: number,
  mapH: number,
  zoom: number,
  panX: number,
  panY: number,
): WorldLocation | null {
  for (let i = locs.length - 1; i >= 0; i--) {
    const loc = locs[i];
    const [px, py] = worldToCanvas(
      loc.position.x,
      loc.position.y,
      mapW,
      mapH,
      zoom,
      panX,
      panY,
    );
    if (Math.hypot(cx - px, cy - py) <= PIN_RADIUS + 6) return loc;
  }
  return null;
}

// ----------------------------------------------------------------
// Selected panel
// ----------------------------------------------------------------
function SelectedPanel({
  loc,
  tagMeta,
  onUpdate,
  onDeselect,
}: {
  loc: WorldLocation;
  tagMeta: Record<string, TagMeta>;
  onUpdate: (patch: Partial<WorldLocation>) => void;
  onDeselect: () => void;
}) {
  const inputClass =
    "w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors";
  const labelClass = "text-xs text-slate-400 uppercase tracking-wide mb-1.5";

  return (
    <div className="owt-subpanel flex flex-col gap-4 w-56 flex-none">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded truncate max-w-xs">
          {loc.id}
        </span>
        <button
          onClick={onDeselect}
          className="text-slate-400 hover:text-slate-200 text-xl leading-none transition-colors"
        >
          ×
        </button>
      </div>

      <label className="block">
        <div className={labelClass}>Name</div>
        <input
          value={loc.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className={inputClass}
        />
      </label>

      <div>
        <div className={labelClass}>Position</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={axis} className="block">
              <div className="text-xs text-slate-500 mb-1">
                {axis.toUpperCase()}
              </div>
              <input
                type="number"
                value={loc.position[axis]}
                onChange={(e) =>
                  onUpdate({
                    position: {
                      ...loc.position,
                      [axis]: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <div className={labelClass}>Radius</div>
        <input
          type="number"
          value={loc.radius}
          onChange={(e) => onUpdate({ radius: Number(e.target.value) })}
          className={inputClass}
        />
      </label>

      {(loc.tags ?? []).length > 0 && (
        <div>
          <div className={labelClass}>Tags</div>
          <div className="flex flex-wrap gap-1.5">
            {(loc.tags ?? []).map((t) => (
              <TagChip key={t} tag={t} tagMeta={tagMeta} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 mt-auto">
        Drag the pin to reposition. Scroll to zoom.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------
// MapCanvas
// ----------------------------------------------------------------
export function MapCanvas({
  map,
  locations,
  tagMeta,
  onUpdateLocation,
  onAddLocation,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for always-current values in event handlers
  const locationsRef = useRef(locations);
  const onUpdateLocRef = useRef(onUpdateLocation);
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);
  useEffect(() => {
    onUpdateLocRef.current = onUpdateLocation;
  }, [onUpdateLocation]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragCanvasPos, setDragCanvasPos] = useState<[number, number] | null>(
    null,
  );
  const [hoverLocId, setHoverLocId] = useState<string | null>(null);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<[number, number]>([0, 0]);

  // Refs for drag + zoom/pan state
  const draggingIdRef = useRef<string | null>(null);
  const dragCanvasPosRef = useRef<[number, number] | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const hoverLocIdRef = useRef<string | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<[number, number]>([0, 0]);
  const panOriginRef = useRef<[number, number]>([0, 0]);

  const mapWRef = useRef(map.size?.width ?? 1000);
  const mapHRef = useRef(map.size?.height ?? 1000);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    mapWRef.current = map.size?.width ?? 1000;
    mapHRef.current = map.size?.height ?? 1000;
  }, [map.size]);

  const mapW = map.size?.width ?? 1000;
  const mapH = map.size?.height ?? 1000;

  const tg: TerrainGenOptions = {
    seed: map.terrainGen?.seed ?? 42,
    scale: map.terrainGen?.scale ?? 18,
    octaves: map.terrainGen?.octaves ?? 4,
    lacunarity: map.terrainGen?.lacunarity ?? 2.0,
    gain: map.terrainGen?.gain ?? 0.5,
    warp: map.terrainGen?.warp ?? 0,
  };
  const terrainKey = JSON.stringify(tg);

  const terrainImageData = useMemo(() => {
    const hm = generateFbmHeightmap(CANVAS_W, CANVAS_H, tg);
    return heightmapToImageData(hm, CANVAS_W, CANVAS_H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrainKey]);

  const terrainImageDataRef = useRef(terrainImageData);
  useEffect(() => {
    terrainImageDataRef.current = terrainImageData;
  }, [terrainImageData]);

  // Offscreen canvas for terrain (avoid re-drawing it every frame)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const off = document.createElement("canvas");
    off.width = CANVAS_W;
    off.height = CANVAS_H;
    const ctx = off.getContext("2d");
    ctx?.putImageData(terrainImageData, 0, 0);
    offscreenRef.current = off;
  }, [terrainImageData]);

  const selectedLoc = useMemo(
    () => locations.find((l) => l.id === selectedId) ?? null,
    [locations, selectedId],
  );

  // ── Draw ────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const locs = locationsRef.current;
    const selId = selectedIdRef.current;
    const dragId = draggingIdRef.current;
    const dragPos = dragCanvasPosRef.current;
    const hovId = hoverLocIdRef.current;
    const mW = mapWRef.current;
    const mH = mapHRef.current;
    const z = zoomRef.current;
    const [px, py] = panRef.current;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw terrain scaled + panned
    if (offscreenRef.current) {
      ctx.drawImage(offscreenRef.current, px, py, CANVAS_W * z, CANVAS_H * z);
    }

    // Grid overlay
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const gridStep = (CANVAS_W / 10) * z;
    const offsetX = ((px % gridStep) + gridStep) % gridStep;
    const offsetY = ((py % gridStep) + gridStep) % gridStep;
    for (let gx = offsetX - gridStep; gx <= CANVAS_W; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, CANVAS_H);
      ctx.stroke();
    }
    for (let gy = offsetY - gridStep; gy <= CANVAS_H; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(CANVAS_W, gy);
      ctx.stroke();
    }

    // Pins
    for (const loc of locs) {
      const isDragging = loc.id === dragId;
      const isSelected = loc.id === selId;
      const isHovered = loc.id === hovId;

      let [cx, cy] = worldToCanvas(
        loc.position.x,
        loc.position.y,
        mW,
        mH,
        z,
        px,
        py,
      );
      if (isDragging && dragPos) {
        cx = dragPos[0];
        cy = dragPos[1];
      }

      // Skip pins outside canvas
      if (cx < -20 || cx > CANVAS_W + 20 || cy < -20 || cy > CANVAS_H + 20)
        continue;

      const r = Math.max(4, PIN_RADIUS * Math.min(z, 1.5));

      // Radius ring
      if (isSelected) {
        const cr = Math.max(12, ((loc.radius ?? 5) / (mW || 1)) * CANVAS_W * z);
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(99,179,237,0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Glow
      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? "rgba(59,130,246,0.4)"
        : isHovered
          ? "rgba(255,255,255,0.2)"
          : "rgba(0,0,0,0.3)";
      ctx.fill();

      // Pin body
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? "#3b82f6"
        : isDragging
          ? "#f59e0b"
          : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();

      // Label (only show when zoomed in enough)
      if (z >= 0.6) {
        const label =
          loc.name.length > 16 ? loc.name.slice(0, 15) + "…" : loc.name;
        ctx.font = `bold ${Math.round(10 * Math.min(z, 1.5))}px system-ui`;
        ctx.textAlign = "left";
        ctx.shadowColor = "rgba(0,0,0,1)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = isSelected ? "#93c5fd" : "#f1f5f9";
        ctx.fillText(label, cx + r + 4, cy + 4);
        ctx.shadowBlur = 0;
      }
    }

    // Zoom indicator
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.fillRect(8, CANVAS_H - 28, 60, 20);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(z * 100)}%`, 14, CANVAS_H - 14);
  }, []);

  // Trigger redraw
  const drawDeps = [
    terrainImageData,
    locations,
    selectedId,
    draggingId,
    dragCanvasPos,
    hoverLocId,
    mapW,
    mapH,
    zoom,
    pan,
  ];
  useEffect(() => {
    draw();
  }, drawDeps); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event handlers ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onMouseDown(e: MouseEvent) {
      const [cx, cy] = getCanvasXY(canvas!, e);
      const z = zoomRef.current;
      const [px, py] = panRef.current;
      const hit = hitTest(
        cx,
        cy,
        locationsRef.current,
        mapWRef.current,
        mapHRef.current,
        z,
        px,
        py,
      );

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle click or Alt+click = pan
        isPanningRef.current = true;
        panStartRef.current = [cx, cy];
        panOriginRef.current = panRef.current;
        canvas!.style.cursor = "grabbing";
        return;
      }

      if (hit) {
        draggingIdRef.current = hit.id;
        selectedIdRef.current = hit.id;
        dragCanvasPosRef.current = [cx, cy];
        setDraggingId(hit.id);
        setSelectedId(hit.id);
        setDragCanvasPos([cx, cy]);
        canvas!.style.cursor = "grabbing";
      } else {
        selectedIdRef.current = null;
        setSelectedId(null);
      }
    }

    function onMouseMove(e: MouseEvent) {
      const [cx, cy] = getCanvasXY(canvas!, e);

      if (isPanningRef.current) {
        const [sx, sy] = panStartRef.current;
        const [ox, oy] = panOriginRef.current;
        const next: [number, number] = [ox + (cx - sx), oy + (cy - sy)];
        panRef.current = next;
        setPan(next);
        return;
      }

      if (draggingIdRef.current) {
        dragCanvasPosRef.current = [cx, cy];
        setDragCanvasPos([cx, cy]);
      } else {
        const z = zoomRef.current;
        const [px, py] = panRef.current;
        const hit = hitTest(
          cx,
          cy,
          locationsRef.current,
          mapWRef.current,
          mapHRef.current,
          z,
          px,
          py,
        );
        hoverLocIdRef.current = hit?.id ?? null;
        setHoverLocId(hit?.id ?? null);
        canvas!.style.cursor = hit ? "grab" : "crosshair";
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        canvas!.style.cursor = "crosshair";
        return;
      }

      if (!draggingIdRef.current) return;
      const [cx, cy] = getCanvasXY(canvas!, e);
      const z = zoomRef.current;
      const [px, py] = panRef.current;
      const [wx, wy] = canvasToWorld(
        cx,
        cy,
        mapWRef.current,
        mapHRef.current,
        z,
        px,
        py,
      );
      const loc = locationsRef.current.find(
        (l) => l.id === draggingIdRef.current,
      );
      if (loc) {
        onUpdateLocRef.current(loc.id, {
          position: { ...loc.position, x: wx, y: wy },
        });
      }
      draggingIdRef.current = null;
      dragCanvasPosRef.current = null;
      setDraggingId(null);
      setDragCanvasPos(null);
      canvas!.style.cursor = "crosshair";
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const [cx, cy] = getCanvasXY(canvas!, e);
      const oldZoom = zoomRef.current;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * delta));

      // Zoom toward mouse cursor
      const [px, py] = panRef.current;
      const newPanX = cx - (cx - px) * (newZoom / oldZoom);
      const newPanY = cy - (cy - py) * (newZoom / oldZoom);

      zoomRef.current = newZoom;
      panRef.current = [newPanX, newPanY];
      setZoom(newZoom);
      setPan([newPanX, newPanY]);
    }

    function onMouseLeave() {
      if (!draggingIdRef.current && !isPanningRef.current) {
        hoverLocIdRef.current = null;
        setHoverLocId(null);
      }
    }

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function resetView() {
    setZoom(1);
    setPan([0, 0]);
    zoomRef.current = 1;
    panRef.current = [0, 0];
  }

  return (
    <div className="mt-4 border-t border-slate-700 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-200 m-0">📍 Map Canvas</h3>
        <div className="flex gap-2">
          <button
            onClick={resetView}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-300 bg-transparent hover:border-slate-400 transition-colors"
          >
            Reset View
          </button>
          <button
            onClick={onAddLocation}
            className="owt-glow-btn text-xs py-1.5"
          >
            + Add Location
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex flex-col gap-2 flex-1">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-xl border border-slate-600 w-full"
            style={{ cursor: "crosshair", maxWidth: CANVAS_W }}
          />
          <p className="text-xs text-slate-500">
            Click to select · Drag to move ·{" "}
            <kbd className="bg-slate-800 px-1 rounded">Scroll</kbd> to zoom ·{" "}
            <kbd className="bg-slate-800 px-1 rounded">Alt+drag</kbd> to pan ·{" "}
            {locations.length} location{locations.length !== 1 ? "s" : ""}
          </p>
        </div>

        {selectedLoc ? (
          <SelectedPanel
            loc={selectedLoc}
            tagMeta={tagMeta}
            onUpdate={(patch) => onUpdateLocation(selectedLoc.id, patch)}
            onDeselect={() => {
              setSelectedId(null);
              selectedIdRef.current = null;
            }}
          />
        ) : (
          <div className="owt-subpanel w-56 flex-none flex flex-col gap-2">
            <p className="text-xs text-slate-400 font-medium">
              No pin selected
            </p>
            <p className="text-xs text-slate-500">
              Click a pin to view and edit its details.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-700 flex flex-col gap-1.5 text-xs text-slate-500">
              <p>
                🖱 <strong className="text-slate-400">Scroll</strong> — zoom
                in/out
              </p>
              <p>
                ⌥ <strong className="text-slate-400">Alt+drag</strong> — pan the
                map
              </p>
              <p>
                🎯 <strong className="text-slate-400">Click pin</strong> —
                select & edit
              </p>
              <p>
                ✋ <strong className="text-slate-400">Drag pin</strong> —
                reposition
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
