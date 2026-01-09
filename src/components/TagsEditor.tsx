import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  Location as WorldLocation,
  TagMeta,
  TagCategory,
} from "../types/worldTypes";

const CATEGORY_ORDER: (TagCategory | "")[] = [
  "system",
  "world",
  "location",
  "poi",
  "biome",
  "faction",
  "quest",
  "gameplay",
  "combat",
  "loot",
  "custom",
  "",
];

const CATEGORY_LABEL: Record<TagCategory | "", string> = {
  system: "System",
  world: "World",
  location: "Location",
  poi: "Point of Interest",
  biome: "Biome",
  faction: "Faction",
  quest: "Quest",
  gameplay: "Gameplay",
  combat: "Combat",
  loot: "Loot",
  custom: "Custom",
  "": "Uncategorized",
};

const CATEGORY_COLOR: Record<TagCategory | "", string> = {
  system: "#ef4444",
  world: "#3b82f6",
  location: "#22c55e",
  poi: "#f59e0b",
  biome: "#14b8a6",
  faction: "#a855f7",
  quest: "#eab308",
  gameplay: "#22c55e",
  combat: "#dc2626",
  loot: "#f97316",
  custom: "#6b7280",
  "": "#666666",
};

type Props = {
  locations: WorldLocation[];
  tagMeta: Record<string, TagMeta>;
  onUpdateTagMeta: (tag: string, patch: Partial<TagMeta>) => void;
  onRenameTag: (from: string, to: string) => void;
  onMergeTag: (from: string, to: string) => void;
  onDeleteTag: (tag: string) => void;
};

