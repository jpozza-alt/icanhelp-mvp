"use client";

import Nr1WorkspaceV2Shell from "@/components/nr1/Nr1WorkspaceV2Shell";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FORMAL_PGR_OPERATIONS_ENABLED = false;

type TenantOption = {
  id: string;
  name: string;
  role?: string | null;
};

type EstablishmentOption = {
  id: string;
  company_id?: string | null;
  name: string;
  city?: string | null;
  state?: string | null;
  status?: string | null;
};

type CompanyOption = {
  id: string;
  tenant_id: string;
  legal_name: string;
  trade_name?: string | null;
};

type PgrSnapshotVersion = {
  id: string;
  version: number;
  document_type: string;
  status: string;
  generated_at: string;
  generated_by?: string | null;
  supersedes_document_id?: string | null;
};
type LoadStatus = "idle" | "loading" | "loaded" | "error";
type AnyRecord = Record<string, unknown>;

const RISK_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  physical: "Físico",
  chemical: "Químico",
  biological: "Biológico",
  accident: "Acidente",
  ergonomics: "Ergonômico",
  psychosocial: "Psicossocial",
  mixed: "Misto",
};

const RISK_LEVEL_LABELS: Readonly<Record<string, string>> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

const PRIORITY_LABELS: Readonly<Record<string, string>> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const ACTION_PLAN_STATUS_LABELS: Readonly<Record<string, string>> = {
  open: "Aberto",
  in_progress: "Em andamento",
  completed: "Concluído",
  overdue: "Atrasado",
  awaiting_evidence: "Aguardando evidência",
  reopened: "Reaberto",
};

const EVIDENCE_TYPE_LABELS: Readonly<Record<string, string>> = {
  document: "Documento",
  photo: "Fotografia",
  report: "Relatório",
  certificate: "Certificado",
  attendance_list: "Lista de presença",
  inspection_record: "Registro de inspeção",
};

const EVIDENCE_STATUS_LABELS: Readonly<Record<string, string>> = {
  pending_validation: "Pendente de validação",
  validated: "Validada",
  rejected: "Rejeitada",
  archived: "Arquivada",
};

const AUDIT_EVENT_LABELS: Readonly<Record<string, string>> = {
  nr1_action_followup_created: "Acompanhamento do plano registrado",
  nr1_action_plan_created: "Plano de ação criado",
  preliminary_risk_generated_from_diagnosis_review: "Risco preliminar gerado após revisão do diagnóstico",
  diagnosis_psychosocial_saved_from_workspace: "Fatores psicossociais salvos",
  diagnosis_context_saved_from_workspace: "Contexto do diagnóstico salvo",
  workspace_draft_saved: "Rascunho salvo",
  diagnosis_session_started_from_workspace: "Diagnóstico iniciado",
  diagnosis_review_risk_generated: "Risco gerado após revisão do diagnóstico",
  diagnosis_review_risk_updated: "Risco atualizado após revisão do diagnóstico",
  pgr_report_generated: "Prévia do PGR gerada",
  establishment_selected: "Local de trabalho selecionado",
  activity_created_from_workspace: "Atividade criada",
  department_created_from_workspace: "Setor criado",
  establishment_created_from_workspace: "Local de trabalho criado",
  nr1_evidence_item_created: "Evidência registrada",
  nr1_evidence_item_archived: "Evidência arquivada",
  nr1_risk_created: "Risco registrado",
};

const AUDIT_ENTITY_LABELS: Readonly<Record<string, string>> = {
  workspace_shell: "Espaço de trabalho NR-1",
  nr1_action_followup: "Acompanhamento",
  nr1_action_plan: "Plano de ação",
  nr1_risk: "Risco",
  nr1_evidence_item: "Evidência",
  nr1_establishment: "Local de trabalho",
  nr1_department: "Setor",
  nr1_activity: "Atividade",
  diagnosis_session: "Diagnóstico",
  pgr_report: "Prévia do PGR",
};

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

function parseTenants(payload: unknown): TenantOption[] {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { items?: unknown[] })?.items)
      ? (payload as { items: unknown[] }).items
      : [];

  return raw
    .map((item) => {
      const record = item as AnyRecord;
      const id = String(record.id ?? record.tenant_id ?? "").trim();
      const name = String(record.name ?? record.slug ?? "Empresa").trim();
      const role = record.role ? String(record.role) : null;
      return { id, name, role };
    })
    .filter((item) => item.id.length > 0);
}

function parseEstablishments(payload: unknown): EstablishmentOption[] {
  const raw = Array.isArray((payload as { items?: unknown[] })?.items)
    ? (payload as { items: unknown[] }).items
    : Array.isArray((payload as { data?: unknown[] })?.data)
      ? (payload as { data: unknown[] }).data
      : Array.isArray(payload)
        ? payload
        : [];

  return raw
    .map((item) => {
      const record = item as AnyRecord;
      const id = String(record.id ?? "").trim();
      const companyId = record.company_id ? String(record.company_id) : null;
      const name = String(record.name ?? "Estabelecimento").trim();
      const city = record.city ? String(record.city) : null;
      const state = record.state ? String(record.state) : null;
      const status = record.status ? String(record.status) : null;
      return { id, company_id: companyId, name, city, state, status };
    })
    .filter((item) => item.id.length > 0);
}

function parseCompanies(payload: unknown): CompanyOption[] {
  const wrapper = asRecord(payload);
  const raw = Array.isArray(wrapper.items)
    ? wrapper.items
    : Array.isArray(wrapper.data)
      ? wrapper.data
      : Array.isArray(payload)
        ? payload
        : [];

  return raw
    .map((item) => {
      const record = asRecord(item);
      const id = String(record.id ?? "").trim();
      const tenantId = String(record.tenant_id ?? "").trim();
      const legalName = String(record.legal_name ?? "").trim();
      const tradeName = record.trade_name ? String(record.trade_name).trim() : null;

      return {
        id,
        tenant_id: tenantId,
        legal_name: legalName,
        trade_name: tradeName || null,
      };
    })
    .filter((item) => item.id.length > 0 && item.tenant_id.length > 0 && item.legal_name.length > 0);
}

function isTechnicalTenantName(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    !normalized ||
    normalized.startsWith("tenant-") ||
    normalized.startsWith("tenant_") ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)
  );
}

