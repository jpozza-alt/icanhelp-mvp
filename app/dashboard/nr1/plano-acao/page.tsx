"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

type TenantOption = {
  id: string;
  name: string;
  slug?: string | null;
};

type EstablishmentItem = {
  id: string;
  name: string;
  company_id?: string | null;
  city?: string | null;
  state?: string | null;
  employee_count?: number | null;
  status?: string | null;
};

type AssessmentItem = {
  id: string;
  establishment_name?: string | null;
  sector_name?: string | null;
  activity_name?: string | null;
  risk_category?: string | null;
  hazard_title?: string | null;
  risk_level?: string | null;
  risk_priority?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

type ActionPlanItem = {
  id: string;
  tenant_id?: string | null;
  establishment_id?: string | null;
  risk_id?: string | null;
  title?: string | null;
  description?: string | null;
  measure_type?: string | null;
  priority?: string | null;
  status?: string | null;
  due_date?: string | null;
  responsible_name?: string | null;
  responsible_user_id?: string | null;
  monitoring_method?: string | null;
  evidence_method?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type ActionFormState = {
  selectedRiskId: string;
  title: string;
  description: string;
  responsible: string;
  dueDate: string;
  priority: string;
  status: string;
  measureType: string;
  monitoringMethod: string;
  evidenceMethod: string;
};

const initialForm: ActionFormState = {
  selectedRiskId: "",
  title: "",
  description: "",
  responsible: "",
  dueDate: "",
  priority: "",
  status: "open",
  measureType: "",
  monitoringMethod: "",
  evidenceMethod: "",
};

const sectionClassName =
  "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-[0_18px_50px_rgba(34,49,63,0.08)]";
const inputClassName =
  "mt-2 w-full rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";
const textareaClassName =
  "mt-2 min-h-[110px] w-full rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";
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

function parseTenants(payload: any): TenantOption[] {
  const raw = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      name: String(item?.name ?? item?.slug ?? "Tenant").trim(),
      slug: item?.slug ? String(item.slug) : null,
    }))
    .filter((item: TenantOption) => item.id);
}

function parseEstablishments(payload: any): EstablishmentItem[] {
  const raw = Array.isArray(payload?.items) ? payload.items : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      name: String(item?.name ?? "Estabelecimento").trim(),
      company_id: item?.company_id ? String(item.company_id) : null,
      city: item?.city ? String(item.city) : null,
      state: item?.state ? String(item.state) : null,
      employee_count:
        typeof item?.employee_count === "number" && Number.isFinite(item.employee_count)
          ? item.employee_count
          : null,
      status: item?.status ? String(item.status) : null,
    }))
    .filter((item: EstablishmentItem) => item.id);
}

function parseAssessments(payload: any): AssessmentItem[] {
  const raw = Array.isArray(payload?.items) ? payload.items : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      establishment_name: item?.establishment_name
        ? String(item.establishment_name)
        : item?.establishment_id
          ? String(item.establishment_id)
          : null,
      sector_name: item?.sector_name
        ? String(item.sector_name)
        : item?.department_id
          ? String(item.department_id)
          : null,
      activity_name: item?.activity_name
        ? String(item.activity_name)
        : item?.activity_id
          ? String(item.activity_id)
          : null,
      risk_category: item?.risk_category ? String(item.risk_category) : null,
      hazard_title: item?.hazard_title
        ? String(item.hazard_title)
        : item?.title
          ? String(item.title)
          : item?.hazard_description
            ? String(item.hazard_description)
            : null,
      risk_level: item?.risk_level
        ? String(item.risk_level)
        : item?.classification
          ? String(item.classification)
          : null,
      risk_priority: item?.risk_priority
        ? String(item.risk_priority)
        : item?.priority
          ? String(item.priority)
          : item?.classification
            ? String(item.classification)
            : item?.risk_level
              ? String(item.risk_level)
              : null,
      status: item?.status ? String(item.status) : null,
      updated_at: item?.updated_at ? String(item.updated_at) : null,
    }))
    .filter((item: AssessmentItem) => item.id);
}

