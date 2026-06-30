import { useState, useCallback, useEffect } from "react";
import type { ModalConfig } from "../components/Modal";

export function useModal() {
  const [config, setConfig] = useState<ModalConfig | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (config) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [config]);

  const closeModal = useCallback(() => setConfig(null), []);

  const confirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      options?: { confirmLabel?: string; cancelLabel?: string },
    ) => {
      setConfig({
        variant: "confirm",
        title,
        message,
        onConfirm,
        confirmLabel: options?.confirmLabel,
        cancelLabel: options?.cancelLabel,
      });
    },
    [],
  );

  const success = useCallback((title: string, message: string) => {
    setConfig({ variant: "success", title, message });
  }, []);

  const error = useCallback((title: string, message: string) => {
    setConfig({ variant: "error", title, message });
  }, []);

  return { config, closeModal, confirm, success, error };
}