function parseSnapshotVersions(payload: unknown): PgrSnapshotVersion[] {
  const wrapper = asRecord(payload);
  const raw = Array.isArray(wrapper.data)
    ? wrapper.data
    : Array.isArray(wrapper.items)
      ? wrapper.items
      : Array.isArray(payload)
        ? payload
        : [];

  return raw
    .map((item) => {
      const record = asRecord(item);
      const id = String(record.id ?? "").trim();
      const versionNumber = Number(record.version ?? 0);
      const version = Number.isFinite(versionNumber) ? versionNumber : 0;
      const documentType = String(record.document_type ?? "").trim();
      const status = String(record.status ?? "").trim();
      const generatedAt = String(record.generated_at ?? "").trim();
      const generatedBy = record.generated_by ? String(record.generated_by) : null;
      const supersedesDocumentId = record.supersedes_document_id ? String(record.supersedes_document_id) : null;

      return {
        id,
        version,
        document_type: documentType,
        status,
        generated_at: generatedAt,
        generated_by: generatedBy,
        supersedes_document_id: supersedesDocumentId,
      };
    })
    .filter((item) => item.id.length > 0)
    .sort((a, b) => b.version - a.version);
}
function getReport(payload: unknown): AnyRecord | null {
  const wrapper = asRecord(payload);
  const report = wrapper.report;
  return report && typeof report === "object" ? (report as AnyRecord) : null;
}

function readArray(report: AnyRecord | null, key: string): AnyRecord[] {
  const value = report?.[key];
  return Array.isArray(value) ? value.map((item) => asRecord(item)) : [];
}

function readArrayCount(report: unknown, key: string): number {
  const record = report as AnyRecord;
  const value = record?.[key];
  return Array.isArray(value) ? value.length : 0;
}

function text(value: unknown, fallback = "-"): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  return fallback;
}

function dateOnlyText(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "-";
  }

  const raw = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);

  if (!match) {
    return raw;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    return raw;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function dateTimeText(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function humanLabel(value: unknown, labels: Readonly<Record<string, string>>): string {
  const raw = text(value, "");

  if (!raw) {
    return "Não informado";
  }

  const knownLabel = labels[raw];
  if (knownLabel) {
    return knownLabel;
  }

  const readable = raw.replace(/[_-]+/g, " ").trim();
  return readable ? readable.charAt(0).toLocaleUpperCase("pt-BR") + readable.slice(1) : "Não informado";
}

function hasDisplayValue(value: unknown): boolean {
  return typeof value === "boolean" ||
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value));
}

function formatCnpj(value: unknown): string {
  const raw = text(value, "");
  const digits = raw.replace(/\D/g, "");

  return digits.length === 14
    ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : raw || "Não informado";
}

function formatCnae(value: unknown): string {
  const raw = text(value, "");
  const digits = raw.replace(/\D/g, "");

  return digits.length === 7
    ? digits.replace(/^(\d{4})(\d)(\d{2})$/, "$1-$2/$3")
    : raw || "Não informado";
}

function formatCityState(cityValue: unknown, stateValue: unknown): string {
  const city = text(cityValue, "");
  const state = text(stateValue, "");
  return [city, state].filter(Boolean).join(" / ") || "Não informado";
}

function auditCategory(eventTypeValue: unknown): string {
  const eventType = text(eventTypeValue, "");

  if (eventType.includes("diagnosis")) return "Diagnóstico";
  if (eventType.includes("risk") || eventType.includes("action_plan")) return "Riscos e planos";
  if (eventType.includes("evidence") || eventType.includes("followup")) return "Evidências e acompanhamentos";
  if (eventType.includes("pgr_report")) return "PGR";
  return "Contexto e estrutura";
}

async function resolvePgrApprovalAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  const directToken =
    window.localStorage.getItem("sb-access-token") ||
    window.localStorage.getItem("access_token") ||
    "";

  if (directToken) {
    return directToken;
  }

  const authStorageKey = Object.keys(window.localStorage).find((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));

  if (!authStorageKey) {
    return "";
  }

  const storedAuth = window.localStorage.getItem(authStorageKey);

  if (!storedAuth) {
    return "";
  }

  try {
    const parsedAuth = JSON.parse(storedAuth) as {
      access_token?: string;
      currentSession?: { access_token?: string };
      session?: { access_token?: string };
    };

    return parsedAuth.access_token || parsedAuth.currentSession?.access_token || parsedAuth.session?.access_token || "";
  } catch {
    return "";
  }
}
function SectionTitle(props: { children: React.ReactNode }) {
  return <h2 className="nr1-print-section-title mt-8 border-b border-slate-300 pb-2 text-xl font-semibold text-slate-950">{props.children}</h2>;
}

