import { useState } from "react";
import type {
  Quest,
  QuestType,
  QuestStatus,
  QuestObjective,
  Npc,
  Location,
} from "../types/worldTypes";

const QUEST_TYPES: QuestType[] = ["main", "side", "daily", "hidden"];
const QUEST_STATUSES: QuestStatus[] = [
  "draft",
  "active",
  "completed",
  "failed",
];

const TYPE_ICONS: Record<QuestType, string> = {
  main: "⭐",
  side: "📋",
  daily: "🔄",
  hidden: "🔮",
};

const STATUS_COLORS: Record<QuestStatus, string> = {
  draft: "text-slate-400 bg-slate-700/60 border-slate-600",
  active: "text-blue-300 bg-blue-500/10 border-blue-500/40",
  completed: "text-green-300 bg-green-500/10 border-green-500/40",
  failed: "text-red-300 bg-red-500/10 border-red-500/40",
};

const inputClass =
  "w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors";
const labelClass = "text-xs text-slate-400 mb-1.5 uppercase tracking-wide";

type Props = {
  quests: Quest[];
  npcs: Npc[];
  locations: Location[];
  onAddQuest: () => void;
  onUpdateQuest: (questId: string, patch: Partial<Quest>) => void;
  onDeleteQuest: (questId: string) => void;
  onAddObjective: (questId: string) => void;
  onUpdateObjective: (
    questId: string,
    objId: string,
    patch: Partial<QuestObjective>,
  ) => void;
  onDeleteObjective: (questId: string, objId: string) => void;
};

