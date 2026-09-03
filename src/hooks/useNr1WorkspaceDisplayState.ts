"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { Nr1WorkspaceContext } from "@/lib/nr1-workspace-context";

type ContextStateLike =
  | { status: "ready"; context: Nr1WorkspaceContext }
  | { status: "loading" | "error"; context: null };

type ApiEntity = Record<string, unknown>;

type DisplaySnapshot = {
  companyName: string;
  establishmentName: string;
  loadedAt: number;
};

export type Nr1WorkspaceDisplayState = {
  companyName: string;
  establishmentName: string;
  isLoading: boolean;
  error: string | null;
};

const CACHE_TTL_MS = 5000;
const snapshotCache = new Map<string, DisplaySnapshot>();
const requestCache = new Map<string, Promise<DisplaySnapshot>>();

const supabaseBrowserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
);

function isEntity(value: unknown): value is ApiEntity {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown, keys: string[]): string {
  if (!isEntity(value)) return "";

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function extractItems(payload: unknown, keys: string[]): ApiEntity[] {
  if (Array.isArray(payload)) {
    return payload.filter(isEntity);
  }

  if (!isEntity(payload)) {
    return [];
  }

  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isEntity);
    }
  }

  return [];
}

async function requestCollection(
  path: string,
  context: Nr1WorkspaceContext,
  token: string,
  keys: string[],
  companyId?: string
): Promise<ApiEntity[]> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("tenantId", context.tenantId);

  if (companyId) {
    url.searchParams.set("companyId", companyId);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
      "x-tenant-id": context.tenantId,
      "x-icanhelp-tenant": context.tenantId,
      "x-establishment-id": context.establishmentId,
    },
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      isEntity(payload) && typeof payload.message === "string"
        ? payload.message
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return extractItems(payload, keys);
}

async function loadDisplaySnapshot(
  context: Nr1WorkspaceContext
): Promise<DisplaySnapshot> {
  const scopeKey =
    `${context.userId}:${context.tenantId}:${context.companyId}:${context.establishmentId}`;

  const cached = snapshotCache.get(scopeKey);

  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached;
  }

  const pending = requestCache.get(scopeKey);

  if (pending) {
    return pending;
  }

  const request = (async () => {
    const { data, error } = await supabaseBrowserClient.auth.getSession();

    if (error) {
      throw error;
    }

    const token = data.session?.access_token?.trim() ?? "";

    if (!token) {
      throw new Error("Sessao autenticada nao encontrada.");
    }

    const [companies, establishments] = await Promise.all([
      requestCollection(
        "/api/nr1/companies",
        context,
        token,
        ["items", "companies", "data"]
      ),
      requestCollection(
        "/api/nr1/establishments",
        context,
        token,
        ["items", "establishments", "data"],
        context.companyId
      ),
    ]);

    const company = companies.find(
      (item) => readString(item, ["id"]) === context.companyId
    );

    const establishment = establishments.find(
      (item) => readString(item, ["id"]) === context.establishmentId
    );

    if (!company) {
      throw new Error("Empresa ativa nao encontrada no contexto oficial.");
    }

    if (!establishment) {
      throw new Error("Estabelecimento ativo nao encontrado no contexto oficial.");
    }

    const companyName =
      readString(company, ["trade_name", "legal_name", "name"]) ||
      "Empresa ativa";

    const establishmentName =
      readString(establishment, ["name"]) ||
      "Estabelecimento ativo";

    const snapshot = {
      companyName,
      establishmentName,
      loadedAt: Date.now(),
    };

    snapshotCache.set(scopeKey, snapshot);
    return snapshot;
  })();

  requestCache.set(scopeKey, request);

  try {
    return await request;
  } finally {
    requestCache.delete(scopeKey);
  }
}

export function useNr1WorkspaceDisplayState(
  contextState: ContextStateLike
): Nr1WorkspaceDisplayState {
  const [state, setState] = useState<Nr1WorkspaceDisplayState>({
    companyName: "",
    establishmentName: "",
    isLoading: true,
    error: null,
  });

  const scopeKey =
    contextState.status === "ready"
      ? `${contextState.context.userId}:${contextState.context.tenantId}:${contextState.context.companyId}:${contextState.context.establishmentId}`
      : "";

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (contextState.status !== "ready") {
        setState({
          companyName: "",
          establishmentName: "",
          isLoading: contextState.status === "loading",
          error:
            contextState.status === "error"
              ? "Contexto oficial NR-1 indisponivel."
              : null,
        });
        return;
      }

      setState((current) => ({
        ...current,
        isLoading: true,
        error: null,
      }));

      void loadDisplaySnapshot(contextState.context)
        .then((snapshot) => {
          if (cancelled) return;

          setState({
            companyName: snapshot.companyName,
            establishmentName: snapshot.establishmentName,
            isLoading: false,
            error: null,
          });
        })
        .catch((error: unknown) => {
          if (cancelled) return;

          setState({
            companyName: "",
            establishmentName: "",
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Falha ao carregar contexto oficial NR-1.",
          });
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [contextState, scopeKey]);

  return state;
}
