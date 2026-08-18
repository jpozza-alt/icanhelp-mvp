"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Nr1JourneyProgressState } from "@/lib/nr1-journey";

export type Nr1JourneyStateResult = Nr1JourneyProgressState & {
  hasJourneyProgress: boolean;
  refresh: () => Promise<void>;
};

type ProbeKey = "diagnosis" | "departments" | "risks" | "actionPlans";

const PROBE_CANDIDATES: Record<ProbeKey, string[]> = {
  diagnosis: [
    "/api/nr1/diagnostico-inicial?limit=1",
    "/api/diagnostico-inicial?limit=1",
    "/api/nr1/initial-diagnosis?limit=1",
    "/api/initial-diagnosis?limit=1",
  ],
  departments: [
    "/api/nr1/departments?limit=1",
    "/api/departments?limit=1",
  ],
  risks: [
    "/api/nr1/risks?limit=1",
    "/api/risks?limit=1",
  ],
  actionPlans: [
    "/api/nr1/action-plans?limit=1",
    "/api/action-plans?limit=1",
  ],
};

const EMPTY_STATE: Nr1JourneyStateResult = {
  hasDiagnosis: false,
  hasDepartments: false,
  hasRisks: false,
  hasActionPlans: false,
  hasJourneyProgress: false,
  isLoading: true,
  error: null,
  refreshedAt: null,
  refresh: async () => undefined,
};

function hasMeaningfulData(payload: unknown): boolean {
  if (Array.isArray(payload)) {
    return payload.length > 0;
  }

  if (typeof payload === "number") {
    return payload > 0;
  }

  if (typeof payload === "boolean") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;
  const numericKeys = ["count", "total", "totalCount", "total_count"];

  for (const key of numericKeys) {
    const value = record[key];
    if (typeof value === "number" && value > 0) {
      return true;
    }
  }

  const collectionKeys = [
    "items",
    "data",
    "rows",
    "results",
    "records",
    "departments",
    "risks",
    "actionPlans",
    "action_plans",
    "diagnoses",
    "diagnosticos",
  ];

  for (const key of collectionKeys) {
    if (key in record && hasMeaningfulData(record[key])) {
      return true;
    }
  }

  const singleRecordKeys = ["id", "tenant_id", "created_at", "updated_at"];
  return singleRecordKeys.some((key) => key in record && record[key] != null);
}

async function probeEndpoints(urls: string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        const rawText = await response.text();
        if (rawText.trim().length > 0 && !rawText.trim().startsWith("<!DOCTYPE")) {
          return true;
        }
        continue;
      }

      const payload = (await response.json()) as unknown;
      if (hasMeaningfulData(payload)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

export function useNr1JourneyState(): Nr1JourneyStateResult {
  const [state, setState] = useState<Nr1JourneyStateResult>(EMPTY_STATE);

  const loadState = useCallback(async function loadState() {
    setState((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    try {
      const [hasDiagnosis, hasDepartments, hasRisks, hasActionPlans] = await Promise.all([
        probeEndpoints(PROBE_CANDIDATES.diagnosis),
        probeEndpoints(PROBE_CANDIDATES.departments),
        probeEndpoints(PROBE_CANDIDATES.risks),
        probeEndpoints(PROBE_CANDIDATES.actionPlans),
      ]);

      const hasJourneyProgress =
        hasDiagnosis || hasDepartments || hasRisks || hasActionPlans;

      setState({
        hasDiagnosis,
        hasDepartments,
        hasRisks,
        hasActionPlans,
        hasJourneyProgress,
        isLoading: false,
        error: null,
        refreshedAt: new Date().toISOString(),
        refresh: loadState,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load NR1 journey state.";
      setState((current) => ({
        ...current,
        isLoading: false,
        error: message,
        refresh: loadState,
      }));
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  return useMemo(
    () => ({
      ...state,
      refresh: loadState,
    }),
    [state, loadState],
  );
}

export default useNr1JourneyState;
