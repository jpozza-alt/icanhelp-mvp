"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import { Nr1JourneyCard } from "@/components/nr1/Nr1JourneyCard";
import { Nr1ProgressDashboard } from "@/components/nr1/Nr1ProgressDashboard";
import { Nr1DiagnosisDraftCard } from "@/components/nr1/Nr1DiagnosisDraftCard";

type FormState = {
  companyName: string;
  companySize: string;
  workerCount: string;
  sectors: string;
  publicService: string;
  goalsPressure: string;
  repetitiveWork: string;
  seatedWork: string;
  machineHeightNoiseHeatChemical: string;
  outsourcedWorkers: string;
  remoteHybrid: string;
};

type TenantOption = {
  id: string;
  name: string;
  slug?: string | null;
};

type SaveMeta = {
  itemId: string | null;
  requestId: string | null;
};

type Nr1AssessmentItem = {
  id?: string;
  establishment_name?: string | null;
  process_description?: string | null;
  environment_description?: string | null;
  workers_count_estimate?: number | null;
  status?: string | null;
};

const initialForm: FormState = {
  companyName: "",
  companySize: "",
  workerCount: "",
  sectors: "",
  publicService: "",
  goalsPressure: "",
  repetitiveWork: "",
  seatedWork: "",
  machineHeightNoiseHeatChemical: "",
  outsourcedWorkers: "",
  remoteHybrid: "",
};

const selectClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";
const inputClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]";
const sectionClassName = "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm";

function yesNoOptions() {
  return (
    <>
      <option value="">
      

      
Selecione</option>
      <option value="yes">Sim</option>
      <option value="no">Nao</option>
      <option value="partially">Em parte</option>
      <option value="unknown">Ainda nao sei</option>
    </>
  );
}

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

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function countYesSignals(form: FormState) {
  const values = [
    form.publicService,
    form.goalsPressure,
    form.repetitiveWork,
    form.seatedWork,
    form.machineHeightNoiseHeatChemical,
    form.outsourcedWorkers,
    form.remoteHybrid,
  ];

  return values.filter((value) => value === "yes").length;
}

