import { useEffect, useRef, useState } from "react";
import { WorldProvider } from "./context/WorldContext";
import { useWorld } from "./context/useWorld";
import { TagsEditor } from "./components/TagsEditor";
import { Sidebar } from "./components/Sidebar";
import { WorldEditor } from "./components/WorldEditor";
import { MapsEditor } from "./components/MapsEditor";
import { LocationsEditor } from "./components/LocationsEditor";
import { PreviewTab } from "./components/PreviewTab";
import { Modal } from "./components/Modal";
import { ExportModal } from "./components/ExportModal";
import { NpcsEditor } from "./components/NpcsEditor";
import { QuestsEditor } from "./components/QuestsEditor";
import { useModal } from "./hooks/useModal";
import { loadGameWorldFile } from "./types/worldIO";

type TabKey =
  | "world"
  | "maps"
  | "locations"
  | "tags"
  | "npcs"
  | "quests"
  | "preview";
const ACTIVE_TAB_STORAGE_KEY = "open_world_toolkit_active_tab";

function AppInner() {
  const {
    syncedWorld,
    locationById,
    errorIssues,
    warningIssues,
    hasErrors,
    dispatch,
    tagSuggestions,
    resetSavedWorld,
  } = useWorld();

  const { config, closeModal, confirm, success, error } = useModal();
  const [showExportModal, setShowExportModal] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (
      saved === "world" ||
      saved === "maps" ||
      saved === "locations" ||
      saved === "tags" ||
      saved === "npcs" ||
      saved === "quests" ||
      saved === "preview"
    )
      return saved;
    return "world";
  });
  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const [tagDraftByLocId, setTagDraftByLocId] = useState<
    Record<string, string>
  >({});
  const [tagFilters, setTagFilters] = useState<string[]>([]);

  // Import
  const importInputRef = useRef<HTMLInputElement | null>(null);
  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const loaded = loadGameWorldFile(parsed);
      dispatch({ type: "LOAD_WORLD", world: loaded });
      setTagFilters([]);
      setTagDraftByLocId({});
      success(
        "Import Successful",
        "Your world file has been loaded successfully.",
      );
    } catch (err) {
      console.error("Import failed:", err);
      error(
        "Import Failed",
        "The file could not be read. Make sure it's a valid world JSON file.",
      );
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        color: "#eee",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Global modal */}
      <Modal config={config} onClose={closeModal} />

      {/* Export modal */}
      {showExportModal && (
        <ExportModal
          world={syncedWorld}
          onClose={() => setShowExportModal(false)}
        />
      )}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportFile(file);
        }}
      />

      <main
        style={{
          flex: 1,
          padding: "48px 32px",
          maxWidth: "1100px",
          margin: "0 auto",
          background: "transparent",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: "32px",
            fontSize: "48px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            color: "#f8faff",
            textShadow: `
              0 0 20px rgba(120,180,255,0.75),
              0 0 40px rgba(120,180,255,0.55),
              0 0 80px rgba(30,100,255,0.35)
            `,
            textAlign: "center",
          }}
        >
          Open World Toolkit (Editor)
        </h1>

        {activeTab === "world" && (
          <>
            <button
              onClick={() =>
                confirm(
                  "Reset World Data",
                  "This will permanently reset all saved world data and cannot be undone. Continue?",
                  () => resetSavedWorld(),
                  { confirmLabel: "Reset", cancelLabel: "Cancel" },
                )
              }
              style={{ marginBottom: 12 }}
            >
              Reset saved data
            </button>
            <WorldEditor
              world={syncedWorld}
              onUpdateWorld={(patch) =>
                dispatch({ type: "UPDATE_WORLD_INFO", patch })
              }
              onExport={() => {
                if (hasErrors) {
                  error(
                    "Cannot Export",
                    `Fix ${errorIssues.length} error${errorIssues.length > 1 ? "s" : ""} before exporting. Check the Preview tab for details.`,
                  );
                  return;
                }
                setShowExportModal(true);
              }}
              onImportClick={() => importInputRef.current?.click()}
              hasErrors={hasErrors}
              errorCount={errorIssues.length}
              warningCount={warningIssues.length}
            />
          </>
        )}

        {activeTab === "maps" && (
          <MapsEditor
            maps={syncedWorld.maps}
            locations={syncedWorld.locations}
            tagMeta={syncedWorld.tagMeta ?? {}}
            onAddMap={() => dispatch({ type: "ADD_MAP" })}
            onUpdateMap={(mapId, patch) =>
              dispatch({ type: "UPDATE_MAP", mapId, patch })
            }
            onDeleteMap={(mapId) =>
              confirm(
                "Delete Map",
                `Delete map "${mapId}"? All locations on this map will become unassigned.`,
                () => dispatch({ type: "DELETE_MAP", mapId }),
                { confirmLabel: "Delete", cancelLabel: "Cancel" },
              )
            }
            onUpdateLocation={(locId, patch) =>
              dispatch({ type: "UPDATE_LOCATION", locId, patch })
            }
            onAddLocation={() => dispatch({ type: "ADD_LOCATION" })}
          />
        )}

        {activeTab === "locations" && (
          <LocationsEditor
            locations={syncedWorld.locations}
            maps={syncedWorld.maps}
            tagMeta={syncedWorld.tagMeta ?? {}}
            tagFilters={tagFilters}
            setTagFilters={setTagFilters}
            tagDraftByLocId={tagDraftByLocId}
            setTagDraftByLocId={setTagDraftByLocId}
            tagSuggestions={tagSuggestions}
            onAddLocation={() => dispatch({ type: "ADD_LOCATION" })}
            onUpdateLocation={(locId, patch) =>
              dispatch({ type: "UPDATE_LOCATION", locId, patch })
            }
            onDeleteLocation={(locId) =>
              confirm(
                "Delete Location",
                `Delete location "${locId}"? This cannot be undone.`,
                () => dispatch({ type: "DELETE_LOCATION", locId }),
                { confirmLabel: "Delete", cancelLabel: "Cancel" },
              )
            }
            onAddTag={(locId, tag) =>
              dispatch({ type: "ADD_TAG_TO_LOCATION", locId, tag })
            }
            onRemoveTag={(locId, tag) =>
              dispatch({ type: "REMOVE_TAG_FROM_LOCATION", locId, tag })
            }
          />
        )}

        {activeTab === "tags" && (
          <TagsEditor
            locations={syncedWorld.locations}
            tagMeta={syncedWorld.tagMeta ?? {}}
            onUpdateTagMeta={(tag, patch) =>
              dispatch({ type: "UPDATE_TAG_META", tag, patch })
            }
            onRenameTag={(from, to) =>
              dispatch({ type: "RENAME_TAG", from, to })
            }
            onMergeTag={(from, to) =>
              dispatch({ type: "RENAME_TAG", from, to })
            }
            onDeleteTag={(tag) => dispatch({ type: "DELETE_TAG", tag })}
          />
        )}

        {activeTab === "quests" && (
          <QuestsEditor
            quests={syncedWorld.quests ?? []}
            npcs={syncedWorld.npcs ?? []}
            locations={syncedWorld.locations}
            onAddQuest={() => dispatch({ type: "ADD_QUEST" })}
            onUpdateQuest={(questId, patch) =>
              dispatch({ type: "UPDATE_QUEST", questId, patch })
            }
            onDeleteQuest={(questId) =>
              confirm(
                "Delete Quest",
                `Delete "${syncedWorld.quests?.find((q) => q.id === questId)?.title ?? questId}"? This cannot be undone.`,
                () => dispatch({ type: "DELETE_QUEST", questId }),
                { confirmLabel: "Delete", cancelLabel: "Cancel" },
              )
            }
            onAddObjective={(questId) =>
              dispatch({ type: "ADD_OBJECTIVE", questId })
            }
            onUpdateObjective={(questId, objId, patch) =>
              dispatch({ type: "UPDATE_OBJECTIVE", questId, objId, patch })
            }
            onDeleteObjective={(questId, objId) =>
              dispatch({ type: "DELETE_OBJECTIVE", questId, objId })
            }
          />
        )}
        {activeTab === "npcs" && (
          <NpcsEditor
            npcs={syncedWorld.npcs ?? []}
            locations={syncedWorld.locations}
            maps={syncedWorld.maps}
            onAddNpc={() => dispatch({ type: "ADD_NPC" })}
            onUpdateNpc={(npcId, patch) =>
              dispatch({ type: "UPDATE_NPC", npcId, patch })
            }
            onDeleteNpc={(npcId) =>
              confirm(
                "Delete NPC",
                `Delete "${syncedWorld.npcs?.find((n) => n.id === npcId)?.name ?? npcId}"? This cannot be undone.`,
                () => dispatch({ type: "DELETE_NPC", npcId }),
                { confirmLabel: "Delete", cancelLabel: "Cancel" },
              )
            }
          />
        )}

        {activeTab === "preview" && (
          <PreviewTab
            world={syncedWorld}
            locationById={locationById}
            errorIssues={errorIssues}
            warningIssues={warningIssues}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WorldProvider>
      <AppInner />
    </WorldProvider>
  );
}
