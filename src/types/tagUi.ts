import type { TagCategory } from "./worldTypes";

export const CATEGORY_LABEL: Record<TagCategory | "", string> = {
  system: "System",
  world: "World",
  location: "Location",
  poi: "Point of Interest",
  biome: "Biome",
  faction: "Faction",
  quest: "Quest",
  gameplay: "Gameplay",
  combat: "Combat",
  loot: "Loot",
  custom: "Custom",
  "": "Uncategorized",
};

export const CATEGORY_COLOR: Record<TagCategory | "", string> = {
  system: "#ef4444",
  world: "#3b82f6",
  location: "#22c55e",
  poi: "#f59e0b",
  biome: "#14b8a6",
  faction: "#a855f7",
  quest: "#eab308",
  gameplay: "#22c55e",
  combat: "#dc2626",
  loot: "#f97316",
  custom: "#6b7280",
  "": "#666666",
};
