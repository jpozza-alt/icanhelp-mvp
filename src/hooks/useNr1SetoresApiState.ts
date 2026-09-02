"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

export type Nr1ApiEntity = Record<string, unknown>;

type ReadyContext = {
  status: "ready";
  context: { tenantId: string; establishmentId: string };
};

type ContextStateLike =
  | ReadyContext
  | { status: "loading" | "error"; context: null };

type ApiSnapshot = {
  departments: Nr1ApiEntity[];
  activities: Nr1ApiEntity[];
  loadedAt: number;
};

export type Nr1SetoresApiState = {
  departments: Nr1ApiEntity[];
  activities: Nr1ApiEntity[];
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

const CACHE_TTL_MS = 5000;
const snapshotCache = new Map<string, ApiSnapshot>();
const requestCache = new Map<string, Promise<ApiSnapshot>>();

const supabaseBrowserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function extractItems(payload: unknown, keys: string[]): Nr1ApiEntity[] {
  if (Array.isArray(payload)) return payload.filter(isEntity);
  if (!isEntity(payload)) return [];

  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isEntity);
  }
  return [];
}

function isEntity(value: unknown): value is Nr1ApiEntity {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function requestCollection(
  path: string,
  tenantId: string,
  establishmentId: string,
  token: string,
  keys: string[]
): Promise<Nr1ApiEntity[]> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("tenantId", tenantId);
  url.searchParams.set("establishmentId", establishmentId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
      "x-icanhelp-tenant": tenantId,
      "x-establishment-id": establishmentId,
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message = isEntity(payload) && typeof payload.message === "string"
      ? payload.message
      : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return extractItems(payload, keys);
}

async function loadSnapshot(tenantId: string, establishmentId: string): Promise<ApiSnapshot> {
  const scopeKey = `${tenantId}:${establishmentId}`;
  const cached = snapshotCache.get(scopeKey);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached;

  const pending = requestCache.get(scopeKey);
  if (pending) return pending;

  const request = (async () => {
    const { data, error } = await supabaseBrowserClient.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token || "";
    if (!token) throw new Error("Sessao autenticada nao encontrada.");

    const [departments, activities] = await Promise.all([
      requestCollection(
        "/api/nr1/departments",
        tenantId,
        establishmentId,
        token,
        ["items", "departments", "data"]
      ),
      requestCollection(
        "/api/nr1/activities",
        tenantId,
        establishmentId,
        token,
        ["items", "activities", "data"]
      ),
    ]);

    const next = { departments, activities, loadedAt: Date.now() };
    snapshotCache.set(scopeKey, next);
    return next;
  })();

  requestCache.set(scopeKey, request);
  try {
    return await request;
  } finally {
    requestCache.delete(scopeKey);
  }
}

export function useNr1SetoresApiState(contextState: ContextStateLike): Nr1SetoresApiState {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<Omit<Nr1SetoresApiState, "refresh">>({
    departments: [],
    activities: [],
    isComplete: false,
    isLoading: true,
    error: null,
  });

  const scopeKey = contextState.status === "ready"
    ? `${contextState.context.tenantId}:${contextState.context.establishmentId}`
    : "";

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (contextState.status !== "ready") {
        setState({
          departments: [],
          activities: [],
          isComplete: false,
          isLoading: contextState.status === "loading",
          error: contextState.status === "error" ? "Contexto NR-1 indisponivel." : null,
        });
        return;
      }

      setState((current) => ({ ...current, isLoading: true, error: null }));
      void loadSnapshot(
        contextState.context.tenantId,
        contextState.context.establishmentId
      ).then((snapshot) => {
        if (cancelled) return;
        setState({
          departments: snapshot.departments,
          activities: snapshot.activities,
          isComplete: snapshot.departments.length > 0 && snapshot.activities.length > 0,
          isLoading: false,
          error: null,
        });
      }).catch((error: unknown) => {
        if (cancelled) return;
        setState({
          departments: [],
          activities: [],
          isComplete: false,
          isLoading: false,
          error: error instanceof Error ? error.message : "Falha ao consultar setores e atividades.",
        });
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [contextState, revision, scopeKey]);

  const refresh = useCallback(() => {
    if (scopeKey) snapshotCache.delete(scopeKey);
    setRevision((current) => current + 1);
  }, [scopeKey]);

  return useMemo(() => ({ ...state, refresh }), [refresh, state]);
}