import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Location as WorldLocation } from "../types/worldTypes";

type TagMeta = { description?: string; category?: string; color?: string };
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
  const [selectedTag, setSelectedTag] = useState<string>(""); // stores canonical key (lowercase)
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

  // current selected tag object (based on key)
  const selected = useMemo(() => {
    if (!selectedTag) return null;
    const k = selectedTag.trim().toLowerCase();
    return tagStats.find((t) => t.key === k) ?? null;
  }, [selectedTag, tagStats]);

  const meta = selected ? tagMeta[selected.key] ?? {} : {};

  function focusActiveRow(key: string) {
    const el = tagRowRefs.current.get(key);
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function selectTag(tagKey: string) {
    setSelectedTag(tagKey.trim().toLowerCase()); // store canonical key
    setRenameTo("");
    setMergeTo("");
  }

  function onTagListKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => {
        const next = prev < 0 ? 0 : (prev + 1) % filtered.length;
        focusActiveRow(filtered[next].key);
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
        focusActiveRow(filtered[next].key);
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

    // keep renamed tag selected (by key)
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

    // select the target tag
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
    <section
      style={{
        marginTop: 16,
        padding: 16,
        border: "1px solid #444",
        borderRadius: 8,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Tags</h2>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setActiveIdx(-1);
        }}
        placeholder="Search tags…"
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "1px solid #666",
          background: "#333",
          color: "#eee",
          marginBottom: 12,
        }}
      />

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Left: tag list */}
        <div
          tabIndex={0}
          onKeyDown={onTagListKeyDown}
          onMouseDown={(e) => (e.currentTarget as HTMLDivElement).focus()}
          style={{
            flex: 1,
            minWidth: 260,
            border: "1px solid #555",
            borderRadius: 8,
            padding: 10,
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
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map((t, idx) => {
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
                      padding: "10px 10px",
                      borderRadius: 8,
                      border: isSelected
                        ? "1px solid #eee"
                        : isActive
                        ? "1px solid #aaa"
                        : "1px solid #666",
                      background: isSelected
                        ? "#3a3a3a"
                        : isActive
                        ? "#2f2f2f"
                        : "transparent",
                      color: "#eee",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                    aria-selected={isSelected}
                  >
                    <span>{t.label}</span>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div
          style={{
            flex: 1,
            border: "1px solid #555",
            borderRadius: 8,
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

              {/* Tag Descriptions */}
              <div style={{ marginTop: 6, opacity: 0.8 }}>
                Used {selected.count} time{selected.count === 1 ? "" : "s"}
              </div>
              <input
                value={meta.description ?? ""}
                onChange={(e) =>
                  onUpdateTagMeta(selected.key, { description: e.target.value })
                }
                placeholder="Describe what this tag means…"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #666",
                  background: "#333",
                  color: "#eee",
                }}
              />

              {/* Rename */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                  Rename tag
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={renameTo}
                    onChange={(e) => setRenameTo(e.target.value)}
                    placeholder="New name…"
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #666",
                      background: "#333",
                      color: "#eee",
                    }}
                  />
                  <button
                    onClick={handleRename}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #666",
                      background: "transparent",
                      color: "#eee",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Rename
                  </button>
                </div>
              </div>

              {/* Merge */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                  Merge into another tag
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={mergeTo}
                    onChange={(e) => setMergeTo(e.target.value)}
                    placeholder="Target tag…"
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #666",
                      background: "#333",
                      color: "#eee",
                    }}
                  />
                  <button
                    onClick={handleMerge}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #666",
                      background: "transparent",
                      color: "#eee",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
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
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #666",
                    background: "transparent",
                    color: "#eee",
                    cursor: "pointer",
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
