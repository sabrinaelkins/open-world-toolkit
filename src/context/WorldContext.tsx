import {
  useReducer,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { GameWorldFile } from "../types/worldTypes";
import { loadGameWorldFile } from "../types/worldIO";
import { worldReducer, type WorldAction } from "./worldReducer";
import { WorldContext, type Issue } from "./worldContextDef";
import worldData from "../data/world_example.json";

const SKIP_HISTORY: WorldAction["type"][] = ["LOAD_WORLD"];
const MAX_HISTORY = 50;
const STORAGE_KEY = "open_world_toolkit_world";

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

export function WorldProvider({ children }: { children: ReactNode }) {
  const initialWorld = (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return loadGameWorldFile(JSON.parse(saved) as unknown);
    } catch (e) {
      console.warn("Failed to load saved world, using default", e);
    }
    return loadGameWorldFile(worldData as unknown);
  })();

  const [world, baseDispatch] = useReducer(worldReducer, initialWorld);

  const pastRef = useRef<GameWorldFile[]>([]);
  const futureRef = useRef<GameWorldFile[]>([]);

  const [historySize, setHistorySize] = useReducer(
    (_: unknown, next: { past: number; future: number }) => next,
    { past: 0, future: 0 },
  );

  const dispatch = useCallback(
    (action: WorldAction) => {
      if (!SKIP_HISTORY.includes(action.type)) {
        pastRef.current = [...pastRef.current, world].slice(-MAX_HISTORY);
        futureRef.current = [];
        setHistorySize({ past: pastRef.current.length, future: 0 });
      }
      baseDispatch(action);
    },
    [world],
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    futureRef.current = [world, ...futureRef.current];
    pastRef.current = pastRef.current.slice(0, -1);
    setHistorySize({
      past: pastRef.current.length,
      future: futureRef.current.length,
    });
    baseDispatch({ type: "LOAD_WORLD", world: prev });
  }, [world]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    pastRef.current = [...pastRef.current, world];
    futureRef.current = futureRef.current.slice(1);
    setHistorySize({
      past: pastRef.current.length,
      future: futureRef.current.length,
    });
    baseDispatch({ type: "LOAD_WORLD", world: next });
  }, [world]);

  const canUndo = historySize.past > 0;
  const canRedo = historySize.future > 0;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(world));
    } catch (e) {
      console.warn("Failed to save world", e);
    }
  }, [world]);

  const syncedWorld: GameWorldFile = useMemo(() => {
    const mapIdToLocIds = new Map<string, string[]>();
    for (const loc of world.locations) {
      const arr = mapIdToLocIds.get(loc.mapId) ?? [];
      arr.push(loc.id);
      mapIdToLocIds.set(loc.mapId, arr);
    }
    return {
      ...world,
      maps: world.maps.map((m) => ({
        ...m,
        locations: mapIdToLocIds.get(m.id) ?? [],
      })),
    };
  }, [world]);

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
    for (const loc of syncedWorld.locations)
      for (const t of loc.tags ?? []) used.add(t);
    return Array.from(new Set([...presets, ...Array.from(used)]))
      .map((t) => t.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [syncedWorld.locations]);

  const locationById = useMemo(
    () => new Map(syncedWorld.locations.map((l) => [l.id, l] as const)),
    [syncedWorld.locations],
  );

  const previewIssues = useMemo(() => {
    const issues: Issue[] = [];
    const mapIds = new Set(syncedWorld.maps.map((m) => m.id));
    const locationIds = new Set(syncedWorld.locations.map((l) => l.id));
    for (const l of syncedWorld.locations) {
      if (l.mapId !== "unassigned" && !mapIds.has(l.mapId))
        issues.push({
          level: "error",
          message: `Location "${l.id}" points to missing mapId "${l.mapId}"`,
        });
    }
    for (const m of syncedWorld.maps)
      for (const locId of m.locations ?? [])
        if (!locationIds.has(locId))
          issues.push({
            level: "error",
            message: `Map "${m.id}" references missing locationId "${locId}"`,
          });
    for (const l of syncedWorld.locations) {
      if (!l.tags || l.tags.length === 0)
        issues.push({
          level: "warning",
          message: `Location "${l.id}" has no tags`,
        });
      if (l.mapId === "unassigned")
        issues.push({
          level: "warning",
          message: `Location "${l.id}" is unassigned to a map`,
        });
    }
    return issues;
  }, [syncedWorld]);

  const errorIssues = useMemo(
    () => previewIssues.filter((i) => i.level === "error"),
    [previewIssues],
  );
  const warningIssues = useMemo(
    () => previewIssues.filter((i) => i.level === "warning"),
    [previewIssues],
  );
  const hasErrors = errorIssues.length > 0;

  const resetSavedWorld = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
    pastRef.current = [];
    futureRef.current = [];
    setHistorySize({ past: 0, future: 0 });
    baseDispatch({
      type: "LOAD_WORLD",
      world: loadGameWorldFile(worldData as unknown),
    });
  }, []);

  const exportWorld = useCallback(() => {
    downloadJson("world_export.json", syncedWorld);
  }, [syncedWorld]);

  return (
    <WorldContext.Provider
      value={{
        world,
        syncedWorld,
        dispatch,
        undo,
        redo,
        canUndo,
        canRedo,
        tagSuggestions,
        locationById,
        previewIssues,
        errorIssues,
        warningIssues,
        hasErrors,
        resetSavedWorld,
        exportWorld,
      }}
    >
      {children}
    </WorldContext.Provider>
  );
}
