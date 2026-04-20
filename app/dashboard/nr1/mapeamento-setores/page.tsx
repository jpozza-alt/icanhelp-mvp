"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

type DepartmentItem = {
  id: string;
  tenant_id?: string;
  establishment_id?: string;
  name: string;
  description?: string | null;
  employee_count?: number | null;
  shift_pattern?: string | null;
  has_direct_leadership?: boolean | null;
  has_public_contact?: boolean | null;
  has_deadline_pressure?: boolean | null;
  has_repetitive_work?: boolean | null;
  has_prolonged_sitting?: boolean | null;
  has_relevant_physical_effort?: boolean | null;
  has_frequent_displacement?: boolean | null;
  notes?: string | null;
  status?: string | null;
};

type SectorFormState = {
  sectorName: string;
  mainActivity: string;
  workerCount: string;
  routineShift: string;
  publicService: string;
  goalsPressure: string;
  repetitiveWork: string;
  seatedWork: string;
  physicalEffort: string;
  machineNoiseHeatChemical: string;
};

const initialForm: SectorFormState = {
  sectorName: "",
  mainActivity: "",
  workerCount: "",
  routineShift: "",
  publicService: "",
  goalsPressure: "",
  repetitiveWork: "",
  seatedWork: "",
  physicalEffort: "",
  machineNoiseHeatChemical: "",
};

const inputClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]";
const selectClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";
const sectionClassName = "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm";

function yesNoOptions() {
  return (
    <>
      <option value="">Selecione</option>
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
      tenant_id: item?.tenant_id ? String(item.tenant_id) : undefined,
      establishment_id: item?.establishment_id ? String(item.establishment_id) : undefined,
      name: String(item?.name ?? "Setor").trim(),
      description: item?.description ? String(item.description) : null,
      employee_count:
        typeof item?.employee_count === "number" && Number.isFinite(item.employee_count)
          ? item.employee_count
          : null,
      shift_pattern: item?.shift_pattern ? String(item.shift_pattern) : null,
      has_direct_leadership:
        typeof item?.has_direct_leadership === "boolean" ? item.has_direct_leadership : null,
      has_public_contact:
        typeof item?.has_public_contact === "boolean" ? item.has_public_contact : null,
      has_deadline_pressure:
        typeof item?.has_deadline_pressure === "boolean" ? item.has_deadline_pressure : null,
      has_repetitive_work:
        typeof item?.has_repetitive_work === "boolean" ? item.has_repetitive_work : null,
      has_prolonged_sitting:
        typeof item?.has_prolonged_sitting === "boolean" ? item.has_prolonged_sitting : null,
      has_relevant_physical_effort:
        typeof item?.has_relevant_physical_effort === "boolean"
          ? item.has_relevant_physical_effort
          : null,
      has_frequent_displacement:
        typeof item?.has_frequent_displacement === "boolean"
          ? item.has_frequent_displacement
          : null,
      notes: item?.notes ? String(item.notes) : null,
      status: item?.status ? String(item.status) : null,
    }))
    .filter((item: DepartmentItem) => item.id);
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

