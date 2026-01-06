import type { MapData } from "../types/worldTypes";

type Props = {
  maps: MapData[];
  onAddMap: () => void;
  onUpdateMap: (mapId: string, patch: Partial<MapData>) => void;
  onDeleteMap: (mapId: string) => void;
};

export function MapsEditor({
  maps,
  onAddMap,
  onUpdateMap,
  onDeleteMap,
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
      <h2>Maps Editor</h2>

      <button
        onClick={onAddMap}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #666",
          background: "transparent",
          color: "#eee",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        + Add Map
      </button>

      {maps.map((m) => (
        <div
          key={m.id}
          style={{
            border: "1px solid #555",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 700 }}>{m.id}</div>
            <button
              onClick={() => onDeleteMap(m.id)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #666",
                background: "transparent",
                color: "#eee",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>

          <label style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Map Name</div>
            <input
              value={m.name}
              onChange={(e) => onUpdateMap(m.id, { name: e.target.value })}
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

          <label style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Description</div>
            <input
              value={m.description}
              onChange={(e) =>
                onUpdateMap(m.id, { description: e.target.value })
              }
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

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Width</div>
              <input
                type="number"
                value={m.size?.width ?? 0}
                onChange={(e) =>
                  onUpdateMap(m.id, {
                    size: {
                      ...(m.size ?? { width: 0, height: 0, unit: "meters" }),
                      width: Number(e.target.value),
                    },
                  })
                }
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

            <label style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Height</div>
              <input
                type="number"
                value={m.size?.height ?? 0}
                onChange={(e) =>
                  onUpdateMap(m.id, {
                    size: {
                      ...(m.size ?? { width: 0, height: 0, unit: "meters" }),
                      height: Number(e.target.value),
                    },
                  })
                }
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

            <label style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Unit</div>
              <input
                value={m.size?.unit ?? "meters"}
                onChange={(e) =>
                  onUpdateMap(m.id, {
                    size: {
                      ...(m.size ?? { width: 0, height: 0, unit: "meters" }),
                      unit: e.target.value,
                    },
                  })
                }
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
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Locations assigned: {(m.locations ?? []).length}
          </div>
        </div>
      ))}
    </section>
  );
}
