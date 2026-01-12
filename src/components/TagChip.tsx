import type { TagMeta } from "../types/worldTypes";

type Props = {
  tag: string;
  tagMeta?: Record<string, TagMeta>;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
  dim?: boolean;
};

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

export function TagChip({
  tag,
  tagMeta,
  onRemove,
  onClick,
  active,
  dim,
}: Props) {
  const tagKey = normalizeTag(tag);
  const meta = (tagMeta?.[tagKey] ?? {}) as TagMeta;
  const color = meta.color;

  return (
    <span
      onClick={onClick}
      title={meta.description ?? tag}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: active ? "1px solid #eee" : "1px solid #666",
        background: active ? "#3a3a3a" : "transparent",
        color: "#eee",
        cursor: onClick ? "pointer" : "default",
        opacity: dim ? 0.35 : 0.95,
        userSelect: "none",
        transition:
          "opacity 120ms ease, background 120ms ease, border-color 120ms ease",
      }}
      onMouseEnter={(e) => {
        if (!onClick || active) return;
        (e.currentTarget as HTMLSpanElement).style.background = "#2f2f2f";
      }}
      onMouseLeave={(e) => {
        if (!onClick || active) return;
        (e.currentTarget as HTMLSpanElement).style.background = "transparent";
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color ?? "#666666",
          display: "inline-block",
        }}
      />
      <span>{tag}</span>

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove"
          style={{
            border: "none",
            background: "transparent",
            color: "#eee",
            opacity: 0.8,
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
