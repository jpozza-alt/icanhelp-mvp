"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type JsonObject = Record<string, unknown>;

type SaveStatus = "idle" | "loading" | "dirty" | "saving" | "saved" | "save_error";

type BackendContext = {
  tenantId: string | null;
  establishmentId: string | null;
};

type HeaderContext = {
  tenantId?: string | null;
  establishmentId?: string | null;
};

type SimpleEntity = {
  id?: string;
  name?: string;
  legal_name?: string;
  trade_name?: string;
  title?: string;
  description?: string;
  status?: string;
  employee_count?: number;
  exposed_worker_count?: number;
  [key: string]: unknown;
};

type AuditEvent = {
  id?: string;
  event_type?: string;
  created_at?: string;
  persistence_type?: string;
  screen_key?: string;
  entity_type?: string;
  entity_id?: string;
  reason?: string;
  [key: string]: unknown;
};

type WorkspaceDraftPayload = {
  activeSection: string;
  diagnosticNotes: string;
  checklist: Record<string, boolean>;
  updatedAt: string | null;
};

const DEFAULT_DRAFT: WorkspaceDraftPayload = {
  activeSection: "overview",
  diagnosticNotes: "",
  checklist: {
    company_checked: false,
    establishment_checked: false,
    departments_checked: false,
    activities_checked: false,
    diagnosis_started: false,
    evidence_pending: false,
  },
  updatedAt: null,
};

const SCREEN_KEY = "nr1_workspace";
const RECORD_TYPE = "workspace_shell";
const ENTITY_TYPE = "workspace_shell";

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstString(record: unknown, keys: string[]): string | null {
  if (!isRecord(record)) return null;
  for (const key of keys) {
    const value = stringOrNull(record[key]);
    if (value) return value;
  }
  return null;
}

function nestedString(record: unknown, path: string[]): string | null {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return stringOrNull(current);
}

function extractArray<T>(payload: unknown, preferredKeys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (!isRecord(payload)) return [];

  for (const key of preferredKeys) {
    const value = payload[key];
    if (Array.isArray(value)) return value as T[];
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}

function displayName(item: SimpleEntity, fallback: string): string {
  return (
    firstString(item, ["name", "legal_name", "trade_name", "title", "description"]) ||
    fallback
  );
}

function buildUrl(path: string, params: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function normalizeDraftPayload(value: unknown): WorkspaceDraftPayload {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      parsed = {};
    }
  }

  if (!isRecord(parsed)) {
    return DEFAULT_DRAFT;
  }

  const checklistSource = isRecord(parsed.checklist) ? parsed.checklist : {};
  const checklist: Record<string, boolean> = { ...DEFAULT_DRAFT.checklist };

  for (const [key, itemValue] of Object.entries(checklistSource)) {
    checklist[key] = Boolean(itemValue);
  }

  return {
    activeSection: stringOrNull(parsed.activeSection) || DEFAULT_DRAFT.activeSection,
    diagnosticNotes: stringOrNull(parsed.diagnosticNotes) || "",
    checklist,
    updatedAt: stringOrNull(parsed.updatedAt),
  };
}

function findDraftPayload(payload: unknown): WorkspaceDraftPayload {
  if (!isRecord(payload)) return DEFAULT_DRAFT;

  const direct = payload.payload_json;
  if (direct !== undefined) return normalizeDraftPayload(direct);

  const nestedKeys = ["data", "draft", "state", "item", "record"];

  for (const key of nestedKeys) {
    const nested = payload[key];
    if (isRecord(nested) && nested.payload_json !== undefined) {
      return normalizeDraftPayload(nested.payload_json);
    }
  }

  return DEFAULT_DRAFT;
}

