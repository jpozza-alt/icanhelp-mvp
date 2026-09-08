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

type TenantReadContext = {
  tenantId: string;
  activeEstablishmentId: string;
};

export type Nr1EstablishmentCandidate = {
  id: string;
  companyId: string;
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

    if (!raw) {
      return { companyId: "", establishmentId: "" };
    }

    const parsed = JSON.parse(raw) as unknown;

    return {
      companyId: readString(parsed, ["companyId"]),
      establishmentId: readString(parsed, ["establishmentId"]),
    };
  } catch {
    return { companyId: "", establishmentId: "" };
  }
}

function hasCompleteStoredSelection(tenantId: string): boolean {
  const selection = readStoredSelection(tenantId);

  return Boolean(selection.companyId && selection.establishmentId);
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

  if (!accessToken || !userId) {
    throw new Error("active_tenant_session_missing");
  }

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

    if (isUuid(tenantId) && !tenantIds.includes(tenantId)) {
      tenantIds.push(tenantId);
    }
  };

  const collect = (value: unknown, tenantObject = false): void => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((item) => collect(item, tenantObject));
      return;
    }

    if (!isRecord(value) || visited.has(value)) return;

    visited.add(value);

    for (const key of [
      "tenant_id",
      "tenantId",
      "active_tenant_id",
      "activeTenantId",
    ]) {
      add(value[key]);
    }

    if (tenantObject) {
      add(value.id);
    }

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

export function selectTenantIdFromCandidates(
  tenantIds: string[],
  hasSelection: (tenantId: string) => boolean
): string {
  const uniqueTenantIds = [
    ...new Set(
      tenantIds
        .map((tenantId) => tenantId.trim())
        .filter((tenantId) => isUuid(tenantId))
    ),
  ];

  if (uniqueTenantIds.length === 0) {
    throw new Error("tenant_membership_missing");
  }

  if (uniqueTenantIds.length === 1) {
    const [onlyTenantId] = uniqueTenantIds;

    if (!onlyTenantId) {
      throw new Error("tenant_membership_missing");
    }

    return onlyTenantId;
  }

  const selectedTenantIds = uniqueTenantIds.filter((tenantId) =>
    hasSelection(tenantId)
  );

  if (selectedTenantIds.length !== 1) {
    throw new Error("tenant_selection_ambiguous");
  }

  const [selectedTenantId] = selectedTenantIds;

  if (!selectedTenantId) {
    throw new Error("tenant_selection_ambiguous");
  }

  return selectedTenantId;
}

export function selectEstablishmentCandidate(
  candidates: Nr1EstablishmentCandidate[]
): Nr1EstablishmentCandidate {
  if (candidates.length === 0) {
    throw new Error("workspace_establishment_missing");
  }

  if (candidates.length !== 1) {
    throw new Error("establishment_selection_ambiguous");
  }

  const [candidate] = candidates;

  if (!candidate) {
    throw new Error("workspace_establishment_missing");
  }

  return candidate;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function authenticatedHeaders(accessToken: string): Record<string, string> {
  return {
    accept: "application/json",
    authorization: `Bearer ${accessToken}`,
  };
}

async function resolveTenantReadContext(
  accessToken: string
): Promise<TenantReadContext> {
  const headers = authenticatedHeaders(accessToken);

  const activeResponse = await fetch("/api/tenants/active", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers,
  });

  const activePayload = await parseResponsePayload(activeResponse);

  if (activeResponse.ok) {
    const tenantId = readString(activePayload, [
      "tenantId",
      "tenant_id",
      "activeTenantId",
      "active_tenant_id",
    ]);

    if (!tenantId) {
      throw new Error("active_tenant_missing");
    }

    const activeEstablishmentId = readString(activePayload, [
      "establishmentId",
      "establishment_id",
      "activeEstablishmentId",
      "active_establishment_id",
    ]);

    return {
      tenantId,
      activeEstablishmentId,
    };
  }

  if (activeResponse.status !== 404) {
    throw new Error("active_tenant_unavailable");
  }

  const tenantsResponse = await fetch("/api/tenants", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers,
  });

  const tenantsPayload = await parseResponsePayload(tenantsResponse);

  if (!tenantsResponse.ok) {
    throw new Error("tenant_memberships_unavailable");
  }

  const tenantIds = collectTenantIds(tenantsPayload);

  const tenantId = selectTenantIdFromCandidates(
    tenantIds,
    hasCompleteStoredSelection
  );

  return {
    tenantId,
    activeEstablishmentId: "",
  };
}

function extractEstablishmentCandidates(
  payload: unknown
): Nr1EstablishmentCandidate[] {
  let items: unknown[] = [];

  if (Array.isArray(payload)) {
    items = payload;
  } else if (isRecord(payload) && Array.isArray(payload.items)) {
    items = payload.items;
  }

  return items
    .map((item) => ({
      id: readString(item, ["id", "establishmentId", "establishment_id"]),
      companyId: readString(item, ["company_id", "companyId"]),
    }))
    .filter(
      (item): item is Nr1EstablishmentCandidate =>
        Boolean(item.id && item.companyId)
    );
}