function parseWorkerCount(value: string) {
  const digits = String(value || "").replace(/\D/g, "").trim();
  if (!digits) return null;

  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

function toHumanAnswer(value: string) {
  switch (value) {
    case "yes":
      return "Sim";
    case "no":
      return "Nao";
    case "partially":
      return "Em parte";
    case "unknown":
      return "Ainda nao sei";
    default:
      return "Nao informado";
  }
}

function parseHumanAnswer(value: string) {
  const normalized = String(value || "").trim().toLowerCase();

  switch (normalized) {
    case "sim":
      return "yes";
    case "nao":
      return "no";
    case "em parte":
      return "partially";
    case "ainda nao sei":
      return "unknown";
    default:
      return "";
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBetween(text: string, startLabel: string, endLabel?: string) {
  if (!text) return "";

  const startEscaped = escapeRegExp(startLabel);
  if (endLabel) {
    const endEscaped = escapeRegExp(endLabel);
    const regex = new RegExp(startEscaped + "\\s*:\\s*([\\s\\S]*?)\\s*" + endEscaped + "\\s*:", "i");
    const match = text.match(regex);
    if (!match || !match[1]) return "";
    return match[1].trim().replace(/\.$/, "");
  }

  const regex = new RegExp(startEscaped + "\\s*:\\s*([\\s\\S]*?)\\s*$", "i");
  const match = text.match(regex);
  if (!match || !match[1]) return "";
  return match[1].trim().replace(/\.$/, "");
}

function extractEnvironmentAnswer(text: string, label: string) {
  if (!text) return "";

  const regex = new RegExp(escapeRegExp(label) + "\\s*:\\s*(Sim|Nao|Em parte|Ainda nao sei|Nao informado)", "i");
  const match = text.match(regex);

  return parseHumanAnswer(match?.[1] || "");
}

function normalizeLoadedValue(value: string) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized.toLowerCase() === "nao informado") return "";
  return normalized;
}

function mapAssessmentToForm(item: Nr1AssessmentItem): FormState {
  const processDescription = String(item?.process_description || "");
  const environmentDescription = String(item?.environment_description || "");

  const companySize = normalizeLoadedValue(
    extractBetween(processDescription, "Porte", "Trabalhadores")
  );

  const workersFromNumber =
    item?.workers_count_estimate !== null &&
    item?.workers_count_estimate !== undefined &&
    String(item.workers_count_estimate).trim()
      ? String(item.workers_count_estimate)
      : "";

  const workersFromText = normalizeLoadedValue(
    extractBetween(processDescription, "Trabalhadores", "Setores informados")
  );

  const sectors = normalizeLoadedValue(
    extractBetween(processDescription, "Setores informados")
  );

  return {
    companyName: String(item?.establishment_name || "").trim(),
    companySize,
    workerCount: workersFromNumber || workersFromText,
    sectors,
    publicService: extractEnvironmentAnswer(environmentDescription, "Atendimento ao publico"),
    goalsPressure: extractEnvironmentAnswer(environmentDescription, "Metas e cobranca"),
    repetitiveWork: extractEnvironmentAnswer(environmentDescription, "Trabalho repetitivo"),
    seatedWork: extractEnvironmentAnswer(environmentDescription, "Trabalho sentado"),
    machineHeightNoiseHeatChemical: extractEnvironmentAnswer(environmentDescription, "Exposicoes operacionais"),
    outsourcedWorkers: extractEnvironmentAnswer(environmentDescription, "Terceirizados"),
    remoteHybrid: extractEnvironmentAnswer(environmentDescription, "Trabalho remoto ou hibrido"),
  };
}

function deriveRiskCategory(form: FormState) {
  if (form.machineHeightNoiseHeatChemical === "yes") {
    return "accident";
  }

  if (
    form.goalsPressure === "yes" ||
    form.publicService === "yes" ||
    form.remoteHybrid === "yes" ||
    form.outsourcedWorkers === "yes"
  ) {
    return "psychosocial_related_to_work";
  }

  if (form.repetitiveWork === "yes" || form.seatedWork === "yes") {
    return "ergonomic";
  }

  return "ergonomic";
}

function deriveHazardTitle(form: FormState) {
  if (form.machineHeightNoiseHeatChemical === "yes") {
    return "Exposicoes operacionais a detalhar por setor";
  }

  if (
    form.goalsPressure === "yes" ||
    form.publicService === "yes" ||
    form.remoteHybrid === "yes" ||
    form.outsourcedWorkers === "yes"
  ) {
    return "Fatores psicossociais e organizacao do trabalho a detalhar";
  }

  if (form.repetitiveWork === "yes" || form.seatedWork === "yes") {
    return "Exigencias ergonomicas iniciais a detalhar";
  }

  return "Levantamento preliminar guiado do diagnostico inicial";
}

function deriveHazardDescription(form: FormState) {
  const parts: string[] = [];

  if (form.publicService === "yes") {
    parts.push("Ha atendimento ao publico, com possibilidade de maior pressao, desgaste e conflito.");
  }

  if (form.goalsPressure === "yes") {
    parts.push("Ha metas ou cobranca frequente por prazo.");
  }

  if (form.repetitiveWork === "yes") {
    parts.push("Ha trabalho repetitivo.");
  }

  if (form.seatedWork === "yes") {
    parts.push("Ha trabalho predominantemente sentado.");
  }

  if (form.machineHeightNoiseHeatChemical === "yes") {
    parts.push("Ha indicio de exposicao a maquina, altura, ruido, calor ou quimico.");
  }

  if (form.outsourcedWorkers === "yes") {
    parts.push("Ha terceirizados atuando na empresa.");
  }

  if (form.remoteHybrid === "yes") {
    parts.push("Ha trabalho remoto ou hibrido.");
  }

  if (parts.length === 0) {
    parts.push("O diagnostico inicial ainda nao apontou um perigo especifico predominante, mas a empresa precisa seguir para o detalhamento por setor.");
  }

  return parts.join(" ");
}

function deriveSourceOrCircumstance() {
  return "Diagnostico inicial guiado da empresa, com base em perguntas sobre estrutura, rotina e exposicoes antes do mapeamento detalhado por setor.";
}

function deriveExposedGroupDescription(form: FormState) {
  const workerCount = parseWorkerCount(form.workerCount);

  if (workerCount) {
    return "Trabalhadores da empresa, com estimativa informada de " + workerCount + " pessoas.";
  }

  return "Trabalhadores da empresa em avaliacao inicial.";
}

function derivePossibleEffects(form: FormState) {
  const category = deriveRiskCategory(form);

  if (category === "accident") {
    return "Lesoes por acidentes, exposicoes operacionais, adoecimento relacionado ao trabalho e necessidade de detalhamento imediato por setor.";
  }

  if (category === "psychosocial_related_to_work") {
    return "Estresse, desgaste mental, conflito, sobrecarga e outros agravos relacionados a organizacao do trabalho.";
  }

  return "Desconforto, fadiga, sobrecarga ergonomica, dores osteomusculares e necessidade de ajuste das condicoes de trabalho.";
}

function deriveSeverityLevel(form: FormState) {
  let severity = 2;

  if (form.machineHeightNoiseHeatChemical === "yes") {
    severity += 2;
  }

  if (form.goalsPressure === "yes" || form.publicService === "yes") {
    severity += 1;
  }

  if (form.repetitiveWork === "yes" || form.seatedWork === "yes") {
    severity += 1;
  }

  return Math.min(severity, 5);
}

function deriveProbabilityLevel(form: FormState) {
  const yesCount = countYesSignals(form);

  if (yesCount >= 5) return 5;
  if (yesCount >= 3) return 4;
  if (yesCount >= 2) return 3;
  return 2;
}

function buildAssessmentPayload(form: FormState, nextSignal: string) {
  const riskCategory = deriveRiskCategory(form);
  const severityLevel = deriveSeverityLevel(form);
  const probabilityLevel = deriveProbabilityLevel(form);

  return {
    establishment_name: form.companyName.trim(),
    unit_name: null,
    sector_name: "Diagnostico inicial",
    activity_name: "Diagnostico inicial da empresa",
    process_description:
      "Porte: " +
      (form.companySize || "nao informado") +
      ". Trabalhadores: " +
      (form.workerCount || "nao informado") +
      ". Setores informados: " +
      (form.sectors || "nao informado") +
      ".",
    environment_description:
      "Atendimento ao publico: " +
      toHumanAnswer(form.publicService) +
      ". Metas e cobranca: " +
      toHumanAnswer(form.goalsPressure) +
      ". Trabalho repetitivo: " +
      toHumanAnswer(form.repetitiveWork) +
      ". Trabalho sentado: " +
      toHumanAnswer(form.seatedWork) +
      ". Exposicoes operacionais: " +
      toHumanAnswer(form.machineHeightNoiseHeatChemical) +
      ". Terceirizados: " +
      toHumanAnswer(form.outsourcedWorkers) +
      ". Trabalho remoto ou hibrido: " +
      toHumanAnswer(form.remoteHybrid) +
      ".",
    risk_category: riskCategory,
    risk_type: "diagnostico_inicial_guiado",
    hazard_title: deriveHazardTitle(form),
    hazard_description: deriveHazardDescription(form),
    source_or_circumstance: deriveSourceOrCircumstance(),
    external_hazard_flag: false,
    exposed_group_description: deriveExposedGroupDescription(form),
    workers_count_estimate: parseWorkerCount(form.workerCount),
    exposure_characterization:
      "Registro inicial consolidado da empresa para orientar o detalhamento posterior por setor e atividade.",
    routine_flag: true,
    change_related_flag: false,
    possible_injuries_or_health_effects: derivePossibleEffects(form),
    existing_prevention_measures: null,
    prevention_effectiveness_notes: null,
    severity_level: severityLevel,
    probability_level: probabilityLevel,
    recommended_action_summary:
      "Seguir para o mapeamento de setores e atividades, detalhando perigos, grupos expostos e medidas de prevencao.",
    monitoring_notes: nextSignal,
    status: "draft",
  };
}

export default function Nr1DiagnosticoInicialPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [form, setForm] = useState<FormState>(initialForm);
  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [saveMeta, setSaveMeta] = useState<SaveMeta>({ itemId: null, requestId: null });

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  const completion = useMemo(() => {
    const values = Object.values(form);
    const filled = values.filter((item) => String(item).trim().length > 0).length;
    return Math.round((filled / values.length) * 100);
  }, [form]);

  const nextSignal = useMemo(() => {
    if (!form.companyName || !form.companySize || !form.workerCount) {
      return "Preencha os dados basicos da empresa para liberar uma leitura inicial confiavel.";
    }

    if (!form.sectors) {
      return "Descreva os setores para que a proxima etapa consiga mapear atividades e grupos expostos.";
    }

    return "Base inicial pronta para seguir para o mapeamento de setores e atividades.";
  }, [form]);

  const concernSignals = useMemo(() => {
    const signals: string[] = [];

    if (form.publicService === "yes") {
      signals.push("Atendimento ao publico pode aumentar pressao, desgaste e exposicao a conflito.");
    }

    if (form.goalsPressure === "yes") {
      signals.push("Metas e cobranca frequente pedem atencao para fatores psicossociais relacionados ao trabalho.");
    }

    if (form.repetitiveWork === "yes") {
      signals.push("Trabalho repetitivo pode exigir atencao ergonomica mais cedo.");
    }

    if (form.seatedWork === "yes") {
      signals.push("Trabalho sentado por longos periodos pode exigir revisao de postura, mobiliario e pausas.");
    }

    if (form.machineHeightNoiseHeatChemical === "yes") {
      signals.push("Ha indicio de exposicao a perigos operacionais que precisarao ser detalhados por setor.");
    }

    if (form.outsourcedWorkers === "yes") {
      signals.push("Terceirizados exigem atencao na articulacao de responsabilidades e medidas de prevencao.");
    }

    if (form.remoteHybrid === "yes") {
      signals.push("Trabalho remoto ou hibrido pode alterar a forma de observar organizacao do trabalho e comunicacao.");
    }

    return signals;
  }, [form]);

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
      setLoadingDraft(true);
      setError("");
      setSuccess("");
      setInfo("");

      try {
        const listResponse = await fetch("/api/nr1-assessments?status=draft&limit=1", {
          method: "GET",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
          },
          cache: "no-store",
        });

        const listPayload = await readJsonSafe(listResponse);

        if (!listResponse.ok) {
          const message =
            listPayload?.message ||
            listPayload?.error ||
            "Falha ao buscar drafts de NR1.";
          throw new Error(String(message));
        }

        const firstItem = Array.isArray(listPayload?.items) && listPayload.items.length > 0
          ? listPayload.items[0]
          : null;

        if (!firstItem?.id) {
          setActiveItemId(null);
          setSaveMeta({ itemId: null, requestId: null });
          setInfo("Nenhum draft anterior encontrado para este tenant.");
          return;
        }

        const detailResponse = await fetch("/api/nr1-assessments/" + firstItem.id, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
          },
          cache: "no-store",
        });

        const detailPayload = await readJsonSafe(detailResponse);

        if (!detailResponse.ok) {
          const message =
            detailPayload?.message ||
            detailPayload?.error ||
            "Falha ao carregar o draft existente.";
          throw new Error(String(message));
        }

        const item = (detailPayload?.item || {}) as Nr1AssessmentItem;
        const restoredForm = mapAssessmentToForm(item);

        setForm(restoredForm);
        setActiveItemId(item?.id ? String(item.id) : null);
        setSaveMeta({
          itemId: item?.id ? String(item.id) : null,
          requestId: detailPayload?.request_id ? String(detailPayload.request_id) : null,
        });
        setInfo("Ultimo draft salvo foi carregado automaticamente.");
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar o draft salvo.");
      } finally {
        setLoadingDraft(false);
      }
    })();
  }, [jwt, tenantId]);

  async function handleSaveDraft() {
    setError("");
    setSuccess("");
    setInfo("");
    setSaveMeta((old) => ({
      itemId: old.itemId,
      requestId: null,
    }));

    if (!jwt) {
      setError("Sessao indisponivel. Recarregue a pagina ou faca login novamente.");
      return;
    }

    if (!tenantId) {
      setError("Tenant nao selecionado.");
      return;
    }

    if (!form.companyName.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }

    if (!form.companySize.trim()) {
      setError("Informe o porte da empresa.");
      return;
    }

    if (!form.workerCount.trim()) {
      setError("Informe o numero aproximado de trabalhadores.");
      return;
    }

    if (!form.sectors.trim()) {
      setError("Descreva os setores ou areas da empresa.");
      return;
    }

    const payload = buildAssessmentPayload(form, nextSignal);

    setSaving(true);

    try {
      const isUpdate = Boolean(activeItemId);
      const url = isUpdate
        ? "/api/nr1-assessments/" + activeItemId
        : "/api/nr1-assessments";

      const response = await fetch(url, {
        method: isUpdate ? "PATCH" : "POST",
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
          "Falha ao salvar o diagnostico inicial.";
        throw new Error(String(message));
      }

      const itemId = responsePayload?.item?.id
        ? String(responsePayload.item.id)
        : activeItemId;

      const requestId = responsePayload?.request_id
        ? String(responsePayload.request_id)
        : null;

      setActiveItemId(itemId || null);
      setSaveMeta({
        itemId: itemId || null,
        requestId,
      });

      setSuccess(
        isUpdate
          ? "Draft atualizado no backend com sucesso."
          : "Diagnostico inicial salvo no backend como draft."
      );
    } catch (e: any) {
      setError(e?.message || "Falha ao salvar o diagnostico inicial.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      active="nr1"
      title="Diagnostico inicial da empresa"
      description="Primeiro passo da jornada. Agora esta tela salva draft real e recarrega automaticamente o ultimo registro salvo do tenant."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Transforma uma conversa inicial em um draft real do diagnostico.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            Em vez de ficar apenas no rascunho visual, esta etapa salva um registro inicial no backend para preparar o detalhamento posterior por setor, atividade e risco.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveDraft();
            }}
          >
            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                sessao e tenant
              </div>

              {loadingSession ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Carregando sessao do navegador e tenants disponiveis...
                </p>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#22313F]">
                      Tenant alvo do registro
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

                  <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] px-4 py-4 text-sm leading-7 text-[#5B6B79]">
                    <div>
                      <span className="font-semibold text-[#22313F]">Sessao:</span>{" "}
                      {jwt ? "ativa" : "indisponivel"}
                    </div>
                    <div>
                      <span className="font-semibold text-[#22313F]">Tenants:</span>{" "}
                      {tenants.length}
                    </div>
                    <div>
                      <span className="font-semibold text-[#22313F]">Draft atual:</span>{" "}
                      {activeItemId || "nenhum"}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                dados basicos
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Nome da empresa
                  </label>
                  <input
                    value={form.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: Pasini Consultoria"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Porte da empresa
                  </label>
                  <select
                    value={form.companySize}
                    onChange={(e) => updateField("companySize", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    <option value="mei">MEI</option>
                    <option value="micro">Microempresa</option>
                    <option value="small">Pequeno porte</option>
                    <option value="medium">Medio porte</option>
                    <option value="large">Grande porte</option>
                    <option value="unknown">Ainda nao sei</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Numero aproximado de trabalhadores
                  </label>
                  <input
                    value={form.workerCount}
                    onChange={(e) => updateField("workerCount", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: 12"
                  />
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                estrutura e rotina
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Quais setores ou areas existem hoje
                  </label>
                  <textarea
                    value={form.sectors}
                    onChange={(e) => updateField("sectors", e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
                    placeholder="Ex.: administrativo, atendimento, comercial, operacional, RH"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#22313F]">
                      Ha atendimento ao publico
                    </label>
                    <select
                      value={form.publicService}
                      onChange={(e) => updateField("publicService", e.target.value)}
                      className={selectClassName}
                    >
                      {yesNoOptions()}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#22313F]">
                      Ha metas ou cobranca frequente por prazo
                    </label>
                    <select
                      value={form.goalsPressure}
                      onChange={(e) => updateField("goalsPressure", e.target.value)}
                      className={selectClassName}
                    >
                      {yesNoOptions()}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#22313F]">
                      Ha trabalho repetitivo
                    </label>
                    <select
                      value={form.repetitiveWork}
                      onChange={(e) => updateField("repetitiveWork", e.target.value)}
                      className={selectClassName}
                    >
                      {yesNoOptions()}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#22313F]">
                      Ha trabalho predominantemente sentado
                    </label>
                    <select
                      value={form.seatedWork}
                      onChange={(e) => updateField("seatedWork", e.target.value)}
                      className={selectClassName}
                    >
                      {yesNoOptions()}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                exposicoes e organizacao do trabalho
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha exposicao a maquina, altura, ruido, calor ou quimico
                  </label>
                  <select
                    value={form.machineHeightNoiseHeatChemical}
                    onChange={(e) => updateField("machineHeightNoiseHeatChemical", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha terceirizados atuando na empresa
                  </label>
                  <select
                    value={form.outsourcedWorkers}
                    onChange={(e) => updateField("outsourcedWorkers", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha trabalho remoto ou hibrido
                  </label>
                  <select
                    value={form.remoteHybrid}
                    onChange={(e) => updateField("remoteHybrid", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                proximo passo da jornada
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loadingSession || loadingDraft || saving || !tenantId || !jwt}
                  className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : activeItemId ? "Atualizar draft no backend" : "Salvar draft no backend"}
                </button>

                <Link
                  href="/dashboard/nr1/mapeamento-setores"
                  className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
                >
                  Seguir para mapear setores
                </Link>
              </div>
            </section>
          </form>

          <div className="space-y-4">
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
                <div className="mt-4 space-y-2 text-sm leading-7 text-[#42634A]">
                  <div>
                    <span className="font-semibold text-[#22313F]">item_id:</span>{" "}
                    {saveMeta.itemId || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-[#22313F]">request_id:</span>{" "}
                    {saveMeta.requestId || "-"}
                  </div>
                </div>
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

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                progresso desta etapa
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[#5B6B79]">Preenchimento atual</span>
                  <span className="font-semibold text-[#22313F]">{completion}%</span>
                </div>

                <div className="h-3 rounded-full bg-[#E9EEF3]">
                  <div
                    className="h-3 rounded-full bg-[#5E7A96]"
                    style={{ width: completion + "%" }}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm leading-7 text-[#5B6B79]">
                <p>{nextSignal}</p>
                <p>
                  {loadingDraft
                    ? "Verificando se existe draft salvo para este tenant..."
                    : activeItemId
                    ? "Draft carregado. Se voce salvar de novo, o sistema atualiza esse mesmo registro."
                    : "Nenhum draft salvo carregado ainda."}
                </p>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                leitura inicial
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5B6B79]">
                <div>
                  <span className="font-semibold text-[#22313F]">Empresa:</span>{" "}
                  {form.companyName || "nao informado"}
                </div>
                <div>
                  <span className="font-semibold text-[#22313F]">Porte:</span>{" "}
                  {form.companySize || "nao informado"}
                </div>
                <div>
                  <span className="font-semibold text-[#22313F]">Trabalhadores:</span>{" "}
                  {form.workerCount || "nao informado"}
                </div>
                <div>
                  <span className="font-semibold text-[#22313F]">Setores:</span>{" "}
                  {form.sectors ? "informados" : "ainda nao informados"}
                </div>
                <div>
                  <span className="font-semibold text-[#22313F]">Categoria inicial sugerida:</span>{" "}
                  {deriveRiskCategory(form)}
                </div>
                <div>
                  <span className="font-semibold text-[#22313F]">Severidade inicial:</span>{" "}
                  {deriveSeverityLevel(form)}
                </div>
                <div>
                  <span className="font-semibold text-[#22313F]">Probabilidade inicial:</span>{" "}
                  {deriveProbabilityLevel(form)}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                sinais para observar
              </div>

              {concernSignals.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Conforme voce responder, o sistema destaca pontos que podem merecer atencao mais cedo.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {concernSignals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-2xl border border-[#D9E0E7] bg-white px-4 py-4 text-sm leading-7 text-[#5B6B79]"
                    >
                      {signal}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}







