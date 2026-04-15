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

  return (
    <AppShell
      active="nr1"
      title="Evidencias e acompanhamento"
      description="Quinta etapa da jornada. Agora a tela le o backend real de evidence-items por estabelecimento."
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
            Esta etapa saiu da leitura indevida de assessments e agora consome o contrato real de evidence-items.
            O acompanhamento detalhado por follow-ups continua como frente separada.
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
            Esta versao foi ligada ao backend real de evidence-items. O detalhamento por action-followups agora segue para a tela propria de trilha de acompanhamento.
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
                href="/dashboard/nr1/plano-acao"
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

