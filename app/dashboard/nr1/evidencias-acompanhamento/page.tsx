"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  city?: string | null;
  state?: string | null;
  employee_count?: number | null;
  status?: string | null;
};

type EvidenceItem = {
  id: string;
  tenant_id?: string | null;
  establishment_id?: string | null;
  title?: string | null;
  evidence_type?: string | null;
  description?: string | null;
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
  reference_date?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  validation_status?: string | null;
  responsible_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

const sectionClassName =
  "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-[0_18px_50px_rgba(34,49,63,0.08)]";
const inputClassName =
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

function parseEvidenceItems(payload: any): EvidenceItem[] {
  const raw = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? "").trim(),
      tenant_id: item?.tenant_id ? String(item.tenant_id) : null,
      establishment_id: item?.establishment_id ? String(item.establishment_id) : null,
      title: item?.title ? String(item.title) : null,
      evidence_type: item?.evidence_type ? String(item.evidence_type) : null,
      description: item?.description ? String(item.description) : null,
      linked_entity_type: item?.linked_entity_type ? String(item.linked_entity_type) : null,
      linked_entity_id: item?.linked_entity_id ? String(item.linked_entity_id) : null,
      reference_date: item?.reference_date ? String(item.reference_date) : null,
      file_name: item?.file_name ? String(item.file_name) : null,
      file_url: item?.file_url ? String(item.file_url) : null,
      validation_status: item?.validation_status ? String(item.validation_status) : null,
      responsible_name: item?.responsible_name ? String(item.responsible_name) : null,
      created_at: item?.created_at ? String(item.created_at) : null,
      updated_at: item?.updated_at ? String(item.updated_at) : null,
      deleted_at: item?.deleted_at ? String(item.deleted_at) : null,
    }))
    .filter((item: EvidenceItem) => item.id);
}

function formatValidationStatus(value: string | null | undefined) {
  switch (String(value || "").trim().toLowerCase()) {
    case "pending_validation":
      return "pendente de validacao";
    case "validated":
      return "validado";
    case "rejected":
      return "rejeitado";
    case "archived":
      return "arquivado";
    default:
      return String(value || "sem status").trim() || "sem status";
  }
}

function getValidationBadgeClass(value: string | null | undefined) {
  switch (String(value || "").trim().toLowerCase()) {
    case "validated":
      return "border-[#D6E5D7] bg-[#F3F8F4] text-[#4E7355]";
    case "pending_validation":
      return "border-[#E9D4C4] bg-[#FBF5EF] text-[#8C5A33]";
    case "rejected":
      return "border-[#E8C8CC] bg-[#F9F1F2] text-[#8A4F58]";
    case "archived":
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
    default:
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
  }
}

export default function Nr1EvidenciasAcompanhamentoPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentItem[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    evidence_type: "document",
    description: "",
    linked_entity_type: "",
    linked_entity_id: "",
    reference_date: "",
    file_name: "",
    file_url: "",
    validation_status: "pending_validation",
    responsible_name: "",
  });

  const selectedEstablishment = useMemo(() => {
    return establishments.find((item) => item.id === selectedEstablishmentId) || null;
  }, [establishments, selectedEstablishmentId]);

  const pendingValidationCount = useMemo(() => {
    return items.filter((item) => String(item.validation_status || "").trim().toLowerCase() === "pending_validation").length;
  }, [items]);

  const linkedActionPlanCount = useMemo(() => {
    return items.filter((item) => String(item.linked_entity_type || "").trim().toLowerCase() === "action_plan").length;
  }, [items]);

  const linkedFollowupCount = useMemo(() => {
    return items.filter((item) => String(item.linked_entity_type || "").trim().toLowerCase() === "action_followup").length;
  }, [items]);

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
      setLoadingItems(true);
      setError("");
      setInfo("");

      try {
        const response = await fetch(
          "/api/nr1/evidence-items?establishmentId=" + encodeURIComponent(selectedEstablishmentId),
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
            "Falha ao carregar evidencias do estabelecimento.";
          throw new Error(String(message));
        }

        const parsedItems = parseEvidenceItems(payload);
        setItems(parsedItems);

        if (parsedItems.length === 0) {
          setInfo("Nenhuma evidencia encontrada para este estabelecimento.");
        } else {
          setInfo("Tela ligada ao backend real de evidence-items por estabelecimento.");
        }
      } catch (e: any) {
        setItems([]);
        setError(e?.message || "Falha ao carregar evidencias.");
      } finally {
        setLoadingItems(false);
      }
    })();
  }, [jwt, tenantId, selectedEstablishmentId]);

  async function handleCreateEvidence() {
    setError("");
    setInfo("");

    if (!jwt || !tenantId || !selectedEstablishmentId) {
      setError("Contexto incompleto. Recarregue a pagina e confirme tenant e estabelecimento.");
      return;
    }

    if (!form.title.trim()) {
      setError("Informe o titulo da evidencia.");
      return;
    }

    if (!form.evidence_type.trim()) {
      setError("Informe o tipo da evidencia.");
      return;
    }

    setSaving(true);

    try {
      const createResponse = await fetch("/api/nr1/evidence-items", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + jwt,
          "x-icanhelp-tenant": tenantId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          title: form.title.trim(),
          evidence_type: form.evidence_type.trim(),
          description: form.description.trim() || null,
          linked_entity_type: form.linked_entity_type.trim() || null,
          linked_entity_id: form.linked_entity_id.trim() || null,
          reference_date: form.reference_date.trim() || null,
          file_name: form.file_name.trim() || null,
          file_url: form.file_url.trim() || null,
          validation_status: form.validation_status.trim() || null,
          responsible_name: form.responsible_name.trim() || null,
        }),
      });

      const createPayload = await readJsonSafe(createResponse);

      if (!createResponse.ok) {
        const message =
          createPayload?.message ||
          createPayload?.error ||
          "Falha ao gravar evidencia no backend real.";
        throw new Error(String(message));
      }

      const refreshResponse = await fetch(
        "/api/nr1/evidence-items?establishmentId=" + encodeURIComponent(selectedEstablishmentId),
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
          "A evidencia foi criada, mas a releitura da lista falhou.";
        throw new Error(String(message));
      }

      setItems(parseEvidenceItems(refreshPayload));
      setForm({
        title: "",
        evidence_type: "document",
        description: "",
        linked_entity_type: "",
        linked_entity_id: "",
        reference_date: "",
        file_name: "",
        file_url: "",
        validation_status: "pending_validation",
        responsible_name: "",
      });
      setInfo("Evidencia gravada com sucesso no backend real.");
    } catch (e: any) {
      setError(e?.message || "Falha ao gravar evidencia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      active="nr1"
      title="Evidencias e acompanhamento"
      description="Quinta etapa da jornada. Agora a tela le e grava evidence-items reais por estabelecimento."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Mostra evidencias reais do estabelecimento, com status, vinculo e rastreabilidade.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            Esta etapa saiu da leitura indevida de assessments e agora consome e grava no contrato real de
            evidence-items. O acompanhamento detalhado por follow-ups continua como frente separada.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                evidencias
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{items.length}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                pendentes
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{pendingValidationCount}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                ligadas a acao
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{linkedActionPlanCount}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                ligadas a followup
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{linkedFollowupCount}</div>
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

        <section className={sectionClassName}>
          <div className="grid gap-4 md:grid-cols-[1.2fr_2fr]">
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
          </div>

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
        </section>

        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            registrar evidencia
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
            Criacao manual ligada ao backend real de evidence-items.
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-[#22313F]">Titulo da evidencia</label>
              <input
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                className={inputClassName}
                placeholder="Ex.: Checklist assinado da verificacao"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Tipo</label>
              <select
                value={form.evidence_type}
                onChange={(e) => setForm((current) => ({ ...current, evidence_type: e.target.value }))}
                className={inputClassName}
              >
                <option value="document">document</option>
                <option value="image">image</option>
                <option value="checklist">checklist</option>
                <option value="report">report</option>
                <option value="other">other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Data de referencia</label>
              <input
                type="date"
                value={form.reference_date}
                onChange={(e) => setForm((current) => ({ ...current, reference_date: e.target.value }))}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Responsavel</label>
              <input
                value={form.responsible_name}
                onChange={(e) => setForm((current) => ({ ...current, responsible_name: e.target.value }))}
                className={inputClassName}
                placeholder="Nome do responsavel"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Entidade vinculada</label>
              <select
                value={form.linked_entity_type}
                onChange={(e) => setForm((current) => ({ ...current, linked_entity_type: e.target.value }))}
                className={inputClassName}
              >
                <option value="">sem vinculo</option>
                <option value="action_plan">action_plan</option>
                <option value="action_followup">action_followup</option>
                <option value="other">other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">ID vinculado</label>
              <input
                value={form.linked_entity_id}
                onChange={(e) => setForm((current) => ({ ...current, linked_entity_id: e.target.value }))}
                className={inputClassName}
                placeholder="UUID do item vinculado"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Nome do arquivo</label>
              <input
                value={form.file_name}
                onChange={(e) => setForm((current) => ({ ...current, file_name: e.target.value }))}
                className={inputClassName}
                placeholder="arquivo.pdf"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">URL do arquivo</label>
              <input
                value={form.file_url}
                onChange={(e) => setForm((current) => ({ ...current, file_url: e.target.value }))}
                className={inputClassName}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Status de validacao</label>
              <select
                value={form.validation_status}
                onChange={(e) => setForm((current) => ({ ...current, validation_status: e.target.value }))}
                className={inputClassName}
              >
                <option value="pending_validation">pending_validation</option>
                <option value="validated">validated</option>
                <option value="rejected">rejected</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-[#22313F]">Descricao</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                className={inputClassName + " min-h-[120px]"}
                placeholder="Descreva a evidencia e o contexto do registro"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCreateEvidence()}
              disabled={saving || !jwt || !tenantId || !selectedEstablishmentId || !form.title.trim() || !form.evidence_type.trim()}
              className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar evidencia"}
            </button>

            <button
              type="button"
              onClick={() =>
                setForm({
                  title: "",
                  evidence_type: "document",
                  description: "",
                  linked_entity_type: "",
                  linked_entity_id: "",
                  reference_date: "",
                  file_name: "",
                  file_url: "",
                  validation_status: "pending_validation",
                  responsible_name: "",
                })
              }
              className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
            >
              Limpar campos
            </button>
          </div>
        </section>

        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            evidencias reais
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
            Lista carregada do backend de evidence-items por estabelecimento.
          </h3>

          {loadingItems ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Buscando registros em /api/nr1/evidence-items...
            </p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Nenhuma evidencia encontrada para o estabelecimento selecionado.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5E7A96]">
                        evidencia {index + 1}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                        {item.title || "Evidencia sem titulo"}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                        {item.description || "Sem descricao complementar."}
                      </p>
                    </div>

                    <div className="rounded-full border px-3 py-2 text-xs font-semibold border-[#D9E0E7] bg-white text-[#5B6B79]">
                      Tipo: {item.evidence_type || "Nao informado"}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className={"rounded-full border px-3 py-2 text-xs font-semibold " + getValidationBadgeClass(item.validation_status)}>
                      Validacao: {formatValidationStatus(item.validation_status)}
                    </div>

                    <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#5B6B79]">
                      Referencia: {item.reference_date || "Nao informada"}
                    </div>

                    <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#5B6B79]">
                      Responsavel: {item.responsible_name || "Nao informado"}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        entidade vinculada
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.linked_entity_type || "Nao informada"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        id vinculado
                      </div>
                      <div className="mt-2 break-all text-sm leading-7 text-[#22313F]">
                        {item.linked_entity_id || "Nao informado"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        arquivo
                      </div>
                      <div className="mt-2 break-all text-sm leading-7 text-[#22313F]">
                        {item.file_name || item.file_url || "Nao informado"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        atualizacao
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.updated_at || item.created_at || "Nao informada"}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
            Esta versao foi ligada ao backend real de evidence-items com leitura e gravacao por estabelecimento.
            O detalhamento por action-followups agora segue para a tela propria de trilha de acompanhamento.
          </div>
        </section>

        <section className={sectionClassName}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                navegacao da jornada
              </div>
              <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
                Acompanhamento documental ligado ao estabelecimento selecionado.
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/nr1/plano-de-acao"
                className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
              >
                Voltar para plano de acao
              </Link>

              <Link
                href="/dashboard/nr1/trilha-acompanhamento"
                className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
              >
                Avancar para trilha
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
