import { useEffect, useState } from "react";
import { tagMetaDefaults, type GameWorldFile } from "../types/worldTypes";

function withDefaults(world: GameWorldFile): GameWorldFile {
  return {
    ...world,
    tagMeta: {
      ...tagMetaDefaults,
      ...(world.tagMeta ?? {}),
    },
  };
}
export function usePersistedWorld(
  storageKey: string,
  initialWorld: GameWorldFile
) {
  const [world, setWorld] = useState<GameWorldFile>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return withDefaults(initialWorld);
      return withDefaults(JSON.parse(saved) as GameWorldFile);
    } catch {
      console.warn("Failed to load saved world, using default");
      return withDefaults(initialWorld);
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
    setWorld(withDefaults(initialWorld));
  }

  return { world, setWorld, resetSavedWorld };
}
