import { createContext } from "react";
import type { GameWorldFile, Location } from "../types/worldTypes";
import type { WorldAction } from "./worldReducer";

export type Issue = { level: "error" | "warning"; message: string };

export interface WorldContextValue {
  // State
  world: GameWorldFile;
  syncedWorld: GameWorldFile;
  dispatch: React.Dispatch<WorldAction>;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Derived
  tagSuggestions: string[];
  locationById: Map<string, Location>;
  previewIssues: Issue[];
  errorIssues: Issue[];
  warningIssues: Issue[];
  hasErrors: boolean;

  // Actions
  resetSavedWorld: () => void;
  exportWorld: () => void;
}

export const WorldContext = createContext<WorldContextValue | null>(null);
