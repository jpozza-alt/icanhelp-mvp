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

type Nr1AssessmentItem = {
  id?: string;
  establishment_name?: string | null;
  process_description?: string | null;
  environment_description?: string | null;
  workers_count_estimate?: number | null;
  status?: string | null;
};

const sectionClassName = "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm";
const selectClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";

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

function shorten(value: string | null | undefined, maxLength: number) {
  const text = String(value || "").trim();
  if (!text) return "Nao informado";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trimEnd() + "...";
}

function statusBadgeClass(status: string | null | undefined) {
  const normalized = String(status || "").trim().toLowerCase();

  switch (normalized) {
    case "draft":
      return "border-[#E8D9BE] bg-[#FBF6EB] text-[#8A6732]";
    case "review_pending":
      return "border-[#D9E0E7] bg-[#F4F7FA] text-[#486273]";
    case "completed":
      return "border-[#CFE2D4] bg-[#EEF7F0] text-[#4D7A58]";
    default:
      return "border-[#E3C7CB] bg-[#F9F1F2] text-[#8A4F58]";
  }
}

export default function Nr1EvidenciasAcompanhamentoPage() {
  const router = useRouter();

  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [items, setItems] = useState<Nr1AssessmentItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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
      setLoadingItems(true);
      setError("");
      setInfo("");

      try {
        const response = await fetch("/api/nr1-assessments?status=draft&limit=20", {
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
            "Falha ao carregar registros de acompanhamento.";
          throw new Error(String(message));
        }

        const parsedItems = Array.isArray(payload?.items) ? payload.items : [];
        setItems(parsedItems);

        if (parsedItems.length === 0) {
          setInfo("Nenhum registro draft encontrado para este tenant.");
        } else {
          setInfo("Tela conectada ao backend real. Registros do tenant carregados com sucesso.");
        }
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar registros.");
      } finally {
        setLoadingItems(false);
      }
    })();
  }, [jwt, tenantId]);

  const totalCount = useMemo(() => items.length, [items]);

  const draftCount = useMemo(() => {
    return items.filter((item) => String(item?.status || "").trim().toLowerCase() === "draft").length;
  }, [items]);

  const namedCount = useMemo(() => {
    return items.filter((item) => String(item?.establishment_name || "").trim().length > 0).length;
  }, [items]);

  const workersKnownCount = useMemo(() => {
    return items.filter((item) => {
      const value = item?.workers_count_estimate;
      return value !== null && value !== undefined && Number(value) > 0;
    }).length;
  }, [items]);

  return (
    <AppShell
      active="nr1"
      title="Evidencias e acompanhamento"
      description="Etapa conectada ao backend. Esta versao remove o mock local e passa a ler registros reais do tenant."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que mudou
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            A tela saiu do modo local e passou a ler dados reais.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            Esta etapa agora usa sessao, tenant e consulta backend para mostrar registros reais ja salvos no fluxo NR1.
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
                      <span className="font-semibold text-[#22313F]">Carregando itens:</span>{" "}
                      {loadingItems ? "sim" : "nao"}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                registros reais do tenant
              </div>

              {loadingItems ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Buscando registros em /api/nr1-assessments...
                </p>
              ) : items.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Nenhum registro draft encontrado para este tenant.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {items.map((item, index) => (
                    <article
                      key={String(item?.id || index)}
                      className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5E7A96]">
                            registro {index + 1}
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                            {item?.establishment_name || "Diagnostico inicial"}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                            {shorten(item?.process_description, 220)}
                          </p>
                        </div>

                        <div
                          className={
                            "rounded-full border px-3 py-2 text-xs font-semibold " +
                            statusBadgeClass(item?.status)
                          }
                        >
                          status: {item?.status || "desconhecido"}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-[#D9E0E7] bg-white p-4 text-sm leading-7 text-[#5B6B79]">
                          <div className="font-semibold text-[#22313F]">processo</div>
                          <div className="mt-2">{shorten(item?.process_description, 280)}</div>
                        </div>

                        <div className="rounded-xl border border-[#D9E0E7] bg-white p-4 text-sm leading-7 text-[#5B6B79]">
                          <div className="font-semibold text-[#22313F]">ambiente</div>
                          <div className="mt-2">{shorten(item?.environment_description, 280)}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          item_id: {item?.id || "-"}
                        </div>
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          trabalhadores: {item?.workers_count_estimate ?? "-"}
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
                leitura da trilha
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    registros
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {totalCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    drafts
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {draftCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    com estabelecimento
                  </div>
<div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {namedCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    com trabalhadores
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {workersKnownCount}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                Esta versao ja mostra dados reais do tenant e elimina a falsa sensacao de tela pronta baseada apenas em estado local.
              </p>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                proximas acoes
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5B6B79]">
                <div>- confirmar se os registros exibidos batem com o tenant seeded</div>
                <div>- fechar o contrato backend canonico da etapa de evidencias</div>
                <div>- trocar esta leitura provisoria por evidencias e anexos reais quando o contrato estiver fechado</div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/nr1/diagnostico-inicial"
                  className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
                >
                  Abrir diagnostico inicial
                </Link>

                <Link
                  href="/dashboard/nr1/plano-acao"
                  className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
                >
                  Seguir para plano de acao
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}