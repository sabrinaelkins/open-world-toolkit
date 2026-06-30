import { useEffect } from "react";
import { createPortal } from "react-dom";

// --------------------------------------------------------------
// Types
// --------------------------------------------------------------
export type ModalVariant = "confirm" | "success" | "error";

export interface ModalConfig {
  variant: ModalVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface Props {
  config: ModalConfig | null;
  onClose: () => void;
}

// --------------------------------------------------------------
// Variant config
// --------------------------------------------------------------
const variantConfig = {
  confirm: {
    icon: "⚠️",
    titleClass: "text-amber-400",
    borderClass: "border-amber-400/20",
    shadowClass:
      "shadow-[0_0_40px_rgba(251,191,36,0.1),0_20px_60px_rgba(0,0,0,0.8)]",
    btnClass: "bg-red-600 hover:bg-red-700",
  },
  success: {
    icon: "✅",
    titleClass: "text-green-400",
    borderClass: "border-green-400/20",
    shadowClass:
      "shadow-[0_0_40px_rgba(34,197,94,0.1),0_20px_60px_rgba(0,0,0,0.8)]",
    btnClass: "bg-green-600 hover:bg-green-700",
  },
  error: {
    icon: "❌",
    titleClass: "text-red-400",
    borderClass: "border-red-400/20",
    shadowClass:
      "shadow-[0_0_40px_rgba(239,68,68,0.1),0_20px_60px_rgba(0,0,0,0.8)]",
    btnClass: "bg-red-600 hover:bg-red-700",
  },
} as const;

// --------------------------------------------------------------
// Component
// --------------------------------------------------------------
export function Modal({ config, onClose }: Props) {
  useEffect(() => {
    if (!config) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config, onClose]);

  if (!config) return null;

  const v = variantConfig[config.variant];
  const isConfirm = config.variant === "confirm";

  function handleConfirm() {
    config?.onConfirm?.();
    onClose();
  }

  function handleCancel() {
    config?.onCancel?.();
    onClose();
  }

  return createPortal(
    <div
      onClick={handleCancel}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] animate-[fadeIn_120ms_ease]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={[
          "bg-gradient-to-br from-slate-950 to-slate-800 border rounded-2xl p-8 w-[90%] max-w-md",
          "animate-[slideUp_150ms_ease]",
          v.borderClass,
          v.shadowClass,
        ].join(" ")}
      >
        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{v.icon}</span>
          <h2 className={`m-0 text-lg font-bold ${v.titleClass}`}>
            {config.title}
          </h2>
        </div>

        {/* Message */}
        <p className="text-slate-400 text-sm leading-relaxed mb-7">
          {config.message}
        </p>

        {/* Buttons */}
        <div className="flex gap-2.5 justify-end">
          {isConfirm && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="px-5 py-2 rounded-lg border border-slate-600/50 bg-slate-800/80 text-slate-400 text-sm font-medium hover:bg-slate-700/80 transition-colors"
            >
              {config.cancelLabel ?? "Cancel"}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleConfirm();
            }}
            className={`px-5 py-2 rounded-lg border-none text-white text-sm font-semibold transition-colors ${v.btnClass}`}
          >
            {config.confirmLabel ?? (isConfirm ? "Confirm" : "OK")}
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
