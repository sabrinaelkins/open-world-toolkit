import type { TagMeta } from "../types/worldTypes";

type Props = {
  tag: string;
  tagMeta?: Record<string, TagMeta>;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
};

export function TagChip({ tag, tagMeta, onRemove, onClick, active }: Props) {
  const key = tag.trim().toLowerCase();
  const meta = (tagMeta?.[key] ?? {}) as TagMeta;
  const color = meta.color;

  return (
<span
  onClick={onClick}
  title={meta.description ?? tag}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = `0 0 10px ${color}aa`;
    e.currentTarget.style.transform = "translateY(-2px)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.transform = "none";
  }}
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: active ? `1px solid ${color}` : "1px solid #666",
    background: active ? color + "22" : "transparent",
    color: "#eee",
    cursor: onClick ? "pointer" : "default",
    opacity: active ? 1 : 0.95,
    userSelect: "none",
    transition: "all 150ms ease",
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
