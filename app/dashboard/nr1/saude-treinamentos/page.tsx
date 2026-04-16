"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const sectionClassName = "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm";
const inputClassName =
  "mt-2 w-full rounded-2xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#9AB0C3]";
const textAreaClassName =
  "mt-2 min-h-[110px] w-full rounded-2xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#9AB0C3]";

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

type OccupationalHealthRefItem = {
  id: string;
  has_pcmso: boolean | null;
  pcmso_valid_until: string | null;
  technical_responsible: string | null;
  accident_disease_indicators: string | null;
  work_related_leave_indicators: string | null;
  notes: string | null;
  updated_at: string | null;
};

type TrainingRecordItem = {
  id: string;
  training_name: string;
  target_audience: string | null;
  status: string | null;
  periodicity: string | null;
  last_date: string | null;
  next_due_date: string | null;
  responsible_name: string | null;
  notes: string | null;
  updated_at: string | null;
};

type HealthFormState = {
  has_pcmso: string;
  pcmso_valid_until: string;
  technical_responsible: string;
  accident_disease_indicators: string;
  work_related_leave_indicators: string;
  notes: string;
};

type TrainingFormState = {
  training_name: string;
  target_audience: string;
  status: string;
  periodicity: string;
  last_date: string;
  next_due_date: string;
  responsible_name: string;
  notes: string;
};

const initialHealthForm: HealthFormState = {
  has_pcmso: "",
  pcmso_valid_until: "",
  technical_responsible: "",
  accident_disease_indicators: "",
  work_related_leave_indicators: "",
  notes: "",
};

const initialTrainingForm: TrainingFormState = {
  training_name: "",
  target_audience: "",
  status: "due_soon",
  periodicity: "annual",
  last_date: "",
  next_due_date: "",
  responsible_name: "",
  notes: "",
};

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function toNullableText(value: string) {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTenants(payload: any): TenantOption[] {
  const raw = Array.isArray(payload?.tenants)
    ? payload.tenants
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      name: String(item?.name ?? item?.slug ?? item?.id ?? "").trim(),
      slug: item?.slug ? String(item.slug) : null,
    }))
    .filter((item: TenantOption) => item.id);
}

function parseEstablishments(payload: any): EstablishmentItem[] {
  const raw = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      name: String(item?.name ?? "").trim(),
      city: item?.city ? String(item.city) : null,
      state: item?.state ? String(item.state) : null,
      status: item?.status ? String(item.status) : null,
    }))
    .filter((item: EstablishmentItem) => item.id);
}

function parseOccupationalHealthLatest(payload: any): OccupationalHealthRefItem | null {
  const source =
    payload?.latest
      ? payload.latest
      : Array.isArray(payload?.items) && payload.items.length > 0
      ? payload.items[0]
      : null;

  if (!source?.id) {
    return null;
  }

  return {
    id: String(source.id),
    has_pcmso: typeof source?.has_pcmso === "boolean" ? source.has_pcmso : null,
    pcmso_valid_until: source?.pcmso_valid_until ? String(source.pcmso_valid_until) : null,
    technical_responsible: source?.technical_responsible ? String(source.technical_responsible) : null,
    accident_disease_indicators: source?.accident_disease_indicators
      ? String(source.accident_disease_indicators)
      : null,
    work_related_leave_indicators: source?.work_related_leave_indicators
      ? String(source.work_related_leave_indicators)
      : null,
    notes: source?.notes ? String(source.notes) : null,
    updated_at: source?.updated_at ? String(source.updated_at) : null,
  };
}

function parseTrainingItems(payload: any): TrainingRecordItem[] {
  const raw = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      training_name: String(item?.training_name ?? "").trim(),
      target_audience: item?.target_audience ? String(item.target_audience) : null,
      status: item?.status ? String(item.status) : null,
      periodicity: item?.periodicity ? String(item.periodicity) : null,
      last_date: item?.last_date ? String(item.last_date) : null,
      next_due_date: item?.next_due_date ? String(item.next_due_date) : null,
      responsible_name: item?.responsible_name ? String(item.responsible_name) : null,
      notes: item?.notes ? String(item.notes) : null,
      updated_at: item?.updated_at ? String(item.updated_at) : null,
    }))
    .filter((item: TrainingRecordItem) => item.id);
}

