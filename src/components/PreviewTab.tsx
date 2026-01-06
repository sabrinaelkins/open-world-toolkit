import type { GameWorldFile } from "../types/worldTypes";

type Issue = { level: "error" | "warning"; message: string };

type Props = {
  world: GameWorldFile; // pass syncedWorld into this
  locationById: Map<string, GameWorldFile["locations"][number]>;
  errorIssues: Issue[];
  warningIssues: Issue[];
};

export function PreviewTab({
  world,
  locationById,
  errorIssues,
  warningIssues,
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
      <h2>Preview</h2>

      {(errorIssues.length > 0 || warningIssues.length > 0) && (
        <div style={{ marginTop: 12 }}>
          {errorIssues.length > 0 && (
            <div
              style={{
                padding: 12,
                border: "1px solid #ff4d4d",
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Errors</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {errorIssues.map((e, idx) => (
                  <li key={idx} style={{ opacity: 0.95 }}>
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warningIssues.length > 0 && (
            <div
              style={{
                padding: 12,
                border: "1px solid #ffb020",
                borderRadius: 8,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Warnings</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {warningIssues.map((w, idx) => (
                  <li key={idx} style={{ opacity: 0.95 }}>
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #555",
          borderRadius: 8,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
          World
        </div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{world.world.name}</div>
        <div style={{ marginTop: 6, opacity: 0.9 }}>
          {world.world.description}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Maps</h3>

        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {world.maps.map((m) => {
            const locs = (m.locations ?? [])
              .map((id) => locationById.get(id))
              .filter((x): x is NonNullable<typeof x> => Boolean(x));

            return (
              <li key={m.id} style={{ marginBottom: 10 }}>
                <div>
                  <strong>{m.name}</strong> — {m.description} (locs: {locs.length})
                </div>

                {locs.length > 0 ? (
                  <ul
                    style={{
                      marginTop: 6,
                      paddingLeft: 18,
                      opacity: 0.9,
                    }}
                  >
                    {locs.map((l) => (
                      <li key={l.id}>
                        {l.name} @ ({l.position.x}, {l.position.y}, {l.position.z}) — radius{" "}
                        {l.radius}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ marginTop: 6, opacity: 0.7 }}>
                    No locations assigned yet
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>All Locations</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {world.locations.map((l) => (
            <li key={l.id}>
              {l.name} @ ({l.position.x}, {l.position.y}, {l.position.z}) — map:{" "}
              {l.mapId}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}