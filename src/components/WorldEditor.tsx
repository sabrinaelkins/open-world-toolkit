import type { GameWorldFile } from "../types/worldTypes";

type Props = {
  world: GameWorldFile;
  onUpdateWorld: (patch: Partial<GameWorldFile["world"]>) => void;
  onExport: () => void;
  onImportClick: () => void;
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
};

export function WorldEditor({
  world,
  onUpdateWorld,
  onExport,
  onImportClick,
  hasErrors,
  errorCount,
  warningCount,
}: Props) {
  return (
    <section className="owt-panel owt-panel-lifted mt-6">
      <h2 className="text-xl font-bold text-slate-100 mb-5">World</h2>

      {/* Name */}
      <label className="block mb-4">
        <div className="text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
          World Name
        </div>
        <input
          value={world.world.name}
          onChange={(e) => onUpdateWorld({ name: e.target.value })}
          className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
        />
      </label>

      {/* Description */}
      <label className="block mb-5">
        <div className="text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
          Description
        </div>
        <textarea
          value={world.world.description}
          onChange={(e) => onUpdateWorld({ description: e.target.value })}
          rows={4}
          className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors resize-none"
        />
      </label>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onExport}
          disabled={hasErrors}
          className={[
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            hasErrors
              ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
              : "bg-gradient-to-b from-sky-500 to-blue-600 text-slate-900 border border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(56,189,248,0.7)] hover:-translate-y-0.5",
          ].join(" ")}
        >
          Export JSON
        </button>

        <button
          onClick={onImportClick}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800/80 text-slate-300 border border-slate-600 hover:bg-blue-900/50 hover:-translate-y-0.5 transition-all"
        >
          Import JSON
        </button>
      </div>

      {/* Footer notes */}
      <p className="text-xs text-slate-500 mt-3">
        Import replaces the current world state.
      </p>

      {(errorCount > 0 || warningCount > 0) && (
        <p
          className={`text-xs mt-2 ${errorCount > 0 ? "text-red-300" : "text-yellow-400"}`}
        >
          Validation: {errorCount} error(s), {warningCount} warning(s)
        </p>
      )}
    </section>
  );
}