function parseActionPlans(payload: any): ActionPlanItem[] {
  const raw = Array.isArray(payload?.items) ? payload.items : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      tenant_id: item?.tenant_id ? String(item.tenant_id) : null,
      establishment_id: item?.establishment_id ? String(item.establishment_id) : null,
      risk_id: item?.risk_id ? String(item.risk_id) : null,
      title: item?.title ? String(item.title) : null,
      description: item?.description ? String(item.description) : null,
      measure_type: item?.measure_type ? String(item.measure_type) : null,
      priority: item?.priority ? String(item.priority) : null,
      status: item?.status ? String(item.status) : null,
      due_date: item?.due_date ? String(item.due_date) : null,
      responsible_name: item?.responsible_name ? String(item.responsible_name) : null,
      responsible_user_id: item?.responsible_user_id ? String(item.responsible_user_id) : null,
      monitoring_method: item?.monitoring_method ? String(item.monitoring_method) : null,
      evidence_method: item?.evidence_method ? String(item.evidence_method) : null,
      created_at: item?.created_at ? String(item.created_at) : null,
      updated_at: item?.updated_at ? String(item.updated_at) : null,
      deleted_at: item?.deleted_at ? String(item.deleted_at) : null,
    }))
    .filter((item: ActionPlanItem) => item.id);
}

function formatPriorityLabel(priority: string | null | undefined) {
  switch (String(priority || "").trim().toLowerCase()) {
    case "very_high":
      return "muito alta";
    case "high":
      return "alta";
    case "medium":
      return "media";
    case "low":
      return "baixa";
    default:
      return "nao classificada";
  }
}

function formatStatusLabel(status: string | null | undefined) {
  switch (String(status || "").trim().toLowerCase()) {
    case "open":
      return "em aberto";
    case "in_progress":
      return "em andamento";
    case "completed":
      return "concluido";
    default:
      return String(status || "sem status").trim() || "sem status";
  }
}

function getPriorityBadgeClass(priority: string | null | undefined) {
  switch (String(priority || "").trim().toLowerCase()) {
    case "very_high":
      return "border-[#E8C8CC] bg-[#F9F1F2] text-[#8A4F58]";
    case "high":
      return "border-[#E9D4C4] bg-[#FBF5EF] text-[#8C5A33]";
    case "medium":
      return "border-[#E6DDC7] bg-[#FBF8F1] text-[#7B6630]";
    case "low":
      return "border-[#D6E5D7] bg-[#F3F8F4] text-[#4E7355]";
    default:
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
  }
}

function getStatusBadgeClass(status: string | null | undefined) {
  switch (String(status || "").trim().toLowerCase()) {
    case "completed":
      return "border-[#D6E5D7] bg-[#F3F8F4] text-[#4E7355]";
    case "in_progress":
      return "border-[#D6E3EE] bg-[#F2F7FB] text-[#45647F]";
    case "open":
      return "border-[#E9D4C4] bg-[#FBF5EF] text-[#8C5A33]";
    default:
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
  }
}

function resetFormState(): ActionFormState {
  return {
    ...initialForm,
  };
}

function buildActionPlanPayload(form: ActionFormState, establishmentId: string) {
  return {
    establishment_id: establishmentId,
    risk_id: form.selectedRiskId,
    title: form.title.trim(),
    description: form.description.trim() || null,
    measure_type: form.measureType.trim() || null,
    priority: form.priority.trim() || null,
    status: form.status.trim() || "open",
    due_date: form.dueDate || null,
    responsible_name: form.responsible.trim() || null,
    monitoring_method: form.monitoringMethod.trim() || null,
    evidence_method: form.evidenceMethod.trim() || null,
  };
}