async function fetchJson<T = unknown>(
  path: string,
  options: RequestInit = {},
  context: HeaderContext = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("accept", "application/json");

  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (context.tenantId) {
    headers.set("x-tenant-id", context.tenantId);
  }

  if (context.establishmentId) {
    headers.set("x-establishment-id", context.establishmentId);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText} ${text}`.trim());
  }

  return response.json() as Promise<T>;
}

async function loadFirstOk(paths: string[], context: HeaderContext = {}): Promise<unknown | null> {
  for (const path of paths) {
    try {
      return await fetchJson(path, {}, context);
    } catch {
      continue;
    }
  }

  return null;
}

export default function Nr1WorkspacePage() {
  const [context, setContext] = useState<BackendContext>({
    tenantId: null,
    establishmentId: null,
  });

  const [company, setCompany] = useState<SimpleEntity | null>(null);
  const [establishments, setEstablishments] = useState<SimpleEntity[]>([]);
  const [departments, setDepartments] = useState<SimpleEntity[]>([]);
  const [activities, setActivities] = useState<SimpleEntity[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [draft, setDraft] = useState<WorkspaceDraftPayload>(DEFAULT_DRAFT);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef<WorkspaceDraftPayload>(DEFAULT_DRAFT);
  const contextRef = useRef<BackendContext>({ tenantId: null, establishmentId: null });

  const activeEstablishmentId = context.establishmentId;

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const progressPercent = useMemo(() => {
    const values = Object.values(draft.checklist);
    if (values.length === 0) return 0;
    const completed = values.filter(Boolean).length;
    return Math.round((completed / values.length) * 100);
  }, [draft.checklist]);

  const headerContext = useMemo<HeaderContext>(
    () => ({
      tenantId: context.tenantId,
      establishmentId: context.establishmentId,
    }),
    [context.tenantId, context.establishmentId]
  );

  const resolveContext = useCallback(async (): Promise<BackendContext> => {
    const payload = await loadFirstOk([
      "/api/debug/context",
      "/api/nr1/context",
      "/api/tenant/context",
      "/api/tenants/active",
    ]);

    const tenantId =
      nestedString(payload, ["tenant", "id"]) ||
      nestedString(payload, ["activeTenant", "id"]) ||
      nestedString(payload, ["data", "tenant", "id"]) ||
      nestedString(payload, ["data", "activeTenant", "id"]) ||
      firstString(payload, ["tenant_id", "tenantId", "active_tenant_id"]);

    const establishmentId =
      nestedString(payload, ["establishment", "id"]) ||
      nestedString(payload, ["activeEstablishment", "id"]) ||
      nestedString(payload, ["data", "establishment", "id"]) ||
      nestedString(payload, ["data", "activeEstablishment", "id"]) ||
      firstString(payload, ["establishment_id", "establishmentId", "active_establishment_id"]);

    return { tenantId, establishmentId };
  }, []);

  const loadCompany = useCallback(async (nextContext: BackendContext): Promise<SimpleEntity | null> => {
    const payload = await loadFirstOk(
      [
        "/api/nr1/company",
        "/api/nr1/companies",
        "/api/nr1/company-profile",
        "/api/nr1/companies-profile",
      ],
      nextContext
    );

    if (!payload) return null;

    if (Array.isArray(payload)) return (payload[0] as SimpleEntity) || null;

    if (isRecord(payload)) {
      if (isRecord(payload.company)) return payload.company as SimpleEntity;
      if (isRecord(payload.data)) return payload.data as SimpleEntity;
      if (isRecord(payload.profile)) return payload.profile as SimpleEntity;
    }

    return payload as SimpleEntity;
  }, []);

  const loadEstablishments = useCallback(
    async (nextContext: BackendContext): Promise<SimpleEntity[]> => {
      if (!nextContext.tenantId) return [];

      const path = buildUrl("/api/nr1/establishments", {
        tenantId: nextContext.tenantId,
      });

      const payload = await loadFirstOk([path], nextContext);
      return extractArray<SimpleEntity>(payload, ["establishments", "items", "data"]);
    },
    []
  );

  const loadDepartments = useCallback(
    async (nextContext: BackendContext): Promise<SimpleEntity[]> => {
      if (!nextContext.establishmentId) return [];

      const path = buildUrl("/api/nr1/departments", {
        establishment_id: nextContext.establishmentId,
      });

      const payload = await loadFirstOk([path], nextContext);
      return extractArray<SimpleEntity>(payload, ["departments", "items", "data"]);
    },
    []
  );

  const loadActivities = useCallback(
    async (nextContext: BackendContext): Promise<SimpleEntity[]> => {
      if (!nextContext.establishmentId) return [];

      const path = buildUrl("/api/nr1/activities", {
        establishment_id: nextContext.establishmentId,
      });

      const payload = await loadFirstOk([path], nextContext);
      return extractArray<SimpleEntity>(payload, ["activities", "work_activities", "items", "data"]);
    },
    []
  );

  const loadDraftState = useCallback(
    async (nextContext: BackendContext): Promise<WorkspaceDraftPayload> => {
      if (!nextContext.tenantId || !nextContext.establishmentId) return DEFAULT_DRAFT;

      const path = buildUrl("/api/nr1/draft-state", {
        tenantId: nextContext.tenantId,
        establishmentId: nextContext.establishmentId,
        screenKey: SCREEN_KEY,
        recordType: RECORD_TYPE,
      });

      const payload = await fetchJson(path, {}, nextContext);
      return findDraftPayload(payload);
    },
    []
  );

  const loadAuditEvents = useCallback(
    async (nextContext: BackendContext): Promise<AuditEvent[]> => {
      if (!nextContext.tenantId || !nextContext.establishmentId) return [];

      const path = buildUrl("/api/nr1/audit-events", {
        tenantId: nextContext.tenantId,
        establishmentId: nextContext.establishmentId,
        screenKey: SCREEN_KEY,
        entityType: ENTITY_TYPE,
        entityId: nextContext.establishmentId,
        limit: "25",
      });

      const payload = await fetchJson(path, {}, nextContext);
      return extractArray<AuditEvent>(payload, ["audit_events", "events", "items", "data"]);
    },
    []
  );

  const recordAuditEvent = useCallback(
    async (
      eventType: string,
      newValue: JsonObject,
      persistenceType: "draft" | "formal" = "draft"
    ): Promise<void> => {
      const currentContext = contextRef.current;

      if (!currentContext.tenantId || !currentContext.establishmentId) return;

      const auditPostPath = buildUrl("/api/nr1/audit-events", {
        tenantId: currentContext.tenantId,
      });

      await fetchJson(
        auditPostPath,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            module_name: "nr1",
            screen_key: SCREEN_KEY,
            entity_type: ENTITY_TYPE,
            entity_id: currentContext.establishmentId,
            event_type: eventType,
            old_value_json: null,
            new_value_json: newValue,
            persistence_type: persistenceType,
            reason: "workspace_nr1_real_audit_event",
          }),
        },
        currentContext
      );
    },
    []
  );

  const refreshAuditEvents = useCallback(async (): Promise<void> => {
    const currentContext = contextRef.current;

    if (!currentContext.establishmentId) return;

    try {
      const events = await loadAuditEvents(currentContext);
      setAuditEvents(events);
    } catch {
      // A trilha nao deve travar a tela quando a listagem falhar.
    }
  }, [loadAuditEvents]);

  const saveDraft = useCallback(
    async (nextDraft: WorkspaceDraftPayload, reason: string): Promise<void> => {
      const currentContext = contextRef.current;

      if (!currentContext.tenantId || !currentContext.establishmentId) {
        setSaveStatus("save_error");
        return;
      }

      setSaveStatus("saving");

      const payloadToSave: WorkspaceDraftPayload = {
        ...nextDraft,
        updatedAt: new Date().toISOString(),
      };

      try {
        const draftPostPath = buildUrl("/api/nr1/draft-state", {
          tenantId: currentContext.tenantId,
        });

        await fetchJson(
          draftPostPath,
          {
            method: "POST",
            body: JSON.stringify({
              establishment_id: currentContext.establishmentId,
              screen_key: SCREEN_KEY,
              record_type: RECORD_TYPE,
              record_id: null,
              payload_json: payloadToSave,
              is_dirty: false,
            }),
          },
          currentContext
        );

        await recordAuditEvent("workspace_draft_saved", {
          reason,
          screen_key: SCREEN_KEY,
          record_type: RECORD_TYPE,
          record_id: null,
          progress_percent: progressPercent,
        });

        const savedAt = new Date().toISOString();
        setDraft(payloadToSave);
        setLastSavedAt(savedAt);
        setSaveStatus("saved");
        await refreshAuditEvents();
      } catch {
        setSaveStatus("save_error");
      }
    },
    [progressPercent, recordAuditEvent, refreshAuditEvents]
  );

  const scheduleDraftSave = useCallback(
    (nextDraft: WorkspaceDraftPayload, reason: string): void => {
      setDraft(nextDraft);
      setSaveStatus("dirty");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        void saveDraft(nextDraft, reason);
      }, 900);
    },
    [saveDraft]
  );

  const patchDraft = useCallback(
    (patch: Partial<WorkspaceDraftPayload>, reason: string): void => {
      const nextDraft: WorkspaceDraftPayload = {
        ...latestDraftRef.current,
        ...patch,
      };

      scheduleDraftSave(nextDraft, reason);
    },
    [scheduleDraftSave]
  );

  const patchChecklist = useCallback(
    (key: string, value: boolean): void => {
      const nextDraft: WorkspaceDraftPayload = {
        ...latestDraftRef.current,
        checklist: {
          ...latestDraftRef.current.checklist,
          [key]: value,
        },
      };

      scheduleDraftSave(nextDraft, `checklist_${key}`);
    },
    [scheduleDraftSave]
  );

  const selectEstablishment = useCallback(
    async (establishmentId: string): Promise<void> => {
      const nextContext = {
        tenantId: contextRef.current.tenantId,
        establishmentId,
      };

      setContext(nextContext);
      setSaveStatus("loading");

      try {
        const [nextDepartments, nextActivities, nextDraft, nextAuditEvents] = await Promise.all([
          loadDepartments(nextContext),
          loadActivities(nextContext),
          loadDraftState(nextContext),
          loadAuditEvents(nextContext),
        ]);

        setDepartments(nextDepartments);
        setActivities(nextActivities);
        setDraft(nextDraft);
        setAuditEvents(nextAuditEvents);
        setSaveStatus("saved");

        await recordAuditEvent("establishment_selected", {
          establishment_id: establishmentId,
          screen_key: SCREEN_KEY,
        });

        await refreshAuditEvents();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Erro ao trocar estabelecimento.");
        setSaveStatus("save_error");
      }
    },
    [loadActivities, loadAuditEvents, loadDepartments, loadDraftState, recordAuditEvent, refreshAuditEvents]
  );

  useEffect(() => {
    let cancelled = false;

    async function boot(): Promise<void> {
      setSaveStatus("loading");
      setLoadError(null);

      try {
        const resolvedContext = await resolveContext();
        const loadedEstablishments = await loadEstablishments(resolvedContext);
        const fallbackEstablishmentId =
          resolvedContext.establishmentId ||
          firstString(loadedEstablishments[0], ["id"]);

        const nextContext = {
          tenantId: resolvedContext.tenantId,
          establishmentId: fallbackEstablishmentId,
        };

        const [loadedCompany, loadedDepartments, loadedActivities, loadedDraft, loadedAuditEvents] =
          await Promise.all([
            loadCompany(nextContext),
            loadDepartments(nextContext),
            loadActivities(nextContext),
            loadDraftState(nextContext),
            loadAuditEvents(nextContext),
          ]);

        if (cancelled) return;

        setContext(nextContext);
        setCompany(loadedCompany);
        setEstablishments(loadedEstablishments);
        setDepartments(loadedDepartments);
        setActivities(loadedActivities);
        setDraft(loadedDraft);
        setAuditEvents(loadedAuditEvents);
        setSaveStatus("saved");

        if (nextContext.establishmentId) {
          await recordAuditEvent("workspace_opened", {
            screen_key: SCREEN_KEY,
            establishment_id: nextContext.establishmentId,
          });
          await refreshAuditEvents();
        }
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Erro ao carregar workspace NR1.");
        setSaveStatus("save_error");
      }
    }

    void boot();

    return () => {
      cancelled = true;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    loadActivities,
    loadAuditEvents,
    loadCompany,
    loadDepartments,
    loadDraftState,
    loadEstablishments,
    recordAuditEvent,
    refreshAuditEvents,
    resolveContext,
  ]);

  const selectedEstablishment = useMemo(() => {
    return establishments.find((item) => item.id === activeEstablishmentId) || null;
  }, [activeEstablishmentId, establishments]);

  const statusLabel = useMemo(() => {
    if (saveStatus === "loading") return "Carregando dados reais...";
    if (saveStatus === "dirty") return "Alteracoes pendentes";
    if (saveStatus === "saving") return "Salvando...";
    if (saveStatus === "saved") return "Salvo";
    if (saveStatus === "save_error") return "Erro ao salvar";
    return "Pronto";
  }, [saveStatus]);

  const checklistItems = [
    ["company_checked", "Empresa revisada"],
    ["establishment_checked", "Estabelecimento selecionado"],
    ["departments_checked", "Setores carregados"],
    ["activities_checked", "Atividades carregadas"],
    ["diagnosis_started", "Diagnostico iniciado"],
    ["evidence_pending", "Evidencias pendentes mapeadas"],
  ] as const;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-6 py-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-72 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl lg:block">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">ICANHELP</p>
            <h1 className="mt-2 text-2xl font-semibold">Workspace NR1</h1>
            <p className="mt-2 text-sm text-slate-400">Rascunho real, trilha real e contexto por estabelecimento.</p>
          </div>

          <nav className="space-y-2">
            {[
              ["overview", "Visao Geral"],
              ["company", "Empresa"],
              ["establishments", "Estabelecimentos"],
              ["departments", "Setores"],
              ["activities", "Atividades"],
              ["diagnosis", "Diagnostico"],
              ["audit", "Trilha"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => patchDraft({ activeSection: key }, `section_${key}`)}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                  draft.activeSection === key
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-800/70 text-slate-200 hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Progresso</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-2xl font-semibold">{progressPercent}%</p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Status</p>
            <p className="mt-1 text-sm font-medium">{statusLabel}</p>
            <p className="mt-2 text-xs text-slate-500">
              {lastSavedAt ? `Ultimo autosave: ${new Date(lastSavedAt).toLocaleTimeString("pt-BR")}` : "Aguardando autosave"}
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">NR1 / SST</p>
                <h2 className="mt-2 text-3xl font-semibold">Adequacao NR1 da empresa</h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">
                  Esta tela mantem empresas, estabelecimentos, setores e atividades no backend e usa draft-state para rascunho do workspace e audit-events para trilha lateral.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
                <p className="text-slate-400">Estabelecimento ativo</p>
                <select
                  value={activeEstablishmentId || ""}
                  onChange={(event) => void selectEstablishment(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                >
                  <option value="">Selecione</option>
                  {establishments.map((item, index) => (
                    <option key={item.id || index} value={item.id || ""}>
                      {displayName(item, `Estabelecimento ${index + 1}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadError ? (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
                {loadError}
              </div>
            ) : null}
          </header>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Empresa</p>
              <h3 className="mt-2 text-xl font-semibold">
                {company ? displayName(company, "Empresa cadastrada") : "Empresa nao carregada"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Tenant: {context.tenantId || "nao resolvido"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Estabelecimento</p>
              <h3 className="mt-2 text-xl font-semibold">
                {selectedEstablishment ? displayName(selectedEstablishment, "Estabelecimento") : "Nao selecionado"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                ID: {activeEstablishmentId || "sem contexto"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Rascunho real</p>
              <h3 className="mt-2 text-xl font-semibold">{statusLabel}</h3>
              <p className="mt-2 text-sm text-slate-500">
                record_id: null / entity_id: establishmentId
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">Checklist do workspace</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Cada alteracao e autosalva no draft-state.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void saveDraft(latestDraftRef.current, "manual_save")}
                  className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                >
                  Salvar agora
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {checklistItems.map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(draft.checklist[key])}
                      onChange={(event) => patchChecklist(key, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-700"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-semibold">Diagnostico em rascunho</h3>
              <p className="mt-1 text-sm text-slate-400">
                Enquanto nao houver rota especifica de diagnosis, o conteudo fica no draft-state do workspace.
              </p>

              <textarea
                value={draft.diagnosticNotes}
                onChange={(event) =>
                  patchDraft({ diagnosticNotes: event.target.value }, "diagnostic_notes")
                }
                rows={10}
                placeholder="Digite observacoes do diagnostico guiado, pendencias, riscos percebidos ou encaminhamentos."
                className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-cyan-300"
              />
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-semibold">Setores do backend</h3>
              <p className="mt-1 text-sm text-slate-400">
                Fonte: /api/nr1/departments
              </p>

              <div className="mt-5 space-y-3">
                {departments.length === 0 ? (
                  <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
                    Nenhum setor retornado para este estabelecimento.
                  </p>
                ) : (
                  departments.map((item, index) => (
                    <div key={item.id || index} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="font-medium">{displayName(item, `Setor ${index + 1}`)}</p>
                      <p className="mt-1 text-xs text-slate-500">ID: {item.id || "sem id"}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-semibold">Atividades do backend</h3>
              <p className="mt-1 text-sm text-slate-400">
                Fonte: /api/nr1/activities
              </p>

              <div className="mt-5 space-y-3">
                {activities.length === 0 ? (
                  <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
                    Nenhuma atividade retornada para este estabelecimento.
                  </p>
                ) : (
                  activities.map((item, index) => (
                    <div key={item.id || index} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="font-medium">{displayName(item, `Atividade ${index + 1}`)}</p>
                      <p className="mt-1 text-xs text-slate-500">ID: {item.id || "sem id"}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Trilha real do workspace</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Fonte: /api/nr1/audit-events
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshAuditEvents()}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
              >
                Atualizar trilha
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {auditEvents.length === 0 ? (
                <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
                  Nenhum evento retornado ainda.
                </p>
              ) : (
                auditEvents.map((event, index) => (
                  <div key={event.id || index} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="font-medium">{event.event_type || "evento"}</p>
                      <p className="text-xs text-slate-500">
                        {event.created_at
                          ? new Date(event.created_at).toLocaleString("pt-BR")
                          : "sem data"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {event.persistence_type || "draft"} / {event.entity_type || ENTITY_TYPE}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}



