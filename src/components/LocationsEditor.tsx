import React, { useState } from "react";
import type { MapData, Location as WorldLocation } from "../types/worldTypes";

type Props = {
  locations: WorldLocation[];
  maps: MapData[];

  // Tags draft state (each location remembers what you're typing)
  tagDraftByLocId: Record<string, string>;
  setTagDraftByLocId: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;

  // Actions
  onAddLocation: () => void;
  onUpdateLocation: (locId: string, patch: Partial<WorldLocation>) => void;
  onDeleteLocation: (locId: string) => void;
  onAddTag: (locId: string, rawTag: string) => void;
  onRemoveTag: (locId: string, tag: string) => void;
};

export function LocationsEditor({
  locations,
  maps,
  tagDraftByLocId,
  setTagDraftByLocId,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
  onAddTag,
  onRemoveTag,
}: Props) {
  // local UI state
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  // filtering logic
  const filteredLocations = locations.filter((loc) => {
    const q = search.trim().toLowerCase();
    const tf = tagFilter.trim().toLowerCase();

    const matchesSearch =
      !q ||
      loc.id.toLowerCase().includes(q) ||
      loc.name.toLowerCase().includes(q);

    const tags = (loc.tags ?? []).map((t) => t.toLowerCase());
    const matchesTag = !tf || tags.some((t) => t.includes(tf));

    return matchesSearch && matchesTag;
  });
  // render
  return (
    <section
      style={{
        marginTop: 16,
        padding: 16,
        border: "1px solid #444",
        borderRadius: 8,
      }}
    >
      <div
        style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by id or name…"
          style={{
            flex: 1,
            minWidth: 220,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #666",
            background: "#333",
            color: "#eee",
          }}
        />

        <input
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="Filter by tag…"
          style={{
            flex: 1,
            minWidth: 220,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #666",
            background: "#333",
            color: "#eee",
          }}
        />
      </div>
      <h2>Locations Editor</h2>

      <button
        onClick={onAddLocation}
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
        + Add Location
      </button>
      {filteredLocations.length === 0 && (
        <div
          style={{
            marginTop: 12,
            opacity: 0.7,
            fontSize: 14,
          }}
        >
          No locations match your filters
        </div>
      )}
      {filteredLocations.map((loc) => (
        <div
          key={loc.id}
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
            <div style={{ fontWeight: 700 }}>{loc.id}</div>
            <button
              onClick={() => onDeleteLocation(loc.id)}
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
            <div style={{ fontSize: 12, opacity: 0.8 }}>Location Name</div>
            <input
              value={loc.name}
              onChange={(e) =>
                onUpdateLocation(loc.id, { name: e.target.value })
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

          <label style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Map</div>
            <select
              value={loc.mapId}
              onChange={(e) =>
                onUpdateLocation(loc.id, { mapId: e.target.value })
              }
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 6,
                border: "1px solid #666",
                background: "#333",
                color: "#eee",
              }}
            >
              {maps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </label>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>X</div>
              <input
                type="number"
                value={loc.position.x}
                onChange={(e) =>
                  onUpdateLocation(loc.id, {
                    position: { ...loc.position, x: Number(e.target.value) },
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
              <div style={{ fontSize: 12, opacity: 0.8 }}>Y</div>
              <input
                type="number"
                value={loc.position.y}
                onChange={(e) =>
                  onUpdateLocation(loc.id, {
                    position: { ...loc.position, y: Number(e.target.value) },
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
              <div style={{ fontSize: 12, opacity: 0.8 }}>Z</div>
              <input
                type="number"
                value={loc.position.z}
                onChange={(e) =>
                  onUpdateLocation(loc.id, {
                    position: { ...loc.position, z: Number(e.target.value) },
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

          <label style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Radius</div>
            <input
              type="number"
              value={loc.radius}
              onChange={(e) =>
                onUpdateLocation(loc.id, { radius: Number(e.target.value) })
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

          {/* TAGS */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
              Tags
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={tagDraftByLocId[loc.id] ?? ""}
                onChange={(e) =>
                  setTagDraftByLocId((prev) => ({
                    ...prev,
                    [loc.id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddTag(loc.id, tagDraftByLocId[loc.id] ?? "");
                    setTagDraftByLocId((prev) => ({ ...prev, [loc.id]: "" }));
                  }
                }}
                placeholder="type tag + Enter"
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #666",
                  background: "#333",
                  color: "#eee",
                }}
              />

              <button
                onClick={() => {
                  onAddTag(loc.id, tagDraftByLocId[loc.id] ?? "");
                  setTagDraftByLocId((prev) => ({ ...prev, [loc.id]: "" }));
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #666",
                  background: "transparent",
                  color: "#eee",
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {(loc.tags ?? []).map((t) => (
                <button
                  key={t}
                  onClick={() => onRemoveTag(loc.id, t)}
                  title="Click to remove"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #666",
                    background: "transparent",
                    color: "#eee",
                    cursor: "pointer",
                    opacity: 0.9,
                  }}
                >
                  {t} ✕
                </button>
              ))}

              {(loc.tags ?? []).length === 0 && (
                <div style={{ opacity: 0.7, fontSize: 12 }}>No tags yet</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
