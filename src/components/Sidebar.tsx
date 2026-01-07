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
        borderRight: "1px solid #444",
        padding: 16,
        height: "100vh",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 16 }}>Open World Toolkit</h2>

      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => setActiveTab(key)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "10px 12px",
            marginBottom: 8,
            borderRadius: 10,
            border: "1px solid #666",
            background: "transparent",
            color: "#eee",
            cursor: "pointer",
            opacity: activeTab === key ? 1 : 0.8,
          }}
        >
          {activeTab === key ? "▶ " : ""}
          {label}
        </button>
      ))}
    </aside>
  );
}
