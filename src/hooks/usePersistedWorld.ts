import { useEffect, useState } from "react";
import type { GameWorldFile } from "../types/worldTypes";
import { loadGameWorldFile } from "../types/worldIO";

export function usePersistedWorld(
  storageKey: string,
  initialWorld: GameWorldFile
) {
  const [world, setWorld] = useState<GameWorldFile>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return loadGameWorldFile(initialWorld);
      return loadGameWorldFile(JSON.parse(saved) as unknown);
    } catch {
      console.warn("Failed to load saved world, using default");
      return loadGameWorldFile(initialWorld);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(world));
    } catch (err) {
      console.warn("Failed to save world", err);
    }
  }, [storageKey, world]);

  function resetSavedWorld() {
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.warn("Failed to reset saved world", err);
    }
    setWorld(loadGameWorldFile(initialWorld));
  }

  return { world, setWorld, resetSavedWorld };
}
