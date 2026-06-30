import type { Npc, NpcRole, Location, MapData } from "../types/worldTypes";

const NPC_ROLES: NpcRole[] = [
  "villager",
  "merchant",
  "quest_giver",
  "guard",
  "companion",
  "enemy",
  "boss",
  "neutral",
  "custom",
];

const ROLE_ICONS: Record<NpcRole, string> = {
  villager: "🧑",
  merchant: "💰",
  quest_giver: "📜",
  guard: "⚔️",
  companion: "🤝",
  enemy: "💀",
  boss: "👹",
  neutral: "😐",
  custom: "✨",
};

const inputClass =
  "w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors";
const labelClass = "text-xs text-slate-400 mb-1.5 uppercase tracking-wide";

type Props = {
  npcs: Npc[];
  locations: Location[];
  maps: MapData[];
  onAddNpc: () => void;
  onUpdateNpc: (npcId: string, patch: Partial<Npc>) => void;
  onDeleteNpc: (npcId: string) => void;
};

export function NpcsEditor({
  npcs,
  locations,
  maps,
  onAddNpc,
  onUpdateNpc,
  onDeleteNpc,
}: Props) {
  const locationById = new Map(locations.map((l) => [l.id, l]));

  return (
    <section className="owt-panel owt-panel-lifted mt-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-100 m-0">
          🧑 NPC Editor
          <span className="ml-2 text-sm font-normal text-slate-400">
            {npcs.length} NPC{npcs.length !== 1 ? "s" : ""}
          </span>
        </h2>
        <button onClick={onAddNpc} className="owt-glow-btn">
          + Add NPC
        </button>
      </div>

      {npcs.length === 0 && (
        <div className="owt-subpanel flex flex-col items-center gap-3 py-10 text-center">
          <span className="text-4xl">🧑</span>
          <p className="text-slate-400 text-sm">No NPCs yet.</p>
          <p className="text-slate-500 text-xs max-w-xs">
            Add NPCs to populate your world with merchants, quest givers, guards
            and more.
          </p>
          <button onClick={onAddNpc} className="owt-glow-btn mt-2">
            + Add First NPC
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {npcs.map((npc) => {
          const loc = locationById.get(npc.locationId);
          return (
            <div key={npc.id} className="owt-subpanel">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ROLE_ICONS[npc.role]}</span>
                  <span className="font-semibold text-slate-100">
                    {npc.name}
                  </span>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {npc.role.replace("_", " ")}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteNpc(npc.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-400/50 text-red-300 bg-transparent hover:bg-red-500/10 hover:border-red-400 transition-all"
                >
                  Delete
                </button>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="block">
                  <div className={labelClass}>Name</div>
                  <input
                    value={npc.name}
                    onChange={(e) =>
                      onUpdateNpc(npc.id, { name: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <div className={labelClass}>Role</div>
                  <select
                    value={npc.role}
                    onChange={(e) =>
                      onUpdateNpc(npc.id, { role: e.target.value as NpcRole })
                    }
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {NPC_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_ICONS[r]} {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="block">
                  <div className={labelClass}>Home Location</div>
                  <select
                    value={npc.locationId}
                    onChange={(e) => {
                      const loc = locations.find(
                        (l) => l.id === e.target.value,
                      );
                      onUpdateNpc(npc.id, {
                        locationId: e.target.value,
                        mapId: loc?.mapId ?? npc.mapId,
                      });
                    }}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">— Unassigned —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <div className={labelClass}>Map</div>
                  <div className="text-sm text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700">
                    {loc
                      ? (maps.find((m) => m.id === loc.mapId)?.name ??
                        "Unknown map")
                      : "—"}
                  </div>
                </div>
              </div>

              <label className="block mb-3">
                <div className={labelClass}>Intro Dialogue</div>
                <input
                  value={npc.dialogue ?? ""}
                  onChange={(e) =>
                    onUpdateNpc(npc.id, { dialogue: e.target.value })
                  }
                  placeholder="What do they say when you talk to them?"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <div className={labelClass}>Notes</div>
                <textarea
                  value={npc.notes ?? ""}
                  onChange={(e) =>
                    onUpdateNpc(npc.id, { notes: e.target.value })
                  }
                  placeholder="Design notes, backstory, behaviour..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
