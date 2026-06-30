import { useState } from "react";
import { createPortal } from "react-dom";
import type { GameWorldFile } from "../types/worldTypes";
import {
  exportNativeJson,
  exportCsv,
  exportTiled,
  downloadFile,
} from "../types/exportFormats";

type Format = "json" | "csv" | "tiled";

const FORMATS: {
  id: Format;
  label: string;
  icon: string;
  desc: string;
  ext: string;
}[] = [
  {
    id: "json",
    label: "Native JSON",
    icon: "📦",
    desc: "Full world file — reimportable into this editor. Best for saving and sharing.",
    ext: ".json",
  },
  {
    id: "csv",
    label: "CSV Spreadsheet",
    icon: "📊",
    desc: "Flat table of all locations with coordinates, tags and map names. Great for Unity importers, spreadsheets, and data pipelines.",
    ext: ".csv",
  },
  {
    id: "tiled",
    label: "Tiled Map Editor",
    icon: "🗺️",
    desc: "One .tmj file per map with locations as Tiled objects. Compatible with Tiled 1.10+ and most 2D game engines.",
    ext: ".tmj",
  },
];

interface Props {
  world: GameWorldFile;
  onClose: () => void;
}

export function ExportModal({ world, onClose }: Props) {
  const [selected, setSelected] = useState<Format>("json");
  const [exported, setExported] = useState(false);

  function handleExport() {
    const worldName = world.world.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");

    if (selected === "json") {
      downloadFile(
        `${worldName}.json`,
        exportNativeJson(world),
        "application/json",
      );
      setExported(true);
    } else if (selected === "csv") {
      downloadFile(`${worldName}_locations.csv`, exportCsv(world), "text/csv");
      setExported(true);
    } else if (selected === "tiled") {
      const files = exportTiled(world);
      if (files.length === 0) {
        alert("No maps to export.");
        return;
      }
      // Download each map as a separate file with a small delay between them
      files.forEach((f, i) => {
        setTimeout(
          () => downloadFile(f.filename, f.content, "application/json"),
          i * 120,
        );
      });
      setExported(true);
    }
  }

  const fmt = FORMATS.find((f) => f.id === selected)!;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] animate-[fadeIn_120ms_ease]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-slate-950 to-slate-800 border border-slate-700 rounded-2xl p-8 w-[90%] max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-[slideUp_150ms_ease]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💾</span>
            <h2 className="m-0 text-lg font-bold text-slate-100">
              Export World
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Format picker */}
        <div className="flex flex-col gap-3 mb-6">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(f.id);
                setExported(false);
              }}
              className={[
                "flex items-start gap-4 p-4 rounded-xl border text-left transition-all",
                selected === f.id
                  ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  : "border-slate-700 bg-slate-800/40 hover:border-slate-500",
              ].join(" ")}
            >
              <span className="text-2xl flex-none mt-0.5">{f.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-100">
                    {f.label}
                  </span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">
                    {f.ext}
                  </span>
                  {selected === f.id && (
                    <span className="ml-auto text-xs text-blue-400 font-semibold">
                      ✓ Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 m-0 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Stats preview */}
        <div className="flex gap-3 mb-6 p-3 rounded-xl bg-slate-800/60 text-xs text-slate-400">
          <span>
            🗺️ {world.maps.length} map{world.maps.length !== 1 ? "s" : ""}
          </span>
          <span>•</span>
          <span>
            📍 {world.locations.length} location
            {world.locations.length !== 1 ? "s" : ""}
          </span>
          <span>•</span>
          <span>🏷️ {Object.keys(world.tagMeta ?? {}).length} tags</span>
          {selected === "tiled" && (
            <>
              <span>•</span>
              <span className="text-blue-300">
                {world.maps.length} file{world.maps.length !== 1 ? "s" : ""}{" "}
                will download
              </span>
            </>
          )}
        </div>

        {/* Success message */}
        {exported && (
          <div className="mb-4 flex items-center gap-2 text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5">
            <span>✅</span>
            <span>
              {selected === "tiled"
                ? `${world.maps.length} Tiled file${world.maps.length !== 1 ? "s" : ""} downloaded!`
                : `${fmt.label} downloaded!`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-5 py-2 rounded-lg border border-slate-600/50 bg-slate-800/80 text-slate-400 text-sm font-medium hover:bg-slate-700/80 transition-colors"
          >
            Close
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExport();
            }}
            className="px-5 py-2 rounded-lg border-none bg-gradient-to-b from-sky-500 to-blue-600 text-white text-sm font-semibold shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:-translate-y-0.5 transition-all"
          >
            {selected === "tiled"
              ? `Download ${world.maps.length} File${world.maps.length !== 1 ? "s" : ""}`
              : `Download ${fmt.ext}`}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>,
    document.body,
  );
}