export function TagsEditor({
  locations,
  tagMeta,
  onUpdateTagMeta,
  onRenameTag,
  onMergeTag,
  onDeleteTag,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>(""); // canonical key (lowercase)
  const [renameTo, setRenameTo] = useState("");
  const [mergeTo, setMergeTo] = useState("");

  // keyboard nav (tag list)
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const tagRowRefs = useRef(new Map<string, HTMLButtonElement | null>());

  // Build tag list + counts (case-insensitive grouping, but display first-seen casing)
  const tagStats = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();

    for (const loc of locations) {
      for (const t of loc.tags ?? []) {
        const key = t.trim().toLowerCase();
        if (!key) continue;

        const prev = map.get(key);
        if (prev) prev.count += 1;
        else map.set(key, { label: t.trim(), count: 1 });
      }
    }

    // sorted by count desc then alpha
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      });
  }, [locations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tagStats;
    return tagStats.filter(
      (t) => t.label.toLowerCase().includes(q) || t.key.includes(q)
    );
  }, [search, tagStats]);

  type TagRow = { key: string; label: string; count: number };
  type TagGroup = { category: TagCategory | ""; items: TagRow[] };

  const grouped = useMemo((): TagGroup[] => {
    const buckets = new Map<TagCategory | "", TagRow[]>();

    for (const t of filtered) {
      const cat = (tagMeta[t.key]?.category ?? "") as TagCategory | "";
      const arr = buckets.get(cat) ?? [];
      arr.push(t);
      buckets.set(cat, arr);
    }

    const out: TagGroup[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = buckets.get(cat);
      if (!items || items.length === 0) continue;

      items.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      });

      out.push({ category: cat, items });
    }

    return out;
  }, [filtered, tagMeta]);

  // current selected tag object (based on key)
  const selected = useMemo(() => {
    if (!selectedTag) return null;
    const k = selectedTag.trim().toLowerCase();
    return tagStats.find((t) => t.key === k) ?? null;
  }, [selectedTag, tagStats]);

  const meta: TagMeta = selected ? tagMeta[selected.key] ?? {} : {};

  function selectTag(tagKey: string) {
    setSelectedTag(tagKey.trim().toLowerCase());
    setRenameTo("");
    setMergeTo("");
  }

  function onTagListKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => {
        const next = prev < 0 ? 0 : (prev + 1) % filtered.length;
        return next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => {
        const next =
          prev < 0
            ? filtered.length - 1
            : (prev - 1 + filtered.length) % filtered.length;
        return next;
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const idx = activeIdx < 0 ? 0 : activeIdx;
      const t = filtered[idx];
      if (!t) return;
      selectTag(t.key);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setActiveIdx(-1);
    }
  }

  function handleRename() {
    if (!selected) return;
    const from = selected.label.trim();
    const to = renameTo.trim();
    if (!to) return;
    if (from.toLowerCase() === to.toLowerCase()) return;

    onRenameTag(from, to);
    setSelectedTag(to.toLowerCase());
    setRenameTo("");
    setMergeTo("");
  }

  function handleMerge() {
    if (!selected) return;
    const from = selected.label.trim();
    const to = mergeTo.trim();
    if (!to) return;
    if (from.toLowerCase() === to.toLowerCase()) return;

    onMergeTag(from, to);
    setSelectedTag(to.toLowerCase());
    setMergeTo("");
    setRenameTo("");
  }

  function handleDelete() {
    if (!selected) return;
    const kill = selected.label.trim();
    if (!kill) return;

    const ok = confirm(
      `Delete tag "${kill}" everywhere? This cannot be undone.`
    );
    if (!ok) return;

    onDeleteTag(kill);

    setSelectedTag("");
    setRenameTo("");
    setMergeTo("");
    setActiveIdx(-1);
  }

  return (
    <section className="owt-panel owt-panel-lifted" style={{ marginTop: 24 }}>
      {/* Heading first, like the other tabs */}
      <h2 style={{ marginTop: 0 }}>Tags</h2>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setActiveIdx(-1);
        }}
        placeholder="Search tags…"
        style={{ width: "100%", marginBottom: 14 }}
      />

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: tag list */}
        <div
          className="owt-subpanel"
          tabIndex={0}
          onKeyDown={onTagListKeyDown}
          onMouseDown={(e) => (e.currentTarget as HTMLDivElement).focus()}
          style={{
            flex: 1,
            minWidth: 260,
            padding: 12,
            outline: "none",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
            {tagStats.length} unique tag{tagStats.length === 1 ? "" : "s"}
          </div>

          {filtered.length === 0 ? (
            <div style={{ opacity: 0.7, fontSize: 14 }}>
              No tags match your search
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grouped.map((g) => (
                <div key={g.category || "uncat"} style={{ marginBottom: 6 }}>
                  {/* Group header */}
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.08,
                      opacity: 0.8,
                      margin: "6px 0 4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{CATEGORY_LABEL[g.category]}</span>
                    <span style={{ opacity: 0.7 }}>{g.items.length}</span>
                  </div>

                  {/* Group items */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {g.items.map((t) => {
                      const idx = filtered.findIndex((x) => x.key === t.key);
                      const isSelected = selected?.key === t.key;
                      const isActive = idx === activeIdx;

                      return (
                        <button
                          key={t.key}
                          ref={(el) => {
                            tagRowRefs.current.set(t.key, el);
                          }}
                          onClick={() => {
                            setActiveIdx(idx);
                            selectTag(t.key);
                          }}
                          style={{
                            textAlign: "left",
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: isSelected
                              ? "1px solid #e5e7eb"
                              : isActive
                              ? "1px solid #9ca3af"
                              : "1px solid #4b5563",
                            background: isSelected
                              ? "rgba(59,130,246,0.25)"
                              : isActive
                              ? "rgba(55,65,81,0.9)"
                              : "transparent",
                            color: "#e5e7eb",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            fontSize: 13,
                            transition:
                              "background 120ms ease, border 120ms ease, transform 100ms ease",
                          }}
                          aria-selected={isSelected}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                background: CATEGORY_COLOR[g.category],
                                display: "inline-block",
                              }}
                            />
                            {t.label}
                          </span>

                          <span style={{ opacity: 0.8, fontSize: 12 }}>
                            {t.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: details */}
        <div
          className="owt-subpanel"
          style={{
            flex: 1,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
            Selected
          </div>

          {selected ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {selected.label}
              </div>

              <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                Used {selected.count} time
                {selected.count === 1 ? "" : "s"}
              </div>

              {/* Description */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  Description
                </div>
                <input
                  value={meta.description ?? ""}
                  onChange={(e) =>
                    onUpdateTagMeta(selected.key, {
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what this tag means…"
                  style={{ width: "100%" }}
                />
              </div>

              {/* Category */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  Category
                </div>
                <select
                  value={meta.category ?? ""}
                  onChange={(e) => {
                    const nextCategory = (e.target.value || undefined) as
                      | TagCategory
                      | undefined;

                    const nextColor =
                      meta.color && meta.color.trim()
                        ? undefined
                        : nextCategory
                        ? CATEGORY_COLOR[nextCategory]
                        : undefined;

                    onUpdateTagMeta(selected.key, {
                      category: nextCategory,
                      ...(nextColor ? { color: nextColor } : {}),
                    });
                  }}
                  style={{ width: "100%" }}
                >
                  <option value="">(none)</option>
                  <option value="system">system</option>
                  <option value="world">world</option>
                  <option value="location">location</option>
                  <option value="poi">poi</option>
                  <option value="biome">biome</option>
                  <option value="faction">faction</option>
                  <option value="quest">quest</option>
                  <option value="gameplay">gameplay</option>
                  <option value="combat">combat</option>
                  <option value="loot">loot</option>
                  <option value="custom">custom</option>
                </select>
              </div>

              {/* Color */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  Color
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={meta.color ?? ""}
                    onChange={(e) =>
                      onUpdateTagMeta(selected.key, { color: e.target.value })
                    }
                    placeholder="#22c55e"
                    style={{ flex: 1 }}
                  />
                  <div
                    title={meta.color ?? ""}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      border: "1px solid #4b5563",
                      background: meta.color ?? "transparent",
                    }}
                  />
                </div>
              </div>

              {/* Rename */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  Rename tag
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={renameTo}
                    onChange={(e) => setRenameTo(e.target.value)}
                    placeholder="New name…"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={handleRename}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #4b5563",
                      background: "transparent",
                      color: "#e5e7eb",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontSize: 13,
                    }}
                  >
                    Rename
                  </button>
                </div>
              </div>

              {/* Merge */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  Merge into another tag
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={mergeTo}
                    onChange={(e) => setMergeTo(e.target.value)}
                    placeholder="Target tag…"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={handleMerge}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #4b5563",
                      background: "transparent",
                      color: "#e5e7eb",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontSize: 13,
                    }}
                  >
                    Merge
                  </button>
                </div>
                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
                  Merge will move all uses of the selected tag into the target
                  tag.
                </div>
              </div>

              {/* Delete */}
              <div style={{ marginTop: 18 }}>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: "10px 14px",
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
                    e.currentTarget.style.transform =
                      "translateY(-1px) scale(1)";
                  }}
                >
                  Delete everywhere
                </button>
              </div>
            </>
          ) : (
            <div style={{ opacity: 0.7, fontSize: 14 }}>
              Select a tag on the left to rename/merge/delete it.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
