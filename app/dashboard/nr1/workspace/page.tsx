"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type JsonObject = Record<string, unknown>;

type SaveStatus = "idle" | "loading" | "dirty" | "saving" | "saved" | "save_error";
type FormStatus = "idle" | "saving" | "saved" | "error";

type SessionDebugState = {
  checked: boolean;
  hasSession: boolean;
  hasAccessToken: boolean;
  userEmail: string;
  tokenPreview: string;
  error: string;
};

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
  tenant_id?: string;
  company_id?: string;
  establishment_id?: string;
  department_id?: string;
  legal_name?: string;
  trade_name?: string;
  name?: string;
  title?: string;
  description?: string;
  status?: string;
  city?: string;
  state?: string;
  employee_count?: number | null;
  exposed_worker_count?: number | null;
  real_activity_description?: string | null;
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

type CompanyForm = {
  legal_name: string;
  trade_name: string;
  cnpj: string;
  cnae_main: string;
  company_size: string;
  risk_grade: string;
  employee_count: string;
  has_cipa: boolean;
  has_sesmt: boolean;
  has_public_service: boolean;
  has_remote_work: boolean;
  has_third_parties: boolean;
  has_external_activities: boolean;
};

type EstablishmentForm = {
  company_id: string;
  name: string;
  establishment_type: string;
  cnpj_unit: string;
  city: string;
  state: string;
  employee_count: string;
  has_third_parties: boolean;
  has_external_activities: boolean;
  notes: string;
};

type DepartmentForm = {
  name: string;
  description: string;
  employee_count: string;
  shift_pattern: string;
  has_direct_leadership: boolean;
  has_public_contact: boolean;
  has_deadline_pressure: boolean;
  has_repetitive_work: boolean;
  has_prolonged_sitting: boolean;
  has_relevant_physical_effort: boolean;
  has_frequent_displacement: boolean;
  notes: string;
};

type ActivityForm = {
  department_id: string;
  name: string;
  real_activity_description: string;
  frequency: string;
  exposed_worker_count: string;
  execution_location: string;
  uses_machine: boolean;
  uses_chemical: boolean;
  has_public_contact: boolean;
  has_third_party_interaction: boolean;
  notes: string;
};

type DiagnosisContextForm = {
  work_description: string;
  exposed_people_count: string;
  work_routine_type: string;
  process_changes_frequency: string;
  has_external_work: boolean;
  has_multi_company_interaction: boolean;
  incident_history: string;
  notes: string;
};

type PsychosocialForm = {
  has_work_overload: boolean;
  has_excessive_pressure: boolean;
  has_role_ambiguity: boolean;
  has_low_autonomy: boolean;
  has_leadership_support_failure: boolean;
  has_peer_conflict: boolean;
  has_hostile_public_contact: boolean;
  has_constant_interruptions: boolean;
  has_task_accumulation: boolean;
  has_communication_difficulty: boolean;
  has_remote_isolation: boolean;
  has_badly_managed_change: boolean;
  has_report_channel: boolean;
  notes: string;
};

type ActionPlanForm = {
  risk_id: string;
  title: string;
  description: string;
  measure_type: string;
  priority: string;
  status: string;
  due_date: string;
  responsible_name: string;
  monitoring_method: string;
  evidence_method: string;
  completion_indicator: string;
  notes: string;
};

const SCREEN_KEY = "nr1_workspace";
const RECORD_TYPE = "workspace_shell";
const ENTITY_TYPE = "workspace_shell";

const INITIAL_SESSION_DEBUG: SessionDebugState = {
  checked: false,
  hasSession: false,
  hasAccessToken: false,
  userEmail: "",
  tokenPreview: "",
  error: "",
};

const DEFAULT_DRAFT: WorkspaceDraftPayload = {
  activeSection: "cadastros",
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

const INITIAL_COMPANY_FORM: CompanyForm = {
  legal_name: "",
  trade_name: "",
  cnpj: "",
  cnae_main: "",
  company_size: "",
  risk_grade: "",
  employee_count: "",
  has_cipa: false,
  has_sesmt: false,
  has_public_service: false,
  has_remote_work: false,
  has_third_parties: false,
  has_external_activities: false,
};

const INITIAL_ESTABLISHMENT_FORM: EstablishmentForm = {
  company_id: "",
  name: "",
  establishment_type: "matriz",
  cnpj_unit: "",
  city: "",
  state: "SC",
  employee_count: "",
  has_third_parties: false,
  has_external_activities: false,
  notes: "",
};

const INITIAL_DEPARTMENT_FORM: DepartmentForm = {
  name: "",
  description: "",
  employee_count: "",
  shift_pattern: "",
  has_direct_leadership: false,
  has_public_contact: false,
  has_deadline_pressure: false,
  has_repetitive_work: false,
  has_prolonged_sitting: false,
  has_relevant_physical_effort: false,
  has_frequent_displacement: false,
  notes: "",
};

const INITIAL_ACTIVITY_FORM: ActivityForm = {
  department_id: "",
  name: "",
  real_activity_description: "",
  frequency: "",
  exposed_worker_count: "",
  execution_location: "",
  uses_machine: false,
  uses_chemical: false,
  has_public_contact: false,
  has_third_party_interaction: false,
  notes: "",
};

const INITIAL_DIAGNOSIS_CONTEXT_FORM: DiagnosisContextForm = {
  work_description: "",
  exposed_people_count: "",
  work_routine_type: "",
  process_changes_frequency: "",
  has_external_work: false,
  has_multi_company_interaction: false,
  incident_history: "",
  notes: "",
};

const INITIAL_PSYCHOSOCIAL_FORM: PsychosocialForm = {
  has_work_overload: false,
  has_excessive_pressure: false,
  has_role_ambiguity: false,
  has_low_autonomy: false,
  has_leadership_support_failure: false,
  has_peer_conflict: false,
  has_hostile_public_contact: false,
  has_constant_interruptions: false,
  has_task_accumulation: false,
  has_communication_difficulty: false,
  has_remote_isolation: false,
  has_badly_managed_change: false,
  has_report_channel: false,
  notes: "",
};

const INITIAL_ACTION_PLAN_FORM: ActionPlanForm = {
  risk_id: "",
  title: "",
  description: "",
  measure_type: "organizational",
  priority: "medium",
  status: "open",
  due_date: isoDatePlusDays(30),
  responsible_name: "",
  monitoring_method: "",
  evidence_method: "",
  completion_indicator: "",
  notes: "",
};

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractTenantIdFromPayload(payload: unknown): string | null {
  const direct =
    firstString(payload, ["tenant_id", "tenantId", "active_tenant_id", "activeTenantId"]) ||
    firstString(payload, ["id"]);

  if (direct) return direct;

  const asRecord = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;

  const candidates: unknown[] = [];

  if (Array.isArray(payload)) {
    candidates.push(payload[0]);
  }

  if (asRecord) {
    candidates.push(asRecord.items);
    candidates.push(asRecord.data);
    candidates.push(asRecord.tenant);
    candidates.push(asRecord.activeTenant);
    candidates.push(asRecord.active_tenant);
    candidates.push(asRecord.membership);
    candidates.push(asRecord.current);
    candidates.push(asRecord.result);
  }

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (Array.isArray(candidate)) {
      const fromFirst =
        firstString(candidate[0], ["tenant_id", "tenantId", "active_tenant_id", "activeTenantId", "id"]);
      if (fromFirst) return fromFirst;
      continue;
    }

    const fromObject =
      firstString(candidate, ["tenant_id", "tenantId", "active_tenant_id", "activeTenantId", "id"]);
    if (fromObject) return fromObject;
  }

  return null;
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

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(",", "."));

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function isoDatePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const supabaseBrowserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
);

