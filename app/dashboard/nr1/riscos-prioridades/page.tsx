"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";

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
  company_id?: string | null;
  city?: string | null;
  state?: string | null;
  employee_count?: number | null;
  status?: string | null;
};

type DepartmentItem = {
  id: string;
  name: string;
  description?: string | null;
  employee_count?: number | null;
  shift_pattern?: string | null;
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

type RiskFormState = {
  sectorName: string;
  activityName: string;
  riskCategory: string;
  hazardTitle: string;
  hazardDescription: string;
  sourceOrCircumstance: string;
  exposedGroup: string;
  possibleEffects: string;
  severity: string;
  probability: string;
};

const initialForm: RiskFormState = {
  sectorName: "",
  activityName: "",
  riskCategory: "",
  hazardTitle: "",
  hazardDescription: "",
  sourceOrCircumstance: "",
  exposedGroup: "",
  possibleEffects: "",
  severity: "",
  probability: "",
};

const sectionClassName = "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm";
const inputClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]";
const selectClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";

const riskCategoryOptions = [
  { value: "physical", label: "Fisico" },
  { value: "chemical", label: "Quimico" },
  { value: "biological", label: "Biologico" },
  { value: "ergonomic", label: "Ergonomico" },
  { value: "psychosocial_related_to_work", label: "Psicossocial relacionado ao trabalho" },
  { value: "accident", label: "Acidente" },
];

function parseTenants(payload: any): TenantOption[] {
  const raw =
    (Array.isArray(payload) && payload) ||
    (Array.isArray(payload?.tenants) && payload.tenants) ||
    (Array.isArray(payload?.items) && payload.items) ||
    (Array.isArray(payload?.data) && payload.data) ||
    [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? item?.tenant_id ?? "").trim(),
      name: String(item?.name ?? item?.tenant_name ?? item?.slug ?? "Tenant").trim(),
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

function parseDepartments(payload: any): DepartmentItem[] {
  const raw = Array.isArray(payload?.items) ? payload.items : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      name: String(item?.name ?? "Setor").trim(),
      description: item?.description ? String(item.description) : null,
      employee_count:
        typeof item?.employee_count === "number" && Number.isFinite(item.employee_count)
          ? item.employee_count
          : null,
      shift_pattern: item?.shift_pattern ? String(item.shift_pattern) : null,
      status: item?.status ? String(item.status) : null,
    }))
    .filter((item: DepartmentItem) => item.id);
}

function parseAssessments(payload: any): AssessmentItem[] {
  const raw = Array.isArray(payload?.items) ? payload.items : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      establishment_name: item?.establishment_name ? String(item.establishment_name) : null,
      sector_name: item?.sector_name ? String(item.sector_name) : null,
      activity_name: item?.activity_name ? String(item.activity_name) : null,
      risk_category: item?.risk_category ? String(item.risk_category) : null,
      hazard_title: item?.hazard_title ? String(item.hazard_title) : null,
      risk_level: item?.risk_level ? String(item.risk_level) : null,
      risk_priority: item?.risk_priority ? String(item.risk_priority) : null,
      status: item?.status ? String(item.status) : null,
      updated_at: item?.updated_at ? String(item.updated_at) : null,
    }))
    .filter((item: AssessmentItem) => item.id);
}

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function resetFormState(): RiskFormState {
  return {
    ...initialForm,
  };
}

