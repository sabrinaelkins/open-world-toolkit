import { useMemo, useRef, useState, useLayoutEffect, useCallback } from "react";
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

const inputClass =
  "w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors";
const fieldLabelClass = "text-xs text-slate-400 mb-1.5 uppercase tracking-wide";

type Props = {
  locations: WorldLocation[];
  tagMeta: Record<string, TagMeta>;
  onUpdateTagMeta: (tag: string, patch: Partial<TagMeta>) => void;
  onRenameTag: (from: string, to: string) => void;
  onMergeTag: (from: string, to: string) => void;
  onDeleteTag: (tag: string) => void;
};

type TagRow = { key: string; label: string; count: number };
type TagGroup = { category: TagCategory | ""; items: TagRow[] };

export function TagsEditor({
  locations,
  tagMeta,
  onUpdateTagMeta,
  onRenameTag,
  onMergeTag,
  onDeleteTag,
}: Props) {
  const norm = useCallback((s: string) => s.trim().toLowerCase(), []);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [mergeTo, setMergeTo] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const tagRowRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const tagStats = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const loc of locations)
      for (const t of loc.tags ?? []) {
        const raw = t.trim();
        const key = norm(raw);
        if (!key) continue;
        const prev = map.get(key);
        if (prev) prev.count += 1;
        else map.set(key, { label: raw, count: 1 });
      }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [locations, norm]);

  const labelByKey = useMemo(() => {
    const m = new Map<string, string>();
    tagStats.forEach((t) => m.set(t.key, t.label));
    return m;
  }, [tagStats]);

  const filtered = useMemo(() => {
    const q = norm(search);
    if (!q) return tagStats;
    return tagStats.filter(
      (t) => t.label.toLowerCase().includes(q) || t.key.includes(q),
    );
  }, [search, tagStats, norm]);

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
      if (!items?.length) continue;
      items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      out.push({ category: cat, items });
    }
    return out;
  }, [filtered, tagMeta]);

  const keysInVisualOrder = useMemo(
    () => grouped.flatMap((g) => g.items.map((t) => t.key)),
    [grouped],
  );
  const idxByKey = useMemo(() => {
    const m = new Map<string, number>();
    keysInVisualOrder.forEach((k, i) => m.set(k, i));
    return m;
  }, [keysInVisualOrder]);
  const safeActiveKey = useMemo(
    () => (activeKey && idxByKey.has(activeKey) ? activeKey : null),
    [activeKey, idxByKey],
  );

  useLayoutEffect(() => {
    if (!safeActiveKey) return;
    tagRowRefs.current.get(safeActiveKey)?.scrollIntoView({ block: "nearest" });
  }, [safeActiveKey]);

  const selected = useMemo(() => {
    if (!selectedTag) return null;
    return tagStats.find((t) => t.key === norm(selectedTag)) ?? null;
  }, [selectedTag, tagStats, norm]);

  const meta: TagMeta = selected ? (tagMeta[selected.key] ?? {}) : {};

  const selectTag = useCallback(
    (tagKey: string) => {
      const k = norm(tagKey);
      setSelectedTag(k);
      setActiveKey(k);
      setRenameTo("");
      setMergeTo("");
    },
    [norm],
  );

  const moveActive = useCallback(
    (dir: -1 | 1) => {
      if (keysInVisualOrder.length === 0) return;
      setActiveKey((prev) => {
        if (!prev)
          return dir === 1
            ? keysInVisualOrder[0]
            : keysInVisualOrder[keysInVisualOrder.length - 1];
        const curIdx = idxByKey.get(prev);
        if (curIdx == null)
          return dir === 1
            ? keysInVisualOrder[0]
            : keysInVisualOrder[keysInVisualOrder.length - 1];
        return (
          keysInVisualOrder[
            Math.max(0, Math.min(curIdx + dir, keysInVisualOrder.length - 1))
          ] ?? prev
        );
      });
    },
    [idxByKey, keysInVisualOrder],
  );

  function onTagListKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!keysInVisualOrder.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      moveActive(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const key = safeActiveKey ?? keysInVisualOrder[0] ?? null;
      if (key) selectTag(key);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setActiveKey(null);
      return;
    }
  }

  function handleRename() {
    if (!selected) return;
    const to = renameTo.trim();
    if (!to || selected.label.toLowerCase() === to.toLowerCase()) return;
    onRenameTag(selected.label.trim(), to);
    const k = norm(to);
    setSelectedTag(k);
    setActiveKey(k);
    setRenameTo("");
    setMergeTo("");
  }

  function handleMerge() {
    if (!selected) return;
    const to = mergeTo.trim();
    if (!to || selected.label.toLowerCase() === to.toLowerCase()) return;
    onMergeTag(selected.label.trim(), to);
    const k = norm(to);
    setSelectedTag(k);
    setActiveKey(k);
    setMergeTo("");
    setRenameTo("");
  }

  function handleDelete() {
    if (!selected) return;
    const kill = selected.label.trim();
    if (!kill) return;
    onDeleteTag(kill);
    setSelectedTag("");
    setRenameTo("");
    setMergeTo("");
    setActiveKey(null);
  }

  return (
    <section className="owt-panel owt-panel-lifted mt-6">
      <h2 className="text-xl font-bold text-slate-100 mb-5 mt-0">Tags</h2>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setActiveKey(null);
        }}
        placeholder="Search tags…"
        className={`${inputClass} mb-4`}
      />

      <div className="flex gap-4 items-start">
        {/* ── LEFT: tag list ── */}
        <div
          className="owt-subpanel flex-1 min-w-[240px] outline-none"
          tabIndex={0}
          onKeyDown={onTagListKeyDown}
          onMouseDown={(e) => (e.currentTarget as HTMLDivElement).focus()}
          onFocus={() => {
            if (!activeKey && selected?.key) setActiveKey(selected.key);
          }}
          onBlur={() => setActiveKey(null)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">
              {tagStats.length} unique tag{tagStats.length === 1 ? "" : "s"}
            </span>
            {safeActiveKey && (
              <span className="text-xs text-slate-400">
                Active:{" "}
                <strong className="text-slate-200">
                  {labelByKey.get(safeActiveKey) ?? safeActiveKey}
                </strong>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Use ↑ ↓ to move, Enter to select, Esc to clear
          </p>

          {filtered.length === 0 ? (
            <p className="text-slate-500 text-sm">No tags match your search.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {grouped.map((g) => (
                <div key={g.category || "uncat"}>
                  <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider mb-2">
                    <span>{CATEGORY_LABEL[g.category]}</span>
                    <span>{g.items.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {g.items.map((t) => {
                      const isSelected = selected?.key === t.key;
                      const isActive = t.key === safeActiveKey;
                      return (
                        <button
                          key={t.key}
                          ref={(el) => {
                            if (el) tagRowRefs.current.set(t.key, el);
                            else tagRowRefs.current.delete(t.key);
                          }}
                          onClick={() => selectTag(t.key)}
                          className={[
                            "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left border transition-all",
                            isSelected
                              ? "border-slate-300 bg-blue-500/20 text-slate-100"
                              : isActive
                                ? "border-slate-500 bg-slate-700/90 text-slate-100 translate-x-0.5"
                                : "border-slate-700 bg-transparent text-slate-300 hover:bg-slate-700/40 hover:border-slate-500",
                          ].join(" ")}
                          aria-selected={isSelected}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full flex-none"
                              style={{ background: CATEGORY_COLOR[g.category] }}
                            />
                            {t.label}
                          </span>
                          <span className="text-xs text-slate-400">
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

        {/* ── RIGHT: details panel ── */}
        <div className="owt-subpanel flex-1">
          <div className={`${fieldLabelClass} mb-3`}>Selected</div>

          {selected ? (
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-lg font-bold text-slate-100">
                  {selected.label}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Used {selected.count} time{selected.count === 1 ? "" : "s"}
                </div>
              </div>

              {/* Description */}
              <label className="block">
                <div className={fieldLabelClass}>Description</div>
                <input
                  value={meta.description ?? ""}
                  onChange={(e) =>
                    onUpdateTagMeta(selected.key, {
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what this tag means…"
                  className={inputClass}
                />
              </label>

              {/* Category */}
              <label className="block">
                <div className={fieldLabelClass}>Category</div>
                <select
                  value={meta.category ?? ""}
                  onChange={(e) => {
                    const nextCategory = (e.target.value || undefined) as
                      | TagCategory
                      | undefined;
                    const nextColor = meta.color?.trim()
                      ? undefined
                      : nextCategory
                        ? CATEGORY_COLOR[nextCategory]
                        : undefined;
                    onUpdateTagMeta(selected.key, {
                      category: nextCategory,
                      ...(nextColor ? { color: nextColor } : {}),
                    });
                  }}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">(none)</option>
                  {(
                    [
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
                    ] as TagCategory[]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              {/* Color */}
              <label className="block">
                <div className={fieldLabelClass}>Color</div>
                <div className="flex gap-2 items-center">
                  <input
                    value={meta.color ?? ""}
                    onChange={(e) =>
                      onUpdateTagMeta(selected.key, { color: e.target.value })
                    }
                    placeholder="#22c55e"
                    className={`${inputClass} flex-1`}
                  />
                  <div
                    className="w-7 h-7 rounded-lg border border-slate-600 flex-none"
                    style={{ background: meta.color ?? "transparent" }}
                  />
                </div>
              </label>

              {/* Rename */}
              <div>
                <div className={fieldLabelClass}>Rename tag</div>
                <div className="flex gap-2">
                  <input
                    value={renameTo}
                    onChange={(e) => setRenameTo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename();
                    }}
                    placeholder="New name…"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    onClick={handleRename}
                    className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-300 text-sm font-medium hover:border-slate-400 transition-colors whitespace-nowrap"
                  >
                    Rename
                  </button>
                </div>
              </div>

              {/* Merge */}
              <div>
                <div className={fieldLabelClass}>Merge into</div>
                <div className="flex gap-2">
                  <input
                    value={mergeTo}
                    onChange={(e) => setMergeTo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleMerge();
                    }}
                    placeholder="Target tag…"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    onClick={handleMerge}
                    className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-300 text-sm font-medium hover:border-slate-400 transition-colors whitespace-nowrap"
                  >
                    Merge
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Moves all uses of this tag into the target tag.
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={handleDelete}
                className="w-fit px-4 py-2 rounded-lg border border-red-400/50 text-red-300 text-sm font-semibold bg-transparent hover:bg-red-500/10 hover:border-red-400 hover:shadow-[0_0_12px_rgba(248,113,113,0.3)] transition-all mt-2"
              >
                🗑 Delete everywhere
              </button>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">
              Select a tag on the left to rename/merge/delete it.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