export function QuestsEditor({
  quests,
  npcs,
  locations,
  onAddQuest,
  onUpdateQuest,
  onDeleteQuest,
  onAddObjective,
  onUpdateObjective,
  onDeleteObjective,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = {
    total: quests.length,
    active: quests.filter((q) => q.status === "active").length,
    completed: quests.filter((q) => q.status === "completed").length,
    draft: quests.filter((q) => q.status === "draft").length,
  };

  return (
    <section className="owt-panel owt-panel-lifted mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0">
            📜 Quest Editor
            <span className="ml-2 text-sm font-normal text-slate-400">
              {stats.total} quest{stats.total !== 1 ? "s" : ""}
            </span>
          </h2>
          {stats.total > 0 && (
            <div className="flex gap-3 mt-1.5 text-xs">
              <span className="text-blue-300">{stats.active} active</span>
              <span className="text-green-300">
                {stats.completed} completed
              </span>
              <span className="text-slate-500">{stats.draft} draft</span>
            </div>
          )}
        </div>
        <button onClick={onAddQuest} className="owt-glow-btn">
          + Add Quest
        </button>
      </div>

      {quests.length === 0 && (
        <div className="owt-subpanel flex flex-col items-center gap-3 py-10 text-center">
          <span className="text-4xl">📜</span>
          <p className="text-slate-400 text-sm">No quests yet.</p>
          <p className="text-slate-500 text-xs max-w-xs">
            Create main story quests, side missions, daily tasks and hidden
            secrets.
          </p>
          <button onClick={onAddQuest} className="owt-glow-btn mt-2">
            + Add First Quest
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {quests.map((quest) => {
          const isExpanded = expandedId === quest.id;
          const giver = npcs.find((n) => n.id === quest.giverNpcId);
          const completedObjs = quest.objectives.filter(
            (o) => o.completed,
          ).length;

          return (
            <div key={quest.id} className="owt-subpanel">
              {/* Quest row header — always visible */}
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : quest.id)}
              >
                <span className="text-lg flex-none">
                  {TYPE_ICONS[quest.type]}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100 truncate">
                      {quest.title}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[quest.status]}`}
                    >
                      {quest.status}
                    </span>
                    <span className="text-xs text-slate-500">{quest.type}</span>
                  </div>
                  {quest.objectives.length > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {completedObjs}/{quest.objectives.length} objectives
                      {giver && (
                        <span className="ml-2">· Given by {giver.name}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {quest.objectives.length > 0 && (
                  <div className="w-16 flex-none">
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{
                          width: `${(completedObjs / quest.objectives.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <span className="text-slate-500 text-sm flex-none">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-700 flex flex-col gap-4">
                  {/* Title + Type + Status */}
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block col-span-1">
                      <div className={labelClass}>Title</div>
                      <input
                        value={quest.title}
                        onChange={(e) =>
                          onUpdateQuest(quest.id, { title: e.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <div className={labelClass}>Type</div>
                      <select
                        value={quest.type}
                        onChange={(e) =>
                          onUpdateQuest(quest.id, {
                            type: e.target.value as QuestType,
                          })
                        }
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        {QUEST_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_ICONS[t]} {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <div className={labelClass}>Status</div>
                      <select
                        value={quest.status}
                        onChange={(e) =>
                          onUpdateQuest(quest.id, {
                            status: e.target.value as QuestStatus,
                          })
                        }
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        {QUEST_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Description */}
                  <label className="block">
                    <div className={labelClass}>Description</div>
                    <textarea
                      value={quest.description}
                      onChange={(e) =>
                        onUpdateQuest(quest.id, { description: e.target.value })
                      }
                      placeholder="What is this quest about?"
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </label>

                  {/* Quest giver */}
                  <label className="block">
                    <div className={labelClass}>Quest Giver NPC</div>
                    <select
                      value={quest.giverNpcId ?? ""}
                      onChange={(e) =>
                        onUpdateQuest(quest.id, {
                          giverNpcId: e.target.value || undefined,
                        })
                      }
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">— No giver —</option>
                      {npcs.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} ({n.role.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Objectives */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={labelClass}>Objectives</div>
                      <button
                        onClick={() => onAddObjective(quest.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-blue-500/40 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                      >
                        + Add Objective
                      </button>
                    </div>

                    {quest.objectives.length === 0 && (
                      <p className="text-xs text-slate-500 italic">
                        No objectives yet.
                      </p>
                    )}

                    <div className="flex flex-col gap-2">
                      {quest.objectives.map((obj, i) => (
                        <div
                          key={obj.id}
                          className="flex items-start gap-2 group"
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() =>
                              onUpdateObjective(quest.id, obj.id, {
                                completed: !obj.completed,
                              })
                            }
                            className={`flex-none w-5 h-5 mt-2 rounded border-2 transition-all ${
                              obj.completed
                                ? "bg-green-500 border-green-500"
                                : "bg-transparent border-slate-600 hover:border-slate-400"
                            }`}
                          >
                            {obj.completed && (
                              <span className="text-white text-xs flex items-center justify-center w-full h-full">
                                ✓
                              </span>
                            )}
                          </button>

                          {/* Description */}
                          <input
                            value={obj.description}
                            onChange={(e) =>
                              onUpdateObjective(quest.id, obj.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder={`Objective ${i + 1}...`}
                            className={`flex-1 ${inputClass} ${obj.completed ? "line-through text-slate-500" : ""}`}
                          />

                          {/* Location tie-in */}
                          <select
                            value={obj.locationId ?? ""}
                            onChange={(e) =>
                              onUpdateObjective(quest.id, obj.id, {
                                locationId: e.target.value || undefined,
                              })
                            }
                            className="bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-2 text-slate-400 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                            title="Optional location"
                          >
                            <option value="">📍 Any</option>
                            {locations.map((l) => (
                              <option key={l.id} value={l.id}>
                                📍 {l.name}
                              </option>
                            ))}
                          </select>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteObjective(quest.id, obj.id)}
                            className="flex-none text-slate-600 hover:text-red-400 transition-colors mt-2 opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <label className="block">
                    <div className={labelClass}>Notes</div>
                    <textarea
                      value={quest.notes ?? ""}
                      onChange={(e) =>
                        onUpdateQuest(quest.id, { notes: e.target.value })
                      }
                      placeholder="Design notes, rewards, triggers..."
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </label>

                  {/* Delete quest */}
                  <div className="flex justify-end pt-2 border-t border-slate-700">
                    <button
                      onClick={() => onDeleteQuest(quest.id)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold border border-red-400/50 text-red-300 bg-transparent hover:bg-red-500/10 hover:border-red-400 transition-all"
                    >
                      🗑 Delete Quest
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
