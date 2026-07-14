"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Nr1WorkspaceV2Shell from "@/components/nr1/Nr1WorkspaceV2Shell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TenantOption = {
  id: string;
  name: string;
  slug?: string | null;
};

type EstablishmentItem = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  status?: string | null;
};

type ActionPlanItem = {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  risk_id?: string | null;
};

type FollowupItem = {
  id: string;
  action_plan_id?: string | null;
  acompanhamento_date?: string | null;
  corrective_adjustment_needed?: boolean | null;
  execution_check?: string | null;
  inspection_result?: string | null;
  environmental_monitoring_result?: string | null;
  effectiveness_result?: string | null;
  continuity_check?: string | null;
  worker_participation_note?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type AuditEventItem = {
  id: string;
  event_type?: string | null;
  title?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  persistence_type?: string | null;
  reason?: string | null;
  created_at?: string | null;
  source?: string | null;
};

const supabaseSectionClass =
  "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-[0_18px_50px_rgba(34,49,63,0.08)]";
const selectClassName =
  "mt-2 w-full rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";

async function readJsonSafe(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function asArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(asRecord);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
function parseTenants(payload: unknown): TenantOption[] {
  const raw = Array.isArray(payload) ? asArray(payload) : asArray(asRecord(payload).items);

  return raw
    .map((item) => ({
      id: String(item?.id ?? "").trim(),
      name: String(item?.name ?? item?.slug ?? "Tenant").trim(),
      slug: item?.slug ? String(item.slug) : null,
    }))
    .filter((item: TenantOption) => item.id);
}

function parseEstablishments(payload: unknown): EstablishmentItem[] {
  const raw = asArray(asRecord(payload).items);

  return raw
    .map((item) => ({
      id: String(item?.id ?? "").trim(),
      name: String(item?.name ?? "Local de trabalho").trim(),
      city: item?.city ? String(item.city) : null,
      state: item?.state ? String(item.state) : null,
      status: item?.status ? String(item.status) : null,
    }))
    .filter((item: EstablishmentItem) => item.id);
}

function parseActionPlans(payload: unknown): ActionPlanItem[] {
  const raw = asArray(asRecord(payload).items);

  return raw
    .map((item) => ({
      id: String(item?.id ?? "").trim(),
      title: item?.title ? String(item.title) : null,
      status: item?.status ? String(item.status) : null,
      priority: item?.priority ? String(item.priority) : null,
      due_date: item?.due_date ? String(item.due_date) : null,
      risk_id: item?.risk_id ? String(item.risk_id) : null,
    }))
    .filter((item: ActionPlanItem) => item.id);
}

function parseFollowups(payload: unknown): FollowupItem[] {
  const raw = asArray(asRecord(payload).items);

  return raw
    .map((item) => ({
      id: String(item?.id ?? "").trim(),
      action_plan_id: item?.action_plan_id ? String(item.action_plan_id) : null,
      acompanhamento_date: item?.acompanhamento_date ? String(item.acompanhamento_date) : null,
      corrective_adjustment_needed:
        typeof item?.corrective_adjustment_needed === "boolean"
          ? item.corrective_adjustment_needed
          : null,
      execution_check: item?.execution_check ? String(item.execution_check) : null,
      inspection_result: item?.inspection_result ? String(item.inspection_result) : null,
      environmental_monitoring_result: item?.environmental_monitoring_result
        ? String(item.environmental_monitoring_result)
        : null,
      effectiveness_result: item?.effectiveness_result ? String(item.effectiveness_result) : null,
      continuity_check: item?.continuity_check ? String(item.continuity_check) : null,
      worker_participation_note: item?.worker_participation_note
        ? String(item.worker_participation_note)
        : null,
      notes: item?.notes ? String(item.notes) : null,
      created_at: item?.created_at ? String(item.created_at) : null,
      updated_at: item?.updated_at ? String(item.updated_at) : null,
    }))
    .filter((item: FollowupItem) => item.id);
}

function formatStatusLabel(value: string | null | undefined) {
  switch (String(value || "").trim().toLowerCase()) {
    case "open":
      return "em aberto";
    case "in_progress":
      return "em andamento";
    case "completed":
      return "concluido";
    case "overdue":
      return "vencido";
    default:
      return String(value || "sem status").trim() || "sem status";
  }
}

function formatPriorityLabel(value: string | null | undefined) {
  switch (String(value || "").trim().toLowerCase()) {
    case "very_high":
      return "muito alta";
    case "high":
      return "alta";
    case "medium":
      return "media";
    case "low":
      return "baixa";
    default:
      return String(value || "sem prioridade").trim() || "sem prioridade";
  }
}

function getStatusBadgeClass(value: string | null | undefined) {
  switch (String(value || "").trim().toLowerCase()) {
    case "completed":
      return "border-[#D6E5D7] bg-[#F3F8F4] text-[#4E7355]";
    case "in_progress":
      return "border-[#D6E3EE] bg-[#F2F7FB] text-[#45647F]";
    case "open":
      return "border-[#E9D4C4] bg-[#FBF5EF] text-[#8C5A33]";
    case "overdue":
      return "border-[#E8C8CC] bg-[#F9F1F2] text-[#8A4F58]";
    default:
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
  }
}


function parseAuditEvents(payload: unknown): AuditEventItem[] {
  const raw = asArray(asRecord(payload).items);

  return raw
    .map((item) => ({
      id: String(item?.id ?? "").trim(),
      event_type: item?.event_type ? String(item.event_type) : null,
      title: item?.title ? String(item.title) : null,
      entity_type: item?.entity_type ? String(item.entity_type) : null,
      entity_id: item?.entity_id ? String(item.entity_id) : null,
      persistence_type: item?.persistence_type ? String(item.persistence_type) : null,
      reason: item?.reason ? String(item.reason) : null,
      created_at: item?.created_at ? String(item.created_at) : null,
      source: item?.source ? String(item.source) : null,
    }))
    .filter((item: AuditEventItem) => item.id);
}

function auditEventHumanTitle(item: AuditEventItem): string {
  const eventType = item.event_type || "";

  if (eventType.includes("evidence_item_archived")) {
    return "Evidência arquivada";
  }

  if (eventType.includes("evidence_item_created")) {
    return "Evidência adicionada";
  }

  if (eventType.includes("action_plan_created")) {
    return "Plano de ação criado";
  }

  if (eventType.includes("risk_generated") || eventType.includes("risk_updated")) {
    return "Risco revisado no diagnóstico";
  }

  if (eventType.includes("diagnosis_session_started")) {
    return "Diagnóstico iniciado";
  }

  if (eventType.includes("diagnosis_context_saved")) {
    return "Contexto do diagnóstico salvo";
  }

  if (eventType.includes("diagnosis_psychosocial_saved")) {
    return "Etapa psicossocial registrada";
  }

  if (eventType.includes("activity_created")) {
    return "Atividade cadastrada";
  }

  if (eventType.includes("department_created")) {
    return "Setor cadastrado";
  }

  if (eventType.includes("establishment_created")) {
    return "Local de trabalho cadastrado";
  }

  if (eventType.includes("workspace_opened")) {
    return "Jornada aberta";
  }

  if (eventType.includes("workspace_draft_saved")) {
    return "Rascunho salvo";
  }

  return item.title || "Movimentação registrada";
}

function auditEventHumanDescription(item: AuditEventItem): string {
  const eventType = item.event_type || "";
  const persistenceType = item.persistence_type || "";

  if (eventType.includes("evidence_item_archived")) {
    return "Uma evidência foi retirada da lista principal, mantendo rastreabilidade para consulta.";
  }

  if (eventType.includes("evidence_item_created")) {
    return "Uma evidência foi vinculada ao processo de adequação.";
  }

  if (eventType.includes("action_plan_created")) {
    return "Um plano de ação foi criado para tratar um risco identificado.";
  }

  if (eventType.includes("risk_generated") || eventType.includes("risk_updated")) {
    return "O diagnóstico gerou ou atualizou um risco para revisão no GRO/PGR.";
  }

  if (eventType.includes("diagnosis")) {
    return "Uma etapa do diagnóstico guiado foi registrada.";
  }

  if (eventType.includes("activity_created")) {
    return "Uma atividade foi cadastrada na estrutura do local de trabalho.";
  }

  if (eventType.includes("department_created")) {
    return "Um setor foi cadastrado na estrutura da empresa.";
  }

  if (eventType.includes("establishment_created")) {
    return "Um local de trabalho foi cadastrado na jornada.";
  }

  if (eventType.includes("workspace")) {
    return "A jornada foi acessada ou salva como rascunho.";
  }

  if (persistenceType === "draft") {
    return "Registro de rascunho da jornada.";
  }

  return "Movimentação formal registrada na trilha do processo.";
}

function auditEventHumanArea(item: AuditEventItem): string {
  const eventType = item.event_type || "";
  const entityType = item.entity_type || "";

  if (eventType.includes("evidence") || entityType.includes("evidence")) {
    return "Evidências";
  }

  if (eventType.includes("action_plan") || entityType.includes("action_plan")) {
    return "Plano de ação";
  }

  if (eventType.includes("risk") || entityType.includes("risk")) {
    return "Riscos e diagnóstico";
  }

  if (eventType.includes("diagnosis")) {
    return "Diagnóstico guiado";
  }

  if (eventType.includes("department")) {
    return "Setores";
  }

  if (eventType.includes("activity")) {
    return "Atividades";
  }

  if (eventType.includes("establishment")) {
    return "Locais de trabalho";
  }

  return "Jornada GRO/PGR";
}

function auditEventHumanBadge(item: AuditEventItem): string {
  if (item.persistence_type === "draft") {
    return "Rascunho";
  }

  return "Registro formal";
}

function auditEventTechnicalSummary(item: AuditEventItem): string {
  return [
    item.event_type ? "evento=" + item.event_type : null,
    item.entity_type ? "entidade=" + item.entity_type : null,
    item.reason ? "motivo=" + item.reason : null,
    item.source ? "fonte=" + item.source : null,
  ]
    .filter(Boolean)
    .join(" | ");
}
export default function Nr1TrilhaAcompanhamentoPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentItem[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [actionPlans, setActionPlans] = useState<ActionPlanItem[]>([]);
  const [selectedActionPlanId, setSelectedActionPlanId] = useState("");
  const [acompanhamentos, setFollowups] = useState<FollowupItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [loadingActionPlans, setLoadingActionPlans] = useState(false);
  const [loadingFollowups, setLoadingFollowups] = useState(false);
  const [loadingAuditEvents, setLoadingAuditEvents] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    acompanhamento_date: "",
    corrective_adjustment_needed: false,
    execution_check: "",
    inspection_result: "",
    environmental_monitoring_result: "",
    effectiveness_result: "",
    continuity_check: "",
    worker_participation_note: "",
    notes: "",
  });

  const selectedEstablishment = useMemo(() => {
    return establishments.find((item) => item.id === selectedEstablishmentId) || null;
  }, [establishments, selectedEstablishmentId]);

  const selectedActionPlan = useMemo(() => {
    return actionPlans.find((item) => item.id === selectedActionPlanId) || null;
  }, [actionPlans, selectedActionPlanId]);

  const adjustmentCount = useMemo(() => {
    return acompanhamentos.filter((item) => item.corrective_adjustment_needed === true).length;
  }, [acompanhamentos]);

  useEffect(() => {
    (async () => {
      setLoadingSession(true);
      setError("");
      setInfo("");

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          router.replace("/login?next=" + encodeURIComponent(pathname || "/dashboard"));
          return;
        }

        setJwt(accessToken);

        const tenantsResponse = await fetch("/api/tenants", {
          method: "GET",
          headers: {
            Authorization: "Bearer " + accessToken,
          },
          cache: "no-store",
        });

        const tenantsPayload = await readJsonSafe(tenantsResponse);

        if (!tenantsResponse.ok) {
          const message =
            tenantsPayload?.message ||
            tenantsPayload?.error ||
            "Falha ao carregar tenants.";
          throw new Error(String(message));
        }

        const parsedTenants = parseTenants(tenantsPayload);
        setTenants(parsedTenants);

        if (parsedTenants.length === 0) {
          throw new Error("Nenhum tenant encontrado para esta sessao.");
        }

        setTenantId(parsedTenants[0].id);
      } catch (error: unknown) {
        setError(getErrorMessage(error, "Falha ao carregar sessao."));
      } finally {
        setLoadingSession(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!jwt || !tenantId) {
      return;
    }

    (async () => {
      setLoadingEstablishments(true);
      setError("");
      setInfo("");

      try {
        const response = await fetch("/api/nr1/establishments", {
          method: "GET",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
          },
          cache: "no-store",
        });

        const payload = await readJsonSafe(response);

        if (!response.ok) {
          const message =
            payload?.message ||
            payload?.error ||
            "Falha ao carregar estabelecimentos.";
          throw new Error(String(message));
        }

        const parsedEstablishments = parseEstablishments(payload);
        setEstablishments(parsedEstablishments);

        if (parsedEstablishments.length === 0) {
          setSelectedEstablishmentId("");
          setInfo("Nenhum estabelecimento encontrado para este tenant.");
          return;
        }

        const queryParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const queryEstablishmentId =
          queryParams?.get("establishmentId")?.trim() ||
          queryParams?.get("establishment_id")?.trim() ||
          "";

        const nextSelectedEstablishmentId =
          parsedEstablishments.find((item) => item.id === queryEstablishmentId)?.id ?? parsedEstablishments[0].id;

        setSelectedEstablishmentId(nextSelectedEstablishmentId);
      } catch (error: unknown) {
        setError(getErrorMessage(error, "Falha ao carregar estabelecimentos."));
      } finally {
        setLoadingEstablishments(false);
      }
    })();
  }, [jwt, tenantId]);

  useEffect(() => {
    if (!jwt || !tenantId || !selectedEstablishmentId) {
      setActionPlans([]);
      setSelectedActionPlanId("");
      setFollowups([]);
      return;
    }

    (async () => {
      setLoadingActionPlans(true);
      setLoadingFollowups(true);
      setError("");
      setInfo("");

      try {
        const response = await fetch(
          "/api/nr1/action-plans?establishmentId=" + encodeURIComponent(selectedEstablishmentId),
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + jwt,
              "x-icanhelp-tenant": tenantId,
            },
            cache: "no-store",
          }
        );

        const payload = await readJsonSafe(response);

        if (!response.ok) {
          const message =
            payload?.message ||
            payload?.error ||
            "Falha ao carregar planos de ação.";
          throw new Error(String(message));
        }

        const parsedItems = parseActionPlans(payload);
        setActionPlans(parsedItems);
        setFollowups([]);

        if (parsedItems.length === 0) {
          setSelectedActionPlanId("");
          setInfo("Nenhum plano de ação encontrado para este local de trabalho.");
          return;
        }

        setSelectedActionPlanId(parsedItems[0].id);
        setInfo("Plano de ação carregado. Registre e acompanhe as verificações realizadas.");
      } catch (error: unknown) {
        setActionPlans([]);
        setSelectedActionPlanId("");
        setFollowups([]);
        setError(getErrorMessage(error, "Falha ao carregar planos de ação."));
      } finally {
        setLoadingActionPlans(false);
        setLoadingFollowups(false);
      }
    })();
  }, [jwt, tenantId, selectedEstablishmentId]);

  useEffect(() => {
    if (!jwt || !tenantId || !selectedEstablishmentId) {
      setAuditEvents([]);
      return;
    }

    (async () => {
      setLoadingAuditEvents(true);
      setError("");

      try {
        const response = await fetch(
          "/api/nr1/audit-events?tenantId=" +
            encodeURIComponent(tenantId) +
            "&establishmentId=" +
            encodeURIComponent(selectedEstablishmentId) +
            "&limit=12",
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + jwt,
              "x-tenant-id": tenantId,
              "x-establishment-id": selectedEstablishmentId,
            },
            cache: "no-store",
          }
        );

        const payload = await readJsonSafe(response);

        if (!response.ok) {
          const message =
            payload?.message ||
            payload?.error ||
            "Falha ao carregar eventos formais da trilha.";
          throw new Error(String(message));
        }

        setAuditEvents(parseAuditEvents(payload));
      } catch (error: unknown) {
        setAuditEvents([]);
        setError(getErrorMessage(error, "Falha ao carregar eventos formais da trilha."));
      } finally {
        setLoadingAuditEvents(false);
      }
    })();
  }, [jwt, tenantId, selectedEstablishmentId]);
  useEffect(() => {
    if (!jwt || !tenantId || !selectedEstablishmentId || !selectedActionPlanId) {
      setFollowups([]);
      return;
    }

    (async () => {
      setLoadingFollowups(true);
      setError("");

      try {
        const response = await fetch(
          "/api/nr1/action-followups?establishmentId=" +
            encodeURIComponent(selectedEstablishmentId) +
            "&actionPlanId=" +
            encodeURIComponent(selectedActionPlanId),
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + jwt,
              "x-icanhelp-tenant": tenantId,
            },
            cache: "no-store",
          }
        );

        const payload = await readJsonSafe(response);

        if (!response.ok) {
          const message =
            payload?.message ||
            payload?.error ||
            "Falha ao carregar acompanhamentos.";
          throw new Error(String(message));
        }

        const parsedItems = parseFollowups(payload);
        setFollowups(parsedItems);
      } catch (error: unknown) {
        setFollowups([]);
        setError(getErrorMessage(error, "Falha ao carregar acompanhamentos."));
      } finally {
        setLoadingFollowups(false);
      }
    })();
  }, [jwt, tenantId, selectedEstablishmentId, selectedActionPlanId]);

  async function handleCreateFollowup() {
    setError("");
    setInfo("");

    if (!jwt || !tenantId || !selectedEstablishmentId || !selectedActionPlanId) {
      setError("Contexto incompleto. Confirme a empresa, o local de trabalho e o plano de ação.");
      return;
    }

    if (!form.acompanhamento_date.trim()) {
      setError("Informe a data do acompanhamento.");
      return;
    }

    setSaving(true);

    try {
      const createResponse = await fetch("/api/nr1/action-followups", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + jwt,
          "x-icanhelp-tenant": tenantId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          action_plan_id: selectedActionPlanId,
          acompanhamento_date: form.acompanhamento_date.trim(),
          corrective_adjustment_needed: form.corrective_adjustment_needed,
          execution_check: form.execution_check.trim() || null,
          inspection_result: form.inspection_result.trim() || null,
          environmental_monitoring_result: form.environmental_monitoring_result.trim() || null,
          effectiveness_result: form.effectiveness_result.trim() || null,
          continuity_check: form.continuity_check.trim() || null,
          worker_participation_note: form.worker_participation_note.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      const createPayload = await readJsonSafe(createResponse);

      if (!createResponse.ok) {
        const message =
          createPayload?.message ||
          createPayload?.error ||
          "Falha ao salvar o acompanhamento.";
        throw new Error(String(message));
      }

      const refreshResponse = await fetch(
        "/api/nr1/action-followups?establishmentId=" +
          encodeURIComponent(selectedEstablishmentId) +
          "&actionPlanId=" +
          encodeURIComponent(selectedActionPlanId),
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
          },
          cache: "no-store",
        }
      );

      const refreshPayload = await readJsonSafe(refreshResponse);

      if (!refreshResponse.ok) {
        const message =
          refreshPayload?.message ||
          refreshPayload?.error ||
          "O acompanhamento foi criado, mas a releitura da lista falhou.";
        throw new Error(String(message));
      }

      setFollowups(parseFollowups(refreshPayload));
      setForm({
        acompanhamento_date: "",
        corrective_adjustment_needed: false,
        execution_check: "",
        inspection_result: "",
        environmental_monitoring_result: "",
        effectiveness_result: "",
        continuity_check: "",
        worker_participation_note: "",
        notes: "",
      });
      setInfo("Acompanhamento salvo com sucesso.");
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Falha ao gravar acompanhamento."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Nr1WorkspaceV2Shell
      companyName={tenantId ? "Empresa ativa" : "Empresa não selecionada"}
      establishmentName={selectedEstablishment?.name || "Local de trabalho não selecionado"}
      pgrStatus="Em construção"
      progressPercent={86}
      progressDescription="Plano de ação e trilha documental em acompanhamento."
      activeModule="Trilha"
      modules={[
        "Base",
        "Mapeamento",
        "Riscos",
        "Plano",
        "Evidências",
        "Trilha",
        "PGR",
      ]}
      pendingItems={[
        actionPlans.length === 0
          ? "Cadastrar um plano de ação para este local de trabalho"
          : "Registrar e acompanhar a execução do plano de ação",
        "Conferir a efetividade das medidas adotadas",
        "Manter a trilha documental atualizada",
      ]}
      nextBestActionLabel="Etapa da jornada"
      nextBestActionTitle="Acompanhar a execução do plano de ação"
      nextBestActionDescription="Registre verificações, inspeções, participação dos trabalhadores e sinais de efetividade. A trilha mantém o histórico organizado para o GRO/PGR."
      nextBestActionPrimaryHref="#nr1-trail-operational-content"
      nextBestActionPrimaryLabel="Registrar acompanhamento"
      nextBestActionSecondaryHref="/dashboard/nr1/evidencias-acompanhamento"
      nextBestActionSecondaryLabel="Voltar para evidências"
      nextBestActionReasons={[
        "O plano de ação precisa de acompanhamento periódico.",
        "As verificações demonstram continuidade e efetividade.",
        "A trilha preserva o histórico documental do GRO/PGR.",
      ]}
      pgrHref="/dashboard/nr1/relatorio-pgr"
      moduleHref="#nr1-trail-operational-content"
    >
      <div id="nr1-trail-operational-content">
      <div className="space-y-6">
        <section className={supabaseSectionClass}>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                planos de ação
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{actionPlans.length}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                acompanhamentos
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{acompanhamentos.length}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                ajustes necessários
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{adjustmentCount}</div>
            </div>
          </div>

          {loadingSession ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">Carregando sessao...</p>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-[#E8C8CC] bg-[#F9F1F2] px-4 py-3 text-sm text-[#8A4F58]">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="mt-4 rounded-2xl border border-[#D6E3EE] bg-[#F2F7FB] px-4 py-3 text-sm text-[#45647F]">
              {info}
            </div>
          ) : null}
        </section>

        <section className={supabaseSectionClass}>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-[#22313F]">Empresa ativa</label>
              <div className="mt-2 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm text-[#5B6B79]">
                {tenantId
                  ? (tenants.find((item) => item.id === tenantId)?.name || tenantId) + " (" + tenantId + ")"
                  : "Nao carregado"}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Local de trabalho</label>
              <select
                value={selectedEstablishmentId}
                onChange={(e) => setSelectedEstablishmentId(e.target.value)}
                className={selectClassName}
                disabled={loadingEstablishments || establishments.length === 0}
              >
                {establishments.length === 0 ? (
                  <option value="">Nenhum estabelecimento</option>
                ) : (
                  establishments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.id})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Plano de ação</label>
              <select
                value={selectedActionPlanId}
                onChange={(e) => setSelectedActionPlanId(e.target.value)}
                className={selectClassName}
                disabled={loadingActionPlans || actionPlans.length === 0}
              >
                {actionPlans.length === 0 ? (
                  <option value="">Nenhum plano de ação</option>
                ) : (
                  actionPlans.map((item) => (
                    <option key={item.id} value={item.id}>
                      {(item.title || "Plano de ação sem titulo") + " (" + item.id + ")"}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {selectedEstablishment ? (
            <div className="mt-4 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
              <div>
                <span className="font-semibold text-[#22313F]">Local de trabalho:</span> {selectedEstablishment.name}
              </div>
              <div>
                <span className="font-semibold text-[#22313F]">Cidade/UF:</span>{" "}
                {[selectedEstablishment.city, selectedEstablishment.state].filter(Boolean).join(" / ") || "Nao informado"}
              </div>
              <div>
                <span className="font-semibold text-[#22313F]">Status:</span> {selectedEstablishment.status || "Nao informado"}
              </div>
            </div>
          ) : null}

          {selectedActionPlan ? (
            <div className="mt-4 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
              <div>
                <span className="font-semibold text-[#22313F]">Titulo:</span> {selectedActionPlan.title || "Nao informado"}
              </div>
              <div>
                <span className="font-semibold text-[#22313F]">Status:</span> {formatStatusLabel(selectedActionPlan.status)}
              </div>
              <div>
                <span className="font-semibold text-[#22313F]">Prioridade:</span> {formatPriorityLabel(selectedActionPlan.priority)}
              </div>
              <div>
                <span className="font-semibold text-[#22313F]">Prazo:</span> {selectedActionPlan.due_date || "Nao informado"}
              </div>
            </div>
          ) : null}
        </section>

        <section className={supabaseSectionClass}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            registrar acompanhamento
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
            Registre como o plano de ação foi verificado.
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-[#22313F]">Data do acompanhamento</label>
              <input
                type="date"
                value={form.acompanhamento_date}
                onChange={(e) => setForm((current) => ({ ...current, acompanhamento_date: e.target.value }))}
                className={selectClassName}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Ajuste corretivo necessario</label>
              <select
                value={form.corrective_adjustment_needed ? "sim" : "nao"}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    corrective_adjustment_needed: e.target.value === "sim",
                  }))
                }
                className={selectClassName}
              >
                <option value="nao">nao</option>
                <option value="sim">sim</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Execucao</label>
              <textarea
                value={form.execution_check}
                onChange={(e) => setForm((current) => ({ ...current, execution_check: e.target.value }))}
                className={selectClassName + " min-h-[110px]"}
                placeholder="Como a execucao foi verificada"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Inspecao</label>
              <textarea
                value={form.inspection_result}
                onChange={(e) => setForm((current) => ({ ...current, inspection_result: e.target.value }))}
                className={selectClassName + " min-h-[110px]"}
                placeholder="Resultado da inspecao"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Efetividade</label>
              <textarea
                value={form.effectiveness_result}
                onChange={(e) => setForm((current) => ({ ...current, effectiveness_result: e.target.value }))}
                className={selectClassName + " min-h-[110px]"}
                placeholder="Resultado da efetividade"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Continuidade</label>
              <textarea
                value={form.continuity_check}
                onChange={(e) => setForm((current) => ({ ...current, continuity_check: e.target.value }))}
                className={selectClassName + " min-h-[110px]"}
                placeholder="Checagem de continuidade"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Monitoramento ambiental</label>
              <textarea
                value={form.environmental_monitoring_result}
                onChange={(e) =>
                  setForm((current) => ({ ...current, environmental_monitoring_result: e.target.value }))
                }
                className={selectClassName + " min-h-[110px]"}
                placeholder="Resultado do monitoramento ambiental"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Participacao dos trabalhadores</label>
              <textarea
                value={form.worker_participation_note}
                onChange={(e) =>
                  setForm((current) => ({ ...current, worker_participation_note: e.target.value }))
                }
                className={selectClassName + " min-h-[110px]"}
                placeholder="Registro da participacao dos trabalhadores"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-[#22313F]">Observacoes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                className={selectClassName + " min-h-[120px]"}
                placeholder="Observacoes complementares do acompanhamento"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCreateFollowup()}
              disabled={saving || !jwt || !tenantId || !selectedEstablishmentId || !selectedActionPlanId || !form.acompanhamento_date.trim()}
              className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar acompanhamento"}
            </button>

            <button
              type="button"
              onClick={() =>
                setForm({
                  acompanhamento_date: "",
                  corrective_adjustment_needed: false,
                  execution_check: "",
                  inspection_result: "",
                  environmental_monitoring_result: "",
                  effectiveness_result: "",
                  continuity_check: "",
                  worker_participation_note: "",
                  notes: "",
                })
              }
              className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
            >
              Limpar campos
            </button>
          </div>
        </section>

        <section className={supabaseSectionClass}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            acompanhamentos registrados
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
            Acompanhamentos do plano de ação selecionado.
          </h3>

          {loadingActionPlans || loadingFollowups ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Carregando acompanhamentos...
            </p>
          ) : acompanhamentos.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Nenhum acompanhamento registrado para o plano de ação selecionado.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {acompanhamentos.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5E7A96]">
                        acompanhamento {index + 1}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                        Data de acompanhamento: {item.acompanhamento_date || "Nao informada"}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                        {item.notes || "Sem observacoes complementares."}
                      </p>
                    </div>

                    <div className="rounded-full border px-3 py-2 text-xs font-semibold border-[#D9E0E7] bg-white text-[#5B6B79]">
                      Ajuste necessario: {item.corrective_adjustment_needed ? "sim" : "nao"}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        execucao
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.execution_check || "Nao informado"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        inspecao
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.inspection_result || "Nao informado"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        efetividade
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.effectiveness_result || "Nao informado"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        continuidade
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.continuity_check || "Nao informado"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        monitoramento ambiental
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.environmental_monitoring_result || "Nao informado"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        participacao dos trabalhadores
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.worker_participation_note || "Nao informado"}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
            Os registros desta etapa ajudam a demonstrar o acompanhamento e a efetividade das medidas adotadas.
          </div>
        </section>

        <section className={supabaseSectionClass}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            trilha do processo
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
            Últimas movimentações registradas.
          </h3>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            Esta área resume os acontecimentos importantes do GRO/PGR em linguagem simples. Os detalhes técnicos continuam preservados, mas não ficam no caminho do usuário.
          </p>

          <div className="mt-5 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
              últimas movimentações
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#22313F]">{Math.min(auditEvents.length, 8)}</div>
          </div>

          {loadingAuditEvents ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Carregando movimentações...
            </p>
          ) : auditEvents.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Nenhum evento formal encontrado para o estabelecimento selecionado.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {auditEvents.slice(0, 8).map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5E7A96]">
                        movimentação {index + 1}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                        {auditEventHumanTitle(item)}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("pt-BR")
                          : "Data nao informada"}
                      </p>
                    </div>

                    <span className="rounded-full border border-[#D9E0E7] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E7A96]">
                      {auditEventHumanBadge(item)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#D9E0E7] bg-white p-4 text-sm leading-7 text-[#5B6B79] md:col-span-2">
                      <span className="font-semibold text-[#22313F]">O que aconteceu:</span>{" "}
                      {auditEventHumanDescription(item)}
                    </div>

                    <div className="rounded-2xl border border-[#D9E0E7] bg-white p-4 text-sm leading-7 text-[#5B6B79]">
                      <span className="font-semibold text-[#22313F]">Área da jornada:</span>{" "}
                      {auditEventHumanArea(item)}
                    </div>

                    <details className="rounded-2xl border border-[#D9E0E7] bg-white p-4 text-sm leading-7 text-[#5B6B79]">
                      <summary className="cursor-pointer font-semibold text-[#22313F]">
                        Ver detalhe técnico
                      </summary>
                      <div className="mt-3 break-words text-xs leading-6 text-[#5B6B79]">
                        {auditEventTechnicalSummary(item) || "Detalhe técnico não informado."}
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
            A tela mostra primeiro o que o RH precisa entender. Os registros técnicos permanecem disponíveis em detalhes, sem poluir a leitura principal.
          </div>
        </section>
        <section className={supabaseSectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                navegacao da jornada
              </div>
              <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
                O acompanhamento agora tem tela propria.
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/nr1/evidencias-acompanhamento"
                className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
              >
                Voltar para evidencias
              </Link>
            </div>
          </div>
        </section>
      </div>
          </div>
    </Nr1WorkspaceV2Shell>
  );
}