function getTrainingStatusLabel(value: string | null | undefined) {
  switch (String(value || "").trim().toLowerCase()) {
    case "up_to_date":
      return "em dia";
    case "due_soon":
      return "vence em breve";
    case "overdue":
      return "vencido";
    default:
      return "nao informado";
  }
}

function getTrainingStatusClass(value: string | null | undefined) {
  switch (String(value || "").trim().toLowerCase()) {
    case "up_to_date":
      return "border-[#D6E7D9] bg-[#F2F8F3] text-[#446B4D]";
    case "due_soon":
      return "border-[#E8D9BE] bg-[#FBF6EB] text-[#8A6732]";
    case "overdue":
      return "border-[#E3C7CB] bg-[#F9F1F2] text-[#8A4F58]";
    default:
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Nao informado";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Nao informado";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR");
}

export default function Nr1SaudeTreinamentosPage() {
  const router = useRouter();

  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentItem[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [healthRef, setHealthRef] = useState<OccupationalHealthRefItem | null>(null);
  const [trainingItems, setTrainingItems] = useState<TrainingRecordItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [savingTraining, setSavingTraining] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [healthSaveMessage, setHealthSaveMessage] = useState("");
  const [trainingSaveMessage, setTrainingSaveMessage] = useState("");
  const [healthForm, setHealthForm] = useState<HealthFormState>(initialHealthForm);
  const [trainingForm, setTrainingForm] = useState<TrainingFormState>(initialTrainingForm);

  const selectedEstablishment = useMemo(() => {
    return establishments.find((item) => item.id === selectedEstablishmentId) || null;
  }, [establishments, selectedEstablishmentId]);

  const overdueCount = useMemo(() => {
    return trainingItems.filter((item) => String(item.status || "").trim().toLowerCase() === "overdue").length;
  }, [trainingItems]);

  const dueSoonCount = useMemo(() => {
    return trainingItems.filter((item) => String(item.status || "").trim().toLowerCase() === "due_soon").length;
  }, [trainingItems]);

  async function refreshData(currentJwt: string, currentTenantId: string, currentEstablishmentId: string) {
    setLoadingData(true);
    setError("");
    setInfo("");

    try {
      const healthUrl =
        "/api/nr1/occupational-health-refs?establishmentId=" + encodeURIComponent(currentEstablishmentId);

      const trainingUrl =
        "/api/nr1/training-records?establishmentId=" + encodeURIComponent(currentEstablishmentId);

      const [healthResponse, trainingResponse] = await Promise.all([
        fetch(healthUrl, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + currentJwt,
            "x-icanhelp-tenant": currentTenantId,
          },
          cache: "no-store",
        }),
        fetch(trainingUrl, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + currentJwt,
            "x-icanhelp-tenant": currentTenantId,
          },
          cache: "no-store",
        }),
      ]);

      const [healthPayload, trainingPayload] = await Promise.all([
        readJsonSafe(healthResponse),
        readJsonSafe(trainingResponse),
      ]);

      if (!healthResponse.ok) {
        const message =
          healthPayload?.message ||
          healthPayload?.error ||
          "Falha ao carregar referencias de saude ocupacional.";
        throw new Error(String(message));
      }

      if (!trainingResponse.ok) {
        const message =
          trainingPayload?.message ||
          trainingPayload?.error ||
          "Falha ao carregar treinamentos.";
        throw new Error(String(message));
      }

      const parsedHealth = parseOccupationalHealthLatest(healthPayload);
      const parsedTraining = parseTrainingItems(trainingPayload);

      setHealthRef(parsedHealth);
      setTrainingItems(parsedTraining);

      if (!parsedHealth && parsedTraining.length === 0) {
        setInfo("Nenhum registro de saude ocupacional ou treinamento encontrado para este estabelecimento.");
      } else {
        setInfo("Tela ligada aos backends reais de saude ocupacional e treinamentos por estabelecimento.");
      }
    } catch (e: any) {
      setHealthRef(null);
      setTrainingItems([]);
      setError(e?.message || "Falha ao carregar saude e treinamentos.");
    } finally {
      setLoadingData(false);
    }
  }

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
      setInfo("");
      setEstablishments([]);
      setSelectedEstablishmentId("");
      setHealthRef(null);
      setTrainingItems([]);
      setHealthSaveMessage("");
      setTrainingSaveMessage("");

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
    if (!jwt || !tenantId || !selectedEstablishmentId) {
      setHealthRef(null);
      setTrainingItems([]);
      return;
    }

    void refreshData(jwt, tenantId, selectedEstablishmentId);
  }, [jwt, tenantId, selectedEstablishmentId]);

  async function handleSaveHealth() {
    setError("");
    setInfo("");
    setHealthSaveMessage("");
    setTrainingSaveMessage("");

    if (!jwt || !tenantId) {
      setError("Sessao ou tenant indisponivel.");
      return;
    }

    if (!selectedEstablishmentId) {
      setError("Estabelecimento nao selecionado.");
      return;
    }

    setSavingHealth(true);

    try {
      const payload = {
        establishment_id: selectedEstablishmentId,
        has_pcmso:
          healthForm.has_pcmso === ""
            ? null
            : healthForm.has_pcmso === "true",
        pcmso_valid_until: toNullableText(healthForm.pcmso_valid_until),
        technical_responsible: toNullableText(healthForm.technical_responsible),
        accident_disease_indicators: toNullableText(healthForm.accident_disease_indicators),
        work_related_leave_indicators: toNullableText(healthForm.work_related_leave_indicators),
        notes: toNullableText(healthForm.notes),
      };

      const response = await fetch(
        "/api/nr1/occupational-health-refs?tenantId=" + encodeURIComponent(tenantId),
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responsePayload = await readJsonSafe(response);

      if (!response.ok) {
        const message =
          responsePayload?.message ||
          responsePayload?.error ||
          "Falha ao salvar saude ocupacional.";
        throw new Error(String(message));
      }

      setHealthSaveMessage("Referencia de saude ocupacional salva com sucesso.");
      await refreshData(jwt, tenantId, selectedEstablishmentId);
    } catch (e: any) {
      setError(e?.message || "Falha ao salvar saude ocupacional.");
    } finally {
      setSavingHealth(false);
    }
  }

  async function handleSaveTraining() {
    setError("");
    setInfo("");
    setHealthSaveMessage("");
    setTrainingSaveMessage("");

    if (!jwt || !tenantId) {
      setError("Sessao ou tenant indisponivel.");
      return;
    }

    if (!selectedEstablishmentId) {
      setError("Estabelecimento nao selecionado.");
      return;
    }

    if (!trainingForm.training_name.trim()) {
      setError("Informe o nome do treinamento.");
      return;
    }

    setSavingTraining(true);

    try {
      const payload = {
        establishment_id: selectedEstablishmentId,
        training_name: trainingForm.training_name.trim(),
        target_audience: toNullableText(trainingForm.target_audience),
        status: toNullableText(trainingForm.status),
        periodicity: toNullableText(trainingForm.periodicity),
        last_date: toNullableText(trainingForm.last_date),
        next_due_date: toNullableText(trainingForm.next_due_date),
        responsible_name: toNullableText(trainingForm.responsible_name),
        certificate_file_url: null,
        notes: toNullableText(trainingForm.notes),
      };

      const response = await fetch(
        "/api/nr1/training-records?tenantId=" + encodeURIComponent(tenantId),
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responsePayload = await readJsonSafe(response);

      if (!response.ok) {
        const message =
          responsePayload?.message ||
          responsePayload?.error ||
          "Falha ao salvar treinamento.";
        throw new Error(String(message));
      }

      setTrainingSaveMessage("Treinamento salvo com sucesso.");
      setTrainingForm(initialTrainingForm);
      await refreshData(jwt, tenantId, selectedEstablishmentId);
    } catch (e: any) {
      setError(e?.message || "Falha ao salvar treinamento.");
    } finally {
      setSavingTraining(false);
    }
  }

  return (
    <AppShell
      active="nr1"
      title="Saude e treinamentos"
      description="Etapa do modulo NR-1 que consolida referencias de saude ocupacional e registros de treinamento por estabelecimento."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Consolida referencias de saude ocupacional e historico de treinamentos por estabelecimento.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            A tela agora usa os endpoints reais de occupational-health-refs e training-records, sempre no contexto do tenant
            e do estabelecimento selecionado.
          </p>
        </section>

        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            sessao, tenant e estabelecimento
          </div>

          {loadingSession ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Carregando sessao do navegador e tenants disponiveis...
            </p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-[#22313F]">Tenant ativo</label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className={inputClassName}
                  disabled={loadingSession || tenants.length === 0}
                >
                  {tenants.length === 0 ? (
                    <option value="">Nenhum tenant</option>
                  ) : (
                    tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Estabelecimento alvo</label>
                <select
                  value={selectedEstablishmentId}
                  onChange={(e) => setSelectedEstablishmentId(e.target.value)}
                  className={inputClassName}
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

              <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-4 text-sm leading-7 text-[#5B6B79]">
                <div>
                  <span className="font-semibold text-[#22313F]">Sessao:</span> {jwt ? "ativa" : "indisponivel"}
                </div>
                <div>
                  <span className="font-semibold text-[#22313F]">Tenants:</span> {tenants.length}
                </div>
                <div>
                  <span className="font-semibold text-[#22313F]">Estabelecimentos:</span> {establishments.length}
                </div>
              </div>
            </div>
          )}

          {selectedEstablishment ? (
            <div className="mt-4 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
              <div>
                <span className="font-semibold text-[#22313F]">Estabelecimento:</span> {selectedEstablishment.name}
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

          {error ? (
            <div className="mt-4 rounded-2xl border border-[#E3C7CB] bg-[#F9F1F2] px-4 py-3 text-sm text-[#8A4F58]">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="mt-4 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm text-[#5B6B79]">
              {info}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className={sectionClassName}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                  saude ocupacional
                </div>
                <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
                  Referencia mais recente do estabelecimento
                </h3>
              </div>

              <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-3 py-2 text-xs text-[#5B6B79]">
                /api/nr1/occupational-health-refs
              </div>
            </div>

            {loadingData ? (
              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                Buscando referencia de saude ocupacional...
              </p>
            ) : !healthRef ? (
              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                Nenhum registro de saude ocupacional encontrado para o estabelecimento selecionado.
              </p>
            ) : (
              <div className="mt-4 space-y-4 text-sm leading-7 text-[#5B6B79]">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">PCMSO</div>
                    <div className="mt-2 text-base font-semibold text-[#22313F]">
                      {healthRef.has_pcmso === true ? "Sim" : healthRef.has_pcmso === false ? "Nao" : "Nao informado"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">Validade do PCMSO</div>
                    <div className="mt-2 text-base font-semibold text-[#22313F]">
                      {formatDate(healthRef.pcmso_valid_until)}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">Responsavel tecnico</div>
                  <div className="mt-2 text-[#22313F]">{healthRef.technical_responsible || "Nao informado"}</div>
                </div>

                <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                    Indicadores de acidentes e doencas
                  </div>
                  <div className="mt-2 text-[#22313F]">
                    {healthRef.accident_disease_indicators || "Nao informado"}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                    Indicadores de afastamento relacionado ao trabalho
                  </div>
                  <div className="mt-2 text-[#22313F]">
                    {healthRef.work_related_leave_indicators || "Nao informado"}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">Observacoes</div>
                  <div className="mt-2 text-[#22313F]">{healthRef.notes || "Nao informado"}</div>
                </div>

                <div className="text-xs text-[#5B6B79]">
                  Ultima atualizacao: {formatDateTime(healthRef.updated_at)}
                </div>
              </div>
            )}
          </section>

          <section className={sectionClassName}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                  treinamentos
                </div>
                <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
                  Lista real de treinamentos por estabelecimento
                </h3>
              </div>

              <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-3 py-2 text-xs text-[#5B6B79]">
                /api/nr1/training-records
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">Total</div>
                <div className="mt-2 text-2xl font-semibold text-[#22313F]">{trainingItems.length}</div>
              </div>
              <div className="rounded-2xl border border-[#E8D9BE] bg-[#FBF6EB] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8A6732]">Vence em breve</div>
                <div className="mt-2 text-2xl font-semibold text-[#8A6732]">{dueSoonCount}</div>
              </div>
              <div className="rounded-2xl border border-[#E3C7CB] bg-[#F9F1F2] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8A4F58]">Vencidos</div>
                <div className="mt-2 text-2xl font-semibold text-[#8A4F58]">{overdueCount}</div>
              </div>
            </div>

            {loadingData ? (
              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                Buscando registros em /api/nr1/training-records...
              </p>
            ) : trainingItems.length === 0 ? (
              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                Nenhum treinamento encontrado para o estabelecimento selecionado.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {trainingItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-[#22313F]">{item.training_name}</h4>
                        <div className="text-xs text-[#5B6B79]">Atualizado em {formatDateTime(item.updated_at)}</div>
                      </div>

                      <span
                        className={
                          "rounded-full border px-3 py-1 text-xs font-semibold " + getTrainingStatusClass(item.status)
                        }
                      >
                        {getTrainingStatusLabel(item.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <span className="font-semibold text-[#22313F]">Publico-alvo:</span>{" "}
                        {item.target_audience || "Nao informado"}
                      </div>
                      <div>
                        <span className="font-semibold text-[#22313F]">Periodicidade:</span>{" "}
                        {item.periodicity || "Nao informado"}
                      </div>
                      <div>
                        <span className="font-semibold text-[#22313F]">Ultima data:</span>{" "}
                        {formatDate(item.last_date)}
                      </div>
                      <div>
                        <span className="font-semibold text-[#22313F]">Proximo vencimento:</span>{" "}
                        {formatDate(item.next_due_date)}
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold text-[#22313F]">Responsavel:</span>{" "}
                        {item.responsible_name || "Nao informado"}
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold text-[#22313F]">Observacoes:</span>{" "}
                        {item.notes || "Nao informado"}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className={sectionClassName}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              gravacao controlada
            </div>
            <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
              Novo registro de saude ocupacional
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#5B6B79]">
              Salva uma nova referencia para o estabelecimento selecionado. Isso cria um novo snapshot e a leitura acima passa
              a mostrar o registro mais recente.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-[#22313F]">PCMSO</label>
                <select
                  value={healthForm.has_pcmso}
                  onChange={(e) => setHealthForm((old) => ({ ...old, has_pcmso: e.target.value }))}
                  className={inputClassName}
                >
                  <option value="">Nao informar</option>
                  <option value="true">Sim</option>
                  <option value="false">Nao</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Validade do PCMSO</label>
                <input
                  type="date"
                  value={healthForm.pcmso_valid_until}
                  onChange={(e) => setHealthForm((old) => ({ ...old, pcmso_valid_until: e.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#22313F]">Responsavel tecnico</label>
                <input
                  type="text"
                  value={healthForm.technical_responsible}
                  onChange={(e) => setHealthForm((old) => ({ ...old, technical_responsible: e.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#22313F]">Indicadores de acidentes e doencas</label>
                <textarea
                  value={healthForm.accident_disease_indicators}
                  onChange={(e) => setHealthForm((old) => ({ ...old, accident_disease_indicators: e.target.value }))}
                  className={textAreaClassName}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#22313F]">Indicadores de afastamento relacionado ao trabalho</label>
                <textarea
                  value={healthForm.work_related_leave_indicators}
                  onChange={(e) => setHealthForm((old) => ({ ...old, work_related_leave_indicators: e.target.value }))}
                  className={textAreaClassName}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#22313F]">Observacoes</label>
                <textarea
                  value={healthForm.notes}
                  onChange={(e) => setHealthForm((old) => ({ ...old, notes: e.target.value }))}
                  className={textAreaClassName}
                />
              </div>
            </div>

            {healthSaveMessage ? (
              <div className="mt-4 rounded-2xl border border-[#D6E7D9] bg-[#F2F8F3] px-4 py-3 text-sm text-[#446B4D]">
                {healthSaveMessage}
              </div>
            ) : null}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => void handleSaveHealth()}
                disabled={savingHealth || !jwt || !tenantId || !selectedEstablishmentId}
                className="rounded-2xl bg-[#22313F] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingHealth ? "Salvando..." : "Salvar saude ocupacional"}
              </button>
            </div>
          </section>

          <section className={sectionClassName}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              gravacao controlada
            </div>
            <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
              Novo treinamento
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#5B6B79]">
              Salva um novo treinamento para o estabelecimento selecionado usando o contrato real de training-records.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#22313F]">Nome do treinamento</label>
                <input
                  type="text"
                  value={trainingForm.training_name}
                  onChange={(e) => setTrainingForm((old) => ({ ...old, training_name: e.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Publico-alvo</label>
                <input
                  type="text"
                  value={trainingForm.target_audience}
                  onChange={(e) => setTrainingForm((old) => ({ ...old, target_audience: e.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Responsavel</label>
                <input
                  type="text"
                  value={trainingForm.responsible_name}
                  onChange={(e) => setTrainingForm((old) => ({ ...old, responsible_name: e.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Status</label>
                <select
                  value={trainingForm.status}
                  onChange={(e) => setTrainingForm((old) => ({ ...old, status: e.target.value }))}
                  className={inputClassName}
                >
                  <option value="up_to_date">up_to_date</option>
                  <option value="due_soon">due_soon</option>
                  <option value="overdue">overdue</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Periodicidade</label>
                <input
                  type="text"
                  value={trainingForm.periodicity}
                  onChange={(e) => setTrainingForm((old) => ({ ...old, periodicity: e.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Ultima data</label>
                <input
                  type="date"
                  value={trainingForm.last_date}
                  onChange={(e) => setTrainingForm((old) => ({ ...old, last_date: e.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#22313F]">Proximo vencimento</label>
                <input
                  type="date"
                  value={trainingForm.next_due_date}
                  onChange={(e) => setTrainingForm((old) => ({ ...old, next_due_date: e.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#22313F]">Observacoes</label>
                <textarea
                  value={trainingForm.notes}
                  onChange={(e) => setTrainingForm((old) => ({ ...old, notes: e.target.value }))}
                  className={textAreaClassName}
                />
              </div>
            </div>

            {trainingSaveMessage ? (
              <div className="mt-4 rounded-2xl border border-[#D6E7D9] bg-[#F2F8F3] px-4 py-3 text-sm text-[#446B4D]">
                {trainingSaveMessage}
              </div>
            ) : null}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => void handleSaveTraining()}
                disabled={savingTraining || !jwt || !tenantId || !selectedEstablishmentId}
                className="rounded-2xl bg-[#22313F] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingTraining ? "Salvando..." : "Salvar treinamento"}
              </button>
            </div>
          </section>
        </section>
      </div>
    </AppShell>
  );
}
