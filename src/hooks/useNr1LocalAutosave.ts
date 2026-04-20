"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Nr1AutosaveStatus = "idle" | "saving" | "saved" | "error";

export function useNr1LocalAutosave(storageKey: string, initialValue = "") {
  const [value, setValue] = useState<string>(initialValue);
  const [status, setStatus] = useState<Nr1AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) {
        setValue(raw);
      } else {
        setValue(initialValue);
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      mountedRef.current = true;
    }
  }, [storageKey, initialValue]);

  useEffect(() => {
    if (!mountedRef.current) return;

    setStatus("saving");

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, value);
        setLastSavedAt(new Date().toLocaleTimeString());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [storageKey, value]);

  const statusLabel = useMemo(() => {
    if (status === "saving") return "Salvando...";
    if (status === "saved") return lastSavedAt ? `Salvo as ${lastSavedAt}` : "Salvo";
    if (status === "error") return "Erro ao salvar";
    return "Sem alteracoes";
  }, [status, lastSavedAt]);

  return {
    value,
    setValue,
    status,
    lastSavedAt,
    statusLabel,
  };
}