function getPriorityLabel(priority: string | null | undefined) {
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

function getPriorityClass(priority: string | null | undefined) {
  const normalized = String(priority || "").trim().toLowerCase();

  switch (normalized) {
    case "very_high":
      return "border-[#E3C7CB] bg-[#F9F1F2] text-[#8A4F58]";
    case "high":
      return "border-[#E8D9BE] bg-[#FBF6EB] text-[#8A6732]";
    case "medium":
      return "border-[#D9E0E7] bg-[#F4F7FA] text-[#486273]";
    default:
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
  }
}

function buildAssessmentPayload(
  form: RiskFormState,
  establishmentName: string
) {
  return {
    establishment_name: establishmentName,
    sector_name: form.sectorName.trim() || null,
    activity_name: form.activityName.trim(),
    risk_category: form.riskCategory.trim(),
    hazard_title: form.hazardTitle.trim(),
    hazard_description: form.hazardDescription.trim(),
    source_or_circumstance: form.sourceOrCircumstance.trim(),
    exposed_group_description: form.exposedGroup.trim(),
    possible_injuries_or_health_effects: form.possibleEffects.trim(),
    severity_level: Number(form.severity),
    probability_level: Number(form.probability),
    status: "draft",
  };
}

export default function Nr1RiscosPrioridadesPage() {
  const router = useRouter();

  const [form, setForm] = useState<RiskFormState>(initialForm);
  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentItem[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");

  function updateField<K extends keyof RiskFormState>(field: K, value: RiskFormState[K]) {
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

  useEffect(() => {
    (async () => {
      setLoadingSession(true);
      setError("");
      setSuccess("");
      setInfo("");

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

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
          throw new Error("Nenhum tenant disponivel para este usuario.");
        }

        setTenantId(parsedTenants[0].id);
      } catch (e: any) {
        setError(e?.message || "Falha ao preparar a tela.");
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
      setDepartments([]);
      setItems([]);
      return;
    }

    (async () => {
      setLoadingDepartments(true);
      setLoadingAssessments(true);
      setError("");
      setSuccess("");

      try {
        const departmentsResponse = await fetch(
          "/api/nr1/departments?establishmentId=" + encodeURIComponent(selectedEstablishmentId),
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + jwt,
              "x-icanhelp-tenant": tenantId,
            },
            cache: "no-store",
          }
        );

        const departmentsPayload = await readJsonSafe(departmentsResponse);

        if (!departmentsResponse.ok) {
          const message =
            departmentsPayload?.message ||
            departmentsPayload?.error ||
            "Falha ao carregar setores.";
          throw new Error(String(message));
        }

        const parsedDepartments = parseDepartments(departmentsPayload);
        setDepartments(parsedDepartments);

        const assessmentsResponse = await fetch("/api/nr1-assessments?status=draft&limit=50", {
          method: "GET",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
          },
          cache: "no-store",
        });

        const assessmentsPayload = await readJsonSafe(assessmentsResponse)
        if (!assessmentsResponse.ok) {
          const message =
            assessmentsPayload?.message ||
            assessmentsPayload?.error ||
            "Falha ao carregar riscos.";
          throw new Error(String(message));
        }

        const parsedAssessments = parseAssessments(assessmentsPayload).filter(
          (item) => String(item.establishment_name || "").trim() === selectedEstablishment.name
        );

        setItems(parsedAssessments);

        if (parsedAssessments.length === 0) {
          setInfo("Estabelecimento carregado, mas ainda sem riscos registrados.");
        } else {
          setInfo("Riscos reais carregados do backend para o estabelecimento selecionado.");
        }
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar riscos e setores.");
      } finally {
        setLoadingDepartments(false);
        setLoadingAssessments(false);
      }
    })();
  }, [jwt, tenantId, selectedEstablishmentId, selectedEstablishment]);

  async function handleAddRisk() {
    setError("");
    setSuccess("");

    if (!jwt) {
      setError("Sessao indisponivel. Recarregue a pagina ou faca login novamente.");
      return;
    }

    if (!tenantId) {
      setError("Tenant nao selecionado.");
      return;
    }

    if (!selectedEstablishment) {
      setError("Selecione um estabelecimento.");
      return;
    }

    if (!form.sectorName.trim()) {
      setError("Selecione o setor.");
      return;
    }

    if (!form.activityName.trim()) {
      setError("Informe a atividade.");
      return;
    }

    if (!form.riskCategory.trim()) {
      setError("Selecione a categoria do risco.");
      return;
    }

    if (!form.hazardTitle.trim()) {
      setError("Informe o perigo ou risco principal.");
      return;
    }

    if (!form.hazardDescription.trim()) {
      setError("Informe a descricao do risco.");
      return;
    }

    if (!form.sourceOrCircumstance.trim()) {
      setError("Informe a fonte ou circunstancia.");
      return;
    }

    if (!form.exposedGroup.trim()) {
      setError("Informe o grupo exposto.");
      return;
    }

    if (!form.possibleEffects.trim()) {
      setError("Informe os possiveis agravamentos.");
      return;
    }

    if (!form.severity || !form.probability) {
      setError("Selecione severidade e probabilidade.");
      return;
    }

    const payload = buildAssessmentPayload(form, selectedEstablishment.name);

    setSaving(true);

    try {
      const response = await fetch("/api/nr1-assessments", {
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
          "Falha ao salvar risco.";
        throw new Error(String(message));
      }

      const createdItem = responsePayload?.item
        ? parseAssessments({ items: [responsePayload.item] })[0]
        : null;

      if (createdItem) {
        setItems((old) => [createdItem, ...old]);
      }

      setSuccess("Risco salvo no backend com sucesso.");
      resetForm();
    } catch (e: any) {
      setError(e?.message || "Falha ao salvar risco.");
    } finally {
      setSaving(false);
    }
  }

  const urgentCount = useMemo(() => {
    return items.filter((item) => String(item.risk_priority || "").trim().toLowerCase() === "very_high").length;
  }, [items]);

  const nextSignal = useMemo(() => {
    if (!selectedEstablishmentId) {
      return "Selecione um estabelecimento para abrir os riscos reais.";
    }

    if (items.length === 0) {
      return "Cadastre pelo menos um risco real para gerar leitura de prioridade e necessidade de acao.";
    }

    if (urgentCount > 0) {
      return "Ha risco com acao imediata sugerida. A proxima etapa deve abrir o plano de acao com prioridade maxima.";
    }

    return "Base real de riscos pronta para abrir o plano de acao da empresa.";
  }, [items.length, urgentCount, selectedEstablishmentId]);

  return (
    <AppShell
      active="nr1"
      title="Riscos e prioridades"
      description="Terceira etapa da jornada. Agora esta tela salva e le riscos reais no backend."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Traduz o trabalho real em risco, prioridade e necessidade de resposta.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            Aqui a jornada deixa de olhar apenas a estrutura e passa a registrar perigo, grupo exposto, gravidade e probabilidade no backend real.
          </p>
        </section>

        {error ? (
          <section className="rounded-3xl border border-[#E5C6C8] bg-[#FFF5F5] p-6 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#A8505A]">
              erro
            </div>
            <p className="mt-3 text-sm leading-7 text-[#7D3B43]">{error}</p>
          </section>
        ) : null}

        {success ? (
          <section className="rounded-3xl border border-[#CFE0D4] bg-[#F4FBF6] p-6 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#4E7B5A]">
              salvo com sucesso
            </div>
            <p className="mt-3 text-sm leading-7 text-[#42634A]">{success}</p>
          </section>
        ) : null}

        {info ? (
          <section className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              leitura do backend
            </div>
            <p className="mt-3 text-sm leading-7 text-[#5B6B79]">{info}</p>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                sessao, tenant e base da analise
              </div>

              {loadingSession ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Carregando sessao do navegador e tenants disponiveis...
                </p>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#22313F]">
                      Tenant alvo
                    </label>
                    <select
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      className={selectClassName}
                    >
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#22313F]">
                      Estabelecimento alvo
                    </label>
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
                </div>
              )}
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                registrar risco
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Setor
                  </label>
                  <select
                    value={form.sectorName}
                    onChange={(e) => updateField("sectorName", e.target.value)}
                    className={selectClassName}
                    disabled={loadingDepartments || departments.length === 0}
                  >
                    <option value="">Selecione</option>
                    {departments.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Atividade
                  </label>
                  <input
                    value={form.activityName}
                    onChange={(e) => updateField("activityName", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: atendimento ao publico, operacao de maquina, analise de documentos"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Categoria do risco
                  </label>
                  <select
                    value={form.riskCategory}
                    onChange={(e) => updateField("riskCategory", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    {riskCategoryOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Grupo exposto
                  </label>
                  <input
                    value={form.exposedGroup}
                    onChange={(e) => updateField("exposedGroup", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: equipe de atendimento"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Perigo ou risco principal
                  </label>
                  <input
                    value={form.hazardTitle}
                    onChange={(e) => updateField("hazardTitle", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: sobrecarga de trabalho"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Descricao do que esta acontecendo
                  </label>
                  <textarea
                    value={form.hazardDescription}
                    onChange={(e) => updateField("hazardDescription", e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
                    placeholder="Ex.: equipe acumulando demandas, prazos curtos e interrupcoes frequentes"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Fonte ou circunstancia
                  </label>
                  <input
                    value={form.sourceOrCircumstance}
                    onChange={(e) => updateField("sourceOrCircumstance", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: aumento de demanda, equipe reduzida, rotina fragmentada"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Possiveis agravamentos ou efeitos
                  </label>
                  <input
                    value={form.possibleEffects}
                    onChange={(e) => updateField("possibleEffects", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: estresse, esgotamento, queda de desempenho"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Severidade
                  </label>
                  <select
                    value={form.severity}
                    onChange={(e) => updateField("severity", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    <option value="1">1 - leve</option>
                    <option value="2">2 - menor</option>
                    <option value="3">3 - moderada</option>
                    <option value="4">4 - maior</option>
                    <option value="5">5 - maxima</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Probabilidade
                  </label>
                  <select
                    value={form.probability}
                    onChange={(e) => updateField("probability", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    <option value="1">1 - muito improvavel</option>
                    <option value="2">2 - pouco provavel</option>
                    <option value="3">3 - possivel</option>
                    <option value="4">4 - provavel</option>
                    <option value="5">5 - muito provavel</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleAddRisk()}
                  disabled={saving || !selectedEstablishmentId}
                  className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Adicionar risco"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
                >
                  Limpar campos
                </button>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                riscos registrados
              </div>

              {loadingAssessments ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Carregando riscos reais do estabelecimento selecionado...
                </p>
              ) : items.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Nenhum risco registrado ainda para este estabelecimento.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {items.map((item, index) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-5"
                    >
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5E7A96]">
                          risco {index + 1}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                          {item.hazard_title || "Risco"}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                          {item.activity_name || "Sem atividade informada"}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Setor: {item.sector_name || "nao informado"}
                        </div>
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Categoria: {item.risk_category || "nao informada"}
                        </div>
                        <div className={"rounded-full border px-3 py-2 text-xs font-semibold " + getPriorityClass(item.risk_priority)}>
                          Prioridade: {getPriorityLabel(item.risk_priority)}
                        </div>
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Status: {item.status || "desconhecido"}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                leitura automatica
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    riscos cadastrados
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {items.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    acao imediata sugerida
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {urgentCount}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                {nextSignal}
              </p>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                como a prioridade nasce
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5B6B79]">
                <div>- severidade x probabilidade</div>
                <div>- classificacao calculada no backend</div>
                <div>- baixa, media, alta ou muito alta</div>
                <div>- risco muito alto acende necessidade de resposta imediata</div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                proximo passo
              </div>

              <div className="mt-4 rounded-2xl border border-[#D9E0E7] bg-white p-4">
                <div className="text-sm font-semibold text-[#22313F]">
                  Plano de acao
                </div>
                <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                  Depois de registrar os riscos reais, a jornada ja pode abrir a tela que transforma prioridade em responsavel, prazo e acompanhamento.
                </p>
              </div>

              <Link
                href="/dashboard/nr1/plano-acao"
                className="mt-4 inline-block rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
              >
                Ir para plano de acao
              </Link>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}