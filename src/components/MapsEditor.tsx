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
    <section className="owt-panel owt-panel-lifted" style={{ marginTop: 24 }}>
      <h2>Maps Editor</h2>

      <button
        onClick={onAddMap}
        className="owt-glow-btn"
        style={{ marginBottom: 16 }}
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
          {/* header row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 700 }}>{m.id}</div>

            {/* Delete button - red outline + glow */}
            <button
              onClick={() => onDeleteMap(m.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #f87171",
                background: "transparent",
                color: "#fca5a5",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 140ms ease",
                boxShadow: "0 0 0px transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 12px rgba(248,113,113,0.6)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 0px transparent";
                e.currentTarget.style.transform = "none";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.95)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translateY(-1px) scale(1)";
              }}
            >
              Delete
            </button>
          </div>

          {/* Map name */}
          <label style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Map Name</div>
            <input
              value={m.name}
              onChange={(e) => onUpdateMap(m.id, { name: e.target.value })}
              style={{ width: "100%" }}
            />
          </label>

          {/* Description */}
          <label style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Description</div>
            <input
              value={m.description}
              onChange={(e) =>
                onUpdateMap(m.id, { description: e.target.value })
              }
              style={{ width: "100%" }}
            />
          </label>

          {/* Size row */}
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
                style={{ width: "100%" }}
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
                style={{ width: "100%" }}
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
                style={{ width: "100%" }}
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
