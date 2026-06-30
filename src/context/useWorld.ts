import { useContext } from "react";
import { WorldContext } from "./worldContextDef";
import type { WorldContextValue } from "./worldContextDef";

export function useWorld(): WorldContextValue {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used inside <WorldProvider>");
  return ctx;
}
