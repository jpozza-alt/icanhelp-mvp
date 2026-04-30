"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TenantOption = {
  id: string;
  name: string;
  role?: string | null;
};

type EstablishmentOption = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  status?: string | null;
};

type LoadStatus = "idle" | "loading" | "loaded" | "error";

function parseTenants(payload: unknown): TenantOption[] {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { items?: unknown[] })?.items)
      ? (payload as { items: unknown[] }).items
      : [];

  return raw
    .map((item) => {
      const record = item as Record<string, unknown>;
      const id = String(record.id ?? record.tenant_id ?? "").trim();
      const name = String(record.name ?? record.slug ?? "Tenant").trim();
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
      const record = item as Record<string, unknown>;
      const id = String(record.id ?? "").trim();
      const name = String(record.name ?? "Estabelecimento").trim();
      const city = record.city ? String(record.city) : null;
      const state = record.state ? String(record.state) : null;
      const status = record.status ? String(record.status) : null;
      return { id, name, city, state, status };
    })
    .filter((item) => item.id.length > 0);
}

function readArrayCount(report: unknown, key: string): number {
  const record = report as Record<string, unknown>;
  const value = record?.[key];
  return Array.isArray(value) ? value.length : 0;
}

export default function Nr1PgrReportPage() {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [reportPayload, setReportPayload] = useState<unknown>(null);

  const report = (reportPayload as { report?: unknown } | null)?.report ?? null;

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

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token ?? "";

    if (!accessToken) {
      throw new Error("Sessao nao encontrada. Faca login novamente.");
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
        throw new Error("Nenhum tenant disponivel para o usuario.");
      }

      setTenants(tenantItems);

      const firstTenantId = selectedTenantId || tenantItems[0].id;
      setSelectedTenantId(firstTenantId);

      await loadEstablishments(accessToken, firstTenantId);
      setStatus("idle");
      setMessage("Selecione o estabelecimento e gere o relatorio.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao carregar contexto NR1.");
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

    if (items.length > 0) {
      setSelectedEstablishmentId(items[0].id);
    } else {
      setSelectedEstablishmentId("");
    }
  }

  async function handleTenantChange(nextTenantId: string) {
    setSelectedTenantId(nextTenantId);
    setReportPayload(null);

    try {
      setStatus("loading");
      setMessage("Carregando estabelecimentos...");
      const accessToken = token || (await getAccessToken());
      await loadEstablishments(accessToken, nextTenantId);
      setStatus("idle");
      setMessage("Estabelecimentos carregados.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao trocar tenant.");
    }
  }

  async function loadReport() {
    if (!selectedTenantId) {
      setStatus("error");
      setMessage("Selecione um tenant.");
      return;
    }

    if (!selectedEstablishmentId) {
      setStatus("error");
      setMessage("Selecione um estabelecimento.");
      return;
    }

    setStatus("loading");
    setMessage("Gerando relatorio PGR...");

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
        throw new Error(payload?.message || payload?.error || "Falha ao gerar relatorio PGR.");
      }

      setStatus("loaded");
      setMessage("Relatorio PGR carregado.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatorio PGR.");
    }
  }

  useEffect(() => {
    loadInitialContext();
  }, []);

  return (
    <main className="min-h-screen bg-[#F4F7FB] px-6 py-8 text-[#132238]">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6">
          <Link href="/dashboard/nr1/workspace" className="text-sm font-semibold text-[#178A8F]">
            Voltar ao workspace NR1
          </Link>
        </div>

        <section className="rounded-[28px] bg-[linear-gradient(135deg,#0F2337_0%,#13495C_60%,#178A8F_100%)] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
          <p className="text-[12px] uppercase tracking-[0.08em] text-white/70">documento PGR</p>
          <h1 className="mt-4 text-[38px] font-semibold leading-tight">Relatorio estruturado do PGR</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-white/85">
            Gere a visao JSON consolidada por estabelecimento com inventario, plano de acao,
            acompanhamentos, evidencias, saude, treinamentos e auditoria.
          </p>
        </section>

        <section className="mt-6 rounded-[24px] border border-[#D9E0E7] bg-white p-6 shadow-[0_18px_50px_rgba(34,49,63,0.08)]">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#22313F]">Tenant</span>
              <select
                value={selectedTenantId}
                onChange={(event) => handleTenantChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm outline-none"
              >
                {tenants.map((tenantItem) => (
                  <option key={tenantItem.id} value={tenantItem.id}>
                    {tenantItem.name} {tenantItem.role ? `- ${tenantItem.role}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#22313F]">Estabelecimento</span>
              <select
                value={selectedEstablishmentId}
                onChange={(event) => {
                  setSelectedEstablishmentId(event.target.value);
                  setReportPayload(null);
                }}
                className="mt-2 w-full rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm outline-none"
              >
                {establishments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.city ? `- ${item.city}/${item.state ?? ""}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-[#5B6776]">{message || "Pronto para gerar."}</p>
            <button
              id="nr1GeneratePgrReportButton"
              type="button"
              onClick={loadReport}
              disabled={status === "loading" || !selectedTenantId || !selectedEstablishmentId}
              className="rounded-2xl bg-[#132238] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1D344F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" ? "Gerando..." : "Gerar relatorio JSON"}
            </button>
          </div>
        </section>

        {summary && (
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key} className="rounded-[22px] border border-[#D9E0E7] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-[#5B6776]">{key}</p>
                <p className="mt-2 text-3xl font-semibold text-[#132238]">{value}</p>
              </div>
            ))}
          </section>
        )}

        {reportPayload ? (
          <section className="mt-6 rounded-[24px] border border-[#D9E0E7] bg-white p-6 shadow-[0_18px_50px_rgba(34,49,63,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#132238]">Payload do relatorio</h2>
              <span className="rounded-full bg-[#E8F5F6] px-3 py-1 text-xs font-semibold text-[#178A8F]">
                {status}
              </span>
            </div>
            <pre className="max-h-[520px] overflow-auto rounded-2xl bg-[#0F172A] p-4 text-xs leading-5 text-white">
              {JSON.stringify(reportPayload, null, 2)}
            </pre>
          </section>
        ) : null}
      </div>
    </main>
  );
}
