import type { CSSProperties } from "react";
import type { GameWorldFile } from "../types/worldTypes";

type Issue = { level: "error" | "warning"; message: string };

type Props = {
  world: GameWorldFile; // synced world
  locationById: Map<string, GameWorldFile["locations"][number]>;
  errorIssues: Issue[];
  warningIssues: Issue[];
};

// Convenience aliases
type WorldMap = GameWorldFile["maps"][number];
type WorldLocation = GameWorldFile["locations"][number];

// “Preview-friendly” world shape that tolerates older / alternate fields
type GameWorldForPreview = GameWorldFile & {
  world?: { name?: string; description?: string };
  name?: string;
  description?: string;
  worldName?: string;
  worldDescription?: string;
  tagMeta?: Record<string, { color?: string }>;
};

// Helper shape for locations that might have different coord/size fields
type LocationForPreview = WorldLocation & {
  x?: number;
  y?: number;
  z?: number;
  posX?: number;
  posY?: number;
  posZ?: number;
  position?: { x?: number; y?: number; z?: number };
  size?: number;
  radius?: number;
};

export function PreviewTab({
  world,
  locationById,
  errorIssues,
  warningIssues,
}: Props) {
  const gw = world as GameWorldForPreview;

  // World name / description (supporting several possible field names)
  const worldName: string =
    gw.worldName ?? gw.name ?? gw.world?.name ?? "(unnamed world)";

  const worldDescription: string =
    gw.worldDescription ?? gw.description ?? gw.world?.description ?? "";

  // Maps + locations
  const maps: WorldMap[] = Array.isArray(gw.maps) ? gw.maps : [];

  const locations: WorldLocation[] =
    Array.isArray(gw.locations) && gw.locations.length > 0
      ? gw.locations
      : Array.from(locationById?.values?.() ?? []);

  const tagMeta: Record<string, { color?: string }> = gw.tagMeta ?? {};

  // Helpers – no `any` anywhere ✨
  function formatCoords(loc: WorldLocation): string {
    const l = loc as LocationForPreview;
    const x = l.x ?? l.posX ?? l.position?.x ?? 0;
    const y = l.y ?? l.posY ?? l.position?.y ?? 0;
    const z = l.z ?? l.posZ ?? l.position?.z ?? 0;
    return `(${x}, ${y}, ${z})`;
  }

  function getRadius(loc: WorldLocation): number | string {
    const l = loc as LocationForPreview;
    return l.radius ?? l.size ?? "?";
  }

  // Shared row styles so nested vs flat lists stay aligned
  const nestedLocationRowStyle: CSSProperties = {
    marginTop: 4,
    marginLeft: 16,
    fontSize: 13,
    lineHeight: "1.3",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 3,
  };

  const flatLocationRowStyle: CSSProperties = {
    ...nestedLocationRowStyle,
    marginLeft: 8,
  };

  const hasIssues = errorIssues.length > 0 || warningIssues.length > 0;

  const rowTextStyle: CSSProperties = {
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "normal",
  };

  const rowChipsStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    paddingLeft: 10,
  };

  return (
    <section className="owt-panel owt-panel-lifted" style={{ marginTop: 24 }}>
      <h2 style={{ marginTop: 0 }}>Preview</h2>

      {/* Issue summary */}
      {hasIssues && (
        <div
          className="owt-subpanel"
          style={{
            marginTop: 12,
            marginBottom: 12,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            Issues in current world
          </div>

          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {errorIssues.length > 0 && (
              <span style={{ color: "#fca5a5", marginRight: 12 }}>
                ● {errorIssues.length} error
                {errorIssues.length === 1 ? "" : "s"}
              </span>
            )}
            {warningIssues.length > 0 && (
              <span style={{ color: "#facc15" }}>
                ● {warningIssues.length} warning
                {warningIssues.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {[...errorIssues, ...warningIssues].map((issue, idx) => (
            <div
              key={idx}
              style={{
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: 0.95,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: issue.level === "error" ? "#f87171" : "#facc15",
                }}
              />
              <span
                style={{
                  color: issue.level === "error" ? "#fecaca" : "#fef9c3",
                }}
              >
                [{issue.level}] {issue.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Main preview content */}
      <div
        className="owt-subpanel"
        style={{
          marginTop: hasIssues ? 8 : 16,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* WORLD SUMMARY */}
        <section>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>World</h3>
          <div style={{ fontWeight: 600 }}>{worldName}</div>
          {worldDescription && (
            <div
              style={{
                marginTop: 4,
                opacity: 0.9,
                fontSize: 14,
                maxWidth: 640,
              }}
            >
              {worldDescription}
            </div>
          )}
        </section>

        {/* MAPS */}
        <section>
          <h3 style={{ marginBottom: 8 }}>Maps</h3>
          {maps.length === 0 ? (
            <div style={{ opacity: 0.8, fontSize: 14 }}>
              No maps yet. Add one on the Maps tab.
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                paddingLeft: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {maps.map((m) => {
                const mapLocs = locations.filter((loc) => loc.mapId === m.id);
                return (
                  <li key={m.id}>
                    <div style={{ fontWeight: 600 }}>
                      {m.name || m.id}{" "}
                      <span
                        style={{
                          opacity: 0.7,
                          fontWeight: 400,
                        }}
                      >
                        — {m.description || "Describe this region..."} (locs:{" "}
                        {mapLocs.length})
                      </span>
                    </div>

                    {mapLocs.map((loc) => (
                      <div key={loc.id} style={nestedLocationRowStyle}>
                        {/* left column: text */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              flex: "0 0 14px",
                              opacity: 0.9,
                            }}
                          >
                            •
                          </span>

                          <div style={rowTextStyle}>
                            {loc.name || loc.id} @ {formatCoords(loc)} — radius{" "}
                            {getRadius(loc)}
                          </div>
                        </div>

                        {/* right column: chips */}
                        {loc.tags && loc.tags.length > 0 && (
                          <div style={rowChipsStyle}>
                            {loc.tags.map((tag) => {
                              const key = tag.trim().toLowerCase();
                              const resolvedColor = tagMeta[key]?.color;

                              return (
                                <span key={tag} className="owt-tag-chip">
                                  <span
                                    className="owt-tag-chip-dot"
                                    style={
                                      resolvedColor
                                        ? { background: resolvedColor }
                                        : undefined
                                    }
                                  />
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ALL LOCATIONS (flat list) */}
        <section>
          <h3 style={{ marginBottom: 8 }}>All Locations</h3>
          {locations.length === 0 ? (
            <div style={{ opacity: 0.8, fontSize: 14 }}>
              No locations yet. Add some on the Locations tab.
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                paddingLeft: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {locations.map((loc) => {
                const map = maps.find((m) => m.id === loc.mapId);

                return (
                  <li key={loc.id}>
                    <div style={flatLocationRowStyle}>
                      {/* left column: text */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{ width: 14, flex: "0 0 14px", opacity: 0.9 }}
                        >
                          •
                        </span>

                        <div style={rowTextStyle}>
                          {loc.name || loc.id} @ {formatCoords(loc)} — radius{" "}
                          {getRadius(loc)}
                          {map && (
                            <span style={{ opacity: 0.7 }}>
                              {" "}
                              — map: <strong>{map.name || map.id}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      {/* right column: chips */}
                      {loc.tags && loc.tags.length > 0 && (
                        <div style={rowChipsStyle}>
                          {loc.tags.map((tag) => {
                            const key = tag.trim().toLowerCase();
                            const resolvedColor = tagMeta[key]?.color;

                            return (
                              <span key={tag} className="owt-tag-chip">
                                <span
                                  className="owt-tag-chip-dot"
                                  style={
                                    resolvedColor
                                      ? { background: resolvedColor }
                                      : undefined
                                  }
                                />
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
