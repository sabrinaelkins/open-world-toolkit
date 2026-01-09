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
    <section className="owt-panel owt-panel-lifted" style={{ marginTop: 24 }}>
      <h2>World</h2>

      {/* Name */}
      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
          World Name
        </div>
        <input
          value={world.world.name}
          onChange={(e) => onUpdateWorld({ name: e.target.value })}
          style={{ width: "100%" }}
        />
      </label>

      {/* Description */}
      <label style={{ display: "block", marginBottom: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
          Description
        </div>
        <textarea
          value={world.world.description}
          onChange={(e) => onUpdateWorld({ description: e.target.value })}
          rows={4}
          style={{ width: "100%" }}
        />
      </label>

      {/* Actions */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={onExport}
          disabled={hasErrors}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: hasErrors ? "1px solid #4b5563" : "1px solid #1e293b",
            background: hasErrors
              ? "rgba(31,41,55,0.9)"
              : "linear-gradient(180deg, #0ea5e9, #3b82f6)",
            color: hasErrors ? "#6b7280" : "#0f172a",
            cursor: hasErrors ? "not-allowed" : "pointer",
            opacity: hasErrors ? 0.6 : 1,
            fontWeight: 600,
            boxShadow: hasErrors ? "none" : "0 0 20px #3b82f677",
            transition: "transform 120ms ease, box-shadow 150ms ease",
          }}
          onMouseEnter={(e) => {
            if (hasErrors) return;
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 0 30px #38bdf8aa";
          }}
          onMouseLeave={(e) => {
            if (hasErrors) return;
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 0 20px #3b82f677";
          }}
        >
          Export JSON
        </button>

        <button
          onClick={onImportClick}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #4b5563",
            background: "transparent",
            color: "#e5e7eb",
            cursor: "pointer",
            marginLeft: 10,
            fontWeight: 500,
            transition: "background 120ms ease, transform 100ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(30,64,175,0.7)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(15,23,42,0.9)";
            e.currentTarget.style.transform = "none";
          }}
        >
          Import JSON
        </button>

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            opacity: 0.75,
          }}
        >
          Import replaces the current world state.
        </div>

        {(errorCount > 0 || warningCount > 0) && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: errorCount > 0 ? "#fca5a5" : "#eab308",
            }}
          >
            Validation: {errorCount} error(s), {warningCount} warning(s)
          </div>
        )}
      </div>
    </section>
  );
}
