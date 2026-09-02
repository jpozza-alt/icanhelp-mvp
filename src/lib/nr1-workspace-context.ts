"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export type Nr1WorkspaceContext = {
  userId: string;
  tenantId: string;
  companyId: string;
  establishmentId: string;
};

type ContextState =
  | { status: "loading"; context: null; error: null }
  | { status: "ready"; context: Nr1WorkspaceContext; error: null }
  | { status: "error"; context: null; error: string };

type StoredWorkspaceSelection = {
  companyId: string;
  establishmentId: string;
};

const SELECTION_PREFIX = "nr1_workspace_selection:";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown, keys: string[]): string {
  if (!isRecord(value)) return "";

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function selectionStorageKey(tenantId: string): string {
  return `${SELECTION_PREFIX}${tenantId}`;
}

function readStoredSelection(tenantId: string): StoredWorkspaceSelection {
  if (typeof window === "undefined") {
    return { companyId: "", establishmentId: "" };
  }

  try {
    const raw = window.localStorage.getItem(selectionStorageKey(tenantId));
    if (!raw) return { companyId: "", establishmentId: "" };

    const parsed = JSON.parse(raw) as unknown;
    return {
      companyId: readString(parsed, ["companyId"]),
      establishmentId: readString(parsed, ["establishmentId"]),
    };
  } catch {
    return { companyId: "", establishmentId: "" };
  }
}

const supabaseBrowserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
);

type BrowserSessionContext = {
  accessToken: string;
  userId: string;
};

async function getBrowserSessionContext(): Promise<BrowserSessionContext> {
  const result = await supabaseBrowserClient.auth.getSession();
  const session = result.data.session;
  const accessToken = session?.access_token?.trim() ?? "";
  const userId = session?.user?.id?.trim() ?? "";

  if (!accessToken || !userId) throw new Error("active_tenant_session_missing");

  return { accessToken, userId };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function collectTenantIds(payload: unknown): string[] {
  const tenantIds: string[] = [];
  const visited = new Set<unknown>();

  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const tenantId = value.trim();
    if (isUuid(tenantId) && !tenantIds.includes(tenantId)) tenantIds.push(tenantId);
  };

  const collect = (value: unknown, tenantObject = false): void => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((item) => collect(item, tenantObject));
      return;
    }

    if (!isRecord(value) || visited.has(value)) return;
    visited.add(value);

    for (const key of ["tenant_id", "tenantId", "active_tenant_id", "activeTenantId"]) {
      add(value[key]);
    }

    if (tenantObject) add(value.id);

    for (const [key, nested] of Object.entries(value)) {
      const nextIsTenantObject =
        tenantObject ||
        key === "tenant" ||
        key === "tenants" ||
        key === "activeTenant" ||
        key === "active_tenant" ||
        key === "currentTenant" ||
        key === "current_tenant" ||
        key === "selectedTenant" ||
        key === "selected_tenant";

      if (Array.isArray(nested) || isRecord(nested)) {
        collect(nested, nextIsTenantObject);
      }
    }
  };

  collect(payload);
  return tenantIds;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function synchronizeActiveTenant(accessToken: string): Promise<string> {
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${accessToken}`,
  };

  const tenantsResponse = await fetch("/api/tenants", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers,
  });
  const tenantsPayload = await parseResponsePayload(tenantsResponse);

  if (!tenantsResponse.ok) throw new Error("tenant_memberships_unavailable");

  const tenantIds = collectTenantIds(tenantsPayload);
  const selectedTenantId =
    tenantIds.find((tenantId) => {
      const selection = readStoredSelection(tenantId);
      return Boolean(selection.companyId && selection.establishmentId);
    }) || tenantIds[0];

  if (!selectedTenantId) throw new Error("tenant_membership_missing");

  const activateResponse = await fetch("/api/tenants/active", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...headers,
      "content-type": "application/json",
    },
    body: JSON.stringify({ tenantId: selectedTenantId }),
  });
  const activatePayload = await parseResponsePayload(activateResponse);

  if (!activateResponse.ok) throw new Error("active_tenant_sync_failed");

  return (
    readString(activatePayload, ["tenantId", "tenant_id", "activeTenantId", "active_tenant_id"]) ||
    selectedTenantId
  );
}

async function resolveActiveTenantId(accessToken: string): Promise<string> {
  const response = await fetch("/api/tenants/active", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await parseResponsePayload(response);

  if (response.ok) {
    const tenantId = readString(payload, [
      "tenantId",
      "tenant_id",
      "activeTenantId",
      "active_tenant_id",
    ]);

    if (!tenantId) throw new Error("active_tenant_missing");
    return tenantId;
  }

  if (response.status !== 404) throw new Error("active_tenant_unavailable");
  return synchronizeActiveTenant(accessToken);
}

function contextFromSelection(tenantId: string, userId: string): Nr1WorkspaceContext {
  const selection = readStoredSelection(tenantId);

  if (!selection.companyId || !selection.establishmentId) {
    throw new Error("workspace_selection_missing");
  }

  return {
    userId,
    tenantId,
    companyId: selection.companyId,
    establishmentId: selection.establishmentId,
  };
}

export function useNr1WorkspaceContext(): ContextState {
  const [state, setState] = useState<ContextState>({
    status: "loading",
    context: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function boot(): Promise<void> {
      try {
        const session = await getBrowserSessionContext();
        const tenantId = await resolveActiveTenantId(session.accessToken);

        const syncSelection = () => {
          if (cancelled) return;

          try {
            const context = contextFromSelection(tenantId, session.userId);
            setState((current) => {
              if (
                current.status === "ready" &&
                current.context.userId === context.userId &&
                current.context.tenantId === context.tenantId &&
                current.context.companyId === context.companyId &&
                current.context.establishmentId === context.establishmentId
              ) {
                return current;
              }

              return { status: "ready", context, error: null };
            });
          } catch (error) {
            setState({
              status: "error",
              context: null,
              error: error instanceof Error ? error.message : "workspace_context_unavailable",
            });
          }
        };

        syncSelection();
        timer = window.setInterval(syncSelection, 750);
      } catch (error) {
        if (cancelled) return;

        setState({
          status: "error",
          context: null,
          error: error instanceof Error ? error.message : "workspace_context_unavailable",
        });
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, []);

  return state;
}