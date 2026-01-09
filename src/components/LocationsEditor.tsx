import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction, KeyboardEvent } from "react";
import type {
  Location as WorldLocation,
  MapData,
  TagMeta,
} from "../types/worldTypes";
import { TagChip } from "./TagChip";

const QUICK_TAGS = ["spawn", "enemy", "town", "quest", "boss", "shop"];

type Props = {
  locations: WorldLocation[];
  maps: MapData[];
  tagMeta: Record<string, TagMeta>;

  tagFilter: string;
  setTagFilter: Dispatch<SetStateAction<string>>;

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
  tagMeta,
  tagFilter,
  setTagFilter,
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
  const [categoryFilter, setCategoryFilter] = useState<string>("");

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

    const tagsLower = (loc.tags ?? []).map((t) => t.trim().toLowerCase());

    const matchesTag = !tf || tagsLower.some((t) => t === tf);

    const matchesCategory =
      !categoryFilter ||
      (loc.tags ?? []).some((t) => {
        const key = t.trim().toLowerCase();
        const cat = tagMeta?.[key]?.category ?? "";
        return cat === categoryFilter;
      });

    return matchesSearch && matchesTag && matchesCategory;
  });

  // render
  return (
    <section className="owt-panel owt-panel-lifted" style={{ marginTop: 24 }}>
      {/* Top filters row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search locations..."
          style={{ flex: 1 }}
        />

        <input
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="Filter by tag..."
          style={{ width: 200 }}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: 180 }}
        >
          <option value="">All categories</option>
          <option value="system">system</option>
          <option value="world">world</option>
          <option value="biome">biome</option>
          <option value="quest">quest</option>
        </select>
      </div>

      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Locations Editor</h2>

      {/* Glowing Add Location button */}
      <button
        onClick={onAddLocation}
        className="owt-glow-btn"
        style={{ marginBottom: 18 }}
      >
        + Add Location
      </button>

      {filteredLocations.length === 0 && (
        <div style={{ marginTop: 12, opacity: 0.7, fontSize: 14 }}>
          No locations match your filters
        </div>
      )}
      {/* Active tag filter pill */}
      {tagFilter && (
        <div style={{ marginBottom: 10 }}>
          <TagChip
            tag={tagFilter}
            tagMeta={tagMeta}
            active
            onClick={() => setTagFilter("")}
            onRemove={() => setTagFilter("")}
          />
        </div>
      )}
      {filteredLocations.map((loc) => {
        const tags = loc.tags ?? [];

        const dedupedTags = tags.filter((tag, index, arr) => {
          const key = tag.trim().toLowerCase();
          return index === arr.findIndex((t) => t.trim().toLowerCase() === key);
        });
        const existingLower = new Set(dedupedTags.map((t) => t.toLowerCase()));
        // per-location helpers
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
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #f87171", // soft red outline
                  background: "transparent",
                  color: "#fca5a5", // light red text
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 140ms ease",
                  boxShadow: "0 0 0px transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 12px rgba(248,113,113,0.6)"; // red glow
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0px transparent";
                  e.currentTarget.style.transform = "none";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "scale(0.95)"; // press
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px) scale(1)";
                }}
              >
                Delete
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 8,
              }}
            >
              {(dedupedTags ?? []).map((t) => {
                const key = t.trim().toLowerCase();

                return (
                  <TagChip
                    key={`${loc.id}:${t}`}
                    tag={t}
                    tagMeta={tagMeta}
                    onClick={() =>
                      setTagFilter((prev) =>
                        prev.trim().toLowerCase() === key ? "" : key
                      )
                    }
                    onRemove={() => onRemoveTag(loc.id, t)}
                  />
                );
              })}
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
                  }}
                />

                <button
                  onClick={() => commitDraftTags(loc.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid #1e293b",
                    boxShadow: "0 0 20px #3b82f677",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Add
                </button>
              </div>

              {/* QUICK TAG BUTTONS */}
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                {QUICK_TAGS.map((qt) => {
                  const key = qt.toLowerCase();
                  const hasIt = existingLower.has(key);
                  const count = getTagCount(qt);

                  const tagToRemove = tags.find(
                    (t) => t.trim().toLowerCase() === key
                  );

                  const meta = tagMeta?.[key] ?? {};
                  const color = meta.color ?? "#666";
                  const desc = meta.description ?? qt;

                  return (
                    <button
                      key={qt}
                      type="button"
                      title={desc}
                      onClick={() => {
                        if (hasIt && tagToRemove) {
                          onRemoveTag(loc.id, tagToRemove);
                        } else if (!hasIt) {
                          onAddTag(loc.id, qt);
                        }
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: hasIt ? `1px solid ${color}` : "1px solid #555",
                        background: hasIt ? color : "transparent",
                        color: hasIt ? "#000" : "#ddd",
                        cursor: "pointer",
                        fontSize: 12,
                        transition: "all 150ms ease",
                        transform: hasIt ? "translateY(-1px)" : "none",
                        boxShadow: hasIt ? `0 0 6px ${color}88` : "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 0 10px ${color}aa`;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = hasIt
                          ? `0 0 6px ${color}55`
                          : "none";
                        e.currentTarget.style.transform = "none";
                      }}
                      onMouseDown={(e) => {
                        // press in: slightly smaller & closer
                        e.currentTarget.style.transform =
                          "translateY(0) scale(0.94)";
                      }}
                      onMouseUp={(e) => {
                        // bounce back to “hovered” state
                        e.currentTarget.style.transform =
                          "translateY(-2px) scale(1)";
                      }}
                    >
                      {hasIt ? "✓ " : "+ "}
                      {qt} <span style={{ opacity: 0.7 }}>({count})</span>
                    </button>
                  );
                })}
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
            </div>
          </div>
        );
      })}
    </section>
  );
}
