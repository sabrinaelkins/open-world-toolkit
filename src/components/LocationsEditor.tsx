import { useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  Location as WorldLocation,
  MapData,
  TagMeta,
} from "../types/worldTypes";
import { TagChip } from "./TagChip";

const QUICK_TAGS = ["spawn", "enemy", "town", "quest", "boss", "shop"] as const;

const inputClass =
  "w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors";

const fieldLabelClass = "text-xs text-slate-400 mb-1.5 uppercase tracking-wide";

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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagMatchMode, setTagMatchMode] = useState<"any" | "all">("any");
  const [tagFilterDraft, setTagFilterDraft] = useState("");
  const [filterActiveIdx, setFilterActiveIdx] = useState(-1);
  const [activeSugKeyByLocId, setActiveSugKeyByLocId] = useState<
    Record<string, string | null>
  >(() => Object.create(null));
  const sugRowRefByLocId = useRef<Record<string, HTMLDivElement | null>>(
    Object.create(null),
  );
  const lastNavLocIdRef = useRef<string | null>(null);

  const norm = useCallback((tag: string) => tag.trim().toLowerCase(), []);
  const clearActiveKey = useCallback((locId: string) => {
    setActiveSugKeyByLocId((prev) => ({ ...prev, [locId]: null }));
  }, []);

  const toggleTagFilter = useCallback(
    (tag: string) => {
      const k = norm(tag);
      if (!k) return;
      setTagFilters((prev) => {
        const has = prev.some((x) => norm(x) === k);
        return has ? prev.filter((x) => norm(x) !== k) : [...prev, k];
      });
    },
    [norm, setTagFilters],
  );

  const commitTagFilter = useCallback(
    (tag: string) => {
      const raw = tag.trim();
      if (!raw) return;
      toggleTagFilter(raw);
      setTagFilterDraft("");
    },
    [toggleTagFilter],
  );

  const tagCountByLower = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of locations)
      for (const t of l.tags ?? []) {
        const k = norm(t);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      }
    return m;
  }, [locations, norm]);

  const getTagCount = useCallback(
    (tag: string) => tagCountByLower.get(norm(tag)) ?? 0,
    [tagCountByLower, norm],
  );

  const filteredLocations = useMemo(() => {
    const q = norm(search);
    const activeFilters = tagFilters.map(norm).filter(Boolean);
    return locations.filter((loc) => {
      const tagsLower = (loc.tags ?? []).map(norm);
      const matchesTags =
        activeFilters.length === 0 ||
        (tagMatchMode === "all"
          ? activeFilters.every((tf) => tagsLower.includes(tf))
          : activeFilters.some((tf) => tagsLower.includes(tf)));
      const matchesSearch =
        !q || norm(loc.id).includes(q) || norm(loc.name).includes(q);
      const matchesCategory =
        !categoryFilter ||
        (loc.tags ?? []).some(
          (t) => (tagMeta?.[norm(t)]?.category ?? "") === categoryFilter,
        );
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

  const filterSuggestions = useMemo(() => {
    const q = norm(tagFilterDraft);
    if (!q) return [];
    const existing = new Set(tagFilters.map(norm));
    const list = tagSuggestions
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !existing.has(norm(t)) && norm(t).includes(q));
    list.sort((a, b) => getTagCount(b) - getTagCount(a) || a.localeCompare(b));
    return list.slice(0, 12);
  }, [tagFilterDraft, tagSuggestions, tagFilters, getTagCount, norm]);

  useLayoutEffect(() => {
    const locId = lastNavLocIdRef.current;
    if (!locId) return;
    const key = activeSugKeyByLocId[locId];
    if (!key) return;
    const row = sugRowRefByLocId.current[locId];
    if (!row) return;
    const btn = row.querySelector<HTMLButtonElement>(
      `button[data-sug-key="${key}"]`,
    );
    if (!btn) return;
    const pad = 8;
    const left = btn.offsetLeft;
    const right = left + btn.offsetWidth;
    const visibleLeft = row.scrollLeft;
    const visibleRight = visibleLeft + row.clientWidth;
    if (left < visibleLeft + pad) row.scrollLeft = Math.max(0, left - pad);
    else if (right > visibleRight - pad)
      row.scrollLeft = right - row.clientWidth + pad;
  }, [activeSugKeyByLocId]);

  return (
    <section className="owt-panel owt-panel-lifted mt-6">
      {/* ── Top filter bar ── */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search locations..."
          className={`${inputClass} flex-1 min-w-[160px]`}
        />

        {/* Tag filter input */}
        <div className="flex flex-col gap-2 min-w-[220px]">
          <input
            value={tagFilterDraft}
            onChange={(e) => {
              setTagFilterDraft(e.target.value);
              setFilterActiveIdx(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                setTagMatchMode((m) => (m === "any" ? "all" : "any"));
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setFilterActiveIdx((i) =>
                  i < 0 ? 0 : Math.min(i + 1, filterSuggestions.length - 1),
                );
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setFilterActiveIdx((i) =>
                  i < 0 ? filterSuggestions.length - 1 : Math.max(i - 1, 0),
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
                if (
                  filterActiveIdx >= 0 &&
                  filterActiveIdx < filterSuggestions.length
                ) {
                  commitTagFilter(filterSuggestions[filterActiveIdx]);
                  setFilterActiveIdx(-1);
                  return;
                }
                commitTagFilter(tagFilterDraft);
                setFilterActiveIdx(-1);
              }
            }}
            placeholder={
              tagMatchMode === "any"
                ? "Filter by tag (ANY)"
                : "Filter by tag (ALL)"
            }
            className={`${inputClass} ${tagMatchMode === "all" ? "border-sky-400" : ""}`}
          />
          {filterSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filterSuggestions.map((t, idx) => {
                const isActive = idx === filterActiveIdx;
                return (
                  <button
                    key={t}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitTagFilter(t)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${isActive ? "border-slate-300 bg-slate-600 text-white" : "border-slate-600 bg-transparent text-slate-300 hover:border-slate-400"}`}
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
          className="px-3 py-2 rounded-lg border border-slate-600 bg-transparent text-slate-300 text-sm hover:border-slate-400 transition-colors whitespace-nowrap"
        >
          {tagMatchMode === "any" ? "ANY (OR)" : "ALL (AND)"}
        </button>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">All categories</option>
          <option value="system">system</option>
          <option value="world">world</option>
          <option value="biome">biome</option>
          <option value="quest">quest</option>
        </select>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-100 m-0">
          Locations Editor
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({filteredLocations.length} / {locations.length})
          </span>
        </h2>
        <button onClick={onAddLocation} className="owt-glow-btn">
          + Add Location
        </button>
      </div>

      {/* ── Active filters bar ── */}
      {(tagFilters.length > 0 || categoryFilter) && (
        <div className="flex gap-2 flex-wrap items-center mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
          <span className="text-xs text-slate-400">Active filters:</span>
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
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-600 bg-slate-800/80 text-xs text-slate-300">
              category: <strong>{categoryFilter}</strong>
              <button
                onClick={() => setCategoryFilter("")}
                className="text-slate-400 hover:text-white transition-colors ml-1"
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
              setFilterActiveIdx(-1);
            }}
            className="ml-auto px-3 py-1.5 rounded-lg border border-slate-600 bg-transparent text-slate-300 text-xs hover:border-slate-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {filteredLocations.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-8">
          No locations match your filters.
        </p>
      )}

      {/* ── Location cards ── */}
      <div className="flex flex-col gap-4">
        {filteredLocations.map((loc) => {
          const tags = loc.tags ?? [];
          const dedupedTags = tags.filter((tag, i, arr) => {
            const k = norm(tag);
            return i === arr.findIndex((t) => norm(t) === k);
          });
          const existingLower = new Set(dedupedTags.map(norm));

          const commitDraftTags = (locId: string) => {
            const raw = (tagDraftByLocId[locId] ?? "").trim();
            if (!raw) return;
            const seen = new Set<string>();
            for (const p of raw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)) {
              const k = norm(p);
              if (!k || seen.has(k)) continue;
              seen.add(k);
              onAddTag(locId, p);
            }
            setTagDraftByLocId((prev) => ({ ...prev, [locId]: "" }));
            clearActiveKey(locId);
          };

          const draftLower = norm(tagDraftByLocId[loc.id] ?? "");
          let suggestions = tagSuggestions
            .map((t) => t.trim())
            .filter(Boolean)
            .filter(
              (t) =>
                !existingLower.has(norm(t)) &&
                (draftLower ? norm(t).includes(draftLower) : true),
            );
          suggestions.sort(
            (a, b) => getTagCount(b) - getTagCount(a) || a.localeCompare(b),
          );
          const seenSug = new Set<string>();
          suggestions = suggestions
            .filter((t) => {
              const k = norm(t);
              if (!k || seenSug.has(k)) return false;
              seenSug.add(k);
              return true;
            })
            .slice(0, 12);
          const keys = suggestions.map((t) => norm(t));
          const rawActiveKey = activeSugKeyByLocId[loc.id] ?? null;
          const safeActiveKey =
            rawActiveKey && keys.includes(rawActiveKey) ? rawActiveKey : null;

          const moveActive = (locId: string, dir: -1 | 1) => {
            if (keys.length === 0) return;
            lastNavLocIdRef.current = locId;
            setActiveSugKeyByLocId((prev) => {
              const cur = prev[locId] ?? null;
              const curIdx = cur ? keys.indexOf(cur) : -1;
              const nextIdx =
                curIdx === -1
                  ? dir === 1
                    ? 0
                    : keys.length - 1
                  : Math.max(0, Math.min(curIdx + dir, keys.length - 1));
              return { ...prev, [locId]: keys[nextIdx] };
            });
          };

          return (
            <div key={loc.id} className="owt-subpanel">
              {/* Card header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                  {loc.id}
                </span>
                <button
                  onClick={() => onDeleteLocation(loc.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-400/50 text-red-300 bg-transparent hover:bg-red-500/10 hover:border-red-400 hover:shadow-[0_0_12px_rgba(248,113,113,0.4)] hover:-translate-y-0.5 transition-all"
                >
                  Delete
                </button>
              </div>

              {/* Tags display */}
              {dedupedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
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
              )}

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="block">
                  <div className={fieldLabelClass}>Location Name</div>
                  <input
                    value={loc.name}
                    onChange={(e) =>
                      onUpdateLocation(loc.id, { name: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <div className={fieldLabelClass}>Map</div>
                  <select
                    value={loc.mapId}
                    onChange={(e) =>
                      onUpdateLocation(loc.id, { mapId: e.target.value })
                    }
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                    <option value="unassigned">Unassigned</option>
                  </select>
                </label>
              </div>

              <label className="block mb-4">
                <div className={fieldLabelClass}>Radius</div>
                <input
                  type="number"
                  value={loc.radius}
                  onChange={(e) =>
                    onUpdateLocation(loc.id, { radius: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </label>

              {/* Tags input */}
              <div>
                <div className={`${fieldLabelClass} mb-2`}>Add Tags</div>
                <div className="flex gap-2 mb-2">
                  <input
                    value={tagDraftByLocId[loc.id] ?? ""}
                    onChange={(e) => {
                      setTagDraftByLocId((prev) => ({
                        ...prev,
                        [loc.id]: e.target.value,
                      }));
                      clearActiveKey(loc.id);
                    }}
                    onKeyDown={(e) => {
                      const locId = loc.id;
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        setTagDraftByLocId((prev) => ({
                          ...prev,
                          [locId]: "",
                        }));
                        clearActiveKey(locId);
                        return;
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        e.stopPropagation();
                        moveActive(locId, 1);
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        e.stopPropagation();
                        moveActive(locId, -1);
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        const chosen =
                          safeActiveKey != null
                            ? (suggestions.find(
                                (t) => norm(t) === safeActiveKey,
                              ) ?? null)
                            : null;
                        if (chosen) {
                          onAddTag(locId, chosen);
                          setTagDraftByLocId((prev) => ({
                            ...prev,
                            [locId]: "",
                          }));
                          clearActiveKey(locId);
                          return;
                        }
                        commitDraftTags(locId);
                      }
                    }}
                    placeholder="type tag(s) + Enter (comma-separated ok)"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    onClick={() => commitDraftTags(loc.id)}
                    className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-300 text-sm font-semibold hover:border-slate-400 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Quick tags */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_TAGS.map((qt) => {
                    const key = norm(qt);
                    const hasIt = existingLower.has(key);
                    const tagToRemove = tags.find((t) => norm(t) === key);
                    const meta = tagMeta?.[key] ?? {};
                    const color = meta.color ?? "#666";
                    return (
                      <button
                        key={qt}
                        type="button"
                        title={meta.description ?? qt}
                        onClick={() => {
                          if (hasIt && tagToRemove)
                            onRemoveTag(loc.id, tagToRemove);
                          else if (!hasIt) onAddTag(loc.id, qt);
                        }}
                        style={
                          hasIt
                            ? {
                                border: `1px solid ${color}`,
                                background: color,
                                color: "#000",
                              }
                            : {}
                        }
                        className={`px-2.5 py-1 rounded-full text-xs border transition-all ${hasIt ? "" : "border-slate-600 bg-transparent text-slate-300 hover:border-slate-400"}`}
                      >
                        {hasIt ? "✓ " : "+ "}
                        {qt}
                        <span className="opacity-60 ml-1">
                          ({getTagCount(qt)})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div
                    ref={(el) => {
                      sugRowRefByLocId.current[loc.id] = el;
                    }}
                    className="flex gap-2 overflow-x-auto pb-1"
                    style={{ opacity: draftLower ? 1 : 0.55 }}
                  >
                    {suggestions.map((t) => {
                      const k = norm(t);
                      const isActive = safeActiveKey === k;
                      return (
                        <button
                          key={k}
                          data-sug-key={k}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            onAddTag(loc.id, t);
                            setTagDraftByLocId((prev) => ({
                              ...prev,
                              [loc.id]: "",
                            }));
                            clearActiveKey(loc.id);
                          }}
                          className={`flex-none px-2.5 py-1 rounded-full text-xs border whitespace-nowrap transition-colors ${isActive ? "border-slate-300 bg-slate-600 text-white" : "border-slate-600 bg-transparent text-slate-300 hover:border-slate-400"}`}
                          aria-selected={isActive}
                        >
                          {isActive && (
                            <span className="mr-1 opacity-70">▶</span>
                          )}
                          {t}{" "}
                          <span className="opacity-60">({getTagCount(t)})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
