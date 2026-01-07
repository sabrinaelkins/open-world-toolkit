import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction, KeyboardEvent } from "react";
import type { MapData, Location as WorldLocation } from "../types/worldTypes";

type Props = {
  locations: WorldLocation[];
  maps: MapData[];

  tagDraftByLocId: Record<string, string>;
  setTagDraftByLocId: Dispatch<SetStateAction<Record<string, string>>>;

  tagSuggestions: string[];

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
  tagSuggestions,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
  onAddTag,
  onRemoveTag,
}: Props) {
  // local UI state
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // keyboard navigation: active suggestion per location
  const [activeSugIdxByLocId, setActiveSugIdxByLocId] = useState<
    Record<string, number>
  >({});

  // A) tag counts across all locations (top-level hook ✅)
  const tagCountByLower = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of locations) {
      for (const t of l.tags ?? []) {
        const k = t.toLowerCase();
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }
    return m;
  }, [locations]);

  function getTagCount(tag: string) {
    return tagCountByLower.get(tag.toLowerCase()) ?? 0;
  }

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
        <div style={{ marginTop: 12, opacity: 0.7, fontSize: 14 }}>
          No locations match your filters
        </div>
      )}

      {filteredLocations.map((loc) => {
        // per-location helpers (safe inside map)
        function setActiveIdx(locId: string, idx: number) {
          setActiveSugIdxByLocId((prev) => ({ ...prev, [locId]: idx }));
        }

        function clearActiveIdx(locId: string) {
          setActiveSugIdxByLocId((prev) => ({ ...prev, [locId]: -1 }));
        }

        function commitDraftTags(locId: string) {
          const raw = (tagDraftByLocId[locId] ?? "").trim();
          if (!raw) return;

          const parts = raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const seen = new Set<string>();
          for (const p of parts) {
            const k = p.toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k);
            onAddTag(locId, p);
          }

          setTagDraftByLocId((prev) => ({ ...prev, [locId]: "" }));
          clearActiveIdx(locId);
        }

        const existingLower = new Set(
          (loc.tags ?? []).map((t) => t.toLowerCase())
        );
        const draftLower = (tagDraftByLocId[loc.id] ?? "").trim().toLowerCase();

        // Base list: remove existing + filter by draft
        let suggestions = tagSuggestions
          .filter((t) => !existingLower.has(t.toLowerCase()))
          .filter((t) =>
            draftLower ? t.toLowerCase().includes(draftLower) : true
          );

        // B) sort by popularity (count desc), then alpha
        suggestions.sort((a, b) => {
          const ca = getTagCount(a);
          const cb = getTagCount(b);
          if (cb !== ca) return cb - ca;
          return a.localeCompare(b);
        });

        suggestions = suggestions.slice(0, 12);

        const sCount = suggestions.length;
        const activeIdx = activeSugIdxByLocId[loc.id] ?? -1;

        return (
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
                  onChange={(e) => {
                    setTagDraftByLocId((prev) => ({
                      ...prev,
                      [loc.id]: e.target.value,
                    }));
                    clearActiveIdx(loc.id);
                  }}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "ArrowDown") {
                      if (sCount === 0) return;
                      e.preventDefault();
                      const next = activeIdx < 0 ? 0 : (activeIdx + 1) % sCount;
                      setActiveIdx(loc.id, next);
                      return;
                    }

                    if (e.key === "ArrowUp") {
                      if (sCount === 0) return;
                      e.preventDefault();
                      const next =
                        activeIdx < 0
                          ? sCount - 1
                          : (activeIdx - 1 + sCount) % sCount;
                      setActiveIdx(loc.id, next);
                      return;
                    }

                    if (e.key === "Escape") {
                      clearActiveIdx(loc.id);
                      return;
                    }

                    if (e.key === "Enter") {
                      e.preventDefault();

                      // choose highlighted suggestion
                      if (activeIdx >= 0 && activeIdx < sCount) {
                        const chosen = suggestions[activeIdx];
                        onAddTag(loc.id, chosen);
                        setTagDraftByLocId((prev) => ({
                          ...prev,
                          [loc.id]: "",
                        }));
                        clearActiveIdx(loc.id);
                        return;
                      }

                      // otherwise commit typed tags (comma-supported)
                      commitDraftTags(loc.id);
                    }
                  }}
                  placeholder="type tag(s) + Enter (comma-separated ok)"
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
                  onClick={() => commitDraftTags(loc.id)}
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

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    opacity: draftLower ? 1 : 0.55,
                  }}
                >
                  {suggestions.map((t, idx) => {
                    const isActive = idx === activeIdx;
                    const count = getTagCount(t);

                    return (
                      <button
                        key={t}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onAddTag(loc.id, t);
                          setTagDraftByLocId((prev) => ({
                            ...prev,
                            [loc.id]: "",
                          }));
                          clearActiveIdx(loc.id);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: isActive
                            ? "1px solid #eee"
                            : "1px solid #555",
                          background: isActive ? "#444" : "transparent",
                          color: isActive ? "#fff" : "#ddd",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                        aria-selected={isActive}
                      >
                        {isActive ? "▶ " : "+ "}
                        {t} <span style={{ opacity: 0.7 }}>({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

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
        );
      })}
    </section>
  );
}
