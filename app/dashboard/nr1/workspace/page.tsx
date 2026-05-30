"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getNr1PlanFeatures, type Nr1PlanFeaturesResponse } from "@/lib/nr1-plan-features-client";
import Nr1PgrReportShortcut from "@/components/nr1/Nr1PgrReportShortcut";

type JsonObject = Record<string, unknown>;

type SaveStatus = "idle" | "loading" | "dirty" | "saving" | "saved" | "save_error";
type FormStatus = "idle" | "saving" | "saved" | "error";
type CnpjLookupStatus = "idle" | "loading" | "ready" | "error";
type GuidedSetupChoice = "undecided" | "review" | "dashboard";
type GuidedStepKey = "empresa" | "estabelecimento" | "setor" | "atividade";

type SessionDebugState = {
  checked: boolean;
  hasSession: boolean;
  hasAccessToken: boolean;
  userEmail: string;
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


type DiagnosisFqbForm = {
  has_noise: boolean;
  has_heat_or_cold: boolean;
  has_vibration: boolean;
  has_dust_fume_gas_vapor_mist: boolean;
  has_chemical_contact: boolean;
  has_biological_agent: boolean;
  has_environmental_monitoring: boolean;
  has_existing_control: boolean;
  notes: string;
};

type DiagnosisAccidentsForm = {
  has_same_level_fall: boolean;
  has_height_fall: boolean;
  has_electricity: boolean;
  has_moving_parts_machine: boolean;
  has_vehicle_flow: boolean;
  has_hot_surfaces: boolean;
  has_fire_explosion: boolean;
  has_sharps: boolean;
  has_confined_space: boolean;
  has_obvious_risk: boolean;
  obvious_risk_description: string;
  immediate_measure: string;
  immediate_responsible: string;
  immediate_date: string;
  notes: string;
};

type DiagnosisErgonomicsForm = {
  has_prolonged_sitting: boolean;
  has_prolonged_standing: boolean;
  has_forced_posture: boolean;
  has_repetitive_movements: boolean;
  has_manual_handling: boolean;
  furniture_adequacy: string;
  lighting_adequacy: string;
  thermal_discomfort: boolean;
  acoustic_discomfort: boolean;
  has_existing_aep: boolean;
  notes: string;
};

type DiagnosisControlsForm = {
  has_collective_controls: boolean;
  collective_controls_description: string;
  has_administrative_controls: boolean;
  administrative_controls_description: string;
  has_written_procedure: boolean;
  has_worker_guidance: boolean;
  has_epi: boolean;
  controls_effectiveness: string;
  controls_maintenance: string;
  notes: string;
};

type DiagnosisReviewForm = {
  preliminary_priority: string;
  reviewer_comment: string;
  reviewed_at: string;
};
type RiskForm = {
  department_id: string;
  activity_id: string;
  title: string;
  risk_category: string;
  hazard_description: string;
  source_circumstance: string;
  exposed_group: string;
  possible_harms: string;
  existing_controls: string;
  exposure_characterization: string;
  severity_level: string;
  probability_level: string;
  risk_level: string;
  classification: string;
  recommended_measure: string;
  suggested_responsible: string;
  suggested_deadline: string;
  status: string;
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


const INITIAL_DIAGNOSIS_FQB_FORM: DiagnosisFqbForm = {
  has_noise: false,
  has_heat_or_cold: false,
  has_vibration: false,
  has_dust_fume_gas_vapor_mist: false,
  has_chemical_contact: false,
  has_biological_agent: false,
  has_environmental_monitoring: false,
  has_existing_control: false,
  notes: "",
};

const INITIAL_DIAGNOSIS_ACCIDENTS_FORM: DiagnosisAccidentsForm = {
  has_same_level_fall: false,
  has_height_fall: false,
  has_electricity: false,
  has_moving_parts_machine: false,
  has_vehicle_flow: false,
  has_hot_surfaces: false,
  has_fire_explosion: false,
  has_sharps: false,
  has_confined_space: false,
  has_obvious_risk: false,
  obvious_risk_description: "",
  immediate_measure: "",
  immediate_responsible: "",
  immediate_date: "",
  notes: "",
};

const INITIAL_DIAGNOSIS_ERGONOMICS_FORM: DiagnosisErgonomicsForm = {
  has_prolonged_sitting: false,
  has_prolonged_standing: false,
  has_forced_posture: false,
  has_repetitive_movements: false,
  has_manual_handling: false,
  furniture_adequacy: "",
  lighting_adequacy: "",
  thermal_discomfort: false,
  acoustic_discomfort: false,
  has_existing_aep: false,
  notes: "",
};

const INITIAL_DIAGNOSIS_CONTROLS_FORM: DiagnosisControlsForm = {
  has_collective_controls: false,
  collective_controls_description: "",
  has_administrative_controls: false,
  administrative_controls_description: "",
  has_written_procedure: false,
  has_worker_guidance: false,
  has_epi: false,
  controls_effectiveness: "",
  controls_maintenance: "",
  notes: "",
};

const INITIAL_DIAGNOSIS_REVIEW_FORM: DiagnosisReviewForm = {
  preliminary_priority: "medium",
  reviewer_comment: "",
  reviewed_at: "",
};
const INITIAL_RISK_FORM: RiskForm = {
  department_id: "",
  activity_id: "",
  title: "",
  risk_category: "psychosocial",
  hazard_description: "",
  source_circumstance: "",
  exposed_group: "",
  possible_harms: "",
  existing_controls: "",
  exposure_characterization: "",
  severity_level: "medium",
  probability_level: "medium",
  risk_level: "medium",
  classification: "medium",
  recommended_measure: "",
  suggested_responsible: "",
  suggested_deadline: "",
  status: "identified",
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

function tenantRolePriority(value: unknown): number {
  const role = stringOrNull(value)?.toLowerCase();

  if (role === "owner") return 0;
  if (role === "admin") return 1;
  if (role) return 2;

  return 3;
}

function isUuid(value: string | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

type TenantCandidate = {
  tenantId: string;
  role: string | null;
  priority: number;
  index: number;
};

function tenantIdFromCandidate(candidate: unknown): string | null {
  const explicit =
    firstString(candidate, ["tenant_id", "tenantId", "active_tenant_id", "activeTenantId"]) ||
    nestedString(candidate, ["tenant", "tenant_id"]) ||
    nestedString(candidate, ["tenant", "tenantId"]) ||
    nestedString(candidate, ["membership", "tenant_id"]) ||
    nestedString(candidate, ["membership", "tenantId"]) ||
    nestedString(candidate, ["membership", "tenant", "tenant_id"]) ||
    nestedString(candidate, ["membership", "tenant", "tenantId"]);

  if (isUuid(explicit)) return explicit;

  const tenantObjectId =
    nestedString(candidate, ["tenant", "id"]) ||
    nestedString(candidate, ["activeTenant", "id"]) ||
    nestedString(candidate, ["active_tenant", "id"]) ||
    nestedString(candidate, ["currentTenant", "id"]) ||
    nestedString(candidate, ["selectedTenant", "id"]) ||
    nestedString(candidate, ["membership", "tenant", "id"]);

  if (isUuid(tenantObjectId)) return tenantObjectId;

  const genericId = firstString(candidate, ["id"]);

  return isUuid(genericId) ? genericId : null;
}

function extractTenantCandidatesFromPayload(payload: unknown): TenantCandidate[] {
  const candidates: TenantCandidate[] = [];
  const visited = new Set<unknown>();

  const addCandidate = (candidate: unknown): void => {
    const tenantId = tenantIdFromCandidate(candidate);

    if (!tenantId || candidates.some((item) => item.tenantId === tenantId)) return;

    const role =
      firstString(candidate, ["role", "membershipRole", "membership_role"]) ||
      nestedString(candidate, ["membership", "role"]) ||
      nestedString(candidate, ["tenant", "role"]);

    candidates.push({
      tenantId,
      role,
      priority: tenantRolePriority(role),
      index: candidates.length,
    });
  };

  const collect = (candidate: unknown): void => {
    if (!candidate) return;

    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        collect(item);
      }
      return;
    }

    if (!isRecord(candidate) || visited.has(candidate)) return;

    visited.add(candidate);
    addCandidate(candidate);

    for (const key of [
      "activeTenant",
      "active_tenant",
      "currentTenant",
      "current_tenant",
      "selectedTenant",
      "selected_tenant",
      "tenant",
      "current",
      "membership",
      "memberships",
      "items",
      "tenants",
      "data",
      "result",
    ]) {
      collect(candidate[key]);
    }

    for (const value of Object.values(candidate)) {
      if (Array.isArray(value) || isRecord(value)) {
        collect(value);
      }
    }
  };

  collect(payload);

  return candidates.sort((left, right) => left.priority - right.priority || left.index - right.index);
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


function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidCnpj(value: string): boolean {
  const digits = normalizeCnpj(value);

  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calculateDigit = (base: string, weights: number[]): number => {
    const sum = weights.reduce((acc, weight, index) => acc + Number(base[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return firstDigit === Number(digits[12]) && secondDigit === Number(digits[13]);
}

function normalizeCnae(value: string): string {
  return value.replace(/\D/g, "");
}

const LOCAL_CNPJ_LOOKUP_STUBS: Record<string, Partial<CompanyForm>> = {
  "12345678000195": {
    legal_name: "EMPRESA EXEMPLO PARA TRIAGEM NR-1 LTDA",
    trade_name: "Empresa Exemplo NR-1",
    cnae_main: "6201501",
    company_size: "EPP",
  },
};
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

function resolvePreferredCompanyId({
  preferredCompanyId,
  currentActiveCompanyId,
  loadedCompanies,
  loadedEstablishments,
  fallbackCompanyId,
}: {
  preferredCompanyId?: string | null;
  currentActiveCompanyId?: string | null;
  loadedCompanies: SimpleEntity[];
  loadedEstablishments: SimpleEntity[];
  fallbackCompanyId?: string | null;
}): string {
  const companyIds = new Set<string>();

  for (const company of loadedCompanies) {
    const companyId = firstString(company, ["id"]);
    if (companyId) companyIds.add(companyId);
  }

  for (const establishment of loadedEstablishments) {
    const companyId = firstString(establishment, ["company_id"]);
    if (companyId) companyIds.add(companyId);
  }

  const isKnownOrUnloaded = (companyId: string | null): companyId is string =>
    Boolean(companyId && (companyIds.size === 0 || companyIds.has(companyId)));

  const preferred = stringOrNull(preferredCompanyId);
  if (preferred) return preferred;

  const current = stringOrNull(currentActiveCompanyId);
  if (isKnownOrUnloaded(current)) return current;

  const fallback = stringOrNull(fallbackCompanyId);
  if (isKnownOrUnloaded(fallback)) return fallback;

  return firstString(loadedCompanies[0], ["id"]) || firstString(loadedEstablishments[0], ["company_id"]) || "";
}

type StoredWorkspaceSelection = {
  companyId: string;
  establishmentId: string;
};

function workspaceSelectionStorageKey(tenantId: string): string {
  return `nr1_workspace_selection:${tenantId}`;
}

function getStoredWorkspaceSelection(tenantId: string | null | undefined): StoredWorkspaceSelection {
  if (!tenantId || typeof window === "undefined") {
    return { companyId: "", establishmentId: "" };
  }

  try {
    const raw = window.localStorage.getItem(workspaceSelectionStorageKey(tenantId));
    if (!raw) return { companyId: "", establishmentId: "" };

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return { companyId: "", establishmentId: "" };

    return {
      companyId: stringOrNull(parsed.companyId) || "",
      establishmentId: stringOrNull(parsed.establishmentId) || "",
    };
  } catch {
    return { companyId: "", establishmentId: "" };
  }
}

function setStoredWorkspaceSelection(
  tenantId: string | null | undefined,
  selection: Partial<StoredWorkspaceSelection>
): void {
  if (!tenantId || typeof window === "undefined") return;

  const current = getStoredWorkspaceSelection(tenantId);
  const next = {
    companyId: selection.companyId ?? current.companyId,
    establishmentId: selection.establishmentId ?? current.establishmentId,
  };

  try {
    window.localStorage.setItem(workspaceSelectionStorageKey(tenantId), JSON.stringify(next));
  } catch {
    // Local storage is an optimization for UX continuity; it must not block the workflow.
  }
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
  const [cnpjLookupStatus, setCnpjLookupStatus] = useState<CnpjLookupStatus>("idle");
  const [cnpjLookupMessage, setCnpjLookupMessage] = useState<string | null>(null);

  const [companyForm, setCompanyForm] = useState<CompanyForm>(INITIAL_COMPANY_FORM);
  const [establishmentForm, setEstablishmentForm] = useState<EstablishmentForm>(INITIAL_ESTABLISHMENT_FORM);
  const [departmentForm, setDepartmentForm] = useState<DepartmentForm>(INITIAL_DEPARTMENT_FORM);
  const [activityForm, setActivityForm] = useState<ActivityForm>(INITIAL_ACTIVITY_FORM);
  const [guidedSetupChoice, setGuidedSetupChoice] = useState<GuidedSetupChoice>("undecided");
  const [guidedStepKey, setGuidedStepKey] = useState<GuidedStepKey>("empresa");
  const [onboardingMicroStepIndex, setOnboardingMicroStepIndex] = useState(0);
  const [guidedSetupOpen, setGuidedSetupOpen] = useState(false);
  const [diagnosisActivityId, setDiagnosisActivityId] = useState<string>("");
  const [diagnosisSessionId, setDiagnosisSessionId] = useState<string>("");
  const [diagnosisRiskId, setDiagnosisRiskId] = useState<string>("");
  const [diagnosisStatus, setDiagnosisStatus] = useState<FormStatus>("idle");
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [diagnosisSuccess, setDiagnosisSuccess] = useState<string | null>(null);
  const [diagnosisContextForm, setDiagnosisContextForm] = useState<DiagnosisContextForm>(INITIAL_DIAGNOSIS_CONTEXT_FORM);
  const [psychosocialForm, setPsychosocialForm] = useState<PsychosocialForm>(INITIAL_PSYCHOSOCIAL_FORM);
  const [fqbForm, setFqbForm] = useState<DiagnosisFqbForm>(INITIAL_DIAGNOSIS_FQB_FORM);
  const [accidentsForm, setAccidentsForm] = useState<DiagnosisAccidentsForm>(INITIAL_DIAGNOSIS_ACCIDENTS_FORM);
  const [ergonomicsForm, setErgonomicsForm] = useState<DiagnosisErgonomicsForm>(INITIAL_DIAGNOSIS_ERGONOMICS_FORM);
  const [controlsForm, setControlsForm] = useState<DiagnosisControlsForm>(INITIAL_DIAGNOSIS_CONTROLS_FORM);
  const [reviewForm, setReviewForm] = useState<DiagnosisReviewForm>(INITIAL_DIAGNOSIS_REVIEW_FORM);
  const [risks, setRisks] = useState<SimpleEntity[]>([]);
  const [actionPlans, setActionPlans] = useState<SimpleEntity[]>([]);
  const [selectedRiskId, setSelectedRiskId] = useState<string>("");
  const [riskForm, setRiskForm] = useState<RiskForm>(INITIAL_RISK_FORM);
  const [riskStatus, setRiskStatus] = useState<FormStatus>("idle");
  const [riskError, setRiskError] = useState<string | null>(null);
  const [riskSuccess, setRiskSuccess] = useState<string | null>(null);
  const [actionPlanForm, setActionPlanForm] = useState<ActionPlanForm>(INITIAL_ACTION_PLAN_FORM);
  const [actionPlanStatus, setActionPlanStatus] = useState<FormStatus>("idle");
  const [actionPlanError, setActionPlanError] = useState<string | null>(null);
  const [actionPlanSuccess, setActionPlanSuccess] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef<WorkspaceDraftPayload>(DEFAULT_DRAFT);
  const contextRef = useRef<BackendContext>({ tenantId: null, establishmentId: null });
  const activeCompanyIdRef = useRef<string>("");
  const [sessionDebug, setSessionDebug] = useState<SessionDebugState>(INITIAL_SESSION_DEBUG);
  const [planFeatures, setPlanFeatures] = useState<Nr1PlanFeaturesResponse | null>(null);
  const [planFeaturesLoading, setPlanFeaturesLoading] = useState<boolean>(false);
  const [planFeaturesError, setPlanFeaturesError] = useState<string | null>(null);
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
        error: result.error?.message || "",
      });
    } catch (error) {
      setSessionDebug({
        checked: true,
        hasSession: false,
        hasAccessToken: false,
        userEmail: "",
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

  useEffect(() => {
    activeCompanyIdRef.current = activeCompanyId;
  }, [activeCompanyId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlanFeatures(): Promise<void> {
      if (!context.tenantId) {
        setPlanFeatures(null);
        setPlanFeaturesError(null);
        setPlanFeaturesLoading(false);
        return;
      }

      setPlanFeaturesLoading(true);
      setPlanFeaturesError(null);

      try {
        const accessToken = await getBrowserAccessToken();

        if (!accessToken) {
          throw new Error("Sessao ausente para carregar plano contratado.");
        }

        const result = await getNr1PlanFeatures({
          tenantId: context.tenantId,
          accessToken,
        });

        if (!cancelled) {
          setPlanFeatures(result);
        }
      } catch (error) {
        if (!cancelled) {
          setPlanFeatures(null);
          setPlanFeaturesError(error instanceof Error ? error.message : "Erro ao carregar plano contratado.");
        }
      } finally {
        if (!cancelled) {
          setPlanFeaturesLoading(false);
        }
      }
    }

    void loadPlanFeatures();

    return () => {
      cancelled = true;
    };
  }, [context.tenantId]);

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

  const hasCompany = companies.length > 0;
  const hasEstablishment = Boolean(context.establishmentId);
  const hasDepartment = departments.length > 0;
  const hasActivity = activities.length > 0;
  const hasAnyTriageBase = hasCompany || hasEstablishment || hasDepartment || hasActivity;
  const isWorkspaceMode = hasCompany && hasEstablishment && hasDepartment && hasActivity;
  const showGuidedSetup = guidedSetupOpen;
  const workspaceBooted = saveStatus !== "loading";
  const showExistingBaseResume = workspaceBooted && !showGuidedSetup && !isWorkspaceMode && hasAnyTriageBase && guidedSetupChoice === "undecided";
  const isFirstRunMode = workspaceBooted && !hasAnyTriageBase && !showGuidedSetup;
  const showWorkspaceShell = workspaceBooted && !isFirstRunMode && !showExistingBaseResume;
  const showWorkspaceDashboardContent = showWorkspaceShell && !showGuidedSetup;
  const previousWorkspaceModeRef = useRef(isWorkspaceMode);

  function openGuidedSetupReview(): void {
    setFormError(null);
    setSuccessMessage(null);
    setGuidedSetupChoice("review");
    setGuidedStepKey("empresa");
    setOnboardingMicroStepIndex(0);
    setGuidedSetupOpen(true);
  }

  useEffect(() => {
    const wasWorkspaceMode = previousWorkspaceModeRef.current;
    previousWorkspaceModeRef.current = isWorkspaceMode;

    if (!wasWorkspaceMode && isWorkspaceMode && !showGuidedSetup && guidedSetupChoice !== "review") {
      setGuidedSetupOpen(false);
    }
  }, [guidedSetupChoice, isWorkspaceMode, showGuidedSetup]);
  function handleRequestCloseGuidedSetup() {
    const confirmed = window.confirm("Deseja sair da jornada guiada? Voce podera voltar depois pelo botao Rever configuracao guiada.");

    if (!confirmed) {
      return;
    }

    setGuidedSetupChoice("dashboard");
    setGuidedSetupOpen(false);
  }

  useEffect(() => {
    if (!showGuidedSetup) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      handleRequestCloseGuidedSetup();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showGuidedSetup]);

  const inferredOnboardingCurrentStep = !hasCompany
    ? {
        index: 1,
        key: "empresa",
        title: "Triagem Empresarial NR-1",
        question: "Triagem Empresarial NR-1",
        intro: "Antes do diagnostico, vamos qualificar a empresa para formar a base do PGR.",
        helper: "Comece pelo CNPJ. Depois revise a identificacao formal, a atividade economica, o porte, a quantidade de trabalhadores e a caracterizacao inicial de SST.",
        buttonLabel: "Salvar triagem da empresa e continuar",
      }
    : !hasEstablishment
      ? {
          index: 2,
          key: "estabelecimento",
          title: "Estabelecimento",
          question: "Onde esse trabalho acontece?",
          intro: "Agora precisamos identificar a unidade que sera usada como referencia.",
          helper: "Informe o estabelecimento para organizar os proximos passos.",
          buttonLabel: "Salvar estabelecimento e continuar",
        }
      : !hasDepartment
        ? {
            index: 3,
            key: "setor",
            title: "Setor",
            question: "Qual setor vamos mapear primeiro?",
            intro: "Escolha uma area real de trabalho. As atividades virao depois.",
            helper: "Mapeie um setor para aproximar a jornada da rotina da empresa.",
            buttonLabel: "Salvar setor e continuar",
          }
        : {
            index: 4,
            key: "atividade",
            title: "Atividade",
            question: "Qual atividade esse setor executa?",
            intro: "Descreva a atividade real para liberar diagnostico, riscos e documentos.",
            helper: "Essa etapa transforma a base cadastrada em uma jornada operacional.",
            buttonLabel: "Salvar atividade e liberar workspace",
          };

  const guidedReviewCurrentStep =
    guidedStepKey === "empresa"
      ? {
          index: 1,
          key: "empresa",
          title: "Triagem Empresarial NR-1",
          question: "Triagem Empresarial NR-1",
          intro: "Antes do diagnostico, vamos qualificar a empresa para formar a base do PGR.",
          helper: "Comece pelo CNPJ. Depois revise a identificacao formal, a atividade economica, o porte, a quantidade de trabalhadores e a caracterizacao inicial de SST.",
          buttonLabel: "Salvar triagem da empresa e continuar",
        }
      : guidedStepKey === "estabelecimento"
        ? {
            index: 2,
            key: "estabelecimento",
            title: "Estabelecimento",
            question: "Onde esse trabalho acontece?",
            intro: "Agora precisamos identificar a unidade que sera usada como referencia.",
            helper: "Informe o estabelecimento para organizar os proximos passos.",
            buttonLabel: "Salvar estabelecimento e continuar",
          }
        : guidedStepKey === "setor"
          ? {
              index: 3,
              key: "setor",
              title: "Setor",
              question: "Qual setor vamos mapear primeiro?",
              intro: "Escolha uma area real de trabalho. As atividades virao depois.",
              helper: "Mapeie um setor para aproximar a jornada da rotina da empresa.",
              buttonLabel: "Salvar setor e continuar",
            }
          : guidedStepKey === "atividade"
            ? {
                index: 4,
                key: "atividade",
                title: "Atividade",
                question: "Qual atividade esse setor executa?",
                intro: "Descreva a atividade real para liberar diagnostico, riscos e documentos.",
                helper: "Essa etapa transforma a base cadastrada em uma jornada operacional.",
                buttonLabel: "Salvar atividade e liberar workspace",
              }
            : inferredOnboardingCurrentStep;

  const onboardingCurrentStep =
    showGuidedSetup && guidedSetupChoice === "review"
      ? guidedReviewCurrentStep
      : inferredOnboardingCurrentStep;

  const onboardingStepItems = [
    ["Triagem empresarial", hasCompany ? "Concluido" : onboardingCurrentStep.index === 1 ? "Agora" : "Depois"],
    ["Estabelecimento", hasEstablishment ? "Concluido" : onboardingCurrentStep.index === 2 ? "Agora" : "Depois"],
    ["Setor", hasDepartment ? "Concluido" : onboardingCurrentStep.index === 3 ? "Agora" : "Depois"],
    ["Atividade e historico", hasActivity ? "Concluido" : onboardingCurrentStep.index === 4 ? "Agora" : "Depois"],
  ] as const;

  // A jornada guiada deve abrir por escolha explicita do usuario. Dados carregados de forma assincrona nao devem empurrar a UI para modal ou dashboard.

  useEffect(() => {
    setOnboardingMicroStepIndex(0);
  }, [onboardingCurrentStep.key]);

  const onboardingMicroSteps =
    onboardingCurrentStep.key === "empresa"
      ? [
                              { question: "Qual e o CNPJ da empresa?", helper: "Informe o CNPJ para validar a porta de entrada da Triagem Empresarial NR-1 e preparar a busca cadastral." },
          { question: "Qual e a razao social da empresa?", helper: "Informe a identificacao formal da organizacao ou revise o dado preenchido pela consulta cadastral." },
          { question: "Qual e o nome fantasia?", helper: "Se nao houver nome fantasia, repita a razao social." },
          { question: "Qual e o CNAE principal?", helper: "Informe 7 digitos. A validacao contra tabela CNAE fica para a proxima etapa tecnica." },
          { question: "Qual e o porte da empresa?", helper: "O porte ajuda a orientar a leitura da obrigacao e da jornada." },
          { question: "Quantos trabalhadores existem aproximadamente?", helper: "A quantidade de trabalhadores ajuda a priorizar a base do PGR." },
          { question: "A empresa possui CIPA, SESMT, terceiros, trabalho remoto ou atividades externas?", helper: "Esses dados ajudam a caracterizar a realidade inicial de SST." },
          { question: "Depois desta etapa, a jornada segue para estabelecimento, setor, atividade e historico ocupacional.", helper: "O historico dos ultimos 24 meses sera tratado em etapa propria, com dados agregados, sem nome de trabalhador, prontuario, CID individual ou diagnostico clinico." },
        ]
      : onboardingCurrentStep.key === "estabelecimento"
        ? [
            { question: "Onde esse trabalho acontece?", helper: "Informe o nome da unidade, matriz, filial ou local principal." },
            { question: "Em qual cidade e estado?", helper: "Isso ajuda a organizar a documentacao da unidade." },
          ]
        : onboardingCurrentStep.key === "setor"
          ? [
              { question: "Qual setor vamos mapear primeiro?", helper: "Comece por uma area real da rotina de trabalho." },
              { question: "Quantas pessoas trabalham nesse setor?", helper: "Pode ser uma estimativa inicial." },
            ]
          : [
              { question: "Qual atividade esse setor executa?", helper: "Escreva como as pessoas chamam essa atividade no dia a dia." },
              { question: "O que acontece nessa atividade?", helper: "Descreva em linguagem simples, sem jargao tecnico." },
            ];

  const onboardingMicroStep =
    onboardingMicroSteps[Math.min(onboardingMicroStepIndex, onboardingMicroSteps.length - 1)] ??
    { question: onboardingCurrentStep.question, helper: onboardingCurrentStep.helper };
  const isLastOnboardingMicroStep = onboardingMicroStepIndex >= onboardingMicroSteps.length - 1;
  const isGuidedCompanyCnpjMicroStep =
    showGuidedSetup && onboardingCurrentStep.key === "empresa" && onboardingMicroStepIndex === 0;
  const visibleFormError =
    isGuidedCompanyCnpjMicroStep && formError?.startsWith("Contexto do workspace nao resolvido")
      ? null
      : formError;

  function handleContinueGuidedMicroStep(): void {
    setFormError(null);
    setSuccessMessage(null);

    if (onboardingCurrentStep.key === "empresa" && onboardingMicroStepIndex === 0) {
      if (!isValidCnpj(companyForm.cnpj)) {
        setFormError("Informe um CNPJ valido antes de continuar.");
        return;
      }

      if (cnpjLookupStatus !== "ready") {
        setFormError("Clique em Buscar dados pelo CNPJ antes de continuar.");
        return;
      }
    }

    setGuidedSetupChoice("review");
    setOnboardingMicroStepIndex((prev) => prev + 1);
  }

  const statusLabel = useMemo(() => {
    if (saveStatus === "loading") return "Carregando dados reais";
    if (saveStatus === "dirty") return "Alteracoes pendentes";
    if (saveStatus === "saving") return "Salvando";
    if (saveStatus === "saved") return "Salvo";
    if (saveStatus === "save_error") return "Erro ao salvar";
    return "Pronto";
  }, [saveStatus]);

  const nextStepSummary = useMemo(() => {
    if (companies.length === 0) {
      return {
        title: "Iniciar Triagem Empresarial NR-1",
        helper: "Comece pela qualificacao da empresa: razao social, nome fantasia, CNPJ, CNAE, porte, trabalhadores e caracterizacao inicial de SST.",
        metric: "1",
      };
    }

    if (!context.establishmentId) {
      return {
        title: "Selecionar estabelecimento",
        helper: "Escolha a unidade que sera usada como referencia do diagnostico.",
        metric: String(establishments.length),
      };
    }

    if (departments.length === 0 || activities.length === 0) {
      return {
        title: "Mapear setores e atividades",
        helper: "Complete a base operacional antes de avancar para riscos e acoes.",
        metric: `${departments.length}/${activities.length}`,
      };
    }

    return {
      title: "Avancar no diagnostico guiado",
      helper: "Revise os sinais de atencao e transforme evidencias em plano de acao.",
      metric: `${progressPercent}%`,
    };
  }, [activities.length, companies.length, context.establishmentId, departments.length, establishments.length, progressPercent]);
  const resolveContext = useCallback(async (): Promise<BackendContext> => {
    const paths = [
      "/api/debug/context",
      "/api/tenants",
      "/api/tenant/select",
    ];
    const accessToken = await getBrowserAccessToken();
    const headers = new Headers({
      accept: "application/json",
    });

    console.debug("[nr1/workspace] context token state", {
      tokenPresent: Boolean(accessToken),
    });

    if (!accessToken) {
      throw new Error("Sessao local sem token de acesso. Faca login novamente e tente de novo.");
    }

    if (accessToken) {
      headers.set("Authorization", "Bearer " + accessToken);
    }

    let fallbackEstablishmentId: string | null = null;
    let authFailed = false;

    for (const path of paths) {
      let payload: unknown | null = null;

      try {
        const response = await fetch(path, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          headers,
        });
        const text = await response.text();

        if (!response.ok) {
          if (response.status === 401) {
            authFailed = true;
          }

          throw new Error(`${response.status} ${response.statusText} ${text.slice(0, 240)}`.trim());
        }

        payload = text.trim() ? (JSON.parse(text) as unknown) : {};
      } catch {
        if (path === "/api/tenant/select") {
          console.debug("[nr1/workspace] tenant legacy fallback ignored", { endpoint: path });
        }
        continue;
      }

      const tenantCandidates = extractTenantCandidatesFromPayload(payload);
      const selectedTenant = tenantCandidates[0] || null;

      console.debug("[nr1/workspace] tenant candidates", {
        endpoint: path,
        count: tenantCandidates.length,
        selectedRole: selectedTenant?.role || null,
      });

      const tenantId = selectedTenant?.tenantId || null;

      const establishmentId =
        nestedString(payload, ["establishment", "id"]) ||
        nestedString(payload, ["activeEstablishment", "id"]) ||
        nestedString(payload, ["data", "establishment", "id"]) ||
        nestedString(payload, ["data", "activeEstablishment", "id"]) ||
        firstString(payload, ["establishment_id", "establishmentId", "active_establishment_id"]);

      if (!fallbackEstablishmentId && establishmentId) {
        fallbackEstablishmentId = establishmentId;
      }

      if (tenantId) {
        console.debug("[nr1/workspace] tenant resolved", {
          endpoint: path,
          role: selectedTenant?.role || null,
        });

        return {
          tenantId,
          establishmentId: establishmentId || fallbackEstablishmentId,
        };
      }
    }

    if (authFailed) {
      throw new Error("Sessao local sem token de acesso. Faca login novamente e tente de novo.");
    }

    return {
      tenantId: null,
      establishmentId: fallbackEstablishmentId,
    };
  }, []);

  const loadCompanies = useCallback(async (nextContext: BackendContext): Promise<SimpleEntity[]> => {
    if (!nextContext.tenantId) return [];

    const path = buildUrl("/api/nr1/companies", {
      tenantId: nextContext.tenantId,
    });

    const payload = await fetchJson(path, {}, nextContext);
    return extractArray<SimpleEntity>(payload, ["items", "companies", "data"]);
  }, []);

  const loadEstablishments = useCallback(async (
    nextContext: BackendContext,
    companyId: string = activeCompanyId
  ): Promise<SimpleEntity[]> => {
    if (!nextContext.tenantId) return [];

    const path = buildUrl("/api/nr1/establishments", {
      tenantId: nextContext.tenantId,
      companyId: companyId || undefined,
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
    async (
      nextContext: BackendContext,
      options: { preferredCompanyId?: string } = {}
    ): Promise<void> => {
      const preferredCompanyId = options.preferredCompanyId || "";
      const currentActiveCompanyId = activeCompanyIdRef.current || activeCompanyId;
      const companyIdForEstablishments = preferredCompanyId || currentActiveCompanyId;
      const [nextCompanies, nextEstablishments, nextDepartments, nextActivities, nextAuditEvents] =
        await Promise.all([
          loadCompanies(nextContext),
          loadEstablishments(nextContext, companyIdForEstablishments),
          loadDepartments(nextContext),
          loadActivities(nextContext),
          loadAuditEvents(nextContext),
        ]);

      setCompanies(nextCompanies);
      setEstablishments(nextEstablishments);
      setDepartments(nextDepartments);
      setActivities(nextActivities);
      setAuditEvents(nextAuditEvents);

      const nextCompanyId = resolvePreferredCompanyId({
        preferredCompanyId,
        currentActiveCompanyId,
        loadedCompanies: nextCompanies,
        loadedEstablishments: nextEstablishments,
      });

      if (nextCompanyId) {
        activeCompanyIdRef.current = nextCompanyId;
        setActiveCompanyId(nextCompanyId);
        setStoredWorkspaceSelection(nextContext.tenantId, { companyId: nextCompanyId });
        setEstablishmentForm((prev) => ({
          ...prev,
          company_id: preferredCompanyId || prev.company_id || nextCompanyId,
        }));
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
          activeCompanyIdRef.current = selectedCompanyId;
          setActiveCompanyId(selectedCompanyId);
          setStoredWorkspaceSelection(nextContext.tenantId, {
            companyId: selectedCompanyId,
            establishmentId,
          });
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

  function handlePreparedCnpjLookup(): void {
    const cnpjDigits = normalizeCnpj(companyForm.cnpj);
    setFormError(null);
    setSuccessMessage(null);
    setCnpjLookupMessage(null);

    if (!isValidCnpj(cnpjDigits)) {
      setCnpjLookupStatus("error");
      setCnpjLookupMessage("Informe um CNPJ valido com 14 digitos e digitos verificadores corretos.");
      return;
    }

    setCnpjLookupStatus("loading");

    window.setTimeout(() => {
      const stub = LOCAL_CNPJ_LOOKUP_STUBS[cnpjDigits];

      if (stub) {
        setCompanyForm((prev) => ({ ...prev, cnpj: cnpjDigits, ...stub }));
        setCnpjLookupStatus("ready");
        setCnpjLookupMessage("Dados de exemplo preenchidos pelo stub local. A consulta cadastral real sera conectada pela API interna do icanHelp.");
        return;
      }

      setCnpjLookupStatus("ready");
      setCnpjLookupMessage("Consulta cadastral sera conectada na proxima etapa tecnica. Por enquanto, revise e preencha manualmente.");
    }, 350);
  }
  async function handleCreateCompany(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormStatus("saving");
    setFormError(null);
    setSuccessMessage(null);

    let currentContext: BackendContext;

    try {
      currentContext = await resolveContext();
    } catch (error) {
      setFormStatus("error");
      setFormError(error instanceof Error ? error.message : "Erro ao resolver contexto do workspace.");
      return;
    }

    setContext(currentContext);
    contextRef.current = currentContext;

    if (!currentContext.tenantId) {
      setFormStatus("error");
      setFormError("Contexto do workspace nao resolvido. Recarregue a pagina e tente novamente.");
      return;
    }

    const cnpjDigits = normalizeCnpj(companyForm.cnpj);
    const cnaeDigits = normalizeCnae(companyForm.cnae_main);
    const employeeCountValue = numberOrNull(companyForm.employee_count);

    if (companyForm.legal_name.trim().length < 3) {
      setFormStatus("error");
      setFormError("Informe a razao social com pelo menos 3 caracteres.");
      return;
    }

    if (companyForm.trade_name.trim().length < 2) {
      setFormStatus("error");
      setFormError("Informe o nome fantasia. Se nao houver, repita a razao social.");
      return;
    }

    if (!isValidCnpj(cnpjDigits)) {
      setFormStatus("error");
      setFormError("Informe um CNPJ valido, com 14 digitos e digitos verificadores corretos.");
      return;
    }

    if (cnaeDigits.length !== 7) {
      setFormStatus("error");
      setFormError("Informe o CNAE principal com 7 digitos.");
      return;
    }

    if (!companyForm.company_size.trim()) {
      setFormStatus("error");
      setFormError("Informe o porte da empresa.");
      return;
    }

    if (employeeCountValue === null || employeeCountValue <= 0) {
      setFormStatus("error");
      setFormError("Informe a quantidade estimada de trabalhadores.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/companies", {
        tenantId: currentContext.tenantId,
      });

      const headers = new Headers({
        accept: "application/json",
        "content-type": "application/json",
        "x-icanhelp-tenant": currentContext.tenantId,
      });
      const accessToken = await getBrowserAccessToken();

      if (accessToken) {
        headers.set("Authorization", "Bearer " + accessToken);
      }

      const companyResponse = await fetch(path, {
        method: "POST",
        headers,
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          legal_name: companyForm.legal_name,
          trade_name: companyForm.trade_name,
          cnpj: cnpjDigits,
          cnae_main: cnaeDigits,
          company_size: companyForm.company_size,
          risk_grade: companyForm.risk_grade,
          employee_count: employeeCountValue,
          has_cipa: companyForm.has_cipa,
          has_sesmt: companyForm.has_sesmt,
          has_public_service: companyForm.has_public_service,
          has_remote_work: companyForm.has_remote_work,
          has_third_parties: companyForm.has_third_parties,
          has_external_activities: companyForm.has_external_activities,
          status: "active",
        }),
      });
      const responseText = await companyResponse.text();

      if (!companyResponse.ok) {
        throw new Error(responseText.trim() || `${companyResponse.status} ${companyResponse.statusText}`);
      }

      const response = responseText.trim() ? (JSON.parse(responseText) as unknown) : {};

      const created = extractFirstEntity(response);
      const createdCompanyId = firstString(created, ["id"]);

      if (createdCompanyId) {
        activeCompanyIdRef.current = createdCompanyId;
        setActiveCompanyId(createdCompanyId);
        setStoredWorkspaceSelection(currentContext.tenantId, {
          companyId: createdCompanyId,
          establishmentId: "",
        });
        setEstablishmentForm((prev) => ({ ...prev, company_id: createdCompanyId }));
      }

      await recordAuditEvent("company_created_from_workspace", {
        company_id: createdCompanyId,
        legal_name: companyForm.legal_name,
      }, "formal");

      setCompanyForm(INITIAL_COMPANY_FORM);
      await reloadOperationalData(currentContext, {
        preferredCompanyId: createdCompanyId || undefined,
      });

      if (createdCompanyId) {
        activeCompanyIdRef.current = createdCompanyId;
        setActiveCompanyId(createdCompanyId);
        setStoredWorkspaceSelection(currentContext.tenantId, {
          companyId: createdCompanyId,
          establishmentId: "",
        });
        setEstablishmentForm((prev) => ({ ...prev, company_id: createdCompanyId }));
      }

      if (showGuidedSetup) {
        setGuidedStepKey("estabelecimento");
        setOnboardingMicroStepIndex(0);
        setSuccessMessage("Triagem da empresa cadastrada. Vamos para o proximo passo.");
      } else {
        setSuccessMessage("Triagem da empresa cadastrada.");
      }
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
    const companyId = establishmentForm.company_id || activeCompanyIdRef.current || activeCompanyId;
    const preferredCompanyId = companyId;

    if (!currentContext.tenantId) {
      setFormStatus("error");
      setFormError("Contexto do workspace nao resolvido.");
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
      if (preferredCompanyId) {
        activeCompanyIdRef.current = preferredCompanyId;
        setActiveCompanyId(preferredCompanyId);
        setStoredWorkspaceSelection(nextContext.tenantId, {
          companyId: preferredCompanyId,
          establishmentId: createdEstablishmentId || "",
        });
      }
      await reloadOperationalData(nextContext, {
        preferredCompanyId: preferredCompanyId || undefined,
      });
      if (showGuidedSetup) {
        setGuidedStepKey("setor");
        setOnboardingMicroStepIndex(0);
        setSuccessMessage("Estabelecimento cadastrado. Vamos para o proximo passo.");
      } else {
        setSuccessMessage("Estabelecimento cadastrado.");
      }
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
      await reloadOperationalData(currentContext, {
        preferredCompanyId: activeCompanyIdRef.current || activeCompanyId || undefined,
      });
      if (showGuidedSetup) {
        setGuidedStepKey("atividade");
        setOnboardingMicroStepIndex(0);
        setSuccessMessage("Setor cadastrado. Vamos para o proximo passo.");
      } else {
        setSuccessMessage("Setor cadastrado.");
      }
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
      await reloadOperationalData(currentContext, {
        preferredCompanyId: activeCompanyIdRef.current || activeCompanyId || undefined,
      });
      if (showGuidedSetup) {
        setGuidedSetupChoice("dashboard");
        setGuidedSetupOpen(false);
        patchDraft({ activeSection: "diagnostico" }, "guided_setup_activity_completed");
        setSuccessMessage("Atividade cadastrada. Diagnostico liberado.");
      } else {
        setSuccessMessage("Atividade cadastrada.");
      }
      setFormStatus("saved");
    } catch (error) {
      setFormStatus("error");
      setFormError(error instanceof Error ? error.message : "Erro ao cadastrar atividade.");
    }
  }

  async function ensureDiagnosisSession(): Promise<string> {
    const currentContext = contextRef.current;
    const activityId = diagnosisActivityId || firstString(activities[0], ["id"]) || "";
    const selectedActivity = activities.find((item) => item.id === activityId) || activities[0] || null;
    const departmentId = firstString(selectedActivity, ["department_id"]) || firstString(departments[0], ["id"]) || "";

    if (!currentContext.tenantId || !currentContext.establishmentId) {
      throw new Error("Salve a triagem ate estabelecimento, setor e atividade antes de iniciar o diagnostico.");
    }

    if (!departmentId || !activityId) {
      throw new Error("Cadastre e selecione uma atividade vinculada a um setor antes de gerar risco.");
    }

    if (diagnosisSessionId) {
      return diagnosisSessionId;
    }

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

    return sessionId;
  }

  async function handleStartDiagnosisSession(): Promise<void> {
    setDiagnosisStatus("saving");
    setDiagnosisError(null);
    setDiagnosisSuccess(null);

    try {
      await ensureDiagnosisSession();
      setDiagnosisSuccess("Sessao de diagnostico iniciada.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao iniciar diagnostico.");
    }
  }

  async function saveDiagnosisContextBlock(sessionId: string): Promise<void> {
    const currentContext = contextRef.current;

    if (!currentContext.tenantId || !currentContext.establishmentId) {
      throw new Error("Salve a triagem ate estabelecimento antes de salvar o diagnostico.");
    }

    const path = buildUrl("/api/nr1/diagnosis-context", {
      tenantId: currentContext.tenantId,
    });

    await fetchJson(
      path,
      {
        method: "POST",
        body: JSON.stringify({
          establishment_id: currentContext.establishmentId,
          diagnosis_session_id: sessionId,
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
      diagnosis_session_id: sessionId,
    }, "formal");
  }

  async function handleSaveDiagnosisContext(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setDiagnosisStatus("saving");
    setDiagnosisError(null);
    setDiagnosisSuccess(null);

    try {
      const sessionId = await ensureDiagnosisSession();
      await saveDiagnosisContextBlock(sessionId);
      await refreshAuditEvents();

      setDiagnosisSuccess("Contexto do trabalho salvo.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao salvar contexto.");
    }
  }

  async function savePsychosocialDiagnosisBlock(sessionId: string): Promise<void> {
    const currentContext = contextRef.current;

    if (!currentContext.tenantId || !currentContext.establishmentId) {
      throw new Error("Salve a triagem ate estabelecimento antes de salvar o diagnostico psicossocial.");
    }

    const path = buildUrl("/api/nr1/diagnosis-psychosocial", {
      tenantId: currentContext.tenantId,
    });

    await fetchJson(
      path,
      {
        method: "POST",
        body: JSON.stringify({
          establishment_id: currentContext.establishmentId,
          diagnosis_session_id: sessionId,
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
      diagnosis_session_id: sessionId,
    }, "formal");
  }

  async function handleSavePsychosocialDiagnosis(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setDiagnosisStatus("saving");
    setDiagnosisError(null);
    setDiagnosisSuccess(null);

    try {
      const sessionId = await ensureDiagnosisSession();
      await savePsychosocialDiagnosisBlock(sessionId);
      await refreshAuditEvents();

      setDiagnosisSuccess("Diagnostico psicossocial salvo.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao salvar diagnostico psicossocial.");
    }
  }

  async function handleSaveDiagnosisFqb(event: FormEvent<HTMLFormElement>): Promise<void> {
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
      const path = buildUrl("/api/nr1/diagnosis-fqb", {
        tenantId: currentContext.tenantId,
      });

      await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            diagnosis_session_id: diagnosisSessionId,
            ...fqbForm,
          }),
        },
        currentContext
      );

      await recordAuditEvent("diagnosis_fqb_saved_from_workspace", {
        diagnosis_session_id: diagnosisSessionId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Diagnostico FQB salvo.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao salvar diagnostico FQB.");
    }
  }

  async function handleSaveDiagnosisAccidents(event: FormEvent<HTMLFormElement>): Promise<void> {
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
      const path = buildUrl("/api/nr1/diagnosis-accidents", {
        tenantId: currentContext.tenantId,
      });

      await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            diagnosis_session_id: diagnosisSessionId,
            ...accidentsForm,
          }),
        },
        currentContext
      );

      await recordAuditEvent("diagnosis_accidents_saved_from_workspace", {
        diagnosis_session_id: diagnosisSessionId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Diagnostico de acidentes salvo.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao salvar diagnostico de acidentes.");
    }
  }

  async function handleSaveDiagnosisErgonomics(event: FormEvent<HTMLFormElement>): Promise<void> {
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
      const path = buildUrl("/api/nr1/diagnosis-ergonomics", {
        tenantId: currentContext.tenantId,
      });

      await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            diagnosis_session_id: diagnosisSessionId,
            ...ergonomicsForm,
          }),
        },
        currentContext
      );

      await recordAuditEvent("diagnosis_ergonomics_saved_from_workspace", {
        diagnosis_session_id: diagnosisSessionId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Diagnostico ergonomico salvo.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao salvar diagnostico ergonomico.");
    }
  }

  async function handleSaveDiagnosisControls(event: FormEvent<HTMLFormElement>): Promise<void> {
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
      const path = buildUrl("/api/nr1/diagnosis-controls", {
        tenantId: currentContext.tenantId,
      });

      await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            diagnosis_session_id: diagnosisSessionId,
            ...controlsForm,
          }),
        },
        currentContext
      );

      await recordAuditEvent("diagnosis_controls_saved_from_workspace", {
        diagnosis_session_id: diagnosisSessionId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Controles existentes salvos.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao salvar controles existentes.");
    }
  }

  async function handleSaveDiagnosisReview(event: FormEvent<HTMLFormElement>): Promise<void> {
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
      const path = buildUrl("/api/nr1/diagnosis-review", {
        tenantId: currentContext.tenantId,
      });

      await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            diagnosis_session_id: diagnosisSessionId,
            confirmed_exposed_group_json: [],
            confirmed_hazards_json: [],
            preliminary_priority: reviewForm.preliminary_priority,
            reviewer_comment: reviewForm.reviewer_comment,
            reviewed_at: reviewForm.reviewed_at,
          }),
        },
        currentContext
      );

      await recordAuditEvent("diagnosis_review_saved_from_workspace", {
        diagnosis_session_id: diagnosisSessionId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Revisao tecnica do diagnostico salva.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao salvar revisao tecnica.");
    }
  }
  async function handleGeneratePreliminaryRiskFromDiagnosis(): Promise<void> {
    setDiagnosisStatus("saving");
    setDiagnosisError(null);
    setDiagnosisSuccess(null);

    const currentContext = contextRef.current;
    const activityId = diagnosisActivityId || firstString(activities[0], ["id"]) || "";
    const selectedActivity = activities.find((item) => item.id === activityId) || activities[0] || null;
    const departmentId = firstString(selectedActivity, ["department_id"]) || firstString(departments[0], ["id"]) || "";
    const activityName = firstString(selectedActivity, ["name", "title"]) || "Atividade analisada";
    const department = departments.find((item) => item.id === departmentId) || departments[0] || null;
    const departmentName = firstString(department, ["name", "title"]) || "Setor analisado";
    const selectedHazards = [
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
    ]
      .filter(([key]) => Boolean(psychosocialForm[key as keyof PsychosocialForm]))
      .map(([, label]) => ({
        title: label,
        source: "diagnosis_psychosocial",
      }));
    const hasContextSignal = Boolean(
      diagnosisContextForm.work_description.trim() ||
      diagnosisContextForm.incident_history.trim() ||
      diagnosisContextForm.notes.trim() ||
      psychosocialForm.notes.trim() ||
      selectedHazards.length > 0
    );

    if (!currentContext.tenantId || !currentContext.establishmentId) {
      setDiagnosisStatus("error");
      setDiagnosisError("Salve a triagem ate estabelecimento, setor e atividade antes de gerar risco.");
      return;
    }

    if (!departmentId || !activityId) {
      setDiagnosisStatus("error");
      setDiagnosisError("Atividade ou setor nao resolvido.");
      return;
    }

    if (!hasContextSignal) {
      setDiagnosisStatus("error");
      setDiagnosisError("Preencha pelo menos um sinal do diagnostico ou descreva o contexto antes de gerar risco preliminar.");
      return;
    }

    try {
      const sessionId = await ensureDiagnosisSession();
      await saveDiagnosisContextBlock(sessionId);
      await savePsychosocialDiagnosisBlock(sessionId);

      const path = buildUrl("/api/nr1/diagnosis-review", {
        tenantId: currentContext.tenantId,
      });

      const response = await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            diagnosis_session_id: sessionId,
            confirmed_exposed_group_json: [
              {
                title: departmentName,
                activity: activityName,
                exposed_people_count: numberOrNull(diagnosisContextForm.exposed_people_count),
              },
            ],
            confirmed_hazards_json:
              selectedHazards.length > 0
                ? selectedHazards
                : [
                    {
                      title: "Indicadores psicossociais observados no diagnostico guiado",
                      description:
                        diagnosisContextForm.incident_history ||
                        diagnosisContextForm.work_description ||
                        psychosocialForm.notes ||
                        "Perigo identificado no fechamento do diagnostico guiado.",
                    },
                  ],
            preliminary_priority: reviewForm.preliminary_priority,
            reviewer_comment:
              reviewForm.reviewer_comment ||
              diagnosisContextForm.notes ||
              psychosocialForm.notes ||
              "Revisao gerada no fechamento do diagnostico guiado.",
            reviewed_at: reviewForm.reviewed_at || new Date().toISOString(),
            generate_risk: true,
            generated_risk_title: "Risco preliminar gerado pelo diagnostico guiado",
            generated_risk_category: "psychosocial",
            generated_risk_source_circumstance: "Diagnostico guiado NR-1",
            generated_risk_recommended_measure:
              "Validar o risco preliminar com responsavel tecnico e definir plano de acao inicial.",
          }),
        },
        currentContext
      );

      const generatedRisk = (response as JsonObject).generatedRisk;
      const riskId =
        firstString(generatedRisk, ["riskId", "risk_id", "id"]) ||
        firstString(response, ["riskId", "risk_id", "id"]);

      if (!riskId) {
        throw new Error("A revisao foi salva, mas a rota nao retornou o id do risco preliminar.");
      }

      setDiagnosisRiskId(riskId);
      setSelectedRiskId(riskId);
      setActionPlanForm((prev) => ({
        ...prev,
        risk_id: riskId,
        title: prev.title || "Plano de acao inicial para risco preliminar",
        description:
          prev.description ||
          "Validar o risco preliminar gerado pelo diagnostico guiado e definir medidas de controle.",
        priority: prev.priority || reviewForm.preliminary_priority || "medium",
        due_date: prev.due_date || isoDatePlusDays(30),
        responsible_name: prev.responsible_name || "Gestao da empresa",
        monitoring_method:
          prev.monitoring_method || "Acompanhar evolucao das medidas em reuniao de rotina e registrar evidencias.",
        evidence_method:
          prev.evidence_method || "Registrar ata, checklist, orientacao, comunicacao ou outra evidencia da medida adotada.",
        completion_indicator:
          prev.completion_indicator || "Risco revisado e plano de acao inicial definido com responsavel e prazo.",
      }));

      await refreshRiskActionData(riskId);

      await recordAuditEvent("preliminary_risk_generated_from_diagnosis_review", {
        diagnosis_session_id: sessionId,
        risk_id: riskId,
        activity_id: activityId,
      }, "formal");

      await refreshAuditEvents();

      setDiagnosisSuccess("Risco preliminar gerado a partir do diagnostico. O proximo passo e revisar o plano de acao inicial.");
      setDiagnosisStatus("saved");
    } catch (error) {
      setDiagnosisStatus("error");
      setDiagnosisError(error instanceof Error ? error.message : "Erro ao gerar risco preliminar a partir do diagnostico.");
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

  async function handleCreateRisk(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRiskStatus("saving");
    setRiskError(null);
    setRiskSuccess(null);
    setActionPlanError(null);
    setActionPlanSuccess(null);

    const currentContext = contextRef.current;

    if (!currentContext.tenantId || !currentContext.establishmentId) {
      setRiskStatus("error");
      setRiskError("Selecione um estabelecimento antes.");
      return;
    }

    const selectedActivityForRisk =
      activities.find((item) => item.id === riskForm.activity_id) ||
      activities[0] ||
      null;

    const activityId = riskForm.activity_id || firstString(selectedActivityForRisk, ["id"]) || "";
    const departmentId =
      riskForm.department_id ||
      firstString(selectedActivityForRisk, ["department_id"]) ||
      firstString(departments[0], ["id"]) ||
      "";

    if (!departmentId) {
      setRiskStatus("error");
      setRiskError("Cadastre ou selecione um setor antes de criar o risco.");
      return;
    }

    if (!activityId) {
      setRiskStatus("error");
      setRiskError("Cadastre ou selecione uma atividade antes de criar o risco.");
      return;
    }

    if (riskForm.title.trim().length < 3) {
      setRiskStatus("error");
      setRiskError("Informe um titulo do risco com pelo menos 3 caracteres.");
      return;
    }

    if (riskForm.hazard_description.trim().length < 3) {
      setRiskStatus("error");
      setRiskError("Descreva o perigo antes de criar o risco.");
      return;
    }

    try {
      const path = buildUrl("/api/nr1/risks", {
        tenantId: currentContext.tenantId,
        establishmentId: currentContext.establishmentId,
      });

      const response = await fetchJson(
        path,
        {
          method: "POST",
          body: JSON.stringify({
            establishment_id: currentContext.establishmentId,
            department_id: departmentId,
            activity_id: activityId,
            title: riskForm.title,
            risk_category: riskForm.risk_category || "psychosocial",
            hazard_description: riskForm.hazard_description,
            source_circumstance: riskForm.source_circumstance,
            exposed_group: riskForm.exposed_group,
            possible_harms: riskForm.possible_harms,
            existing_controls: riskForm.existing_controls,
            exposure_characterization: riskForm.exposure_characterization,
            severity_level: riskForm.severity_level,
            probability_level: riskForm.probability_level,
            risk_level: riskForm.risk_level,
            classification: riskForm.classification,
            recommended_measure: riskForm.recommended_measure,
            suggested_responsible: riskForm.suggested_responsible,
            suggested_deadline: riskForm.suggested_deadline || isoDatePlusDays(30),
            status: riskForm.status || "identified",
          }),
        },
        currentContext
      );

      const createdRiskId = firstString(extractFirstEntity(response), ["id"]);

      if (!createdRiskId) {
        throw new Error("Risco criado sem id retornado pela API.");
      }

      await recordAuditEvent(
        "manual_risk_created_from_workspace",
        {
          risk_id: createdRiskId,
          establishment_id: currentContext.establishmentId,
          department_id: departmentId,
          activity_id: activityId,
          risk_category: riskForm.risk_category || "psychosocial",
          risk_level: riskForm.risk_level,
        },
        "formal"
      );

      await refreshRiskActionData(createdRiskId);
      await refreshAuditEvents();

      setSelectedRiskId(createdRiskId);
      setActionPlanForm((prev) => ({
        ...prev,
        risk_id: createdRiskId,
      }));

      setRiskForm({
        ...INITIAL_RISK_FORM,
        department_id: departmentId,
        activity_id: activityId,
        suggested_deadline: isoDatePlusDays(30),
      });

      setRiskSuccess("Risco criado no inventario e pronto para plano de acao.");
      setRiskStatus("saved");
    } catch (error) {
      setRiskStatus("error");
      setRiskError(error instanceof Error ? error.message : "Erro ao criar risco.");
    }
  }
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
        const storedSelection = getStoredWorkspaceSelection(resolvedContext.tenantId);
        const loadedCompanies = await loadCompanies(resolvedContext);
        const currentActiveCompanyId = activeCompanyIdRef.current;
        const storedCompanyExists = Boolean(
          storedSelection.companyId && loadedCompanies.some((item) => item.id === storedSelection.companyId)
        );

        const firstCompanyId = resolvePreferredCompanyId({
          preferredCompanyId: storedCompanyExists ? storedSelection.companyId : "",
          currentActiveCompanyId,
          loadedCompanies,
          loadedEstablishments: [],
        });
        if (firstCompanyId && !activeCompanyIdRef.current) {
          activeCompanyIdRef.current = firstCompanyId;
          setActiveCompanyId(firstCompanyId);
          setEstablishmentForm((prev) => ({ ...prev, company_id: prev.company_id || firstCompanyId }));
        }

        const companyIdForEstablishments = activeCompanyIdRef.current || firstCompanyId;
        const loadedEstablishments = await loadEstablishments(resolvedContext, companyIdForEstablishments);
        const storedEstablishment = loadedEstablishments.find((item) => item.id === storedSelection.establishmentId);
        const fallbackEstablishmentId =
          firstString(storedEstablishment, ["id"]) ||
          resolvedContext.establishmentId ||
          firstString(loadedEstablishments[0], ["id"]);

        const selectedEstablishmentCompanyId =
          resolvePreferredCompanyId({
            preferredCompanyId: storedCompanyExists ? storedSelection.companyId : "",
            currentActiveCompanyId: activeCompanyIdRef.current || firstCompanyId,
            loadedCompanies,
            loadedEstablishments,
            fallbackCompanyId:
              firstString(loadedEstablishments.find((item) => item.id === fallbackEstablishmentId), ["company_id"]) ||
              firstString(loadedEstablishments[0], ["company_id"]),
          });

        if (selectedEstablishmentCompanyId && !activeCompanyIdRef.current) {
          activeCompanyIdRef.current = selectedEstablishmentCompanyId;
          setActiveCompanyId(selectedEstablishmentCompanyId);
          setEstablishmentForm((prev) => ({ ...prev, company_id: selectedEstablishmentCompanyId }));
        }

        const nextContext = {
          tenantId: resolvedContext.tenantId,
          establishmentId: fallbackEstablishmentId,
        };

        if (selectedEstablishmentCompanyId || fallbackEstablishmentId) {
          setStoredWorkspaceSelection(nextContext.tenantId, {
            companyId: selectedEstablishmentCompanyId || firstCompanyId,
            establishmentId: fallbackEstablishmentId || "",
          });
        }

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
        setLoadError(error instanceof Error ? error.message : "Erro ao carregar area de trabalho.");
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
    <main className="min-h-screen bg-[#f7f1e8] text-[#10243e]">
      {!workspaceBooted ? (
        <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9d7b37]">
            ICANHELP NR-1
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#10243e]">
            Carregando sua jornada NR-1
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f665b]">
            Estamos verificando se ja existe uma Triagem Empresarial NR-1 iniciada para esta empresa.
          </p>
        </section>
      ) : null}
      {isFirstRunMode ? (
        <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9d7b37]">
              ICANHELP NR-1
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#10243e]">
              Bem-vindo ao icanHelp NR-1
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6f665b]">
              Este módulo ajuda sua empresa a organizar a adequação NR-1, entender a rotina de trabalho, identificar riscos, criar plano de ação e guardar evidências.
            </p>
          </div>

          <div id="nr1-welcome-details" className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-[#d9c9b8] bg-[#fffaf6] p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10243e]">O que você vai fazer</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#6f665b]">
                <li>Informar os dados básicos da empresa</li>
                <li>Cadastrar a unidade analisada</li>
                <li>Mapear setor e atividade</li>
                <li>Responder perguntas guiadas sobre a rotina de trabalho</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-[#d9c9b8] bg-[#fffaf6] p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10243e]">O que o sistema vai montar</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#6f665b]">
                <li>Base inicial da empresa</li>
                <li>Diagnóstico guiado</li>
                <li>Riscos organizados</li>
                <li>Plano de ação, evidências e documentos de apoio ao PGR</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-[#d9c9b8] bg-[#fffaf6] p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10243e]">Onde você vai chegar</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#6f665b]">
                <li>Visão clara do que falta</li>
                <li>Riscos priorizados</li>
                <li>Ações recomendadas</li>
                <li>Histórico e evidências organizadas</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openGuidedSetupReview}
              className="rounded-xl bg-[#132238] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0f1b2d]"
            >
              Começar jornada guiada
            </button>
            <a
              href="#nr1-welcome-details"
              className="rounded-xl border border-[#d9c9b8] px-5 py-3 text-sm font-semibold text-[#132238] hover:bg-[#fffaf6]"
            >
              Ver como funciona
            </a>
          </div>
        </section>
      ) : null}

      {showExistingBaseResume ? (
        <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9d7b37]">
            ICANHELP NR-1
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#10243e]">
            Encontramos uma base ja iniciada
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f665b]">
            Voce pode revisar a Triagem Empresarial NR-1 antes de continuar ou ir para o dashboard e retomar pelos cadastros.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openGuidedSetupReview}
              className="rounded-xl bg-[#132238] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0f1b2d]"
            >
              Revisar triagem
            </button>
            <button
              type="button"
              onClick={() => setGuidedSetupChoice("dashboard")}
              className="rounded-xl border border-[#d9c9b8] px-5 py-3 text-sm font-semibold text-[#132238] hover:bg-[#fffaf6]"
            >
              Ir para dashboard
            </button>
          </div>
        </section>
      ) : null}

      {showWorkspaceShell ? (
        <>
      {showWorkspaceDashboardContent && isWorkspaceMode ? <Nr1PgrReportShortcut /> : null}
      {showWorkspaceDashboardContent ? (
      <div className="border-b border-[#d9c9b8] bg-[#fffaf1]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-7 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9d7b37]">ICANHELP NR-1</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#10243e]">Adequacao NR-1 da sua empresa</h1>
            <p className="mt-2 text-sm leading-6 text-[#6f665b]">
              Cadastre a empresa, organize a unidade e avance pela jornada guiada. O sistema transforma as respostas em riscos, acoes e documentos.
            </p>

          </div>

          <div className="w-full shrink-0 rounded-2xl border border-[#d9c9b8] bg-[#fffaf6] p-4 text-sm shadow-sm lg:w-[320px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[#10243e]">Salvamento automatico</p>
                <p className="mt-1 text-[#6f665b]">{statusLabel}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  saveStatus === "save_error"
                    ? "bg-red-100 text-red-700"
                    : saveStatus === "dirty"
                      ? "bg-amber-100 text-amber-700"
                      : saveStatus === "saving" || saveStatus === "loading"
                        ? "bg-[#ead8c8] text-[#10243e]"
                        : "bg-[#e9f0e5] text-[#2f6f4e]"
                }`}
              >
                {saveStatus === "save_error"
                  ? "Revisar"
                  : saveStatus === "dirty"
                    ? "Pendente"
                    : saveStatus === "saving" || saveStatus === "loading"
                      ? "Processando"
                      : "Seguro"}
              </span>
            </div>
            <p className="mt-3 text-xs text-[#7a7065]">
              {lastSavedAt ? `Ultimo salvamento: ${new Date(lastSavedAt).toLocaleTimeString("pt-BR")}` : "Salvamento automatico aguardando alteracao"}
            </p>
          </div>
        </div>
      </div>
      ) : null}

      <div className={showGuidedSetup ? "" : "mx-auto grid max-w-7xl gap-6 px-6 py-6 xl:grid-cols-[280px_1fr]"}>
        {showWorkspaceDashboardContent ? (
        <aside className="h-fit rounded-3xl border border-[#132238] bg-[#132238] p-5 text-white shadow-sm">
          <div className="border-b border-white/10 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c7a96b]">icanHelp NR-1</p>
            <p className="mt-2 text-sm leading-5 text-white/70">
              Jornada guiada para organizar diagnostico, riscos e acoes.
            </p>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white/75">Progresso</p>
              <p className="text-xl font-semibold">{progressPercent}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#c7a96b]" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/60">
              Continue pela etapa ativa e deixe o sistema salvar a jornada automaticamente.
            </p>
            <button
              type="button"
              onClick={() => patchDraft({ activeSection: draft.activeSection }, `continue_${draft.activeSection}`)}
              className="mt-4 w-full rounded-xl border border-white/15 bg-[#0f1b2d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0b1524]"
            >
              Continuar jornada
            </button>
          </div>

          <nav className="mt-6 space-y-1.5">
            {[
              ["cadastros", "Cadastros", "Empresa, unidade, setores e atividades"],
              ["diagnostico", "Diagnostico", "Perguntas guiadas por atividade"],
              ["riscos", "Riscos e planos", "Prioridades, acoes e evidencias"],
              ["auditoria", "Trilha", "Historico e registros do processo"],
            ].map(([key, label, helper]) => (
              <button
                key={key}
                type="button"
                onClick={() => patchDraft({ activeSection: key }, `section_${key}`)}
                className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                  draft.activeSection === key
                    ? "bg-white text-[#132238] shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-1 block text-xs font-normal opacity-75">{helper}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white/85">Checklist</p>
            {checklistItems.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-white/65">
                <input
                  type="checkbox"
                  checked={Boolean(draft.checklist[key])}
                  onChange={(event) => patchChecklist(key, event.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-transparent accent-[#c7a96b]"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </aside>
        ) : null}

        <section className={showGuidedSetup ? "min-w-0" : "min-w-0 space-y-6"}>
          {showWorkspaceDashboardContent && isWorkspaceMode ? (
          <div
            className={
              planFeatures?.featureFlags.iso45003_engine
                ? "rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 shadow-sm"
                : "rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm"
            }
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em]">
              Recursos do plano
            </p>
            <h3 className="mt-2 text-lg font-semibold">
              {planFeatures?.featureFlags.iso45003_engine
                ? "Recursos avancados disponiveis"
                : "Recursos avancados em outro plano"}
            </h3>
            <p className="mt-2 max-w-3xl">
              Seu plano atual permite continuar a jornada NR-1. Alguns recursos avancados podem aparecer conforme o plano contratado.
            </p>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {[
                ["iso45003_engine", "Analise psicossocial"],
                ["psychosocial_radar", "Sinais de atencao"],
                ["psychosocial_scoring", "Leitura de prioridade"],
                ["smart_alerts", "Orientacoes de cuidado"],
              ].map(([featureKey, label]) => {
                const enabled = planFeatures?.featureFlags[featureKey] === true;

                return (
                  <div
                    key={featureKey}
                    className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/70 px-3 py-2"
                  >
                    <span>{label}</span>
                    <span className={enabled ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                      {enabled ? "Disponivel" : "Nao disponivel agora"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          ) : null}
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

          {showWorkspaceDashboardContent && isWorkspaceMode ? (
          <section className="rounded-3xl border border-[#d9c9b8] bg-[#fffaf6] p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d7b37]">
                  Base inicial pronta
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#10243e]">
                  Agora vamos entender a rotina de trabalho
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f665b]">
                  Agora que já sabemos quem trabalha, onde trabalha e qual atividade será analisada, o próximo passo é entender a rotina real de trabalho.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => patchDraft({ activeSection: "diagnostico" }, "start_guided_diagnosis")}
                  className="rounded-xl bg-[#132238] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f1b2d]"
                >
                  Iniciar diagnóstico guiado
                </button>
                <button
                  type="button"
                  onClick={openGuidedSetupReview}
                  className="rounded-xl border border-[#d9c9b8] px-4 py-2 text-sm font-semibold text-[#132238] hover:bg-[#f7f1e8]"
                >
                  Rever configuração guiada
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-2 text-xs font-medium text-[#6f665b] sm:grid-cols-4">
              <span className="rounded-full bg-[#ead8c8] px-3 py-1">Empresa pronta</span>
              <span className="rounded-full bg-[#ead8c8] px-3 py-1">Unidade pronta</span>
              <span className="rounded-full bg-[#ead8c8] px-3 py-1">Setor pronto</span>
              <span className="rounded-full bg-[#ead8c8] px-3 py-1">Atividade pronta</span>
            </div>
          </section>
          ) : null}

          {showWorkspaceDashboardContent && isWorkspaceMode ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">Empresa ativa</p>
                <select
                  value={activeCompanyId}
                  onChange={(event) => {
                    activeCompanyIdRef.current = event.target.value;
                    setActiveCompanyId(event.target.value);
                    setStoredWorkspaceSelection(contextRef.current.tenantId, {
                      companyId: event.target.value,
                      establishmentId: "",
                    });
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
                <p className="mt-2 text-xs text-slate-500">{selectedCompany ? "Empresa selecionada" : "Nenhuma empresa selecionada"}</p>
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
                <p className="mt-2 text-xs text-slate-500">{selectedEstablishment ? "Estabelecimento selecionado" : "Nenhum estabelecimento selecionado"}</p>
              </div>
            </div>
          </section>
          ) : null}


          {showGuidedSetup ? (
            <div className="fixed -inset-24 z-[9998] bg-[#10243e]/12 backdrop-blur-sm" aria-hidden="true" />
          ) : null}

          {showGuidedSetup || draft.activeSection === "cadastros" ? (
            <section className={showGuidedSetup ? "fixed left-1/2 top-1/2 z-[9999] max-h-[calc(100vh-3rem)] w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-[#d9c9b8] bg-[#fffaf6]/95 p-6 shadow-2xl ring-1 ring-white/60" : "grid gap-6 xl:grid-cols-2"}>
              {showGuidedSetup ? (
                <div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d7b37]">
                        Implantacao guiada
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#10243e]">
                        {onboardingMicroStep.question}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f665b]">
                        {onboardingMicroStep.helper}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-[#132238] px-3 py-1 text-xs font-semibold text-white">
                      {onboardingCurrentStep.index} de 4
                    </span>
                  </div>
                  <div className="mt-6 grid gap-2 sm:grid-cols-4">
                    {onboardingStepItems.map(([label, status], index) => (
                      <div
                        key={label}
                        className={`rounded-2xl border px-3 py-2 text-xs ${
                          status === "Agora"
                            ? "border-[#132238] bg-[#132238] text-white"
                            : status === "Concluido"
                              ? "border-[#d9c9b8] bg-[#f7f1e8] text-[#10243e]"
                              : "border-[#ead8c8] bg-white/50 text-[#8b8175]"
                        }`}
                      >
                        <p className="font-semibold">{index + 1}. {label}</p>
                        <p className="mt-1 opacity-75">{status}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-sm leading-6 text-[#6f665b]">
                    {onboardingCurrentStep.helper}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ead8c8]">
                    <div
                      className="h-full rounded-full bg-[#132238] transition-all"
                      style={{ width: `${((onboardingMicroStepIndex + 1) / onboardingMicroSteps.length) * 100}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestCloseGuidedSetup}
                    className="mt-4 text-sm font-semibold text-[#132238] underline underline-offset-4"
                  >
                    Sair da jornada guiada
                  </button>
                  {visibleFormError ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      {visibleFormError}
                    </div>
                  ) : null}
                  {successMessage ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      {successMessage}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {(!showGuidedSetup || onboardingCurrentStep.key === "empresa") ? (
              <form onSubmit={handleCreateCompany} className={showGuidedSetup ? "mt-6 border-t border-[#ead8c8] pt-5" : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"}>
                <h2 className={showGuidedSetup ? "sr-only" : "text-xl font-semibold"}>1. Triagem Empresarial NR-1</h2>
                <p className="mt-1 text-sm text-slate-500">Antes do diagnostico, vamos qualificar a empresa para formar a base do PGR.</p>

                {showGuidedSetup ? (
                  <div className="mt-5 space-y-4">
                    {onboardingMicroStepIndex === 0 ? (
                      <div className="rounded-2xl border border-[#d9c9b8] bg-white p-4">
                        <label className="block">
                          <span className="text-sm font-semibold text-[#10243e]">CNPJ</span>
                          <span className="mt-1 block text-xs text-[#6f665b]">Informe 14 digitos. O sistema valida os digitos verificadores antes de continuar.</span>
                          <input
                            value={companyForm.cnpj}
                            onChange={(event) => {
                              setCompanyForm((prev) => ({ ...prev, cnpj: event.target.value }));
                              setCnpjLookupStatus("idle");
                              setCnpjLookupMessage(null);
                              setFormError(null);
                              setSuccessMessage(null);
                            }}
                            placeholder="00.000.000/0000-00"
                            className="mt-2 w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handlePreparedCnpjLookup}
                          disabled={cnpjLookupStatus === "loading" || !isValidCnpj(companyForm.cnpj)}
                          className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {cnpjLookupStatus === "loading" ? "Buscando..." : "Buscar dados pelo CNPJ"}
                        </button>
                        {cnpjLookupMessage ? (
                          <p className={`mt-3 text-sm leading-5 ${cnpjLookupStatus === "error" ? "text-red-700" : "text-[#6f665b]"}`}>
                            {cnpjLookupMessage}
                          </p>
                        ) : (
                          <p className="mt-3 text-xs leading-5 text-[#6f665b]">
                            A consulta cadastral real sera conectada por API interna. Por enquanto, o preenchimento manual assistido continua disponivel.
                          </p>
                        )}
                      </div>
                    ) : null}
                    {onboardingMicroStepIndex === 1 ? (
                      <label className="block">
                        <span className="text-sm font-semibold text-[#10243e]">Razao social</span>
                        <span className="mt-1 block text-xs text-[#6f665b]">Informe a identificacao formal da organizacao ou revise o dado preenchido pela consulta cadastral.</span>
                        <input
                          value={companyForm.legal_name}
                          onChange={(event) => setCompanyForm((prev) => ({ ...prev, legal_name: event.target.value }))}
                          placeholder="Razao social"
                          className="mt-2 w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                        />
                      </label>
                    ) : null}
                    {onboardingMicroStepIndex === 2 ? (
                      <label className="block">
                        <span className="text-sm font-semibold text-[#10243e]">Nome fantasia</span>
                        <span className="mt-1 block text-xs text-[#6f665b]">Se nao houver nome fantasia, repita a razao social.</span>
                        <input
                          value={companyForm.trade_name}
                          onChange={(event) => setCompanyForm((prev) => ({ ...prev, trade_name: event.target.value }))}
                          placeholder="Nome fantasia"
                          className="mt-2 w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                        />
                      </label>
                    ) : null}
                    {onboardingMicroStepIndex === 3 ? (
                      <label className="block">
                        <span className="text-sm font-semibold text-[#10243e]">CNAE principal</span>
                        <span className="mt-1 block text-xs text-[#6f665b]">Informe 7 digitos. A validacao contra tabela CNAE fica para a proxima etapa tecnica.</span>
                        <input
                          value={companyForm.cnae_main}
                          onChange={(event) => setCompanyForm((prev) => ({ ...prev, cnae_main: event.target.value }))}
                          placeholder="CNAE principal"
                          className="mt-2 w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                        />
                      </label>
                    ) : null}
                    {onboardingMicroStepIndex === 4 ? (
                      <label className="block">
                        <span className="text-sm font-semibold text-[#10243e]">Porte da empresa</span>
                        <span className="mt-1 block text-xs text-[#6f665b]">O porte ajuda a orientar a leitura da obrigacao e da jornada.</span>
                        <input
                          value={companyForm.company_size}
                          onChange={(event) => setCompanyForm((prev) => ({ ...prev, company_size: event.target.value }))}
                          placeholder="ME, EPP, medio porte ou grande porte"
                          className="mt-2 w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                        />
                      </label>
                    ) : null}
                    {onboardingMicroStepIndex === 5 ? (
                      <label className="block">
                        <span className="text-sm font-semibold text-[#10243e]">Quantidade aproximada de trabalhadores</span>
                        <span className="mt-1 block text-xs text-[#6f665b]">A quantidade de trabalhadores ajuda a priorizar a base do PGR.</span>
                        <input
                          value={companyForm.employee_count}
                          onChange={(event) => setCompanyForm((prev) => ({ ...prev, employee_count: event.target.value }))}
                          placeholder="Ex.: 45"
                          className="mt-2 w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                        />
                      </label>
                    ) : null}
                    {onboardingMicroStepIndex === 6 ? (
                      <div className="rounded-2xl border border-[#d9c9b8] bg-white p-4">
                        <p className="text-sm font-semibold text-[#10243e]">Caracterizacao inicial de SST</p>
                        <p className="mt-1 text-xs text-[#6f665b]">Marque o que ja existe na realidade da empresa.</p>
                        <div className="mt-4 grid gap-3 text-sm text-[#10243e] sm:grid-cols-2">
                          {[
                            ["has_cipa", "Possui CIPA"],
                            ["has_sesmt", "Possui SESMT"],
                            ["has_third_parties", "Possui terceiros"],
                            ["has_remote_work", "Possui trabalho remoto"],
                            ["has_external_activities", "Possui atividades externas"],
                            ["has_public_service", "Possui atendimento ao publico"],
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
                    ) : null}
                    {onboardingMicroStepIndex === 7 ? (
                      <div className="rounded-2xl border border-[#d9c9b8] bg-[#fffaf3] p-4">
                        <p className="text-sm font-semibold text-[#10243e]">Proximas etapas da triagem</p>
                        <p className="mt-2 text-sm leading-6 text-[#6f665b]">
                          Depois desta qualificacao, a jornada segue para estabelecimento, setor, atividade ou tarefa, grupo exposto e historico ocupacional dos ultimos 24 meses.
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[#6f665b]">
                          O historico sera coletado como indicador agregado: afastamentos, acidentes, CAT, atestados recorrentes, setores mais afetados, motivos agrupados e evidencias existentes. Nao deve coletar nome de trabalhador, prontuario medico, CID individual ou diagnostico clinico individual.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className={showGuidedSetup ? "hidden" : "mt-5 grid gap-3"}>
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
                      ["has_external_activities", "Atividades externas"],
                      ["has_public_service", "Atendimento ao publico"],
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

                <div className="mt-5 flex items-center justify-between gap-3">
                  {showGuidedSetup && onboardingMicroStepIndex > 0 ? (
                    <button type="button" onClick={() => setOnboardingMicroStepIndex((prev) => Math.max(0, prev - 1))} className="rounded-xl border border-[#d9c9b8] px-4 py-2 text-sm font-semibold text-[#10243e] hover:bg-[#f7f1e8]">
                      Voltar
                    </button>
                  ) : <span />}
                  <button
                    type={showGuidedSetup && !isLastOnboardingMicroStep ? "button" : "submit"}
                    onClick={
                      showGuidedSetup && !isLastOnboardingMicroStep
                        ? handleContinueGuidedMicroStep
                        : undefined
                    }
                    disabled={formStatus === "saving"}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {showGuidedSetup ? (isLastOnboardingMicroStep ? onboardingCurrentStep.buttonLabel : "Continuar") : "Cadastrar empresa"}
                  </button>
                </div>
              </form>
              ) : null}

              {(!showGuidedSetup || onboardingCurrentStep.key === "estabelecimento") ? (
              <form onSubmit={handleCreateEstablishment} className={showGuidedSetup ? "mt-6 border-t border-[#ead8c8] pt-5" : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"}>
                <h2 className={showGuidedSetup ? "sr-only" : "text-xl font-semibold"}>2. Estabelecimento</h2>
                <p className="mt-1 text-sm text-slate-500">Organize a unidade onde as atividades acontecem e onde a documentacao sera estruturada.</p>

                {showGuidedSetup ? (
                  <div className="mt-5">
                    {onboardingMicroStepIndex === 0 ? (
                      <input
                        value={establishmentForm.name}
                        onChange={(event) => setEstablishmentForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Nome da unidade"
                        className="w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                      />
                    ) : null}
                    {onboardingMicroStepIndex === 1 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={establishmentForm.city}
                          onChange={(event) => setEstablishmentForm((prev) => ({ ...prev, city: event.target.value }))}
                          placeholder="Cidade"
                          className="rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                        />
                        <input
                          value={establishmentForm.state}
                          onChange={(event) => setEstablishmentForm((prev) => ({ ...prev, state: event.target.value }))}
                          placeholder="UF"
                          className="rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className={showGuidedSetup ? "hidden" : "mt-5 grid gap-3"}>
                  <select
                    value={establishmentForm.company_id || activeCompanyId}
                    onChange={(event) => {
                      activeCompanyIdRef.current = event.target.value;
                      setActiveCompanyId(event.target.value);
                      setStoredWorkspaceSelection(contextRef.current.tenantId, {
                        companyId: event.target.value,
                        establishmentId: "",
                      });
                      setEstablishmentForm((prev) => ({ ...prev, company_id: event.target.value }));
                    }}
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

                <div className="mt-5 flex items-center justify-between gap-3">
                  {showGuidedSetup && onboardingMicroStepIndex > 0 ? (
                    <button type="button" onClick={() => setOnboardingMicroStepIndex((prev) => Math.max(0, prev - 1))} className="rounded-xl border border-[#d9c9b8] px-4 py-2 text-sm font-semibold text-[#10243e] hover:bg-[#f7f1e8]">
                      Voltar
                    </button>
                  ) : <span />}
                  <button
                    type={showGuidedSetup && !isLastOnboardingMicroStep ? "button" : "submit"}
                    onClick={
                      showGuidedSetup && !isLastOnboardingMicroStep
                        ? handleContinueGuidedMicroStep
                        : undefined
                    }
                    disabled={formStatus === "saving"}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {showGuidedSetup ? (isLastOnboardingMicroStep ? onboardingCurrentStep.buttonLabel : "Continuar") : "Cadastrar estabelecimento"}
                  </button>
                </div>
              </form>
              ) : null}

              {(!showGuidedSetup || onboardingCurrentStep.key === "setor") ? (
              <form onSubmit={handleCreateDepartment} className={showGuidedSetup ? "mt-6 border-t border-[#ead8c8] pt-5" : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"}>
                <h2 className={showGuidedSetup ? "sr-only" : "text-xl font-semibold"}>3. Setor</h2>
                <p className="mt-1 text-sm text-slate-500">Mapeie os setores reais de trabalho antes de vincular atividades e riscos.</p>

                {showGuidedSetup ? (
                  <div className="mt-5">
                    {onboardingMicroStepIndex === 0 ? (
                      <input
                        value={departmentForm.name}
                        onChange={(event) => setDepartmentForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Nome do setor"
                        className="w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                      />
                    ) : null}
                    {onboardingMicroStepIndex === 1 ? (
                      <input
                        value={departmentForm.employee_count}
                        onChange={(event) => setDepartmentForm((prev) => ({ ...prev, employee_count: event.target.value }))}
                        placeholder="Numero de pessoas no setor"
                        className="w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                      />
                    ) : null}
                  </div>
                ) : null}

                <div className={showGuidedSetup ? "hidden" : "mt-5 grid gap-3"}>
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

                <div className="mt-5 flex items-center justify-between gap-3">
                  {showGuidedSetup && onboardingMicroStepIndex > 0 ? (
                    <button type="button" onClick={() => setOnboardingMicroStepIndex((prev) => Math.max(0, prev - 1))} className="rounded-xl border border-[#d9c9b8] px-4 py-2 text-sm font-semibold text-[#10243e] hover:bg-[#f7f1e8]">
                      Voltar
                    </button>
                  ) : <span />}
                  <button
                    type={showGuidedSetup && !isLastOnboardingMicroStep ? "button" : "submit"}
                    onClick={
                      showGuidedSetup && !isLastOnboardingMicroStep
                        ? handleContinueGuidedMicroStep
                        : undefined
                    }
                    disabled={formStatus === "saving"}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {showGuidedSetup ? (isLastOnboardingMicroStep ? onboardingCurrentStep.buttonLabel : "Continuar") : "Cadastrar setor"}
                  </button>
                </div>
              </form>
              ) : null}

              {(!showGuidedSetup || onboardingCurrentStep.key === "atividade") ? (
              <form onSubmit={handleCreateActivity} className={showGuidedSetup ? "mt-6 border-t border-[#ead8c8] pt-5" : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"}>
                <h2 className={showGuidedSetup ? "sr-only" : "text-xl font-semibold"}>4. Atividade</h2>
                <p className="mt-1 text-sm text-slate-500">Descreva as atividades reais executadas para orientar o diagnostico e o plano de acao.</p>

                {showGuidedSetup ? (
                  <div className="mt-5">
                    {onboardingMicroStepIndex === 0 ? (
                      <input
                        value={activityForm.name}
                        onChange={(event) => setActivityForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Nome da atividade"
                        className="w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                      />
                    ) : null}
                    {onboardingMicroStepIndex === 1 ? (
                      <textarea
                        value={activityForm.real_activity_description}
                        onChange={(event) => setActivityForm((prev) => ({ ...prev, real_activity_description: event.target.value }))}
                        placeholder="Descreva em uma frase simples"
                        rows={4}
                        className="w-full rounded-2xl border border-[#d9c9b8] bg-white px-4 py-3 text-base"
                      />
                    ) : null}
                  </div>
                ) : null}

                <div className={showGuidedSetup ? "hidden" : "mt-5 grid gap-3"}>
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

                <div className="mt-5 flex items-center justify-between gap-3">
                  {showGuidedSetup && onboardingMicroStepIndex > 0 ? (
                    <button type="button" onClick={() => setOnboardingMicroStepIndex((prev) => Math.max(0, prev - 1))} className="rounded-xl border border-[#d9c9b8] px-4 py-2 text-sm font-semibold text-[#10243e] hover:bg-[#f7f1e8]">
                      Voltar
                    </button>
                  ) : <span />}
                  <button
                    type={showGuidedSetup && !isLastOnboardingMicroStep ? "button" : "submit"}
                    onClick={
                      showGuidedSetup && !isLastOnboardingMicroStep
                        ? handleContinueGuidedMicroStep
                        : undefined
                    }
                    disabled={formStatus === "saving"}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {showGuidedSetup ? (isLastOnboardingMicroStep ? onboardingCurrentStep.buttonLabel : "Continuar") : "Cadastrar atividade"}
                  </button>
                </div>
              </form>
              ) : null}
            </section>
          ) : null}

          {showWorkspaceDashboardContent && isWorkspaceMode && draft.activeSection === "diagnostico" ? (
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Diagnóstico guiado do trabalho</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                      Responda por atividade, registre o contexto real do trabalho e mantenha foco nos fatores ocupacionais.
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
                      onChange={(event) => {
                        setDiagnosisActivityId(event.target.value);
                        setDiagnosisSessionId("");
                        setDiagnosisRiskId("");
                      }}
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
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    Iniciar diagnóstico guiado
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
                  disabled={diagnosisStatus === "saving"}
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
                  disabled={diagnosisStatus === "saving"}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Salvar psicossocial
                </button>
              </form>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">3. Encaminhar para inventario de riscos</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Fecha a revisao do diagnostico e gera um risco preliminar real vinculado a atividade, setor, estabelecimento e sessao.
                </p>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  A acao usa a rota real de revisao do diagnostico com geracao de risco e prepara o proximo passo para plano de acao.
                </div>

                <button
                  type="button"
                  onClick={() => void handleGeneratePreliminaryRiskFromDiagnosis()}
                  disabled={diagnosisStatus === "saving"}
                  className="mt-5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  Gerar risco preliminar a partir do diagnóstico
                </button>

                {diagnosisRiskId ? (
                  <p className="mt-3 text-sm text-slate-600">Risco preliminar: {diagnosisRiskId}</p>
                ) : null}
              </div>
            </section>
          ) : null}

          {showWorkspaceDashboardContent && isWorkspaceMode && draft.activeSection === "riscos" ? (
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Riscos e plano de acao</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                      Revise os riscos encontrados, priorize o que precisa de controle e organize as acoes de melhoria.
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

                {riskError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {riskError}
                  </div>
                ) : null}

                {riskSuccess ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    {riskSuccess}
                  </div>
                ) : null}
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
                    <p className="mt-2 text-lg font-semibold">Risco: {riskStatus} / Plano: {actionPlanStatus}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
                <form onSubmit={handleCreateRisk} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">1. Criar risco manual</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha os dados principais para registrar o risco com seguranca.
                  </p>

                  <div className="mt-5 grid gap-3">
                    <select
                      value={riskForm.department_id || firstString(departments[0], ["id"]) || ""}
                      onChange={(event) => setRiskForm((prev) => ({ ...prev, department_id: event.target.value, activity_id: "" }))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione o setor</option>
                      {departments.map((item, index) => (
                        <option key={item.id || index} value={item.id || ""}>
                          {displayName(item, `Setor ${index + 1}`)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={riskForm.activity_id || firstString(activities[0], ["id"]) || ""}
                      onChange={(event) => {
                        const selected = activities.find((item) => item.id === event.target.value) || null;
                        setRiskForm((prev) => ({
                          ...prev,
                          activity_id: event.target.value,
                          department_id: firstString(selected, ["department_id"]) || prev.department_id,
                        }));
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione a atividade</option>
                      {activities.map((item, index) => (
                        <option key={item.id || index} value={item.id || ""}>
                          {displayName(item, `Atividade ${index + 1}`)}
                        </option>
                      ))}
                    </select>

                    <input
                      value={riskForm.title}
                      onChange={(event) => setRiskForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Titulo do risco"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <div className="grid gap-3 md:grid-cols-3">
                      <select
                        value={riskForm.risk_category}
                        onChange={(event) => setRiskForm((prev) => ({ ...prev, risk_category: event.target.value }))}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="physical">Fisico</option>
                        <option value="chemical">Quimico</option>
                        <option value="biological">Biologico</option>
                        <option value="accident">Acidente</option>
                        <option value="ergonomics">Ergonomico</option>
                        <option value="psychosocial">Psicossocial</option>
                        <option value="mixed">Misto</option>
                      </select>

                      <select
                        value={riskForm.risk_level}
                        onChange={(event) => setRiskForm((prev) => ({ ...prev, risk_level: event.target.value }))}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="low">Baixo</option>
                        <option value="medium">Medio</option>
                        <option value="high">Alto</option>
                        <option value="critical">Critico</option>
                      </select>

                      <select
                        value={riskForm.status}
                        onChange={(event) => setRiskForm((prev) => ({ ...prev, status: event.target.value }))}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="identified">Identificado</option>
                        <option value="under_analysis">Em analise</option>
                        <option value="classified">Classificado</option>
                        <option value="action_defined">Com acao definida</option>
                        <option value="controlled">Controlado</option>
                        <option value="requires_review">Requer revisao</option>
                      </select>
                    </div>

                    <textarea
                      value={riskForm.hazard_description}
                      onChange={(event) => setRiskForm((prev) => ({ ...prev, hazard_description: event.target.value }))}
                      placeholder="Descricao do perigo"
                      rows={3}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <textarea
                      value={riskForm.source_circumstance}
                      onChange={(event) => setRiskForm((prev) => ({ ...prev, source_circumstance: event.target.value }))}
                      placeholder="Fonte ou circunstancia"
                      rows={2}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <textarea
                      value={riskForm.exposed_group}
                      onChange={(event) => setRiskForm((prev) => ({ ...prev, exposed_group: event.target.value }))}
                      placeholder="Grupo exposto"
                      rows={2}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <textarea
                      value={riskForm.possible_harms}
                      onChange={(event) => setRiskForm((prev) => ({ ...prev, possible_harms: event.target.value }))}
                      placeholder="Possiveis lesoes ou agravos"
                      rows={2}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <textarea
                      value={riskForm.existing_controls}
                      onChange={(event) => setRiskForm((prev) => ({ ...prev, existing_controls: event.target.value }))}
                      placeholder="Controles existentes"
                      rows={2}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <textarea
                      value={riskForm.recommended_measure}
                      onChange={(event) => setRiskForm((prev) => ({ ...prev, recommended_measure: event.target.value }))}
                      placeholder="Medida recomendada"
                      rows={2}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={riskForm.suggested_responsible}
                        onChange={(event) => setRiskForm((prev) => ({ ...prev, suggested_responsible: event.target.value }))}
                        placeholder="Responsavel sugerido"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={riskForm.suggested_deadline}
                        onChange={(event) => setRiskForm((prev) => ({ ...prev, suggested_deadline: event.target.value }))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={riskStatus === "saving"}
                    className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {riskStatus === "saving" ? "Salvando risco..." : "Criar risco manual"}
                  </button>
                </form>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">2. Selecionar risco</h3>
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
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <form onSubmit={handleCreateActionPlan} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">3. Criar plano de acao</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    De um nome claro ao plano e mantenha-o vinculado ao risco selecionado.
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
                  Acoes vinculadas ao risco selecionado.
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
          {showWorkspaceDashboardContent && isWorkspaceMode && draft.activeSection === "auditoria" ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Trilha do processo</h2>
                  <p className="mt-1 text-sm text-slate-500">Acompanhe os registros gerados durante o preenchimento da jornada.</p>
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
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </section>
      </div>
          </>
      ) : null}
    </main>
);
}