function InfoGrid(props: { items: Array<[string, unknown]>; selectedTenantId?: string; selectedEstablishmentId?: string; selectedDocumentVersionId?: string }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {FORMAL_PGR_OPERATIONS_ENABLED ? (
        <PgrProfessionalApprovalPanel selectedTenantId={props.selectedTenantId} selectedEstablishmentId={props.selectedEstablishmentId} selectedDocumentVersionId={props.selectedDocumentVersionId} />
      ) : null}

      {props.items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{text(value)}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState(props: { text: string }) {
  return <p className="nr1-print-avoid mt-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">{props.text}</p>;
}

function PrintFooter() {
  return (
    <footer id="nr1PrintLayoutVersion" className="mt-10 border-t border-slate-300 pt-4 text-[11px] leading-5 text-slate-500">
      <p>Prévia não formal gerada pelo icanHelp para apoio ao Gerenciamento de Riscos Ocupacionais.</p>
      <p>Esta visualização não constitui versão formal, aprovação profissional ou documento para assinatura.</p>
    </footer>
  );
}

export default function Nr1PgrReportPage() {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [reportPayload, setReportPayload] = useState<unknown>(null);
  const [snapshotVersions, setSnapshotVersions] = useState<PgrSnapshotVersion[]>([]);
  const companyRequestSequence = useRef(0);

  const report = getReport(reportPayload);
  const latestFormalDocumentVersionId = snapshotVersions[0]?.id ?? "";
  const selectedTenant = tenants.find((tenantItem) => tenantItem.id === selectedTenantId);
  const selectedEstablishment = establishments.find((item) => item.id === selectedEstablishmentId);
  const selectedCompany = companies.find((item) => item.id === selectedEstablishment?.company_id);
  const topSelectorScopeReady = Boolean(selectedTenantId && selectedEstablishmentId);
  const safeTenantName = selectedTenant?.name?.trim() || "";
  const activeCompanyName =
    selectedCompany?.trade_name?.trim() ||
    selectedCompany?.legal_name?.trim() ||
    (!isTechnicalTenantName(safeTenantName) ? safeTenantName : "") ||
    "Empresa ativa";
  const activeEstablishmentName = selectedEstablishment?.name || "Local de trabalho não selecionado";
  const previewProgress = report ? 100 : topSelectorScopeReady ? 50 : 0;
  const previewProgressDescription = report
    ? "Preparação da prévia concluída. Isso não representa formalização do PGR."
    : topSelectorScopeReady
      ? "Contexto selecionado. Gere a prévia para conferir a consolidação."
      : "Selecione a empresa e o local de trabalho para preparar a prévia.";
  const previewStatus = report ? "Prévia gerada" : topSelectorScopeReady ? "Pronta para gerar" : "Contexto pendente";

  const summary = useMemo(() => {
    if (!report) {
      return null;
    }

    return {
      departments: readArrayCount(report, "departments"),
      activities: readArrayCount(report, "activities"),
      risks: readArrayCount(report, "risks"),
      actionPlans: readArrayCount(report, "actionPlans"),
      actionFollowups: readArrayCount(report, "actionFollowups"),
      evidenceItems: readArrayCount(report, "evidenceItems"),
      auditEvents: readArrayCount(report, "auditEvents"),
      occupationalHealthRefs: readArrayCount(report, "occupationalHealthRefs"),
      trainingRecords: readArrayCount(report, "trainingRecords"),
    };
  }, [report]);

  const summaryItems = summary
    ? [
        ["Setores", summary.departments],
        ["Atividades", summary.activities],
        ["Riscos", summary.risks],
        ["Planos de ação", summary.actionPlans],
        ["Acompanhamentos", summary.actionFollowups],
        ["Evidências", summary.evidenceItems],
        ["Eventos de auditoria", summary.auditEvents],
        ["Referências de saúde", summary.occupationalHealthRefs],
        ["Treinamentos", summary.trainingRecords],
      ] as const
    : [];

  const company = asRecord(report?.company);
  const establishment = asRecord(report?.establishment);
  const scope = asRecord(report?.scope);
  const risks = readArray(report, "risks");
  const actionPlans = readArray(report, "actionPlans");
  const actionFollowups = readArray(report, "actionFollowups");
  const evidenceItems = readArray(report, "evidenceItems");
  const auditEvents = readArray(report, "auditEvents");
  const generatedAt = text(report?.generatedAt, "");
  const reportCompanyName = text(company.trade_name ?? company.legal_name, activeCompanyName);
  const reportEstablishmentName = text(establishment.name, activeEstablishmentName);
  const legalName = text(company.legal_name, "");
  const tradeName = text(company.trade_name, "");
  const showTradeName = Boolean(
    tradeName &&
    legalName.localeCompare(tradeName, "pt-BR", { sensitivity: "base" }) !== 0
  );
  const identificationItems: Array<[string, unknown]> = [
    ["Razão social", legalName || tradeName || "Não informado"],
  ];

  if (showTradeName) {
    identificationItems.push(["Nome fantasia", tradeName]);
  }

  identificationItems.push(
    ["CNPJ", formatCnpj(company.cnpj)],
    ["CNAE principal", formatCnae(company.cnae_main)],
    ["Grau de risco", text(company.risk_grade, "Não informado")],
    ["Estabelecimento", establishment.name],
    ["Cidade/UF", formatCityState(establishment.city, establishment.state)],
    ["Trabalhadores", text(establishment.employee_count, "Não informado")],
  );

  const relevantAuditEvents = auditEvents
    .filter((item) => text(item.event_type, "") !== "workspace_draft_saved")
    .slice(0, 5);
  const auditCategories = Array.from(new Set(auditEvents.map((item) => auditCategory(item.event_type))));
  const latestAuditEvent = auditEvents[0] ?? null;

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token ?? "";

    if (!accessToken) {
      throw new Error("Sessão não encontrada. Faça login novamente.");
    }

    setToken(accessToken);
    return accessToken;
  }

  async function loadInitialContext() {
    setStatus("loading");
    setMessage("Carregando contexto NR1...");

    try {
      const accessToken = await getAccessToken();

      const tenantsResponse = await fetch("/api/tenants", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const tenantsPayload = await tenantsResponse.json();
      const tenantItems = parseTenants(tenantsPayload);

      if (!tenantsResponse.ok || tenantItems.length === 0) {
        throw new Error("Nenhuma empresa disponível para o usuário.");
      }

      setTenants(tenantItems);

      const firstTenantId = selectedTenantId || tenantItems[0].id;
      setSelectedTenantId(firstTenantId);

      await Promise.all([
        loadCompanies(accessToken, firstTenantId),
        loadEstablishments(accessToken, firstTenantId),
      ]);
      setStatus("idle");
      setMessage("Selecione o local de trabalho e gere a prévia.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao carregar contexto NR1.");
    }
  }

  async function loadCompanies(accessToken: string, tenantId: string) {
    const requestSequence = ++companyRequestSequence.current;

    try {
      const response = await fetch(`/api/nr1/companies?tenantId=${encodeURIComponent(tenantId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-icanhelp-tenant": tenantId,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      const payload = await response.json();

      if (requestSequence !== companyRequestSequence.current) {
        return;
      }

      setCompanies(response.ok ? parseCompanies(payload) : []);
    } catch {
      if (requestSequence === companyRequestSequence.current) {
        setCompanies([]);
      }
    }
  }

  async function loadEstablishments(accessToken: string, tenantId: string) {
    const response = await fetch("/api/nr1/establishments", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-icanhelp-tenant": tenantId,
        Accept: "application/json",
      },
    });

    const payload = await response.json();
    const items = parseEstablishments(payload);

    if (!response.ok) {
      throw new Error("Falha ao carregar estabelecimentos.");
    }

    setEstablishments(items);

    const queryParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const queryEstablishmentId =
      queryParams?.get("establishmentId")?.trim() ||
      queryParams?.get("establishment_id")?.trim() ||
      "";

    const nextSelectedEstablishmentId =
      items.find((item) => item.id === queryEstablishmentId)?.id ?? items[0]?.id ?? "";

    setSelectedEstablishmentId(nextSelectedEstablishmentId);
  }

  async function handleTenantChange(nextTenantId: string) {
    setSelectedTenantId(nextTenantId);
    setSelectedEstablishmentId("");
    setCompanies([]);
    setEstablishments([]);
    setReportPayload(null);
    setSnapshotVersions([]);

    try {
      setStatus("loading");
      setMessage("Carregando empresas e locais de trabalho...");
      const accessToken = token || (await getAccessToken());
      await Promise.all([
        loadCompanies(accessToken, nextTenantId),
        loadEstablishments(accessToken, nextTenantId),
      ]);
      setStatus("idle");
      setMessage("Contexto carregado.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao trocar empresa.");
    }
  }
  async function loadReport() {
    if (!selectedTenantId) {
      setStatus("error");
      setMessage("Selecione uma empresa.");
      return;
    }

    if (!selectedEstablishmentId) {
      setStatus("error");
      setMessage("Selecione um local de trabalho.");
      return;
    }

    setStatus("loading");
    setMessage("Gerando prévia do PGR...");

    try {
      const accessToken = token || (await getAccessToken());

      const response = await fetch(
        `/api/nr1/pgr-report?establishmentId=${encodeURIComponent(selectedEstablishmentId)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-icanhelp-tenant": selectedTenantId,
            Accept: "application/json",
          },
        }
      );

      const payload = await response.json();
      setReportPayload(payload);

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Falha ao gerar relatório PGR.");
      }

      await loadFormalPgrSnapshots(accessToken);
      setStatus("loaded");
      setMessage("Prévia do PGR carregada. Use o botão de impressão para salvar uma cópia não formal.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatório PGR.");
    }
  }



  async function loadFormalPgrSnapshots(accessTokenOverride?: string) {
    if (!selectedTenantId || !selectedEstablishmentId) {
      setSnapshotVersions([]);
      return;
    }

    try {
      const accessToken = accessTokenOverride || token || (await getAccessToken());
      const response = await fetch(`/api/nr1/pgr-snapshot?establishmentId=${selectedEstablishmentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-icanhelp-tenant": selectedTenantId,
          Accept: "application/json",
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        setSnapshotVersions([]);
        return;
      }

      setSnapshotVersions(parseSnapshotVersions(payload));
    } catch {
      setSnapshotVersions([]);
    }
  }

  async function createFormalPgrSnapshot() {
    if (!selectedTenantId || !selectedEstablishmentId) {
      setMessage("Selecione tenant e estabelecimento antes de criar o snapshot formal.");
      return;
    }

    if (!reportPayload) {
      setMessage("Gere o relatorio antes de criar o snapshot formal.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("Criando snapshot formal do PGR...");
      const accessToken = token || (await getAccessToken());

      const response = await fetch("/api/nr1/pgr-snapshot", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-icanhelp-tenant": selectedTenantId,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          source_snapshot_json: reportPayload,
          status: "generated",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Falha ao criar snapshot formal do PGR.");
      }

      await loadFormalPgrSnapshots(accessToken);

      const version = payload?.data?.version ? ` versao ${payload.data.version}` : "";
      setStatus("loaded");
      setMessage(`Snapshot formal do PGR criado.${version}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao criar snapshot formal do PGR.");
    }
  }

  function handlePrintPdf() {
    if (!report) {
      setMessage("Gere a prévia antes de imprimir ou salvar em PDF.");
      return;
    }

    window.print();
  }

  useEffect(() => {
    loadInitialContext();
  }, []);

  const pgrTopContextSlot = (
    <section
      id="nr1-pgr-generation"
      className="nr1-screen-only min-w-0 rounded-[1.75rem] border border-[#d8c7ae] bg-[#FFFCF7] p-5 shadow-sm"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d7b37]">
          Contexto da prévia
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#10243e]">
          Empresa e local de trabalho
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#6f665b]">
          Confira o escopo antes de gerar a consolidação. Os identificadores técnicos permanecem somente nas chamadas internas.
        </p>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
        <label className="min-w-0 text-sm font-semibold text-[#10243e]">
          Empresa
          <select
            value={selectedTenantId}
            onChange={(event) => void handleTenantChange(event.target.value)}
            className="mt-2 w-full min-w-0 rounded-2xl border border-[#d9c9b8] bg-[#FFFCF7] px-4 py-3 text-sm font-semibold text-[#10243e] outline-none transition focus:border-[#9d7b37]"
          >
            {tenants.map((tenantItem, index) => {
              const tenantName = tenantItem.name.trim();
              const optionLabel =
                tenantItem.id === selectedTenantId && selectedCompany
                  ? activeCompanyName
                  : !isTechnicalTenantName(tenantName)
                    ? tenantName
                    : `Empresa ${index + 1}`;

              return (
                <option key={tenantItem.id} value={tenantItem.id}>
                  {optionLabel}
                </option>
              );
            })}
          </select>
        </label>

        <label className="min-w-0 text-sm font-semibold text-[#10243e]">
          Local de trabalho
          <select
            value={selectedEstablishmentId}
            onChange={(event) => {
              setSelectedEstablishmentId(event.target.value);
              setReportPayload(null);
              setSnapshotVersions([]);
            }}
            className="mt-2 w-full min-w-0 rounded-2xl border border-[#d9c9b8] bg-[#FFFCF7] px-4 py-3 text-sm font-semibold text-[#10243e] outline-none transition focus:border-[#9d7b37]"
          >
            {establishments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.city ? `- ${item.city}/${item.state ?? ""}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="mt-5 grid min-w-0 gap-3 md:grid-cols-2">
        <div className="min-w-0 rounded-2xl bg-[#f7efe6] px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7b37]">Empresa ativa</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-[#10243e]">{activeCompanyName}</dd>
        </div>
        <div className="min-w-0 rounded-2xl bg-[#f7efe6] px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7b37]">Local de trabalho</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-[#10243e]">{activeEstablishmentName}</dd>
          {selectedEstablishment?.city ? (
            <dd className="mt-1 text-xs text-[#6f665b]">
              {selectedEstablishment.city}/{selectedEstablishment.state ?? ""}
            </dd>
          ) : null}
        </div>
      </dl>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#e2d4bf] bg-[#fffdf9] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9d7b37]">Contexto selecionado</p>
          <p className="mt-2 text-sm font-semibold text-[#10243e]">{topSelectorScopeReady ? "Pronto" : "Pendente"}</p>
        </div>
        <div className="rounded-2xl border border-[#e2d4bf] bg-[#fffdf9] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9d7b37]">Dados prontos</p>
          <p className="mt-2 text-sm font-semibold text-[#10243e]">
            {status === "loading" ? "Carregando" : topSelectorScopeReady ? "Prontos para consolidar" : "Aguardando contexto"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e2d4bf] bg-[#fffdf9] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9d7b37]">Prévia gerada</p>
          <p className="mt-2 text-sm font-semibold text-[#10243e]">{report ? "Sim" : "Ainda não"}</p>
        </div>
      </div>

      <div className="mt-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="min-w-0 break-words text-sm text-[#6f665b]">{message || "Pronto para gerar."}</p>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <button
            id="nr1GeneratePgrReportButton"
            type="button"
            onClick={loadReport}
            disabled={status === "loading" || !topSelectorScopeReady}
            className="rounded-2xl bg-[#10243e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d344f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Gerando..." : "Gerar prévia"}
          </button>

          <button
            id="nr1PrintPgrReportButton"
            type="button"
            onClick={handlePrintPdf}
            disabled={!report || status === "loading"}
            className="rounded-2xl border border-[#10243e] bg-[#FFFCF7] px-5 py-3 text-sm font-semibold text-[#10243e] transition hover:bg-[#f7f1e8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Imprimir prévia — não formal
          </button>

          {FORMAL_PGR_OPERATIONS_ENABLED ? (
            <button
              id="nr1CreatePgrSnapshotButton"
              type="button"
              onClick={createFormalPgrSnapshot}
              disabled={!reportPayload || status === "loading"}
              className="rounded-2xl border border-[#D6B56C] bg-[#FFF8EA] px-5 py-3 text-sm font-semibold text-[#10243E] transition hover:bg-[#F4ECE2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Criar snapshot formal
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e2d4bf] bg-[#f7efe6] p-4 text-sm text-[#10243e]">
        <strong>Versão formal em preparação</strong>
        <p className="mt-1 leading-6 text-[#6f665b]">
          Você já pode conferir e imprimir a prévia. A criação da versão formal permanece indisponível enquanto esse fluxo está em validação.
        </p>
      </div>
    </section>
  );

  return (
    <>
      <style>{`
        @media print {
          html,
          body {
            background: #ffffff !important;
          }

          .nr1-pgr-shell > div {
            min-height: 0 !important;
            background: #ffffff !important;
          }

          .nr1-pgr-shell > div > div {
            display: block !important;
            min-height: 0 !important;
            max-width: none !important;
          }

          .nr1-pgr-shell aside,
          .nr1-pgr-shell > div > div > section > section:first-child,
          .nr1-pgr-shell > div > div > section > div {
            display: none !important;
          }

          .nr1-pgr-shell > div > div > section {
            padding: 0 !important;
          }

          .nr1-pgr-shell > div > div > section > section:last-child {
            margin: 0 !important;
          }

          .nr1-screen-only {
            display: none !important;
          }

          .nr1-pgr-content > * {
            display: none !important;
          }

          #nr1-pgr-print-area {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            overflow: visible !important;
            border: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10.5pt;
            line-height: 1.35;
          }

          #nr1-pgr-print-area * {
            color-adjust: exact;
            print-color-adjust: exact;
            overflow-wrap: anywhere;
            min-height: 0 !important;
          }

          #nr1-pgr-print-area > .nr1-print-section-title:nth-of-type(1) + div {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 7pt !important;
          }

          #nr1-pgr-print-area > .nr1-print-section-title:nth-of-type(2) + div {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 7pt !important;
          }

          #nr1-pgr-print-area .nr1-print-avoid,
          #nr1-pgr-print-area > .nr1-print-section-title + .grid > div {
            padding: 7pt !important;
          }

          #nr1-pgr-print-area .mt-4 {
            margin-top: 7pt !important;
          }

          #nr1-pgr-print-area .mt-3 {
            margin-top: 5pt !important;
          }

          #nr1-pgr-print-area .mt-2 {
            margin-top: 3pt !important;
          }

          #nr1-pgr-print-area .mt-1 {
            margin-top: 2pt !important;
          }

          #nr1-pgr-print-area .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 7pt !important;
          }

          #nr1-pgr-print-area .space-y-3 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 5pt !important;
          }

          .nr1-print-avoid,
          #nr1-pgr-print-area article {
            break-inside: avoid;
            page-break-inside: avoid;
            orphans: 3;
            widows: 3;
          }

          .nr1-print-section-title {
            break-after: avoid;
            page-break-after: avoid;
            margin-top: 12pt !important;
            padding-bottom: 4pt !important;
            font-size: 14pt !important;
            line-height: 1.25 !important;
          }

          .nr1-print-cover {
            border-bottom: 2px solid #D6B56C !important;
            padding-bottom: 10pt !important;
            margin-bottom: 10pt !important;
          }

          .nr1-print-cover h1 {
            font-size: 20pt !important;
            line-height: 1.2 !important;
          }

          .nr1-print-badge {
            border: 1px solid #E2D4BF !important;
            background: #FFF8EA !important;
            color: #8B5E34 !important;
          }

          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>

      <div className="nr1-pgr-shell">
        <Nr1WorkspaceV2Shell
          companyName={activeCompanyName}
          establishmentName={activeEstablishmentName}
          pgrStatus={previewStatus}
          progressPercent={previewProgress}
          progressDescription={previewProgressDescription}
          activeModule="PGR"
          modules={["Base", "Mapeamento", "Riscos", "Plano", "Evidências", "Trilha", "PGR"]}
          pendingItems={[
            topSelectorScopeReady ? "Contexto da prévia conferido" : "Selecionar empresa e local de trabalho",
            report ? "Conferir a consolidação gerada" : "Gerar a prévia do PGR",
            report ? "Imprimir a prévia não formal" : "A impressão será liberada após a geração",
          ]}
          nextBestActionLabel="Etapa da jornada"
          nextBestActionTitle="Conferir a prévia do PGR"
          nextBestActionDescription="Revise a consolidação da empresa e do local de trabalho antes da formalização. Esta prévia não é uma versão formal."
          nextBestActionPrimaryHref="#nr1-pgr-generation"
          nextBestActionPrimaryLabel="Gerar prévia"
          nextBestActionSecondaryHref="/dashboard/nr1/trilha-acompanhamento"
          nextBestActionSecondaryLabel="Revisar trilha"
          nextBestActionReasons={[
            "A prévia reúne riscos, plano de ação, evidências e acompanhamentos.",
            "Confira se a empresa e o local de trabalho estão corretos.",
            "A impressão continua identificada como prévia não formal.",
          ]}
          pgrHref="/dashboard/nr1/relatorio-pgr"
          moduleHref="#nr1-pgr-generation"
          topContextSlot={pgrTopContextSlot}
        >
          <section className="nr1-pgr-content min-w-0 break-words">

        {report ? (
          <section id="nr1-pgr-print-area" className="nr1-pgr-print-area min-w-0 rounded-[24px] border border-[#E2D4BF] bg-[#FFFCF7] p-5 shadow-[0_8px_24px_rgba(18,40,70,0.07)] sm:p-8">
            <header className="nr1-print-cover border-b border-slate-300 pb-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#A36B16]">Programa de Gerenciamento de Riscos</p>
                  <h1 className="mt-3 text-3xl font-bold text-slate-950">Prévia estruturada do PGR — não formal</h1>
                  <p className="mt-2 text-sm text-slate-600">Visualização dinâmica gerada a partir da base NR1 do icanHelp; não constitui versão formal.</p>
                </div>
                <div className="nr1-print-badge rounded-2xl px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[#8B5E34]">
                  Prévia não formal
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p><strong>Gerado em:</strong> {generatedAt ? dateTimeText(generatedAt) : "-"}</p>
                <p><strong>Empresa:</strong> {reportCompanyName}</p>
                <p><strong>Local de trabalho:</strong> {reportEstablishmentName}</p>
              </div>
            </header>

            <SectionTitle>1. Identificação</SectionTitle>
            <InfoGrid selectedTenantId={String(scope.tenantId ?? scope.tenant_id ?? selectedTenantId ?? "")} selectedEstablishmentId={String(scope.establishmentId ?? scope.establishment_id ?? selectedEstablishmentId ?? "")}
              selectedDocumentVersionId={latestFormalDocumentVersionId}
              items={identificationItems}
            />

            <SectionTitle>2. Resumo quantitativo</SectionTitle>
            {summary ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {summaryItems.map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-2xl border border-slate-200 p-4">
                    <p className="break-words text-[11px] uppercase tracking-[0.08em] text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <SectionTitle>3. Inventário de riscos</SectionTitle>
            {risks.length > 0 ? (
              <div className="mt-4 space-y-4">
                {risks.map((item, index) => (
                  <article key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-950">{index + 1}. {text(item.title, "Risco sem título")}</h3>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <p><strong>Categoria:</strong> {humanLabel(item.risk_category, RISK_CATEGORY_LABELS)}</p>
                      <p><strong>Nível:</strong> {humanLabel(item.risk_level, RISK_LEVEL_LABELS)}</p>
                      <p><strong>Classificação:</strong> {humanLabel(item.classification, RISK_LEVEL_LABELS)}</p>
                      <p><strong>Grupo exposto:</strong> {text(item.exposed_group)}</p>
                      <p className="md:col-span-2"><strong>Perigo/Fonte:</strong> {text(item.hazard_description ?? item.source_circumstance)}</p>
                      <p className="md:col-span-2"><strong>Medida recomendada:</strong> {text(item.recommended_measure)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum risco registrado para este estabelecimento." />
            )}

            <SectionTitle>4. Plano de ação</SectionTitle>
            {actionPlans.length > 0 ? (
              <div className="mt-4 space-y-4">
                {actionPlans.map((item, index) => (
                  <article key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-950">{index + 1}. {text(item.title, "Ação sem título")}</h3>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <p><strong>Prioridade:</strong> {humanLabel(item.priority, PRIORITY_LABELS)}</p>
                      <p><strong>Status:</strong> {humanLabel(item.status, ACTION_PLAN_STATUS_LABELS)}</p>
                      <p><strong>Responsável:</strong> {text(item.responsible_name)}</p>
                      <p><strong>Prazo:</strong> {dateOnlyText(item.due_date)}</p>
                      <p className="md:col-span-2"><strong>Descrição:</strong> {text(item.description)}</p>
                      <p className="md:col-span-2"><strong>Indicador:</strong> {text(item.completion_indicator)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum plano de ação registrado para este estabelecimento." />
            )}

            <SectionTitle>5. Acompanhamentos</SectionTitle>
            {actionFollowups.length > 0 ? (
              <div className="mt-4 space-y-3">
                {actionFollowups.map((item, index) => (
                  <div key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">{index + 1}. Acompanhamento</p>
                    <p><strong>Data:</strong> {dateOnlyText(item.followup_date)}</p>
                    {hasDisplayValue(item.execution_check) ? <p><strong>Verificação da execução:</strong> {text(item.execution_check)}</p> : null}
                    {hasDisplayValue(item.inspection_result) ? <p><strong>Resultado da inspeção:</strong> {text(item.inspection_result)}</p> : null}
                    {hasDisplayValue(item.effectiveness_result) ? <p><strong>Efetividade:</strong> {text(item.effectiveness_result)}</p> : null}
                    {hasDisplayValue(item.continuity_check) ? <p><strong>Continuidade:</strong> {text(item.continuity_check)}</p> : null}
                    {hasDisplayValue(item.environmental_monitoring_result) ? <p><strong>Monitoramento ambiental:</strong> {text(item.environmental_monitoring_result)}</p> : null}
                    {hasDisplayValue(item.worker_participation_note) ? <p><strong>Participação dos trabalhadores:</strong> {text(item.worker_participation_note)}</p> : null}
                    {typeof item.corrective_adjustment_needed === "boolean" ? <p><strong>Ajuste corretivo necessário:</strong> {item.corrective_adjustment_needed ? "Sim" : "Não"}</p> : null}
                    {hasDisplayValue(item.notes) ? <p><strong>Observações:</strong> {text(item.notes)}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum acompanhamento registrado para os planos deste estabelecimento." />
            )}

            <SectionTitle>6. Evidências</SectionTitle>
            {evidenceItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {evidenceItems.map((item, index) => (
                  <div key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p><strong>{index + 1}. Título:</strong> {text(item.title)}</p>
                    <p><strong>Tipo:</strong> {humanLabel(item.evidence_type, EVIDENCE_TYPE_LABELS)}</p>
                    <p><strong>Status:</strong> {humanLabel(item.validation_status, EVIDENCE_STATUS_LABELS)}</p>
                    <p><strong>Referência:</strong> {dateOnlyText(item.reference_date)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhuma evidência registrada para este estabelecimento." />
            )}

            <SectionTitle>7. Trilha de auditoria</SectionTitle>
            {auditEvents.length > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="nr1-print-avoid rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p><strong>Movimentações registradas:</strong> {auditEvents.length}</p>
                  <p><strong>Última movimentação:</strong> {latestAuditEvent ? dateTimeText(latestAuditEvent.created_at) : "Não informada"}</p>
                  <p><strong>Categorias:</strong> {auditCategories.join(", ")}</p>
                </div>

                {relevantAuditEvents.length > 0 ? (
                  <div className="space-y-3">
                    {relevantAuditEvents.map((item, index) => (
                      <div key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-950">{index + 1}. {humanLabel(item.event_type, AUDIT_EVENT_LABELS)}</p>
                        <p>{humanLabel(item.entity_type, AUDIT_ENTITY_LABELS)}</p>
                        <p>{dateTimeText(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Nenhuma movimentação relevante além dos salvamentos automáticos.</p>
                )}

                <details className="nr1-screen-only rounded-2xl border border-slate-200 bg-[#FFFCF7] p-4 text-sm text-slate-700">
                  <summary className="cursor-pointer font-semibold text-slate-950">Consultar histórico completo ({auditEvents.length})</summary>
                  <div className="mt-4 space-y-3">
                    {auditEvents.map((item, index) => (
                      <div key={String(item.id ?? index)} className="rounded-xl border border-slate-200 p-3">
                        <p className="font-semibold text-slate-950">{index + 1}. {humanLabel(item.event_type, AUDIT_EVENT_LABELS)}</p>
                        <p>{humanLabel(item.entity_type, AUDIT_ENTITY_LABELS)}</p>
                        <p>{dateTimeText(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ) : (
              <EmptyState text="Nenhum evento de auditoria registrado para este estabelecimento." />
            )}

            <PrintFooter />
          </section>
        ) : null}

        {snapshotVersions.length > 0 ? (
          <section id="nr1SnapshotVersionsPanel" className="nr1-screen-only mt-6 min-w-0 rounded-[24px] border border-[#e2d4bf] bg-[#FFFCF7] p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9d7b37]">versões existentes — somente leitura</p>
                <h2 className="mt-1 text-xl font-semibold text-[#10243e]">Histórico legado do PGR</h2>
                <p className="mt-1 text-sm text-[#6f665b]">Versões existentes preservadas para consulta. Nenhuma nova versão ou aprovação pode ser criada nesta etapa.</p>
              </div>
              <button
                id="nr1RefreshPgrSnapshotsButton"
                type="button"
                onClick={() => void loadFormalPgrSnapshots()}
                disabled={!selectedTenantId || !selectedEstablishmentId || status === "loading"}
                className="rounded-2xl border border-[#d9c9b8] bg-[#FFFCF7] px-4 py-2 text-sm font-semibold text-[#10243e] transition hover:bg-[#f7f1e8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Atualizar versões
              </button>
            </div>

            <div className="mt-4 max-w-full overflow-x-auto rounded-2xl border border-[#E2D4BF]">
              <table className="min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-[#f7efe6] text-xs uppercase tracking-[0.08em] text-[#6f665b]">
                  <tr>
                    <th className="px-4 py-3">Versão</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Gerado em</th>
                    <th className="px-4 py-3">Substitui</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotVersions.map((snapshot) => (
                    <tr key={snapshot.id} className="border-t border-[#E2D4BF]">
                      <td className="px-4 py-3 font-semibold text-[#10243e]">v{snapshot.version}</td>
                      <td className="px-4 py-3 text-[#10243E]">{snapshot.document_type}</td>
                      <td className="px-4 py-3 text-[#10243E]">{snapshot.status}</td>
                      <td className="px-4 py-3 text-[#10243E]">{dateTimeText(snapshot.generated_at)}</td>
                      <td className="px-4 py-3 text-[#6f665b]">{snapshot.supersedes_document_id ? "Sim" : "Não"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
          </section>
        </Nr1WorkspaceV2Shell>
      </div>
    </>
  );
}

type PgrProfessionalApprovalPanelProps = {
  selectedTenantId?: string;
  selectedEstablishmentId?: string;
  selectedDocumentVersionId?: string;
};

function PgrProfessionalApprovalPanel({
  selectedTenantId = "",
  selectedEstablishmentId = "",
  selectedDocumentVersionId = "",
}: PgrProfessionalApprovalPanelProps) {
  const [tenantId, setTenantId] = useState("");
  const [establishmentId, setEstablishmentId] = useState("");
  const [documentVersionId, setDocumentVersionId] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [professionalRole, setProfessionalRole] = useState("");
  const [professionalCouncil, setProfessionalCouncil] = useState("");
  const [professionalRegistration, setProfessionalRegistration] = useState("");
  const [professionalState, setProfessionalState] = useState("");
  const [approvalStatement, setApprovalStatement] = useState("");
  const [responsibilityConfirmation, setResponsibilityConfirmation] = useState(false);
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const [approvalId, setApprovalId] = useState("");
  const [auditEventId, setAuditEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    if (!tenantId.trim() && selectedTenantId.trim()) {
      setTenantId(selectedTenantId.trim());
    }

    if (!establishmentId.trim() && selectedEstablishmentId.trim()) {
      setEstablishmentId(selectedEstablishmentId.trim());
    }

    if (!documentVersionId.trim() && selectedDocumentVersionId.trim()) {
      setDocumentVersionId(selectedDocumentVersionId.trim());
      return;
    }

    if (!documentVersionId.trim() && typeof window !== "undefined") {
      const queryDocumentVersionId = new URLSearchParams(window.location.search).get("documentVersionId")?.trim() ?? "";

      if (queryDocumentVersionId) {
        setDocumentVersionId(queryDocumentVersionId);
      }
    }
  }, [documentVersionId, establishmentId, selectedDocumentVersionId, selectedEstablishmentId, selectedTenantId, tenantId]);
  const queryDocumentVersionId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("documentVersionId")?.trim() ?? ""
      : "";

  const effectiveTenantIdForInput = tenantId.trim() || selectedTenantId.trim();
  const effectiveEstablishmentIdForInput = establishmentId.trim() || selectedEstablishmentId.trim();
  const effectiveDocumentVersionIdForInput = documentVersionId.trim() || selectedDocumentVersionId.trim() || queryDocumentVersionId;
  const approvalScopeReady =
    Boolean(effectiveTenantIdForInput) &&
    Boolean(effectiveEstablishmentIdForInput) &&
    Boolean(effectiveDocumentVersionIdForInput);

  async function submitApproval() {
    setFeedback("");

    const effectiveTenantId = effectiveTenantIdForInput;
    const effectiveEstablishmentId = effectiveEstablishmentIdForInput;

    if (!effectiveTenantId) {
      setFeedback("Informe o tenant_id antes de registrar a aprovacao.");
      return;
    }

    if (!effectiveEstablishmentId) {
      setFeedback("Informe o establishment_id antes de registrar a aprovacao.");
      return;
    }

    if (!effectiveDocumentVersionIdForInput) {
      setFeedback("Informe o ID da versao formal do PGR.");
      return;
    }

    if (!professionalName.trim()) {
      setFeedback("Informe o nome do responsavel ou profissional.");
      return;
    }

    if (!professionalRole.trim()) {
      setFeedback("Informe a funcao do responsavel tecnico.");
      return;
    }

    if (!professionalCouncil.trim()) {
      setFeedback("Informe o conselho profissional ou identificador aplicavel.");
      return;
    }

    if (!professionalRegistration.trim()) {
      setFeedback("Informe o numero de registro profissional.");
      return;
    }

    if (!professionalState.trim()) {
      setFeedback("Informe a UF do registro profissional.");
      return;
    }

    if (!approvalStatement.trim()) {
      setFeedback("Informe a declaracao de aprovacao final.");
      return;
    }

    if (!responsibilityConfirmation) {
      setFeedback("Confirme a responsabilidade tecnica antes de finalizar o PGR.");
      return;
    }

    if (!finalConfirmation) {
      setFeedback("Confirme que esta e uma aprovacao final do PGR.");
      return;
    }

    let token = "";

    try {
      token = await resolvePgrApprovalAccessToken();
    } catch {
      const directToken =
        window.localStorage.getItem("sb-access-token") ||
        window.localStorage.getItem("access_token") ||
        "";

      if (directToken) {
        token = directToken;
      } else {
        const authStorageKey = Object.keys(window.localStorage).find((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));

        if (authStorageKey) {
          const storedAuth = window.localStorage.getItem(authStorageKey);

          if (storedAuth) {
            try {
              const parsedAuth = JSON.parse(storedAuth) as {
                access_token?: string;
                currentSession?: { access_token?: string };
                session?: { access_token?: string };
              };

              token = parsedAuth.access_token || parsedAuth.currentSession?.access_token || parsedAuth.session?.access_token || "";
            } catch {
              token = "";
            }
          }
        }
      }
    }

    if (!token) {
      setFeedback("Sessao local nao encontrada. Faca login novamente antes de registrar a aprovacao.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/nr1/pgr-approvals/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-icanhelp-tenant": effectiveTenantId,
          "x-icanhelp-establishment": effectiveEstablishmentId,
        },
        body: JSON.stringify({
          tenant_id: effectiveTenantId,
          establishment_id: effectiveEstablishmentId,
          document_version_id: effectiveDocumentVersionIdForInput,
          professional_name: professionalName.trim(),
          professional_role: professionalRole.trim(),
          professional_council: professionalCouncil.trim(),
          professional_registration: professionalRegistration.trim(),
          professional_state: professionalState.trim(),
          approval_statement: approvalStatement.trim(),
          responsibility_confirmation: responsibilityConfirmation,
          final_confirmation: finalConfirmation,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback(payload?.message || payload?.error || "Nao foi possivel finalizar a aprovacao profissional do PGR.");
        return;
      }

      setApprovalId(String(payload?.approval?.id || ""));
      setAuditEventId(String(payload?.audit_event?.id || ""));
      setFeedback("Aprovacao final profissional registrada com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado ao finalizar aprovacao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="print:hidden rounded-2xl border border-slate-200 bg-[#FFFCF7] p-5 shadow-sm">
      <div className="print:hidden mb-4">
        <p className="text-sm font-semibold text-slate-500">Validacao formal</p>
        <h2 className="text-xl font-bold text-slate-900">Aprovacao final profissional do PGR</h2>
        <p className="mt-1 text-sm text-slate-600">
          Registre a aprovacao final sobre uma versao formal do PGR. Esta etapa exige responsabilidade tecnica explicita e gera trilha de auditoria.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Tenant ID
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={effectiveTenantIdForInput}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="tenant_id"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Estabelecimento ID
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={effectiveEstablishmentIdForInput}
            onChange={(event) => setEstablishmentId(event.target.value)}
            placeholder="establishment_id"
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          ID da versao formal do PGR
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={effectiveDocumentVersionIdForInput}
            onChange={(event) => setDocumentVersionId(event.target.value)}
            placeholder="document_version_id"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Nome do responsavel ou profissional
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalName}
            onChange={(event) => setProfessionalName(event.target.value)}
            placeholder="Nome completo"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Funcao
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalRole}
            onChange={(event) => setProfessionalRole(event.target.value)}
            placeholder="Responsavel tecnico, consultor, SST..."
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Conselho
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalCouncil}
            onChange={(event) => setProfessionalCouncil(event.target.value)}
            placeholder="CREA, CRP, CRM, outro"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Registro
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalRegistration}
            onChange={(event) => setProfessionalRegistration(event.target.value)}
            placeholder="Numero de registro"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          UF
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalState}
            onChange={(event) => setProfessionalState(event.target.value)}
            placeholder="SC"
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Declaracao de aprovacao
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={approvalStatement}
            onChange={(event) => setApprovalStatement(event.target.value)}
            placeholder="Declaro que revisei a versao formal do PGR indicada e registro a validacao profissional nos limites das informacoes disponiveis."
          />
        </label>

        <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Confirmacoes obrigatorias para aprovacao final</p>
          <label className="mt-3 flex gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={responsibilityConfirmation}
              onChange={(event) => setResponsibilityConfirmation(event.target.checked)}
            />
            <span>
              Confirmo que a aprovacao final representa ato formal de responsabilidade tecnica sobre a versao do PGR indicada.
            </span>
          </label>
          <label className="mt-3 flex gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={finalConfirmation}
              onChange={(event) => setFinalConfirmation(event.target.checked)}
            />
            <span>
              Confirmo que desejo finalizar a aprovacao profissional do PGR e gerar registro de auditoria.
            </span>
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex flex-col gap-1">
          <strong>Escopo da aprovacao final do PGR</strong>
          <span>Confira estes dados antes de finalizar. A aprovacao sera vinculada exatamente a este tenant, estabelecimento e versao formal.</span>
        </div>

        <dl className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-lg bg-[#FFFCF7]/70 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">Tenant ID</dt>
            <dd className="mt-1 break-all font-mono text-xs">{effectiveTenantIdForInput || "Nao preenchido"}</dd>
          </div>
          <div className="rounded-lg bg-[#FFFCF7]/70 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">Establishment ID</dt>
            <dd className="mt-1 break-all font-mono text-xs">{effectiveEstablishmentIdForInput || "Nao preenchido"}</dd>
          </div>
          <div className="rounded-lg bg-[#FFFCF7]/70 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">Document Version ID</dt>
            <dd className="mt-1 break-all font-mono text-xs">{effectiveDocumentVersionIdForInput || "Nao preenchido"}</dd>
          </div>
        </dl>

        {!approvalScopeReady ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            A aprovacao final esta bloqueada ate tenant, estabelecimento e versao formal estarem preenchidos.
          </p>
        ) : (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            Escopo pronto para aprovacao final. Prossiga somente se os dados acima estiverem corretos.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-500">
          A finalizacao gera vinculo com a versao formal do PGR, aprovacao ativa e trilha de auditoria.
        </p>

        <button
          type="button"
          onClick={submitApproval}
          disabled={loading || !approvalScopeReady || !responsibilityConfirmation || !finalConfirmation}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Finalizando..." : "Finalizar aprovacao do PGR"}
        </button>
      </div>

      {feedback ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {feedback}
        </p>
      ) : null}

      {approvalId || auditEventId ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {approvalId ? <p><strong>Approval ID:</strong> {approvalId}</p> : null}
          {auditEventId ? <p><strong>Audit Event ID:</strong> {auditEventId}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

