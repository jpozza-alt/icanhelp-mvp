"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export type Nr1WorkspaceReadContext = {
  tenantId: string;
  establishmentId: string;
};

export type Nr1WorkspaceReadContextState =
  | {
      status: "loading";
      context: null;
    }
  | {
      status: "ready";
      context: Nr1WorkspaceReadContext;
    }
  | {
      status: "error";
      context: null;
      error: string;
    };

type StoredSelection = {
  establishmentId?: unknown;
};

const SELECTION_PREFIX = "nr1_workspace_selection:";

const supabaseBrowserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
);

function readString(
  value: unknown,
  keys: string[]
): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record =
    value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = record[key];

    if (
      typeof candidate === "string" &&
      candidate.trim().length > 0
    ) {
      return candidate.trim();
    }
  }

  return "";
}

function readStoredEstablishmentId(
  tenantId: string
): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const raw = window.localStorage.getItem(
      `${SELECTION_PREFIX}${tenantId}`
    );

    if (!raw) {
      return "";
    }

    const parsed =
      JSON.parse(raw) as StoredSelection;

    return typeof parsed.establishmentId === "string"
      ? parsed.establishmentId.trim()
      : "";
  } catch {
    return "";
  }
}

async function resolveReadContext():
  Promise<Nr1WorkspaceReadContext> {

  const { data, error } =
    await supabaseBrowserClient.auth.getSession();

  if (error) {
    throw error;
  }

  const token =
    data.session?.access_token?.trim() || "";

  if (!token) {
    throw new Error(
      "Sessao autenticada nao encontrada."
    );
  }

  const response = await fetch(
    "/api/tenants/active",
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Contexto de tenant ativo indisponivel."
    );
  }

  const payload =
    (await response.json()) as unknown;

  const tenantId = readString(
    payload,
    [
      "tenantId",
      "tenant_id",
      "activeTenantId",
      "active_tenant_id",
    ]
  );

  if (!tenantId) {
    throw new Error(
      "Tenant ativo nao identificado."
    );
  }

  const establishmentFromApi =
    readString(
      payload,
      [
        "establishmentId",
        "establishment_id",
        "activeEstablishmentId",
        "active_establishment_id",
      ]
    );

  const establishmentId =
    establishmentFromApi ||
    readStoredEstablishmentId(tenantId);

  if (!establishmentId) {
    throw new Error(
      "Estabelecimento ativo nao identificado."
    );
  }

  return {
    tenantId,
    establishmentId,
  };
}

export function useNr1WorkspaceReadContext(
  enabled: boolean
): Nr1WorkspaceReadContextState {

  const [state, setState] =
    useState<Nr1WorkspaceReadContextState>({
      status: "loading",
      context: null,
    });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void resolveReadContext()
      .then((context) => {
        if (cancelled) {
          return;
        }

        setState({
          status: "ready",
          context,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          context: null,
          error:
            error instanceof Error
              ? error.message
              : "Contexto NR-1 indisponivel.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}

export default useNr1WorkspaceReadContext;