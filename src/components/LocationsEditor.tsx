import { useMemo, useState, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
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

  tagFilters: string[];
  setTagFilters: Dispatch<SetStateAction<string[]>>;

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
  tagFilters,
  setTagFilters,
  tagDraftByLocId,
  setTagDraftByLocId,
  tagSuggestions,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
  onAddTag,
  onRemoveTag,
}: Props) {
  // ------------------------------
  // local UI state
  // ------------------------------
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [tagMatchMode, setTagMatchMode] = useState<"any" | "all">("any");

  const [tagFilterDraft, setTagFilterDraft] = useState("");
  const [filterActiveIdx, setFilterActiveIdx] = useState(-1);
  // keyboard navigation: active suggestion per location
  const [activeSugIdxByLocId, setActiveSugIdxByLocId] = useState<
    Record<string, number>
  >({});

  // ------------------------------
  // helpers (stable)
  // ------------------------------
  const norm = useCallback((tag: string) => tag.trim().toLowerCase(), []);

  // tag counts across all locations
  const tagCountByLower = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of locations) {
      for (const t of l.tags ?? []) {
        const k = norm(t);
        if (!k) continue;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }
    return m;
  }, [locations, norm]);

  const getTagCount = useCallback(
    (tag: string) => tagCountByLower.get(norm(tag)) ?? 0,
    [tagCountByLower, norm]
  );

  const toggleTagFilter = useCallback(
    (tag: string) => {
      const k = norm(tag);
      if (!k) return;

      setTagFilters((prev) => {
        const has = prev.some((x) => norm(x) === k);
        return has ? prev.filter((x) => norm(x) !== k) : [...prev, k];
      });
    },
    [norm, setTagFilters]
  );

  const commitTagFilter = useCallback(
    (tag: string) => {
      toggleTagFilter(tag);
      setTagFilterDraft("");
    },
    [toggleTagFilter]
  );

  // ------------------------------
  // filtering logic
  // ------------------------------
  const filteredLocations = useMemo(() => {
    const q = norm(search);
    const activeFilters = tagFilters.map(norm).filter(Boolean);

    return locations.filter((loc) => {
      const tagsLower = (loc.tags ?? []).map(norm);

      const matchesTags =
        activeFilters.length === 0 ||
        (tagMatchMode === "all"
          ? activeFilters.every((tf) => tagsLower.includes(tf)) // AND
          : activeFilters.some((tf) => tagsLower.includes(tf))); // OR

      const matchesSearch =
        !q || norm(loc.id).includes(q) || norm(loc.name).includes(q);

      const matchesCategory =
        !categoryFilter ||
        (loc.tags ?? []).some((t) => {
          const key = norm(t);
          const cat = tagMeta?.[key]?.category ?? "";
          return cat === categoryFilter;
        });

      return matchesSearch && matchesTags && matchesCategory;
    });
  }, [
    locations,
    search,
    tagFilters,
    tagMatchMode,
    categoryFilter,
    tagMeta,
    norm,
  ]);

  // ------------------------------
  // Tag-filter autocomplete (data only)
  // ------------------------------
  const filterSuggestions = useMemo(() => {
    const q = norm(tagFilterDraft);
    if (!q) return [];

    const existing = new Set(tagFilters.map(norm));

    const list = tagSuggestions
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !existing.has(norm(t)))
      .filter((t) => norm(t).includes(q));

    list.sort((a, b) => {
      const ca = getTagCount(a);
      const cb = getTagCount(b);
      if (cb !== ca) return cb - ca;
      return a.localeCompare(b);
    });

    return list.slice(0, 12);
  }, [tagFilterDraft, tagSuggestions, tagFilters, getTagCount, norm]);

  // ------------------------------
  // render
  // ------------------------------
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

        {/* Tag filter + autocomplete */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <input
            value={tagFilterDraft}
            onChange={(e) => {
              setTagFilterDraft(e.target.value);
              setFilterActiveIdx(-1); // reset suggestion highlight when typing
            }}
            onKeyDown={(e) => {
              // SHIFT + ENTER → toggle ANY / ALL
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                setTagMatchMode((m) => (m === "any" ? "all" : "any"));
                return;
              }

              if (e.key === "ArrowDown") {
                if (filterSuggestions.length === 0) return;
                e.preventDefault();
                setFilterActiveIdx((i) =>
                  i < 0 ? 0 : (i + 1) % filterSuggestions.length
                );
                return;
              }

              if (e.key === "ArrowUp") {
                if (filterSuggestions.length === 0) return;
                e.preventDefault();
                setFilterActiveIdx((i) =>
                  i < 0
                    ? filterSuggestions.length - 1
                    : (i - 1 + filterSuggestions.length) %
                      filterSuggestions.length
                );
                return;
              }

              if (e.key === "Escape") {
                e.preventDefault();
                setTagFilterDraft("");
                setFilterActiveIdx(-1);
                return;
              }

              if (e.key === "Enter") {
                e.preventDefault();

                // If a suggestion is highlighted, choose it
                if (
                  filterActiveIdx >= 0 &&
                  filterActiveIdx < filterSuggestions.length
                ) {
                  commitTagFilter(filterSuggestions[filterActiveIdx]);
                  setFilterActiveIdx(-1);
                  return;
                }

                // Otherwise commit whatever they typed
                commitTagFilter(tagFilterDraft);
                setFilterActiveIdx(-1);
              }
            }}
            placeholder={
              tagMatchMode === "any"
                ? "Add tag filter + Enter (ANY match)"
                : "Add tag filter + Enter (ALL match)"
            }
            style={{
              width: 260,
              border:
                tagMatchMode === "all" ? "1px solid #38bdf8" : "1px solid #666",
            }}
          />

          {filterSuggestions.length > 0 && (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {filterSuggestions.map((t, idx) => {
                const isActive = idx === filterActiveIdx;

                return (
                  <button
                    key={t}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitTagFilter(t)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: isActive ? "1px solid #eee" : "1px solid #555",
                      background: isActive ? "#444" : "transparent",
                      color: isActive ? "#fff" : "#ddd",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    aria-selected={isActive}
                  >
                    {isActive ? "▶ " : "+ "}
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setTagMatchMode((m) => (m === "any" ? "all" : "any"))}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #666",
            background: "transparent",
            color: "#eee",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          title={
            tagMatchMode === "any"
              ? "Match ANY selected tag (OR)"
              : "Match ALL selected tags (AND)"
          }
        >
          {tagMatchMode === "any" ? "ANY tag (OR)" : "ALL tags (AND)"}
        </button>

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

      {/* Active Filters Bar */}
      {(tagFilters.length > 0 || categoryFilter) && (
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.75 }}>Active filters:</div>

          {tagFilters.map((t) => (
            <TagChip
              key={t}
              tag={t}
              tagMeta={tagMeta}
              active
              onClick={() => toggleTagFilter(t)}
              onRemove={() => toggleTagFilter(t)}
            />
          ))}

          {categoryFilter && (
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #666",
                background: "rgba(255,255,255,0.06)",
                fontSize: 12,
              }}
            >
              category: <strong>{categoryFilter}</strong>
              <button
                onClick={() => setCategoryFilter("")}
                style={{
                  marginLeft: 8,
                  border: "none",
                  background: "transparent",
                  color: "#eee",
                  cursor: "pointer",
                  opacity: 0.85,
                }}
                title="Clear category filter"
              >
                ×
              </button>
            </span>
          )}

          <button
            onClick={() => {
              setTagFilters([]);
              setCategoryFilter("");
              setTagFilterDraft("");
            }}
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #666",
              background: "transparent",
              color: "#eee",
              cursor: "pointer",
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {filteredLocations.map((loc) => {
        const tags = loc.tags ?? [];

        const dedupedTags = tags.filter((tag, index, arr) => {
          const k = norm(tag);
          return index === arr.findIndex((t) => norm(t) === k);
        });

        const existingLower = new Set(dedupedTags.map(norm));

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
            const k = norm(p);
            if (!k || seen.has(k)) continue;
            seen.add(k);
            onAddTag(locId, p);
          }

          setTagDraftByLocId((prev) => ({ ...prev, [locId]: "" }));
          clearActiveIdx(locId);
        }

        const draftLower = norm(tagDraftByLocId[loc.id] ?? "");

        let suggestions = tagSuggestions
          .filter((t) => !existingLower.has(norm(t)))
          .filter((t) => (draftLower ? norm(t).includes(draftLower) : true));

        suggestions.sort((a, b) => {
          const ca = getTagCount(a);
          const cb = getTagCount(b);
          if (cb !== ca) return cb - ca;
          return a.localeCompare(b);
        });

        suggestions = suggestions.slice(0, 12);

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
                  border: "1px solid #f87171",
                  background: "transparent",
                  color: "#fca5a5",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>

            {/* tags row */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 8,
              }}
            >
              {dedupedTags.map((t) => {
                const k = norm(t);
                const isActive = tagFilters.some((x) => norm(x) === k);
                const isDim = tagFilters.length > 0 && !isActive;

                return (
                  <TagChip
                    key={`${loc.id}:${t}`}
                    tag={t}
                    tagMeta={tagMeta}
                    active={isActive}
                    dim={isDim}
                    onClick={() => toggleTagFilter(t)}
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
                style={{ width: "100%" }}
              />
            </label>

            <label style={{ display: "block", marginTop: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Map</div>
              <select
                value={loc.mapId}
                onChange={(e) =>
                  onUpdateLocation(loc.id, { mapId: e.target.value })
                }
                style={{ width: "100%" }}
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
                style={{ width: "100%" }}
              />
            </label>

            {/* TAGS input */}
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
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setTagDraftByLocId((prev) => ({ ...prev, [loc.id]: "" }));
                      clearActiveIdx(loc.id);
                      return;
                    }

                    if (e.key === "ArrowDown") {
                      if (suggestions.length === 0) return;
                      e.preventDefault();
                      setActiveIdx(
                        loc.id,
                        activeIdx < 0 ? 0 : (activeIdx + 1) % suggestions.length
                      );
                      return;
                    }

                    if (e.key === "ArrowUp") {
                      if (suggestions.length === 0) return;
                      e.preventDefault();
                      setActiveIdx(
                        loc.id,
                        activeIdx < 0
                          ? suggestions.length - 1
                          : (activeIdx - 1 + suggestions.length) %
                              suggestions.length
                      );
                      return;
                    }

                    if (e.key === "Enter") {
                      e.preventDefault();

                      // if highlighted suggestion, add it
                      if (activeIdx >= 0 && activeIdx < suggestions.length) {
                        onAddTag(loc.id, suggestions[activeIdx]);
                        setTagDraftByLocId((prev) => ({
                          ...prev,
                          [loc.id]: "",
                        }));
                        clearActiveIdx(loc.id);
                        return;
                      }

                      // otherwise commit comma-separated draft
                      commitDraftTags(loc.id);
                      return;
                    }
                  }}
                  placeholder="type tag(s) + Enter (comma-separated ok)"
                  style={{ flex: 1 }}
                />

                <button
                  onClick={() => commitDraftTags(loc.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid #666",
                    color: "#eee",
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
                  const key = norm(qt);
                  const hasIt = existingLower.has(key);
                  const count = getTagCount(qt);

                  const tagToRemove = tags.find((t) => norm(t) === key);

                  const meta = tagMeta?.[key] ?? {};
                  const color = meta.color ?? "#666";
                  const desc = meta.description ?? qt;

                  return (
                    <button
                      key={qt}
                      type="button"
                      title={desc}
                      onClick={() => {
                        if (hasIt && tagToRemove)
                          onRemoveTag(loc.id, tagToRemove);
                        else if (!hasIt) onAddTag(loc.id, qt);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: hasIt ? `1px solid ${color}` : "1px solid #555",
                        background: hasIt ? color : "transparent",
                        color: hasIt ? "#000" : "#ddd",
                        cursor: "pointer",
                        fontSize: 12,
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
