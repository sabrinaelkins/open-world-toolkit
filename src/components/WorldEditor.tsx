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
    <section
      style={{
        marginTop: 16,
        padding: 16,
        border: "1px solid #444",
        borderRadius: 8,
      }}
    >
      <h2>World</h2>

      <label style={{ display: "block", marginBottom: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>World Name</div>
        <input
          value={world.world.name}
          onChange={(e) => onUpdateWorld({ name: e.target.value })}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "1px solid #666",
            background: "#333",
            color: "#eee",
          }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Description</div>
        <textarea
          value={world.world.description}
          onChange={(e) => onUpdateWorld({ description: e.target.value })}
          rows={4}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "1px solid #666",
            background: "#333",
            color: "#eee",
          }}
        />
      </label>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={onExport}
          disabled={hasErrors}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${hasErrors ? "#555" : "#666"}`,
            background: "transparent",
            color: hasErrors ? "#777" : "#eee",
            cursor: hasErrors ? "not-allowed" : "pointer",
            opacity: hasErrors ? 0.6 : 1,
          }}
        >
          Export JSON
        </button>

        <button
          onClick={onImportClick}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #666",
            background: "transparent",
            color: "#eee",
            cursor: "pointer",
            marginLeft: 10,
          }}
        >
          Import JSON
        </button>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          Import replaces the current world state.
        </div>

        {(errorCount > 0 || warningCount > 0) && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            Validation: {errorCount} error(s), {warningCount} warning(s)
          </div>
        )}
      </div>
    </section>
  );
}