export default function Nr1PlanoAcaoPage() {
  const router = useRouter();

  const [form, setForm] = useState<ActionFormState>(initialForm);
  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentItem[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [risks, setRisks] = useState<AssessmentItem[]>([]);
  const [items, setItems] = useState<ActionPlanItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");

  function updateField<K extends keyof ActionFormState>(field: K, value: ActionFormState[K]) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(resetFormState());
  }

  const selectedEstablishment = useMemo(() => {
    return establishments.find((item) => item.id === selectedEstablishmentId) || null;
  }, [establishments, selectedEstablishmentId]);

  const riskLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const risk of risks) {
      const parts = [
        String(risk.hazard_title || "").trim(),
        String(risk.sector_name || "").trim(),
        String(risk.activity_name || "").trim(),
      ].filter(Boolean);
      map.set(risk.id, parts.join(" - ") || risk.id);
    }
    return map;
  }, [risks]);

  async function loadPlansAndRisks(
    currentJwt: string,
    currentTenantId: string,
    currentEstablishmentId: string,
    currentEstablishmentName: string
  ) {
    setLoadingRisks(true);
    setLoadingPlans(true);
    setError("");
    setSuccess("");

    try {
      const assessmentsResponse = await fetch("/api/nr1/risks?establishmentId=" + encodeURIComponent(currentEstablishmentId), {
        method: "GET",
        headers: {
          Authorization: "Bearer " + currentJwt,
          "x-icanhelp-tenant": currentTenantId,
        },
        cache: "no-store",
      });

      const assessmentsPayload = await readJsonSafe(assessmentsResponse);
      if (!assessmentsResponse.ok) {
        const message =
          assessmentsPayload?.message ||
          assessmentsPayload?.error ||
          "Falha ao carregar riscos para o plano de acao.";
        throw new Error(String(message));
      }

      const parsedAssessments = parseAssessments(assessmentsPayload);
      setRisks(parsedAssessments);

      const plansResponse = await fetch(
        "/api/nr1/action-plans?establishmentId=" + encodeURIComponent(currentEstablishmentId),
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + currentJwt,
            "x-icanhelp-tenant": currentTenantId,
          },
          cache: "no-store",
        }
      );

      const plansPayload = await readJsonSafe(plansResponse);
      if (!plansResponse.ok) {
        const message =
          plansPayload?.message ||
          plansPayload?.error ||
          "Falha ao carregar plano de acao.";
        throw new Error(String(message));
      }

      const parsedPlans = parseActionPlans(plansPayload);
      setItems(parsedPlans);

      if (parsedPlans.length === 0 && parsedAssessments.length === 0) {
        setInfo("Estabelecimento carregado, mas ainda sem riscos e sem acoes formais.");
      } else if (parsedPlans.length === 0) {
        setInfo("Riscos reais carregados. Ainda nao ha acoes formais cadastradas.");
      } else {
        setInfo("Plano de acao real carregado do backend.");
      }
    } catch (e: any) {
      setRisks([]);
      setItems([]);
      setError(e?.message || "Falha ao carregar plano de acao.");
    } finally {
      setLoadingRisks(false);
      setLoadingPlans(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoadingSession(true);
      setError("");
      setSuccess("");
      setInfo("");

      try {
        await new Promise((resolve) => setTimeout(resolve, 250));

        let data: { session: any | null } = { session: null };
        let sessionError: any = null;

        for (const waitMs of [0, 250, 500]) {
          if (waitMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
          }

          const sessionResult = await supabase.auth.getSession();
          data = sessionResult.data;
          sessionError = sessionResult.error;

          if (data?.session) {
            break;
          }
        }

        if (sessionError) {
          throw sessionError;
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          router.replace("/login");
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
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar sessao.");
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
      setSuccess("");
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

        setSelectedEstablishmentId(parsedEstablishments[0].id);
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar estabelecimentos.");
      } finally {
        setLoadingEstablishments(false);
      }
    })();
  }, [jwt, tenantId]);

  useEffect(() => {
    if (!jwt || !tenantId || !selectedEstablishmentId || !selectedEstablishment) {
      setRisks([]);
      setItems([]);
      return;
    }

    void loadPlansAndRisks(jwt, tenantId, selectedEstablishmentId, selectedEstablishment.name);
  }, [jwt, tenantId, selectedEstablishmentId, selectedEstablishment]);

  async function handleAddAction() {
    setError("");
    setSuccess("");
    setInfo("");

    if (!jwt) {
      setError("Sessao indisponivel. Recarregue a pagina ou faca login novamente.");
      return;
    }

    if (!tenantId) {
      setError("Tenant nao selecionado.");
      return;
    }

    if (!selectedEstablishmentId || !selectedEstablishment) {
      setError("Selecione um estabelecimento antes de criar a acao.");
      return;
    }

    if (!form.selectedRiskId) {
      setError("Selecione o risco que sera transformado em acao.");
      return;
    }

    if (!form.title.trim() || form.title.trim().length < 3) {
      setError("Informe um titulo com pelo menos 3 caracteres.");
      return;
    }

    setSaving(true);

    try {
      const payload = buildActionPlanPayload(form, selectedEstablishmentId);

      const response = await fetch("/api/nr1/action-plans", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + jwt,
          "x-icanhelp-tenant": tenantId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await readJsonSafe(response);
      if (!response.ok) {
        const message =
          responsePayload?.message ||
          responsePayload?.error ||
          "Falha ao salvar acao no backend.";
        throw new Error(String(message));
      }

      await loadPlansAndRisks(jwt, tenantId, selectedEstablishmentId, selectedEstablishment.name);

      setSuccess("Acao salva no backend com sucesso.");
      resetForm();
    } catch (e: any) {
      setError(e?.message || "Falha ao salvar acao.");
    } finally {
      setSaving(false);
    }
  }

  const overdueOpenCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items.filter((item) => {
      if (String(item.status || "").trim().toLowerCase() === "completed") {
        return false;
      }

      if (!item.due_date) {
        return false;
      }

      const due = new Date(String(item.due_date).trim() + "T00:00:00");
      return due < today;
    }).length;
  }, [items]);

  const highPriorityCount = useMemo(() => {
    return items.filter((item) => {
      const priority = String(item.priority || "").trim().toLowerCase();
      return priority === "high" || priority === "very_high";
    }).length;
  }, [items]);

  const nextSignal = useMemo(() => {
    if (!selectedEstablishmentId) {
      return "Selecione um estabelecimento para abrir o plano de acao real.";
    }

    if (risks.length === 0) {
      return "Ainda nao ha risco elegivel para virar acao neste estabelecimento.";
    }

    if (items.length === 0) {
      return "Ha riscos reais carregados. Preencha o formulario para gravar a primeira acao formal.";
    }

    if (overdueOpenCount > 0) {
      return "Ha acao vencida e nao concluida. A etapa de acompanhamento precisa ganhar prioridade.";
    }

    if (highPriorityCount > 0) {
      return "Existem acoes de prioridade alta ou muito alta. Elas devem aparecer primeiro na devolutiva executiva.";
    }

    return "Base real de acoes pronta para acompanhamento e evidencias.";
  }, [selectedEstablishmentId, risks.length, items.length, overdueOpenCount, highPriorityCount]);

  return (
    <AppShell
      active="nr1"
      title="Plano de acao"
      description="Quarta etapa da jornada. Agora esta tela le e grava acoes reais no backend."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Transforma risco real em responsavel, prazo, prioridade e monitoramento.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            O backend da etapa usa action-plans por estabelecimento. Isso permite que a jornada saia do rascunho
            local e vire plano de acao rastreavel por risco, prazo e responsavel.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                riscos elegiveis
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{risks.length}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                acoes formais
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{items.length}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                vencidas abertas
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{overdueOpenCount}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                alta prioridade
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{highPriorityCount}</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
            {nextSignal}
          </div>

          {loadingSession ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">Carregando sessao...</p>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-[#E8C8CC] bg-[#F9F1F2] px-4 py-3 text-sm text-[#8A4F58]">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-4 rounded-2xl border border-[#D6E5D7] bg-[#F3F8F4] px-4 py-3 text-sm text-[#4E7355]">
              {success}
            </div>
          ) : null}

          {info ? (
            <div className="mt-4 rounded-2xl border border-[#D6E3EE] bg-[#F2F7FB] px-4 py-3 text-sm text-[#45647F]">
              {info}
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
          <section className={sectionClassName}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              cadastrar acao
            </div>
            <h3 className="mt-3 text-xl font-semibold text-[#22313F]">Vincule a acao a um risco real do estabelecimento.</h3>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-semibold text-[#22313F]">Tenant ativo</label>
                <div className="mt-2 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm text-[#5B6B79]">
                  {tenantId
                    ? (tenants.find((item) => item.id === tenantId)?.name || tenantId) + " (" + tenantId + ")"
                    : "Nao carregado"}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Estabelecimento alvo</label>
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
                <label className="text-sm font-semibold text-[#22313F]">Risco relacionado</label>
                <select
                  value={form.selectedRiskId}
                  onChange={(e) => updateField("selectedRiskId", e.target.value)}
                  className={selectClassName}
                  disabled={loadingRisks || risks.length === 0}
                >
                  <option value="">
                    {loadingRisks
                      ? "Carregando riscos..."
                      : risks.length === 0
                        ? "Nenhum risco disponivel"
                        : "Selecione o risco"}
                  </option>
                  {risks.map((item) => {
                    const optionLabel =
                      [
                        String(item.hazard_title || "").trim(),
                        String(item.sector_name || "").trim(),
                        String(item.activity_name || "").trim(),
                      ]
                        .filter(Boolean)
                        .join(" - ") || item.id;

                    return (
                      <option key={item.id} value={item.id}>
                        {optionLabel}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Titulo da acao</label>
                <input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className={inputClassName}
                  placeholder="Ex.: Redistribuir tarefas e revisar prazos"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Descricao da acao</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className={textareaClassName}
                  placeholder="Descreva o que a empresa vai fazer para responder ao risco."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[#22313F]">Responsavel</label>
                  <input
                    value={form.responsible}
                    onChange={(e) => updateField("responsible", e.target.value)}
                    className={inputClassName}
                    placeholder="Nome do responsavel"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#22313F]">Prazo</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => updateField("dueDate", e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-semibold text-[#22313F]">Prioridade</label>
                  <select
                    value={form.priority}
                    onChange={(e) => updateField("priority", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    <option value="low">baixa</option>
                    <option value="medium">media</option>
                    <option value="high">alta</option>
                    <option value="very_high">muito alta</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#22313F]">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="open">em aberto</option>
                    <option value="in_progress">em andamento</option>
                    <option value="completed">concluido</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#22313F]">Tipo de medida</label>
                  <select
                    value={form.measureType}
                    onChange={(e) => updateField("measureType", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    <option value="elimination">eliminacao</option>
                    <option value="collective">protecao coletiva</option>
                    <option value="administrative">medida administrativa</option>
                    <option value="individual">protecao individual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Metodo de monitoramento</label>
                <textarea
                  value={form.monitoringMethod}
                  onChange={(e) => updateField("monitoringMethod", e.target.value)}
                  className={textareaClassName}
                  placeholder="Ex.: Reuniao quinzenal, checklist, indicador de prazo."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Metodo de evidencia</label>
                <textarea
                  value={form.evidenceMethod}
                  onChange={(e) => updateField("evidenceMethod", e.target.value)}
                  className={textareaClassName}
                  placeholder="Ex.: Ata, foto, lista de presenca, revisao de procedimento."
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void handleAddAction()}
                  disabled={saving || !jwt || !tenantId || !selectedEstablishmentId || !form.selectedRiskId || !form.title.trim() || form.title.trim().length < 3}
                  className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar acao"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
                >
                  Limpar campos
                </button>
              </div>
            </div>
          </section>

          <section className={sectionClassName}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              acoes registradas
            </div>
            <h3 className="mt-3 text-xl font-semibold text-[#22313F]">Lista real carregada do backend por estabelecimento.</h3>

            {loadingPlans ? (
              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">Carregando acoes reais do estabelecimento selecionado...</p>
            ) : items.length === 0 ? (
              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                Nenhuma acao formal encontrada. Use o formulario ao lado para gravar a primeira resposta de gestao.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {items.map((item, index) => {
                  const relatedRiskLabel =
                    (item.risk_id ? riskLabelById.get(item.risk_id) : null) ||
                    item.risk_id ||
                    "Risco nao identificado";

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5E7A96]">
                            acao {index + 1}
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                            {item.title || "Acao sem titulo"}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                            {item.description || "Sem descricao complementar."}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#D9E0E7] bg-white px-4 py-3 text-xs leading-6 text-[#5B6B79]">
                          <div>
                            <span className="font-semibold text-[#22313F]">ID:</span> {item.id}
                          </div>
                          <div>
                            <span className="font-semibold text-[#22313F]">Risco:</span> {relatedRiskLabel}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <div className={"rounded-full border px-3 py-2 text-xs font-semibold " + getPriorityBadgeClass(item.priority)}>
                          Prioridade: {formatPriorityLabel(item.priority)}
                        </div>
                        <div className={"rounded-full border px-3 py-2 text-xs font-semibold " + getStatusBadgeClass(item.status)}>
                          Status: {formatStatusLabel(item.status)}
                        </div>
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#5B6B79]">
                          Prazo: {item.due_date || "nao informado"}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                            responsavel
                          </div>
                          <div className="mt-2 text-sm leading-7 text-[#22313F]">
                            {item.responsible_name || "Nao informado"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                            tipo de medida
                          </div>
                          <div className="mt-2 text-sm leading-7 text-[#22313F]">
                            {item.measure_type || "Nao informado"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                            monitoramento
                          </div>
                          <div className="mt-2 text-sm leading-7 text-[#22313F]">
                            {item.monitoring_method || "Nao informado"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                            evidencia
                          </div>
                          <div className="mt-2 text-sm leading-7 text-[#22313F]">
                            {item.evidence_method || "Nao informado"}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
              Esta versao esta ligada ao backend real para leitura e gravacao por estabelecimento.
            </div>
          </section>
        </div>

        <section className={sectionClassName}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                navegacao da jornada
              </div>
              <h3 className="mt-3 text-xl font-semibold text-[#22313F]">A jornada segue em sequencia, sem perder contexto.</h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/nr1/riscos-prioridades"
                className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
              >
                Voltar para riscos
              </Link>

              <Link
                href="/dashboard/nr1/evidencias-acompanhamento"
                className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
              >
                Avancar para evidencias
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}