function parseNullableInteger(value: string): number | null {
  const digits = String(value || "").replace(/\D/g, "").trim();
  if (!digits) return null;

  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

function toNullableBoolean(value: string): boolean | null {
  switch (value) {
    case "yes":
      return true;
    case "no":
      return false;
    default:
      return null;
  }
}

function buildDepartmentPayload(form: SectorFormState, establishmentId: string) {
  const machineNotes = form.machineNoiseHeatChemical
    ? "maquina_ruido_calor_quimico=" + form.machineNoiseHeatChemical
    : "";

  return {
    establishment_id: establishmentId,
    name: form.sectorName.trim(),
    description: form.mainActivity.trim() || null,
    employee_count: parseNullableInteger(form.workerCount),
    shift_pattern: form.routineShift.trim() || null,
    has_direct_leadership: null,
    has_public_contact: toNullableBoolean(form.publicService),
    has_deadline_pressure: toNullableBoolean(form.goalsPressure),
    has_repetitive_work: toNullableBoolean(form.repetitiveWork),
    has_prolonged_sitting: toNullableBoolean(form.seatedWork),
    has_relevant_physical_effort: toNullableBoolean(form.physicalEffort),
    has_frequent_displacement: null,
    notes: machineNotes || null,
    status: "draft",
  };
}

function buildEarlySignals(items: DepartmentItem[]) {
  const signals: string[] = [];

  for (const item of items) {
    if (item.has_public_contact === true) {
      signals.push(item.name + ": atendimento ao publico pode elevar pressao e desgaste.");
    }

    if (item.has_deadline_pressure === true) {
      signals.push(item.name + ": metas e cobranca frequente pedem atencao para fatores psicossociais.");
    }

    if (item.has_repetitive_work === true) {
      signals.push(item.name + ": trabalho repetitivo sugere revisao ergonomica.");
    }

    if (item.has_prolonged_sitting === true) {
      signals.push(item.name + ": trabalho sentado prolongado pede observacao de postura e pausas.");
    }

    if (item.has_relevant_physical_effort === true) {
      signals.push(item.name + ": esforco fisico pode exigir detalhamento de movimentacao e sobrecarga.");
    }

    if ((item.notes || "").toLowerCase().includes("maquina_ruido_calor_quimico=yes")) {
      signals.push(item.name + ": ha indicio de perigos operacionais para detalhar no proximo passo.");
    }
  }

  return signals;
}

export default function Nr1MapeamentoSetoresPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [form, setForm] = useState<SectorFormState>(initialForm);
  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentItem[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [items, setItems] = useState<DepartmentItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");

  function updateField<K extends keyof SectorFormState>(field: K, value: SectorFormState[K]) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
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
    if (!jwt || !tenantId || !selectedEstablishmentId) {
      setItems([]);
      return;
    }

    (async () => {
      setLoadingDepartments(true);
      setError("");
      setSuccess("");

      try {
        const response = await fetch(
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

        const payload = await readJsonSafe(response);

        if (!response.ok) {
          const message =
            payload?.message ||
            payload?.error ||
            "Falha ao carregar setores.";
          throw new Error(String(message));
        }

        const parsedDepartments = parseDepartments(payload);
        setItems(parsedDepartments);

        if (parsedDepartments.length === 0) {
          setInfo("Estabelecimento carregado, mas ainda sem setores cadastrados.");
        } else {
          setInfo("Setores reais carregados do backend para o estabelecimento selecionado.");
        }
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar setores.");
      } finally {
        setLoadingDepartments(false);
      }
    })();
  }, [jwt, tenantId, selectedEstablishmentId]);

  async function handleAddSector() {
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

    if (!selectedEstablishmentId) {
      setError("Selecione um estabelecimento.");
      return;
    }

    if (!form.sectorName.trim()) {
      setError("Informe o nome do setor.");
      return;
    }

    if (!form.mainActivity.trim()) {
      setError("Informe a atividade principal do setor.");
      return;
    }

    const payload = buildDepartmentPayload(form, selectedEstablishmentId);

    setSaving(true);

    try {
      const response = await fetch("/api/nr1/departments", {
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
          "Falha ao salvar setor.";
        throw new Error(String(message));
      }

      const createdItem = responsePayload?.item
        ? parseDepartments({ items: [responsePayload.item] })[0]
        : null;

      if (createdItem) {
        setItems((old) => [...old, createdItem]);
      }

      setSuccess("Setor salvo no backend com sucesso.");
      resetForm();
    } catch (e: any) {
      setError(e?.message || "Falha ao salvar setor.");
    } finally {
      setSaving(false);
    }
  }

  const readyForNextStep = useMemo(() => items.length > 0, [items.length]);

  const summaryText = useMemo(() => {
    if (!selectedEstablishmentId) {
      return "Selecione um estabelecimento para abrir o mapeamento real de setores.";
    }

    if (items.length === 0) {
      return "Cadastre pelo menos um setor real para preparar a etapa de identificacao de riscos e prioridades.";
    }

    return "Base real de setores pronta. A proxima etapa ja pode ler atividades, grupos expostos e sinais prioritarios.";
  }, [items.length, selectedEstablishmentId]);

  const earlySignals = useMemo(() => buildEarlySignals(items), [items]);

  return (
    <AppShell
      active="nr1"
      title="Mapeamento de setores e atividades"
      description="Segunda etapa da jornada. Agora esta tela usa estabelecimentos e setores reais do backend."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Transforma a empresa em setores reais por estabelecimento.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            O objetivo aqui nao e discutir norma. E estruturar setores, rotina e sinais iniciais de exposicao para que o sistema consiga enxergar onde o trabalho acontece.
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
                sessao, tenant e estabelecimento
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
                cadastrar setor
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Nome do setor
                  </label>
                  <input
                    value={form.sectorName}
                    onChange={(e) => updateField("sectorName", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: atendimento"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Quantidade aproximada de pessoas
                  </label>
                  <input
                    value={form.workerCount}
                    onChange={(e) => updateField("workerCount", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: 6"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Atividade principal do setor
                  </label>
                  <input
                    value={form.mainActivity}
                    onChange={(e) => updateField("mainActivity", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: atendimento a clientes e organizacao de demandas"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Turno ou rotina predominante
                  </label>
                  <input
                    value={form.routineShift}
                    onChange={(e) => updateField("routineShift", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: horario comercial, revezamento, rotina externa"
                  />
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                sinais do trabalho nesse setor
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                    Ha pressao por metas ou prazo
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

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha esforco fisico relevante
                  </label>
                  <select
                    value={form.physicalEffort}
                    onChange={(e) => updateField("physicalEffort", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha maquina, ruido, calor ou quimico
                  </label>
                  <select
                    value={form.machineNoiseHeatChemical}
                    onChange={(e) => updateField("machineNoiseHeatChemical", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleAddSector()}
                  disabled={saving || !selectedEstablishmentId}
                  className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Adicionar setor"}
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
                setores carregados do backend
              </div>

              {loadingDepartments ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Carregando setores reais do estabelecimento selecionado...
                </p>
              ) : items.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Nenhum setor cadastrado ainda para este estabelecimento.
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
                          setor {index + 1}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                          {item.name}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                          {item.description || "Sem descricao registrada."}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-[#E6ECF1] bg-white px-4 py-3 text-sm text-[#5B6B79]">
                          <span className="font-semibold text-[#22313F]">Pessoas:</span>{" "}
                          {item.employee_count ?? "nao informado"}
                        </div>
                        <div className="rounded-xl border border-[#E6ECF1] bg-white px-4 py-3 text-sm text-[#5B6B79]">
                          <span className="font-semibold text-[#22313F]">Rotina:</span>{" "}
                          {item.shift_pattern || "nao informado"}
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
                progresso desta etapa
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[#5B6B79]">Setores estruturados</span>
                  <span className="font-semibold text-[#22313F]">{items.length}</span>
                </div>

                <div className="h-3 rounded-full bg-[#E9EEF3]">
                  <div
                    className="h-3 rounded-full bg-[#5E7A96]"
                    style={{ width: (items.length === 0 ? 8 : Math.min(100, items.length * 25)) + "%" }}
                  />
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                {summaryText}
              </p>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                o que isso prepara
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5B6B79]">
                <div>- grupos expostos por setor</div>
                <div>- atividades que exigem observacao</div>
                <div>- sinais iniciais para risco ergonomico, psicossocial e operacional</div>
                <div>- base para a classificacao de prioridades</div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                sinais iniciais por setor
              </div>

              {earlySignals.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Conforme os setores reais forem cadastrados, o sistema destaca pontos que podem merecer atencao mais cedo.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {earlySignals.map((signal) => (
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

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                proximo passo
              </div>

              <div className="mt-4 rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                <div className="text-sm font-semibold text-[#22313F]">
                  Identificacao de riscos e prioridades
                </div>
                <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                  Depois de estruturar os setores reais, a jornada consegue abrir a tela que transforma atividade e exposicao em risco, prioridade e necessidade de acao.
                </p>
              </div>

              <Link
                href="/dashboard/nr1/riscos-prioridades"
                className={
                  readyForNextStep
                    ? "mt-4 inline-block rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
                    : "mt-4 inline-block rounded-xl bg-[#C8D5E2] px-5 py-3 text-sm font-semibold text-white"
                }
              >
                Ir para riscos e prioridades
              </Link>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}