async function loadEstablishmentCandidates(
  accessToken: string,
  tenantId: string
): Promise<Nr1EstablishmentCandidate[]> {
  const search = new URLSearchParams({ tenantId });

  const response = await fetch(
    `/api/nr1/establishments?${search.toString()}`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...authenticatedHeaders(accessToken),
        "x-tenant-id": tenantId,
        "x-icanhelp-tenant": tenantId,
      },
    }
  );

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new Error("workspace_establishments_unavailable");
  }

  return extractEstablishmentCandidates(payload);
}

function makeWorkspaceContext(
  userId: string,
  tenantId: string,
  companyId: string,
  establishmentId: string
): Nr1WorkspaceContext {
  if (!userId || !tenantId || !companyId || !establishmentId) {
    throw new Error("workspace_context_incomplete");
  }

  return {
    userId,
    tenantId,
    companyId,
    establishmentId,
  };
}

async function resolveInitialWorkspaceContext(
  accessToken: string,
  userId: string,
  tenantReadContext: TenantReadContext
): Promise<Nr1WorkspaceContext> {
  const { tenantId, activeEstablishmentId } = tenantReadContext;
  const storedSelection = readStoredSelection(tenantId);

  if (activeEstablishmentId) {
    if (
      storedSelection.companyId &&
      storedSelection.establishmentId === activeEstablishmentId
    ) {
      return makeWorkspaceContext(
        userId,
        tenantId,
        storedSelection.companyId,
        activeEstablishmentId
      );
    }

    const candidates = await loadEstablishmentCandidates(
      accessToken,
      tenantId
    );

    const matchingCandidates = candidates.filter(
      (candidate) => candidate.id === activeEstablishmentId
    );

    if (matchingCandidates.length !== 1) {
      throw new Error("active_establishment_unavailable");
    }

    const [activeCandidate] = matchingCandidates;

    if (!activeCandidate) {
      throw new Error("active_establishment_unavailable");
    }

    return makeWorkspaceContext(
      userId,
      tenantId,
      activeCandidate.companyId,
      activeCandidate.id
    );
  }

  if (
    storedSelection.companyId &&
    storedSelection.establishmentId
  ) {
    return makeWorkspaceContext(
      userId,
      tenantId,
      storedSelection.companyId,
      storedSelection.establishmentId
    );
  }

  const candidates = await loadEstablishmentCandidates(
    accessToken,
    tenantId
  );

  if (storedSelection.establishmentId) {
    const storedMatches = candidates.filter(
      (candidate) => candidate.id === storedSelection.establishmentId
    );

    if (storedMatches.length === 1) {
      const [storedCandidate] = storedMatches;

      if (storedCandidate) {
        return makeWorkspaceContext(
          userId,
          tenantId,
          storedCandidate.companyId,
          storedCandidate.id
        );
      }
    }
  }

  const candidate = selectEstablishmentCandidate(candidates);

  return makeWorkspaceContext(
    userId,
    tenantId,
    candidate.companyId,
    candidate.id
  );
}

function sameContext(
  left: Nr1WorkspaceContext,
  right: Nr1WorkspaceContext
): boolean {
  return (
    left.userId === right.userId &&
    left.tenantId === right.tenantId &&
    left.companyId === right.companyId &&
    left.establishmentId === right.establishmentId
  );
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

        const tenantReadContext = await resolveTenantReadContext(
          session.accessToken
        );

        const initialContext = await resolveInitialWorkspaceContext(
          session.accessToken,
          session.userId,
          tenantReadContext
        );

        if (cancelled) {
          return;
        }

        setState({
          status: "ready",
          context: initialContext,
          error: null,
        });

        const syncStoredSelection = () => {
          if (
            cancelled ||
            tenantReadContext.activeEstablishmentId
          ) {
            return;
          }

          const storedSelection = readStoredSelection(
            tenantReadContext.tenantId
          );

          if (
            !storedSelection.companyId ||
            !storedSelection.establishmentId
          ) {
            return;
          }

          const nextContext = makeWorkspaceContext(
            session.userId,
            tenantReadContext.tenantId,
            storedSelection.companyId,
            storedSelection.establishmentId
          );

          setState((current) => {
            if (
              current.status === "ready" &&
              sameContext(current.context, nextContext)
            ) {
              return current;
            }

            return {
              status: "ready",
              context: nextContext,
              error: null,
            };
          });
        };

        timer = window.setInterval(syncStoredSelection, 750);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          context: null,
          error:
            error instanceof Error
              ? error.message
              : "workspace_context_unavailable",
        });
      }
    }

    void boot();

    return () => {
      cancelled = true;

      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, []);

  return state;
}