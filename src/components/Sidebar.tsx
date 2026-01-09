type TabKey = "world" | "maps" | "locations" | "tags" | "preview";

type Props = {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
};

export function Sidebar({ activeTab, setActiveTab }: Props) {
  const tabs: Array<[TabKey, string]> = [
    ["world", "World"],
    ["maps", "Maps"],
    ["locations", "Locations"],
    ["tags", "Tags"],
    ["preview", "Preview"],
  ];

  return (
    <aside
      style={{
        width: 220,
        padding: 16,
        background: "linear-gradient(to bottom, #020617, #020617)",
        borderRight: "1px solid rgba(15,23,42,0.9)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.6)",
        position: "relative",
        zIndex: 2, // stay above moving grid
      }}
    >
      <h2
        style={{
          marginTop: 4,
          marginBottom: 16,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 0.06,
          color: "#e5e7eb",
        }}
      >
        Open World Toolkit
      </h2>

      {tabs.map(([key, label]) => {
        const isActive = activeTab === key;

        return (
          <div
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: "10px 14px",
              marginBottom: 8,
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              background: isActive
                ? "linear-gradient(90deg, #22d3ee, #3b82f6)"
                : "rgba(15,23,42,0.9)",
              color: isActive ? "#0b1120" : "#e5e7eb",
              border: isActive
                ? "1px solid rgba(59,130,246,0.9)"
                : "1px solid rgba(30,64,175,0.7)",
              transition:
                "background 150ms ease, transform 120ms ease, border 150ms ease, box-shadow 150ms ease",
              transform: isActive ? "translateX(2px)" : "none",
              boxShadow: isActive
                ? "0 0 0 1px rgba(56,189,248,0.6), 0 10px 24px rgba(15,23,42,0.9)"
                : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "rgba(30,64,175,0.75)";
                e.currentTarget.style.transform = "translateX(2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "rgba(15,23,42,0.9)";
                e.currentTarget.style.transform = "none";
              }
            }}
          >
            {label}
          </div>
        );
      })}
    </aside>
  );
}