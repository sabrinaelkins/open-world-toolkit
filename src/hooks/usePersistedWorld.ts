import { useEffect, useState } from "react";
import type { GameWorldFile } from "../types/worldTypes";

export function usePersistedWorld(
  storageKey: string,
  initialWorld: GameWorldFile
) {
  const [world, setWorld] = useState<GameWorldFile>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return initialWorld;
      return JSON.parse(saved) as GameWorldFile;
    } catch {
      console.warn("Failed to load saved world, using default");
      return initialWorld;
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
    setWorld(initialWorld);
  }

  return { world, setWorld, resetSavedWorld };
}