async function getBrowserAccessToken(): Promise<string | null> {
  const result = await supabaseBrowserClient.auth.getSession();
  return result.data.session?.access_token || null;
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

function extractFirstEntity(payload: unknown): SimpleEntity | null {
  const items = extractArray<SimpleEntity>(payload, ["items", "data", "companies", "establishments", "departments", "activities"]);

  if (items.length > 0) return items[0];

  if (isRecord(payload)) {
    for (const key of ["item", "data", "company", "establishment", "department", "activity"]) {
      const value = payload[key];
      if (isRecord(value)) return value as SimpleEntity;
    }
  }

  return null;
}

function displayName(item: SimpleEntity | null | undefined, fallback: string): string {
  if (!item) return fallback;

  return (
    firstString(item, ["legal_name", "trade_name", "name", "title", "description", "real_activity_description"]) ||
    fallback
  );
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

  const accessToken = await getBrowserAccessToken();

  if (accessToken) {
    headers.set("Authorization", "Bearer " + accessToken);
  }

  if (context.tenantId) {
    headers.set("x-tenant-id", context.tenantId);
    headers.set("x-icanhelp-tenant", context.tenantId);
  }

  if (context.establishmentId) {
    headers.set("x-establishment-id", context.establishmentId);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    cache: "no-store",
    credentials: "same-origin",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} ${text}`.trim());
  }

  if (!text.trim()) {
    return {} as T;
  }

  return JSON.parse(text) as T;
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

  const [companies, setCompanies] = useState<SimpleEntity[]>([]);
  const [establishments, setEstablishments] = useState<SimpleEntity[]>([]);
  const [departments, setDepartments] = useState<SimpleEntity[]>([]);
  const [activities, setActivities] = useState<SimpleEntity[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [draft, setDraft] = useState<WorkspaceDraftPayload>(DEFAULT_DRAFT);

  const [activeCompanyId, setActiveCompanyId] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [companyForm, setCompanyForm] = useState<CompanyForm>(INITIAL_COMPANY_FORM);
  const [establishmentForm, setEstablishmentForm] = useState<EstablishmentForm>(INITIAL_ESTABLISHMENT_FORM);
  const [departmentForm, setDepartmentForm] = useState<DepartmentForm>(INITIAL_DEPARTMENT_FORM);
  const [activityForm, setActivityForm] = useState<ActivityForm>(INITIAL_ACTIVITY_FORM);
  const [diagnosisActivityId, setDiagnosisActivityId] = useState<string>("");
  const [diagnosisSessionId, setDiagnosisSessionId] = useState<string>("");
  const [diagnosisRiskId, setDiagnosisRiskId] = useState<string>("");
  const [diagnosisStatus, setDiagnosisStatus] = useState<FormStatus>("idle");
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [diagnosisSuccess, setDiagnosisSuccess] = useState<string | null>(null);
  const [diagnosisContextForm, setDiagnosisContextForm] = useState<DiagnosisContextForm>(INITIAL_DIAGNOSIS_CONTEXT_FORM);
  const [psychosocialForm, setPsychosocialForm] = useState<PsychosocialForm>(INITIAL_PSYCHOSOCIAL_FORM);
  const [risks, setRisks] = useState<SimpleEntity[]>([]);
  const [actionPlans, setActionPlans] = useState<SimpleEntity[]>([]);
  const [selectedRiskId, setSelectedRiskId] = useState<string>("");
  const [actionPlanForm, setActionPlanForm] = useState<ActionPlanForm>(INITIAL_ACTION_PLAN_FORM);
  const [actionPlanStatus, setActionPlanStatus] = useState<FormStatus>("idle");
  const [actionPlanError, setActionPlanError] = useState<string | null>(null);
  const [actionPlanSuccess, setActionPlanSuccess] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef<WorkspaceDraftPayload>(DEFAULT_DRAFT);
  const contextRef = useRef<BackendContext>({ tenantId: null, establishmentId: null });

      const [sessionDebug, setSessionDebug] = useState<SessionDebugState>(INITIAL_SESSION_DEBUG);
const refreshSessionDebug = useCallback(async () => {
    try {
      const result = await supabaseBrowserClient.auth.getSession();
      const session = result.data.session;
      const token = session?.access_token || "";

      setSessionDebug({
        checked: true,
        hasSession: Boolean(session),
        hasAccessToken: Boolean(token),
        userEmail: session?.user?.email || "",
        tokenPreview: token ? token.slice(0, 12) + "..." + token.slice(-8) : "",
        error: result.error?.message || "",
      });
    } catch (error) {
      setSessionDebug({
        checked: true,
        hasSession: false,
        hasAccessToken: false,
        userEmail: "",
        tokenPreview: "",
        error: error instanceof Error ? error.message : "Erro desconhecido ao verificar sessao.",
      });
    }
  }, []);

  useEffect(() => {
    void refreshSessionDebug();
  }, [refreshSessionDebug]);
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

  const selectedCompany = useMemo(() => {
    return companies.find((item) => item.id === activeCompanyId) || null;
  }, [activeCompanyId, companies]);

  const selectedEstablishment = useMemo(() => {
    return establishments.find((item) => item.id === context.establishmentId) || null;
  }, [context.establishmentId, establishments]);

  const selectedRisk = useMemo(() => {
    return risks.find((item) => item.id === selectedRiskId) || null;
  }, [risks, selectedRiskId]);

  const statusLabel = useMemo(() => {
    if (saveStatus === "loading") return "Carregando dados reais";
    if (saveStatus === "dirty") return "Alteracoes pendentes";
    if (saveStatus === "saving") return "Salvando";
    if (saveStatus === "saved") return "Salvo";
    if (saveStatus === "save_error") return "Erro ao salvar";
    return "Pronto";
  }, [saveStatus]);

  const resolveContext = useCallback(async (): Promise<BackendContext> => {
    const payload = await loadFirstOk([
      "/api/debug/context",
      "/api/nr1/context",
      "/api/tenant/context",
      "/api/tenants",
      "/api/tenants",
    ]);

    const tenantId = extractTenantIdFromPayload(payload);

    const establishmentId =
      nestedString(payload, ["establishment", "id"]) ||
      nestedString(payload, ["activeEstablishment", "id"]) ||
      nestedString(payload, ["data", "establishment", "id"]) ||
      nestedString(payload, ["data", "activeEstablishment", "id"]) ||
      firstString(payload, ["establishment_id", "establishmentId", "active_establishment_id"]);

    return { tenantId, establishmentId };
  }, []);

  const loadCompanies = useCallback(async (nextContext: BackendContext): Promise<SimpleEntity[]> => {
    if (!nextContext.tenantId) return [];

    const path = buildUrl("/api/nr1/companies", {
      tenantId: nextContext.tenantId,
    });

    const payload = await fetchJson(path, {}, nextContext);
    return extractArray<SimpleEntity>(payload, ["items", "companies", "data"]);
  }, []);

  const loadEstablishments = useCallback(async (nextContext: BackendContext): Promise<SimpleEntity[]> => {
    if (!nextContext.tenantId) return [];

    const path = buildUrl("/api/nr1/establishments", {
      tenantId: nextContext.tenantId,
      companyId: activeCompanyId || undefined,
    });

    const payload = await fetchJson(path, {}, nextContext);
    return extractArray<SimpleEntity>(payload, ["items", "establishments", "data"]);
  }, [activeCompanyId]);

  const loadDepartments = useCallback(async (nextContext: BackendContext): Promise<SimpleEntity[]> => {
    if (!nextContext.tenantId || !nextContext.establishmentId) return [];

    const path = buildUrl("/api/nr1/departments", {
      tenantId: nextContext.tenantId,
      establishmentId: nextContext.establishmentId,
    });

    const payload = await fetchJson(path, {}, nextContext);
    return extractArray<SimpleEntity>(payload, ["items", "departments", "data"]);
  }, []);

  const loadActivities = useCallback(async (nextContext: BackendContext): Promise<SimpleEntity[]> => {
    if (!nextContext.tenantId || !nextContext.establishmentId) return [];

    const path = buildUrl("/api/nr1/activities", {
      tenantId: nextContext.tenantId,
      establishmentId: nextContext.establishmentId,
    });

    const payload = await fetchJson(path, {}, nextContext);
    return extractArray<SimpleEntity>(payload, ["items", "activities", "work_activities", "data"]);
  }, []);

  const loadDraftState = useCallback(async (nextContext: BackendContext): Promise<WorkspaceDraftPayload> => {
    if (!nextContext.tenantId || !nextContext.establishmentId) return DEFAULT_DRAFT;

    const path = buildUrl("/api/nr1/draft-state", {
      tenantId: nextContext.tenantId,
      establishmentId: nextContext.establishmentId,
      screenKey: SCREEN_KEY,
      recordType: RECORD_TYPE,
    });

    const payload = await fetchJson(path, {}, nextContext);
    return findDraftPayload(payload);
  }, []);

  const loadAuditEvents = useCallback(async (nextContext: BackendContext): Promise<AuditEvent[]> => {
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
  }, []);

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
            reason: "workspace_nr1_visible_crud",
          }),
        },
        currentContext
      );
    },
    []
  );

  const refreshAuditEvents = useCallback(async (): Promise<void> => {
    const currentContext = contextRef.current;

    if (!currentContext.tenantId || !currentContext.establishmentId) return;

    try {
      const events = await loadAuditEvents(currentContext);
      setAuditEvents(events);
    } catch {
      // Audit list must not block the operational screen.
    }
  }, [loadAuditEvents]);

  const reloadOperationalData = useCallback(
    async (nextContext: BackendContext): Promise<void> => {
      const [nextCompanies, nextEstablishments, nextDepartments, nextActivities, nextAuditEvents] =
        await Promise.all([
          loadCompanies(nextContext),
          loadEstablishments(nextContext),
          loadDepartments(nextContext),
          loadActivities(nextContext),
          loadAuditEvents(nextContext),
        ]);

      setCompanies(nextCompanies);
      setEstablishments(nextEstablishments);
      setDepartments(nextDepartments);
      setActivities(nextActivities);
      setAuditEvents(nextAuditEvents);

      const firstCompanyId =
        activeCompanyId ||
        firstString(nextEstablishments[0], ["company_id"]) ||
        firstString(nextCompanies[0], ["id"]) ||
        "";

      if (firstCompanyId) {
        setActiveCompanyId(firstCompanyId);
        setEstablishmentForm((prev) => ({ ...prev, company_id: prev.company_id || firstCompanyId }));
      }

      const firstDepartmentId = firstString(nextDepartments[0], ["id"]) || "";
      if (firstDepartmentId) {
        setActivityForm((prev) => ({ ...prev, department_id: prev.department_id || firstDepartmentId }));
      }
    },
    [activeCompanyId, loadActivities, loadAuditEvents, loadCompanies, loadDepartments, loadEstablishments]
  );

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
        const selected = establishments.find((item) => item.id === establishmentId);
        const selectedCompanyId = firstString(selected, ["company_id"]);
        if (selectedCompanyId) {
          setActiveCompanyId(selectedCompanyId);
          setEstablishmentForm((prev) => ({ ...prev, company_id: selectedCompanyId }));
        }

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
    [establishments, loadActivities, loadAuditEvents, loadDepartments, loadDraftState, recordAuditEvent, refreshAuditEvents]
  );

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormStatus("saving");
    setFormError(null);
    setSuccessMessage(null);

    const currentContext = contextRef.current;

    if (!currentContext.tenantId) {
      setFormStatus("error");
      setFormError("Tenant nao resolvido.");
      return;
    }

    if (companyForm.legal_name.trim().length < 3) {
      setFormStatus("error");
      setFormError("Informe uma razao social com pelo menos 3 caracteres.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/companies", {
        tenantId: currentContext.tenantId,
      });

      const response = await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            legal_name: companyForm.legal_name,
            trade_name: companyForm.trade_name,
            cnpj: companyForm.cnpj,
            cnae_main: companyForm.cnae_main,
            company_size: companyForm.company_size,
            risk_grade: companyForm.risk_grade,
            employee_count: numberOrNull(companyForm.employee_count),
            has_cipa: companyForm.has_cipa,
            has_sesmt: companyForm.has_sesmt,
            has_public_service: companyForm.has_public_service,
            has_remote_work: companyForm.has_remote_work,
            has_third_parties: companyForm.has_third_parties,
            has_external_activities: companyForm.has_external_activities,
            status: "active",
          }),
        },
        currentContext
      );

      const created = extractFirstEntity(response);
      const createdCompanyId = firstString(created, ["id"]);

      if (createdCompanyId) {
        setActiveCompanyId(createdCompanyId);
        setEstablishmentForm((prev) => ({ ...prev, company_id: createdCompanyId }));
      }

      await recordAuditEvent("company_created_from_workspace", {
        company_id: createdCompanyId,
        legal_name: companyForm.legal_name,
      }, "formal");

      setCompanyForm(INITIAL_COMPANY_FORM);
      await reloadOperationalData(currentContext);
      setSuccessMessage("Empresa cadastrada.");
      setFormStatus("saved");
    } catch (error) {
      setFormStatus("error");
      setFormError(error instanceof Error ? error.message : "Erro ao cadastrar empresa.");
    }
  }

  async function handleCreateEstablishment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormStatus("saving");
    setFormError(null);
    setSuccessMessage(null);

    const currentContext = contextRef.current;
    const companyId = establishmentForm.company_id || activeCompanyId;

    if (!currentContext.tenantId) {
      setFormStatus("error");
      setFormError("Tenant nao resolvido.");
      return;
    }

    if (!companyId) {
      setFormStatus("error");
      setFormError("Cadastre ou selecione uma empresa antes.");
      return;
    }

    if (establishmentForm.name.trim().length < 3) {
      setFormStatus("error");
      setFormError("Informe um nome de estabelecimento com pelo menos 3 caracteres.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/establishments", {
        tenantId: currentContext.tenantId,
      });

      const response = await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            company_id: companyId,
            name: establishmentForm.name,
            establishment_type: establishmentForm.establishment_type,
            cnpj_unit: establishmentForm.cnpj_unit,
            city: establishmentForm.city,
            state: establishmentForm.state,
            employee_count: numberOrNull(establishmentForm.employee_count),
            has_third_parties: establishmentForm.has_third_parties,
            has_external_activities: establishmentForm.has_external_activities,
            notes: establishmentForm.notes,
            status: "active",
          }),
        },
        currentContext
      );

      const created = extractFirstEntity(response);
      const createdEstablishmentId = firstString(created, ["id"]);
      const nextContext = {
        tenantId: currentContext.tenantId,
        establishmentId: createdEstablishmentId || currentContext.establishmentId,
      };

      setContext(nextContext);
      contextRef.current = nextContext;

      await recordAuditEvent("establishment_created_from_workspace", {
        establishment_id: createdEstablishmentId,
        company_id: companyId,
        name: establishmentForm.name,
      }, "formal");

      setEstablishmentForm({ ...INITIAL_ESTABLISHMENT_FORM, company_id: companyId, state: establishmentForm.state || "SC" });
      await reloadOperationalData(nextContext);
      setSuccessMessage("Estabelecimento cadastrado.");
      setFormStatus("saved");
    } catch (error) {
      setFormStatus("error");
      setFormError(error instanceof Error ? error.message : "Erro ao cadastrar estabelecimento.");
    }
  }

  async function handleCreateDepartment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormStatus("saving");
    setFormError(null);
    setSuccessMessage(null);

    const currentContext = contextRef.current;

    if (!currentContext.tenantId || !currentContext.establishmentId) {
      setFormStatus("error");
      setFormError("Selecione um estabelecimento antes.");
      return;
    }

    if (departmentForm.name.trim().length < 3) {
      setFormStatus("error");
      setFormError("Informe um nome de setor com pelo menos 3 caracteres.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/departments", {
        tenantId: currentContext.tenantId,
      });

      const response = await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            name: departmentForm.name,
            description: departmentForm.description,
            employee_count: numberOrNull(departmentForm.employee_count),
            shift_pattern: departmentForm.shift_pattern,
            has_direct_leadership: departmentForm.has_direct_leadership,
            has_public_contact: departmentForm.has_public_contact,
            has_deadline_pressure: departmentForm.has_deadline_pressure,
            has_repetitive_work: departmentForm.has_repetitive_work,
            has_prolonged_sitting: departmentForm.has_prolonged_sitting,
            has_relevant_physical_effort: departmentForm.has_relevant_physical_effort,
            has_frequent_displacement: departmentForm.has_frequent_displacement,
            notes: departmentForm.notes,
            status: "active",
          }),
        },
        currentContext
      );

      const created = extractFirstEntity(response);
      const createdDepartmentId = firstString(created, ["id"]);

      if (createdDepartmentId) {
        setActivityForm((prev) => ({ ...prev, department_id: createdDepartmentId }));
      }

      await recordAuditEvent("department_created_from_workspace", {
        department_id: createdDepartmentId,
        establishment_id: currentContext.establishmentId,
        name: departmentForm.name,
      }, "formal");

      setDepartmentForm(INITIAL_DEPARTMENT_FORM);
      await reloadOperationalData(currentContext);
      setSuccessMessage("Setor cadastrado.");
      setFormStatus("saved");
    } catch (error) {
      setFormStatus("error");
      setFormError(error instanceof Error ? error.message : "Erro ao cadastrar setor.");
    }
  }

  async function handleCreateActivity(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormStatus("saving");
    setFormError(null);
    setSuccessMessage(null);

    const currentContext = contextRef.current;
    const departmentId = activityForm.department_id || firstString(departments[0], ["id"]) || "";

    if (!currentContext.tenantId || !currentContext.establishmentId) {
      setFormStatus("error");
      setFormError("Selecione um estabelecimento antes.");
      return;
    }

    if (!departmentId) {
      setFormStatus("error");
      setFormError("Cadastre ou selecione um setor antes.");
      return;
    }

    if (activityForm.name.trim().length < 3) {
      setFormStatus("error");
      setFormError("Informe uma atividade com pelo menos 3 caracteres.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/activities", {
        tenantId: currentContext.tenantId,
      });

      const response = await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            department_id: departmentId,
            name: activityForm.name,
            real_activity_description: activityForm.real_activity_description,
            frequency: activityForm.frequency,
            exposed_worker_count: numberOrNull(activityForm.exposed_worker_count),
            execution_location: activityForm.execution_location,
            uses_machine: activityForm.uses_machine,
            uses_chemical: activityForm.uses_chemical,
            has_public_contact: activityForm.has_public_contact,
            has_third_party_interaction: activityForm.has_third_party_interaction,
            notes: activityForm.notes,
            status: "active",
          }),
        },
        currentContext
      );

      const created = extractFirstEntity(response);
      const createdActivityId = firstString(created, ["id"]);

      await recordAuditEvent("activity_created_from_workspace", {
        activity_id: createdActivityId,
        establishment_id: currentContext.establishmentId,
        department_id: departmentId,
        name: activityForm.name,
      }, "formal");

      setActivityForm({ ...INITIAL_ACTIVITY_FORM, department_id: departmentId });
      await reloadOperationalData(currentContext);
      setSuccessMessage("Atividade cadastrada.");
      setFormStatus("saved");
    } catch (error) {
      setFormStatus("error");
      setFormError(error instanceof Error ? error.message : "Erro ao cadastrar atividade.");
    }
  }

  async function handleStartDiagnosisSession(): Promise<void> {
    setDiagnosisStatus("saving");
    setDiagnosisError(null);
    setDiagnosisSuccess(null);

    const currentContext = contextRef.current;
    const activityId = diagnosisActivityId || firstString(activities[0], ["id"]) || "";
    const selectedActivity = activities.find((item) => item.id === activityId) || activities[0] || null;
    const departmentId = firstString(selectedActivity, ["department_id"]) || firstString(departments[0], ["id"]) || "";

    if (!currentContext.tenantId || !currentContext.establishmentId) {
      setDiagnosisStatus("error");
      setDiagnosisError("Selecione um estabelecimento antes.");
      return;
    }

    if (!departmentId || !activityId) {
      setDiagnosisStatus("error");
      setDiagnosisError("Cadastre e selecione uma atividade vinculada a um setor.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/diagnosis-sessions", {
        tenantId: currentContext.tenantId,
      });

      const response = await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            department_id: departmentId,
            activity_id: activityId,
            current_stage: "psychosocial",
            status: "open",
          }),
        },
        currentContext
      );

      const sessionId = firstString(extractFirstEntity(response), ["id"]);

      if (!sessionId) {
        throw new Error("A rota nao retornou o id da sessao de diagnostico.");
      }

      setDiagnosisActivityId(activityId);
      setDiagnosisSessionId(sessionId);
      patchChecklist("diagnosis_started", true);

      await recordAuditEvent("diagnosis_session_started_from_workspace", {
        diagnosis_session_id: sessionId,
        establishment_id: currentContext.establishmentId,
        department_id: departmentId,
        activity_id: activityId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Sessao de diagnostico iniciada.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao iniciar diagnostico.");
    }
  }

  async function handleSaveDiagnosisContext(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setDiagnosisStatus("saving");
    setDiagnosisError(null);
    setDiagnosisSuccess(null);

    const currentContext = contextRef.current;

    if (!currentContext.tenantId || !currentContext.establishmentId || !diagnosisSessionId) {
      setDiagnosisStatus("error");
      setDiagnosisError("Inicie uma sessao de diagnostico antes.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/diagnosis-context", {
        tenantId: currentContext.tenantId,
      });

      await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            diagnosis_session_id: diagnosisSessionId,
            work_description: diagnosisContextForm.work_description,
            exposed_people_count: numberOrNull(diagnosisContextForm.exposed_people_count),
            work_routine_type: diagnosisContextForm.work_routine_type,
            process_changes_frequency: diagnosisContextForm.process_changes_frequency,
            has_external_work: diagnosisContextForm.has_external_work,
            has_multi_company_interaction: diagnosisContextForm.has_multi_company_interaction,
            incident_history: diagnosisContextForm.incident_history,
            notes: diagnosisContextForm.notes,
          }),
        },
        currentContext
      );

      await recordAuditEvent("diagnosis_context_saved_from_workspace", {
        diagnosis_session_id: diagnosisSessionId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Contexto do trabalho salvo.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao salvar contexto.");
    }
  }

  async function handleSavePsychosocialDiagnosis(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setDiagnosisStatus("saving");
    setDiagnosisError(null);
    setDiagnosisSuccess(null);

    const currentContext = contextRef.current;

    if (!currentContext.tenantId || !currentContext.establishmentId || !diagnosisSessionId) {
      setDiagnosisStatus("error");
      setDiagnosisError("Inicie uma sessao de diagnostico antes.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/diagnosis-psychosocial", {
        tenantId: currentContext.tenantId,
      });

      await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            diagnosis_session_id: diagnosisSessionId,
            has_work_overload: psychosocialForm.has_work_overload,
            has_excessive_pressure: psychosocialForm.has_excessive_pressure,
            has_role_ambiguity: psychosocialForm.has_role_ambiguity,
            has_low_autonomy: psychosocialForm.has_low_autonomy,
            has_leadership_support_failure: psychosocialForm.has_leadership_support_failure,
            has_peer_conflict: psychosocialForm.has_peer_conflict,
            has_hostile_public_contact: psychosocialForm.has_hostile_public_contact,
            has_constant_interruptions: psychosocialForm.has_constant_interruptions,
            has_task_accumulation: psychosocialForm.has_task_accumulation,
            has_communication_difficulty: psychosocialForm.has_communication_difficulty,
            has_remote_isolation: psychosocialForm.has_remote_isolation,
            has_badly_managed_change: psychosocialForm.has_badly_managed_change,
            has_report_channel: psychosocialForm.has_report_channel,
            notes: psychosocialForm.notes,
          }),
        },
        currentContext
      );

      await recordAuditEvent("diagnosis_psychosocial_saved_from_workspace", {
        diagnosis_session_id: diagnosisSessionId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Diagnostico psicossocial salvo.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao salvar diagnostico psicossocial.");
    }
  }

  async function handleCreatePsychosocialRisk(): Promise<void> {
    setDiagnosisStatus("saving");
    setDiagnosisError(null);
    setDiagnosisSuccess(null);

    const currentContext = contextRef.current;
    const activityId = diagnosisActivityId || firstString(activities[0], ["id"]) || "";
    const selectedActivity = activities.find((item) => item.id === activityId) || activities[0] || null;
    const departmentId = firstString(selectedActivity, ["department_id"]) || firstString(departments[0], ["id"]) || "";

    if (!currentContext.tenantId || !currentContext.establishmentId || !diagnosisSessionId) {
      setDiagnosisStatus("error");
      setDiagnosisError("Inicie uma sessao de diagnostico antes.");
      return;
    }

    if (!departmentId || !activityId) {
      setDiagnosisStatus("error");
      setDiagnosisError("Atividade ou setor nao resolvido.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/risks", {
        tenantId: currentContext.tenantId,
      });

      const response = await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            department_id: departmentId,
            activity_id: activityId,
            diagnosis_session_id: diagnosisSessionId,
            title: "Risco psicossocial identificado no diagnostico",
            risk_category: "psychosocial",
            hazard_description: "Indicadores psicossociais sinalizados no diagnostico guiado.",
            source_circumstance: "Diagnostico guiado psicossocial",
            exposed_group: "Trabalhadores da atividade analisada",
            possible_harms: "Estresse ocupacional, fadiga, sofrimento psiquico e reducao de desempenho.",
            existing_controls: "Controles ainda nao formalizados no sistema.",
            exposure_characterization: "Exposicao relacionada a organizacao do trabalho e interacoes da rotina.",
            severity_level: "medium",
            probability_level: "medium",
            risk_level: "medium",
            classification: "priorizar monitoramento",
            recommended_measure: "Revisar carga de trabalho, apoio da lideranca, canais de comunicacao e medidas preventivas.",
            suggested_responsible: "Gestao da empresa",
            suggested_deadline: isoDatePlusDays(30),
            status: "identified",
          }),
        },
        currentContext
      );

      const riskId = firstString(extractFirstEntity(response), ["id"]);

      if (!riskId) {
        throw new Error("A rota nao retornou o id do risco.");
      }

      setDiagnosisRiskId(riskId);

      await recordAuditEvent("psychosocial_risk_created_from_workspace", {
        diagnosis_session_id: diagnosisSessionId,
        risk_id: riskId,
        activity_id: activityId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Risco psicossocial gerado no inventario.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao gerar risco psicossocial.");
    }
  }
  const loadRisks = useCallback(async (nextContext: BackendContext): Promise<SimpleEntity[]> => {
    if (!nextContext.tenantId || !nextContext.establishmentId) return [];

    const path = buildUrl("/api/nr1/risks", {
      tenantId: nextContext.tenantId,
      establishmentId: nextContext.establishmentId,
    });

    const payload = await fetchJson(path, {}, nextContext);
    return extractArray<SimpleEntity>(payload, ["items", "risks", "data"]);
  }, []);

  const loadActionPlans = useCallback(
    async (nextContext: BackendContext, riskId?: string): Promise<SimpleEntity[]> => {
      if (!nextContext.tenantId || !nextContext.establishmentId) return [];

      const path = buildUrl("/api/nr1/action-plans", {
        tenantId: nextContext.tenantId,
        establishmentId: nextContext.establishmentId,
        riskId: riskId || undefined,
      });

      const payload = await fetchJson(path, {}, nextContext);
      return extractArray<SimpleEntity>(payload, ["items", "action_plans", "plans", "data"]);
    },
    []
  );

  const refreshRiskActionData = useCallback(
    async (riskId?: string): Promise<void> => {
      const currentContext = contextRef.current;

      if (!currentContext.tenantId || !currentContext.establishmentId) return;

      try {
        const loadedRisks = await loadRisks(currentContext);
        const effectiveRiskId = riskId || selectedRiskId || firstString(loadedRisks[0], ["id"]) || "";
        const loadedActionPlans = await loadActionPlans(currentContext, effectiveRiskId || undefined);

        setRisks(loadedRisks);
        setActionPlans(loadedActionPlans);

        if (effectiveRiskId) {
          setSelectedRiskId(effectiveRiskId);
          setActionPlanForm((prev) => ({
            ...prev,
            risk_id: prev.risk_id || effectiveRiskId,
          }));
        }
      } catch (error) {
        setActionPlanError(error instanceof Error ? error.message : "Erro ao carregar riscos e planos.");
      }
    },
    [loadActionPlans, loadRisks, selectedRiskId]
  );

  async function handleCreateActionPlan(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionPlanStatus("saving");
    setActionPlanError(null);
    setActionPlanSuccess(null);

    const currentContext = contextRef.current;
    const riskId = actionPlanForm.risk_id || selectedRiskId || firstString(risks[0], ["id"]) || "";

    if (!currentContext.tenantId || !currentContext.establishmentId) {
      setActionPlanStatus("error");
      setActionPlanError("Selecione um estabelecimento antes.");
      return;
    }

    if (!riskId) {
      setActionPlanStatus("error");
      setActionPlanError("Selecione um risco antes de criar o plano de acao.");
      return;
    }

    if (actionPlanForm.title.trim().length < 3) {
      setActionPlanStatus("error");
      setActionPlanError("Informe um titulo com pelo menos 3 caracteres.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/action-plans", {
        tenantId: currentContext.tenantId,
      });

      const response = await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            risk_id: riskId,
            title: actionPlanForm.title,
            description: actionPlanForm.description,
            measure_type: actionPlanForm.measure_type,
            priority: actionPlanForm.priority,
            status: actionPlanForm.status || "open",
            due_date: actionPlanForm.due_date || isoDatePlusDays(30),
            responsible_name: actionPlanForm.responsible_name,
            responsible_user_id: null,
            monitoring_method: actionPlanForm.monitoring_method,
            evidence_method: actionPlanForm.evidence_method,
            completion_indicator: actionPlanForm.completion_indicator,
            notes: actionPlanForm.notes,
          }),
        },
        currentContext
      );

      const createdPlanId = firstString(extractFirstEntity(response), ["id"]);

      await recordAuditEvent(
        "action_plan_created_from_workspace",
        {
          action_plan_id: createdPlanId,
          risk_id: riskId,
          establishment_id: currentContext.establishmentId,
          due_date: actionPlanForm.due_date || isoDatePlusDays(30),
        },
        "formal"
      );

      await refreshRiskActionData(riskId);
      await refreshAuditEvents();

      setActionPlanForm({
        ...INITIAL_ACTION_PLAN_FORM,
        risk_id: riskId,
        due_date: isoDatePlusDays(30),
      });
      setActionPlanSuccess("Plano de acao criado e vinculado ao risco.");
      setActionPlanStatus("saved");
    } catch (error) {
      setActionPlanStatus("error");
      setActionPlanError(error instanceof Error ? error.message : "Erro ao criar plano de acao.");
    }
  }

  useEffect(() => {
    if (context.tenantId && context.establishmentId) {
      void refreshRiskActionData(selectedRiskId);
    }
  }, [context.tenantId, context.establishmentId]);
  useEffect(() => {
    let cancelled = false;

    async function boot(): Promise<void> {
      setSaveStatus("loading");
      setLoadError(null);

      try {
        const resolvedContext = await resolveContext();
        const loadedCompanies = await loadCompanies(resolvedContext);

        const firstCompanyId = firstString(loadedCompanies[0], ["id"]) || "";
        if (firstCompanyId) {
          setActiveCompanyId(firstCompanyId);
          setEstablishmentForm((prev) => ({ ...prev, company_id: firstCompanyId }));
        }

        const loadedEstablishments = await loadEstablishments(resolvedContext);
        const fallbackEstablishmentId =
          resolvedContext.establishmentId ||
          firstString(loadedEstablishments[0], ["id"]);

        const selectedEstablishmentCompanyId =
          firstString(loadedEstablishments.find((item) => item.id === fallbackEstablishmentId), ["company_id"]) ||
          firstString(loadedEstablishments[0], ["company_id"]) ||
          firstCompanyId;

        if (selectedEstablishmentCompanyId) {
          setActiveCompanyId(selectedEstablishmentCompanyId);
          setEstablishmentForm((prev) => ({ ...prev, company_id: selectedEstablishmentCompanyId }));
        }

        const nextContext = {
          tenantId: resolvedContext.tenantId,
          establishmentId: fallbackEstablishmentId,
        };

        const [loadedDepartments, loadedActivities, loadedDraft, loadedAuditEvents] =
          await Promise.all([
            loadDepartments(nextContext),
            loadActivities(nextContext),
            loadDraftState(nextContext),
            loadAuditEvents(nextContext),
          ]);

        if (cancelled) return;

        setContext(nextContext);
        setCompanies(loadedCompanies);
        setEstablishments(loadedEstablishments);
        setDepartments(loadedDepartments);
        setActivities(loadedActivities);
        setDraft(loadedDraft);
        setAuditEvents(loadedAuditEvents);

        const firstDepartmentId = firstString(loadedDepartments[0], ["id"]);
        if (firstDepartmentId) {
          setActivityForm((prev) => ({ ...prev, department_id: firstDepartmentId }));
        }

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
    loadCompanies,
    loadDepartments,
    loadDraftState,
    loadEstablishments,
    recordAuditEvent,
    refreshAuditEvents,
    resolveContext,
  ]);

  const checklistItems = [
    ["company_checked", "Empresa revisada"],
    ["establishment_checked", "Estabelecimento selecionado"],
    ["departments_checked", "Setores cadastrados"],
    ["activities_checked", "Atividades cadastradas"],
    ["diagnosis_started", "Diagnostico iniciado"],
    ["evidence_pending", "Evidencias pendentes mapeadas"],
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">ICANHELP NR1</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Workspace operacional SST</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Cadastre empresa, estabelecimento, setores e atividades. Estes registros sustentam o diagnostico guiado, inventario de riscos e plano de acao.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm">
            <p className="font-medium text-slate-700">Status da base</p>
            <p className="mt-1 text-slate-600">{statusLabel}</p>
            <p className="mt-1 text-xs text-slate-500">
              {lastSavedAt ? `Ultimo autosave: ${new Date(lastSavedAt).toLocaleTimeString("pt-BR")}` : "Autosave aguardando edicao"}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 xl:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <p className="text-sm text-slate-300">Progresso do workspace</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{progressPercent}%</p>
          </div>

          <nav className="mt-5 space-y-2">
            {[
              ["cadastros", "Cadastros"],
              ["diagnostico", "Diagnostico"],
              ["riscos", "Riscos e planos"],
              ["auditoria", "Trilha"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => patchDraft({ activeSection: key }, `section_${key}`)}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  draft.activeSection === key
                    ? "bg-cyan-100 text-cyan-900"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-5 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold">Checklist</p>
            {checklistItems.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(draft.checklist[key])}
                  onChange={(event) => patchChecklist(key, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Diagnostico de sessao</p>
                <h2 className="mt-2 text-lg font-semibold">
                  {sessionDebug.hasAccessToken ? "Sessao Supabase detectada" : "Sessao Supabase ausente"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Checked: {String(sessionDebug.checked)} / Session: {String(sessionDebug.hasSession)} / Token: {String(sessionDebug.hasAccessToken)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Email: {sessionDebug.userEmail || "nao identificado"} / Token: {sessionDebug.tokenPreview || "sem token"}
                </p>
                {sessionDebug.error ? (
                  <p className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{sessionDebug.error}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void refreshSessionDebug()}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Verificar sessao
              </button>
            </div>
          </div>
          {loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {loadError}
            </div>
          ) : null}

          {formError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {formError}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {successMessage}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Empresas</p>
              <p className="mt-2 text-3xl font-semibold">{companies.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Estabelecimentos</p>
              <p className="mt-2 text-3xl font-semibold">{establishments.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Setores</p>
              <p className="mt-2 text-3xl font-semibold">{departments.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Atividades</p>
              <p className="mt-2 text-3xl font-semibold">{activities.length}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">Empresa ativa</p>
                <select
                  value={activeCompanyId}
                  onChange={(event) => {
                    setActiveCompanyId(event.target.value);
                    setEstablishmentForm((prev) => ({ ...prev, company_id: event.target.value }));
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma empresa</option>
                  {companies.map((item, index) => (
                    <option key={item.id || index} value={item.id || ""}>
                      {displayName(item, `Empresa ${index + 1}`)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">{selectedCompany ? `ID: ${selectedCompany.id}` : "Nenhuma empresa selecionada"}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700">Estabelecimento ativo</p>
                <select
                  value={context.establishmentId || ""}
                  onChange={(event) => void selectEstablishment(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecione um estabelecimento</option>
                  {establishments.map((item, index) => (
                    <option key={item.id || index} value={item.id || ""}>
                      {displayName(item, `Estabelecimento ${index + 1}`)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">{selectedEstablishment ? `ID: ${selectedEstablishment.id}` : "Nenhum estabelecimento selecionado"}</p>
              </div>
            </div>
          </section>

          {draft.activeSection === "cadastros" ? (
            <section className="grid gap-6 xl:grid-cols-2">
              <form onSubmit={handleCreateCompany} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold">1. Empresa</h2>
                <p className="mt-1 text-sm text-slate-500">Contrato: POST /api/nr1/companies?tenantId=...</p>

                <div className="mt-5 grid gap-3">
                  <input
                    value={companyForm.legal_name}
                    onChange={(event) => setCompanyForm((prev) => ({ ...prev, legal_name: event.target.value }))}
                    placeholder="Razao social"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={companyForm.trade_name}
                    onChange={(event) => setCompanyForm((prev) => ({ ...prev, trade_name: event.target.value }))}
                    placeholder="Nome fantasia"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={companyForm.cnpj}
                      onChange={(event) => setCompanyForm((prev) => ({ ...prev, cnpj: event.target.value }))}
                      placeholder="CNPJ"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={companyForm.employee_count}
                      onChange={(event) => setCompanyForm((prev) => ({ ...prev, employee_count: event.target.value }))}
                      placeholder="Numero de empregados"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={companyForm.company_size}
                      onChange={(event) => setCompanyForm((prev) => ({ ...prev, company_size: event.target.value }))}
                      placeholder="Porte"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={companyForm.risk_grade}
                      onChange={(event) => setCompanyForm((prev) => ({ ...prev, risk_grade: event.target.value }))}
                      placeholder="Grau de risco"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    {[
                      ["has_cipa", "Possui CIPA"],
                      ["has_sesmt", "Possui SESMT"],
                      ["has_remote_work", "Trabalho remoto"],
                      ["has_third_parties", "Terceiros"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(companyForm[key as keyof CompanyForm])}
                          onChange={(event) => setCompanyForm((prev) => ({ ...prev, [key]: event.target.checked }))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formStatus === "saving"}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Cadastrar empresa
                </button>
              </form>

              <form onSubmit={handleCreateEstablishment} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold">2. Estabelecimento</h2>
                <p className="mt-1 text-sm text-slate-500">Contrato: POST /api/nr1/establishments?tenantId=...</p>

                <div className="mt-5 grid gap-3">
                  <select
                    value={establishmentForm.company_id || activeCompanyId}
                    onChange={(event) => setEstablishmentForm((prev) => ({ ...prev, company_id: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Empresa vinculada</option>
                    {companies.map((item, index) => (
                      <option key={item.id || index} value={item.id || ""}>
                        {displayName(item, `Empresa ${index + 1}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={establishmentForm.name}
                    onChange={(event) => setEstablishmentForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Nome do estabelecimento"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={establishmentForm.city}
                      onChange={(event) => setEstablishmentForm((prev) => ({ ...prev, city: event.target.value }))}
                      placeholder="Cidade"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={establishmentForm.state}
                      onChange={(event) => setEstablishmentForm((prev) => ({ ...prev, state: event.target.value }))}
                      placeholder="UF"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <input
                    value={establishmentForm.employee_count}
                    onChange={(event) => setEstablishmentForm((prev) => ({ ...prev, employee_count: event.target.value }))}
                    placeholder="Numero de empregados"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={establishmentForm.notes}
                    onChange={(event) => setEstablishmentForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Observacoes"
                    rows={3}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formStatus === "saving"}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Cadastrar estabelecimento
                </button>
              </form>

              <form onSubmit={handleCreateDepartment} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold">3. Setor</h2>
                <p className="mt-1 text-sm text-slate-500">Contrato: POST /api/nr1/departments?tenantId=...</p>

                <div className="mt-5 grid gap-3">
                  <input
                    value={departmentForm.name}
                    onChange={(event) => setDepartmentForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Nome do setor"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={departmentForm.employee_count}
                    onChange={(event) => setDepartmentForm((prev) => ({ ...prev, employee_count: event.target.value }))}
                    placeholder="Numero de trabalhadores"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={departmentForm.shift_pattern}
                    onChange={(event) => setDepartmentForm((prev) => ({ ...prev, shift_pattern: event.target.value }))}
                    placeholder="Turno / jornada"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={departmentForm.description}
                    onChange={(event) => setDepartmentForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Descricao do setor"
                    rows={3}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    {[
                      ["has_direct_leadership", "Lideranca direta"],
                      ["has_public_contact", "Contato com publico"],
                      ["has_deadline_pressure", "Pressao de prazo"],
                      ["has_repetitive_work", "Trabalho repetitivo"],
                      ["has_prolonged_sitting", "Sentado prolongado"],
                      ["has_relevant_physical_effort", "Esforco fisico"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(departmentForm[key as keyof DepartmentForm])}
                          onChange={(event) => setDepartmentForm((prev) => ({ ...prev, [key]: event.target.checked }))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formStatus === "saving"}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Cadastrar setor
                </button>
              </form>

              <form onSubmit={handleCreateActivity} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold">4. Atividade</h2>
                <p className="mt-1 text-sm text-slate-500">Contrato: POST /api/nr1/activities?tenantId=...</p>

                <div className="mt-5 grid gap-3">
                  <select
                    value={activityForm.department_id}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, department_id: event.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Setor vinculado</option>
                    {departments.map((item, index) => (
                      <option key={item.id || index} value={item.id || ""}>
                        {displayName(item, `Setor ${index + 1}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={activityForm.name}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Nome da atividade"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={activityForm.real_activity_description}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, real_activity_description: event.target.value }))}
                    placeholder="Descricao real da atividade"
                    rows={3}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={activityForm.frequency}
                      onChange={(event) => setActivityForm((prev) => ({ ...prev, frequency: event.target.value }))}
                      placeholder="Frequencia"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={activityForm.exposed_worker_count}
                      onChange={(event) => setActivityForm((prev) => ({ ...prev, exposed_worker_count: event.target.value }))}
                      placeholder="Trabalhadores expostos"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <input
                    value={activityForm.execution_location}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, execution_location: event.target.value }))}
                    placeholder="Local de execucao"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    {[
                      ["uses_machine", "Usa maquina"],
                      ["uses_chemical", "Usa quimico"],
                      ["has_public_contact", "Contato com publico"],
                      ["has_third_party_interaction", "Interacao com terceiros"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(activityForm[key as keyof ActivityForm])}
                          onChange={(event) => setActivityForm((prev) => ({ ...prev, [key]: event.target.checked }))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formStatus === "saving"}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Cadastrar atividade
                </button>
              </form>
            </section>
          ) : null}

          {draft.activeSection === "diagnostico" ? (
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Diagnostico Guiado NR1/Pasini</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                      Fluxo real: atividade cadastrada, sessao de diagnostico, contexto do trabalho, sinais psicossociais e risco gerado no inventario.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-medium">Status do diagnostico</p>
                    <p className="mt-1 text-slate-600">{diagnosisStatus}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {diagnosisSessionId ? `Sessao: ${diagnosisSessionId}` : "Sessao ainda nao iniciada"}
                    </p>
                  </div>
                </div>

                {diagnosisError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {diagnosisError}
                  </div>
                ) : null}

                {diagnosisSuccess ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    {diagnosisSuccess}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Atividade analisada</label>
                    <select
                      value={diagnosisActivityId || firstString(activities[0], ["id"]) || ""}
                      onChange={(event) => setDiagnosisActivityId(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione uma atividade</option>
                      {activities.map((item, index) => (
                        <option key={item.id || index} value={item.id || ""}>
                          {displayName(item, `Atividade ${index + 1}`)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      A sessao exige estabelecimento, setor e atividade reais.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleStartDiagnosisSession()}
                    disabled={diagnosisStatus === "saving"}
                    className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
                  >
                    Iniciar diagnostico
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveDiagnosisContext} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">1. Contexto do trabalho</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Registra a rotina real antes da avaliacao psicossocial.
                </p>

                <div className="mt-5 grid gap-3">
                  <textarea
                    value={diagnosisContextForm.work_description}
                    onChange={(event) => setDiagnosisContextForm((prev) => ({ ...prev, work_description: event.target.value }))}
                    rows={4}
                    placeholder="Descreva a rotina, demandas, picos, interacoes e pressao operacional."
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      value={diagnosisContextForm.exposed_people_count}
                      onChange={(event) => setDiagnosisContextForm((prev) => ({ ...prev, exposed_people_count: event.target.value }))}
                      placeholder="Pessoas expostas"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={diagnosisContextForm.work_routine_type}
                      onChange={(event) => setDiagnosisContextForm((prev) => ({ ...prev, work_routine_type: event.target.value }))}
                      placeholder="Tipo de rotina"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={diagnosisContextForm.process_changes_frequency}
                      onChange={(event) => setDiagnosisContextForm((prev) => ({ ...prev, process_changes_frequency: event.target.value }))}
                      placeholder="Frequencia de mudancas"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    value={diagnosisContextForm.incident_history}
                    onChange={(event) => setDiagnosisContextForm((prev) => ({ ...prev, incident_history: event.target.value }))}
                    rows={3}
                    placeholder="Historico de incidentes, queixas, afastamentos ou sinais observados."
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={diagnosisContextForm.notes}
                    onChange={(event) => setDiagnosisContextForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={3}
                    placeholder="Observacoes complementares."
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={diagnosisContextForm.has_external_work}
                        onChange={(event) => setDiagnosisContextForm((prev) => ({ ...prev, has_external_work: event.target.checked }))}
                      />
                      <span>Ha trabalho externo</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={diagnosisContextForm.has_multi_company_interaction}
                        onChange={(event) => setDiagnosisContextForm((prev) => ({ ...prev, has_multi_company_interaction: event.target.checked }))}
                      />
                      <span>Ha interacao com outras empresas</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={diagnosisStatus === "saving" || !diagnosisSessionId}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Salvar contexto
                </button>
              </form>

              <form onSubmit={handleSavePsychosocialDiagnosis} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">2. Sinais psicossociais</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Marque os fatores observados. O objetivo e registrar indicios para tratamento tecnico posterior.
                </p>

                <div className="mt-5 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  {[
                    ["has_work_overload", "Sobrecarga de trabalho"],
                    ["has_excessive_pressure", "Pressao excessiva"],
                    ["has_role_ambiguity", "Ambiguidade de papel"],
                    ["has_low_autonomy", "Baixa autonomia"],
                    ["has_leadership_support_failure", "Falha de apoio da lideranca"],
                    ["has_peer_conflict", "Conflito entre pares"],
                    ["has_hostile_public_contact", "Contato hostil com publico"],
                    ["has_constant_interruptions", "Interrupcoes constantes"],
                    ["has_task_accumulation", "Acumulo de tarefas"],
                    ["has_communication_difficulty", "Dificuldade de comunicacao"],
                    ["has_remote_isolation", "Isolamento no trabalho remoto"],
                    ["has_badly_managed_change", "Mudanca mal gerida"],
                    ["has_report_channel", "Existe canal de relato"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(psychosocialForm[key as keyof PsychosocialForm])}
                        onChange={(event) => setPsychosocialForm((prev) => ({ ...prev, [key]: event.target.checked }))}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                <textarea
                  value={psychosocialForm.notes}
                  onChange={(event) => setPsychosocialForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={4}
                  placeholder="Comentarios tecnicos sobre os sinais psicossociais."
                  className="mt-5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />

                <button
                  type="submit"
                  disabled={diagnosisStatus === "saving" || !diagnosisSessionId}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Salvar psicossocial
                </button>
              </form>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">3. Encaminhar para inventario de riscos</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Cria um risco psicossocial vinculado a atividade, setor, estabelecimento e sessao de diagnostico.
                </p>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  A data sugerida sera gravada em formato ISO, conforme contrato real da rota de riscos.
                </div>

                <button
                  type="button"
                  onClick={() => void handleCreatePsychosocialRisk()}
                  disabled={diagnosisStatus === "saving" || !diagnosisSessionId}
                  className="mt-5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  Gerar risco psicossocial
                </button>

                {diagnosisRiskId ? (
                  <p className="mt-3 text-sm text-slate-600">Risco criado: {diagnosisRiskId}</p>
                ) : null}
              </div>
            </section>
          ) : null}

          {draft.activeSection === "riscos" ? (
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Inventario de riscos e plano de acao</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                      Liste riscos do estabelecimento, selecione um risco psicossocial e crie um plano de acao vinculado ao risk_id.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshRiskActionData(selectedRiskId)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Atualizar riscos
                  </button>
                </div>

                {actionPlanError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {actionPlanError}
                  </div>
                ) : null}

                {actionPlanSuccess ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    {actionPlanSuccess}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Riscos encontrados</p>
                    <p className="mt-2 text-3xl font-semibold">{risks.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Planos do risco selecionado</p>
                    <p className="mt-2 text-3xl font-semibold">{actionPlans.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Status</p>
                    <p className="mt-2 text-lg font-semibold">{actionPlanStatus}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">1. Selecionar risco</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    O plano de acao sempre precisa nascer vinculado a um risco.
                  </p>

                  <select
                    value={selectedRiskId || firstString(risks[0], ["id"]) || ""}
                    onChange={(event) => {
                      setSelectedRiskId(event.target.value);
                      setActionPlanForm((prev) => ({ ...prev, risk_id: event.target.value }));
                      void refreshRiskActionData(event.target.value);
                    }}
                    className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Selecione um risco</option>
                    {risks.map((item, index) => (
                      <option key={item.id || index} value={item.id || ""}>
                        {firstString(item, ["title", "hazard_description", "risk_category"]) || `Risco ${index + 1}`}
                      </option>
                    ))}
                  </select>

                  <div className="mt-5 space-y-3">
                    {risks.length === 0 ? (
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        Nenhum risco retornado para este estabelecimento.
                      </p>
                    ) : (
                      risks.map((item, index) => (
                        <button
                          key={item.id || index}
                          type="button"
                          onClick={() => {
                            const riskId = item.id || "";
                            setSelectedRiskId(riskId);
                            setActionPlanForm((prev) => ({ ...prev, risk_id: riskId }));
                            void refreshRiskActionData(riskId);
                          }}
                          className={`w-full rounded-2xl border p-4 text-left text-sm transition ${
                            selectedRiskId === item.id
                              ? "border-cyan-300 bg-cyan-50"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <p className="font-medium">
                            {firstString(item, ["title", "hazard_description"]) || `Risco ${index + 1}`}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Categoria: {firstString(item, ["risk_category"]) || "nao informada"} / Nivel: {firstString(item, ["risk_level"]) || "nao informado"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            ID: {item.id || "sem id"}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <form onSubmit={handleCreateActionPlan} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">2. Criar plano de acao</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Contrato real: establishment_id, risk_id e title sao obrigatorios.
                  </p>

                  <div className="mt-5 grid gap-3">
                    <input
                      value={actionPlanForm.title}
                      onChange={(event) => setActionPlanForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Titulo do plano de acao"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <textarea
                      value={actionPlanForm.description}
                      onChange={(event) => setActionPlanForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Descricao da medida a ser adotada"
                      rows={4}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={actionPlanForm.measure_type}
                        onChange={(event) => setActionPlanForm((prev) => ({ ...prev, measure_type: event.target.value }))}
                        placeholder="Tipo da medida"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={actionPlanForm.priority}
                        onChange={(event) => setActionPlanForm((prev) => ({ ...prev, priority: event.target.value }))}
                        placeholder="Prioridade"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={actionPlanForm.status}
                        onChange={(event) => setActionPlanForm((prev) => ({ ...prev, status: event.target.value }))}
                        placeholder="Status"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        type="date"
                        value={actionPlanForm.due_date}
                        onChange={(event) => setActionPlanForm((prev) => ({ ...prev, due_date: event.target.value }))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={actionPlanForm.responsible_name}
                        onChange={(event) => setActionPlanForm((prev) => ({ ...prev, responsible_name: event.target.value }))}
                        placeholder="Responsavel"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <textarea
                      value={actionPlanForm.monitoring_method}
                      onChange={(event) => setActionPlanForm((prev) => ({ ...prev, monitoring_method: event.target.value }))}
                      placeholder="Como sera monitorado"
                      rows={3}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <textarea
                      value={actionPlanForm.evidence_method}
                      onChange={(event) => setActionPlanForm((prev) => ({ ...prev, evidence_method: event.target.value }))}
                      placeholder="Qual evidencia comprovara a acao"
                      rows={3}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <textarea
                      value={actionPlanForm.completion_indicator}
                      onChange={(event) => setActionPlanForm((prev) => ({ ...prev, completion_indicator: event.target.value }))}
                      placeholder="Indicador de conclusao"
                      rows={3}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <textarea
                      value={actionPlanForm.notes}
                      onChange={(event) => setActionPlanForm((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Observacoes"
                      rows={3}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionPlanStatus === "saving"}
                    className="mt-5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    Criar plano vinculado ao risco
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">Planos do risco selecionado</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Lista retornada por /api/nr1/action-plans filtrada por riskId.
                </p>

                <div className="mt-5 space-y-3">
                  {actionPlans.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Nenhum plano de acao retornado para o risco selecionado.
                    </p>
                  ) : (
                    actionPlans.map((item, index) => (
                      <div key={item.id || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-medium">{firstString(item, ["title", "description"]) || `Plano ${index + 1}`}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Responsavel: {firstString(item, ["responsible_name"]) || "nao informado"}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            Prazo: {firstString(item, ["due_date"]) || "sem prazo"}
                          </p>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Status: {firstString(item, ["status"]) || "nao informado"} / Prioridade: {firstString(item, ["priority"]) || "nao informada"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}
          {draft.activeSection === "auditoria" ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Trilha auditavel</h2>
                  <p className="mt-1 text-sm text-slate-500">Eventos reais de rascunho e cadastro.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void refreshAuditEvents()}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Atualizar
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {auditEvents.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Nenhum evento retornado ainda.
                  </p>
                ) : (
                  auditEvents.map((event, index) => (
                    <div key={event.id || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <p className="font-medium">{event.event_type || "evento"}</p>
                        <p className="text-xs text-slate-500">
                          {event.created_at ? new Date(event.created_at).toLocaleString("pt-BR") : "sem data"}
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
          ) : null}

          <section className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">Empresas cadastradas</h3>
              <div className="mt-4 space-y-3">
                {companies.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma empresa cadastrada.</p>
                ) : (
                  companies.map((item, index) => (
                    <div key={item.id || index} className="rounded-2xl bg-slate-50 p-3 text-sm">
                      <p className="font-medium">{displayName(item, `Empresa ${index + 1}`)}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.cnpj ? `CNPJ: ${String(item.cnpj)}` : "Sem CNPJ"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">Setores cadastrados</h3>
              <div className="mt-4 space-y-3">
                {departments.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum setor cadastrado neste estabelecimento.</p>
                ) : (
                  departments.map((item, index) => (
                    <div key={item.id || index} className="rounded-2xl bg-slate-50 p-3 text-sm">
                      <p className="font-medium">{displayName(item, `Setor ${index + 1}`)}</p>
                      <p className="mt-1 text-xs text-slate-500">ID: {item.id || "sem id"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">Atividades cadastradas</h3>
              <div className="mt-4 space-y-3">
                {activities.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma atividade cadastrada neste estabelecimento.</p>
                ) : (
                  activities.map((item, index) => (
                    <div key={item.id || index} className="rounded-2xl bg-slate-50 p-3 text-sm">
                      <p className="font-medium">{displayName(item, `Atividade ${index + 1}`)}</p>
                      <p className="mt-1 text-xs text-slate-500">Setor: {item.department_id || "nao informado"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}






