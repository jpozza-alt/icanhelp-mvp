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

type PgrSnapshotVersion = {
  id: string;
  version: number;
  document_type: string;
  status: string;
  generated_at: string;
  generated_by?: string | null;
  supersedes_document_id?: string | null;
};
type LoadStatus = "idle" | "loading" | "loaded" | "error";
type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

function parseTenants(payload: unknown): TenantOption[] {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { items?: unknown[] })?.items)
      ? (payload as { items: unknown[] }).items
      : [];

  return raw
    .map((item) => {
      const record = item as AnyRecord;
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
      const record = item as AnyRecord;
      const id = String(record.id ?? "").trim();
      const name = String(record.name ?? "Estabelecimento").trim();
      const city = record.city ? String(record.city) : null;
      const state = record.state ? String(record.state) : null;
      const status = record.status ? String(record.status) : null;
      return { id, name, city, state, status };
    })
    .filter((item) => item.id.length > 0);
}

function parseSnapshotVersions(payload: unknown): PgrSnapshotVersion[] {
  const wrapper = asRecord(payload);
  const raw = Array.isArray(wrapper.data)
    ? wrapper.data
    : Array.isArray(wrapper.items)
      ? wrapper.items
      : Array.isArray(payload)
        ? payload
        : [];

  return raw
    .map((item) => {
      const record = asRecord(item);
      const id = String(record.id ?? "").trim();
      const versionNumber = Number(record.version ?? 0);
      const version = Number.isFinite(versionNumber) ? versionNumber : 0;
      const documentType = String(record.document_type ?? "").trim();
      const status = String(record.status ?? "").trim();
      const generatedAt = String(record.generated_at ?? "").trim();
      const generatedBy = record.generated_by ? String(record.generated_by) : null;
      const supersedesDocumentId = record.supersedes_document_id ? String(record.supersedes_document_id) : null;

      return {
        id,
        version,
        document_type: documentType,
        status,
        generated_at: generatedAt,
        generated_by: generatedBy,
        supersedes_document_id: supersedesDocumentId,
      };
    })
    .filter((item) => item.id.length > 0)
    .sort((a, b) => b.version - a.version);
}
function getReport(payload: unknown): AnyRecord | null {
  const wrapper = asRecord(payload);
  const report = wrapper.report;
  return report && typeof report === "object" ? (report as AnyRecord) : null;
}

function readArray(report: AnyRecord | null, key: string): AnyRecord[] {
  const value = report?.[key];
  return Array.isArray(value) ? value.map((item) => asRecord(item)) : [];
}

function readArrayCount(report: unknown, key: string): number {
  const record = report as AnyRecord;
  const value = record?.[key];
  return Array.isArray(value) ? value.length : 0;
}

function text(value: unknown, fallback = "-"): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }

  return fallback;
}

function dateText(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR");
}

function SectionTitle(props: { children: React.ReactNode }) {
  return <h2 className="nr1-print-section-title mt-8 border-b border-slate-300 pb-2 text-xl font-semibold text-slate-950">{props.children}</h2>;
}

function InfoGrid(props: { items: Array<[string, unknown]> }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PgrProfessionalApprovalPanel />

      {props.items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{text(value)}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState(props: { text: string }) {
  return <p className="nr1-print-avoid mt-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">{props.text}</p>;
}

function PrintFooter() {
  return (
    <footer id="nr1PrintLayoutVersion" className="mt-10 border-t border-slate-300 pt-4 text-[11px] leading-5 text-slate-500">
      <p>Documento gerado pelo icanHelp para apoio ao Gerenciamento de Riscos Ocupacionais.</p>
      <p>Revise os dados tecnicos, responsaveis e evidencias antes da assinatura e arquivamento formal.</p>
    </footer>
  );
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
  const [snapshotVersions, setSnapshotVersions] = useState<PgrSnapshotVersion[]>([]);

  const report = getReport(reportPayload);

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

  const company = asRecord(report?.company);
  const establishment = asRecord(report?.establishment);
  const scope = asRecord(report?.scope);
  const risks = readArray(report, "risks");
  const actionPlans = readArray(report, "actionPlans");
  const actionFollowups = readArray(report, "actionFollowups");
  const evidenceItems = readArray(report, "evidenceItems");
  const auditEvents = readArray(report, "auditEvents");
  const generatedAt = text(report?.generatedAt, "");

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


  async function recordPgrDocumentAuditEvent(action: "generated" | "print_requested") {
    if (!selectedTenantId || !selectedEstablishmentId) {
      return;
    }

    try {
      const accessToken = token || (await getAccessToken());
      const eventType = action === "generated" ? "pgr_report_generated" : "pgr_report_print_requested";
      const reason =
        action === "generated"
          ? "Relatorio PGR gerado na tela."
          : "Solicitacao de impressao ou salvamento em PDF do PGR.";

      await fetch("/api/nr1/audit-events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-icanhelp-tenant": selectedTenantId,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          module_name: "nr1",
          screen_key: "dashboard/nr1/relatorio-pgr",
          entity_type: "pgr_report",
          entity_id: selectedEstablishmentId,
          event_type: eventType,
          persistence_type: "formal_version",
          reason,
          old_value_json: null,
          new_value_json: {
            tenantId: selectedTenantId,
            establishmentId: selectedEstablishmentId,
            source: "dashboard/nr1/relatorio-pgr",
            action,
            reportType: "nr1_pgr_json",
          },
        }),
      });
    } catch {
      // Audit failure must not block report generation or browser print.
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

      await loadFormalPgrSnapshots(accessToken);
      await recordPgrDocumentAuditEvent("generated");
      setStatus("loaded");
      setMessage("Relatorio PGR carregado. Use o botao de impressao para salvar em PDF.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatorio PGR.");
    }
  }



  async function loadFormalPgrSnapshots(accessTokenOverride?: string) {
    if (!selectedTenantId || !selectedEstablishmentId) {
      setSnapshotVersions([]);
      return;
    }

    try {
      const accessToken = accessTokenOverride || token || (await getAccessToken());
      const response = await fetch(`/api/nr1/pgr-snapshot?establishmentId=${selectedEstablishmentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-icanhelp-tenant": selectedTenantId,
          Accept: "application/json",
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        setSnapshotVersions([]);
        return;
      }

      setSnapshotVersions(parseSnapshotVersions(payload));
    } catch {
      setSnapshotVersions([]);
    }
  }

  async function createFormalPgrSnapshot() {
    if (!selectedTenantId || !selectedEstablishmentId) {
      setMessage("Selecione tenant e estabelecimento antes de criar o snapshot formal.");
      return;
    }

    if (!reportPayload) {
      setMessage("Gere o relatorio antes de criar o snapshot formal.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("Criando snapshot formal do PGR...");
      const accessToken = token || (await getAccessToken());

      const response = await fetch("/api/nr1/pgr-snapshot", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-icanhelp-tenant": selectedTenantId,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          source_snapshot_json: reportPayload,
          status: "generated",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Falha ao criar snapshot formal do PGR.");
      }

      await loadFormalPgrSnapshots(accessToken);

      const version = payload?.data?.version ? ` versao ${payload.data.version}` : "";
      setStatus("loaded");
      setMessage(`Snapshot formal do PGR criado.${version}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao criar snapshot formal do PGR.");
    }
  }

  function handlePrintPdf() {
    if (!report) {
      setMessage("Gere o relatorio antes de imprimir ou salvar em PDF.");
      return;
    }

    void recordPgrDocumentAuditEvent("print_requested");
    window.print();
  }

  useEffect(() => {
    loadInitialContext();
  }, []);

  return (
    <main className="min-h-screen bg-[#F4F7FB] px-6 py-8 text-[#132238]">
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          .nr1-screen-only {
            display: none !important;
          }

          #nr1-pgr-print-area {
            display: block !important;
            border: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11.5pt;
            line-height: 1.45;
          }

          #nr1-pgr-print-area * {
            color-adjust: exact;
            print-color-adjust: exact;
          }

          .nr1-print-avoid,
          #nr1-pgr-print-area article,
          #nr1-pgr-print-area .rounded-2xl {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .nr1-print-section-title {
            break-after: avoid;
            page-break-after: avoid;
            margin-top: 18pt !important;
          }

          .nr1-print-cover {
            border-bottom: 2px solid #0f766e !important;
            padding-bottom: 18pt !important;
            margin-bottom: 18pt !important;
          }

          .nr1-print-badge {
            border: 1px solid #99f6e4 !important;
            background: #f0fdfa !important;
            color: #115e59 !important;
          }

          @page {
            size: A4;
            margin: 13mm;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1200px]">
        <div className="nr1-screen-only mb-6">
          <Link href="/dashboard/nr1/workspace" className="text-sm font-semibold text-[#178A8F]">
            Voltar ao workspace NR1
          </Link>
        </div>

        <section className="nr1-screen-only rounded-[28px] bg-[linear-gradient(135deg,#0F2337_0%,#13495C_60%,#178A8F_100%)] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
          <p className="text-[12px] uppercase tracking-[0.08em] text-white/70">documento PGR</p>
          <h1 className="mt-4 text-[38px] font-semibold leading-tight">Relatorio estruturado do PGR</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-white/85">
            Gere a visao consolidada por estabelecimento com inventario, plano de acao,
            acompanhamentos, evidencias, saude, treinamentos e auditoria.
          </p>
        </section>

        <section className="nr1-screen-only mt-6 rounded-[24px] border border-[#D9E0E7] bg-white p-6 shadow-[0_18px_50px_rgba(34,49,63,0.08)]">
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
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                id="nr1GeneratePgrReportButton"
                type="button"
                onClick={loadReport}
                disabled={status === "loading" || !selectedTenantId || !selectedEstablishmentId}
                className="rounded-2xl bg-[#132238] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1D344F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading" ? "Gerando..." : "Gerar relatorio"}
              </button>

              <button
                id="nr1PrintPgrReportButton"
                type="button"
                onClick={handlePrintPdf}
                disabled={!report || status === "loading"}
                className="rounded-2xl border border-[#132238] bg-white px-5 py-3 text-sm font-semibold text-[#132238] transition hover:bg-[#F4F7FB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Imprimir / salvar PDF
              </button>
              <button
                id="nr1CreatePgrSnapshotButton"
                type="button"
                onClick={createFormalPgrSnapshot}
                disabled={!reportPayload || status === "loading"}
                className="rounded-2xl border border-[#178A8F] bg-[#E8F5F6] px-5 py-3 text-sm font-semibold text-[#116B70] transition hover:bg-[#D6F0F2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Criar snapshot formal
              </button>
            </div>
          </div>
        </section>

        {summary && (
          <section className="nr1-screen-only mt-6 grid gap-4 md:grid-cols-3">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key} className="rounded-[22px] border border-[#D9E0E7] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-[#5B6776]">{key}</p>
                <p className="mt-2 text-3xl font-semibold text-[#132238]">{value}</p>
              </div>
            ))}
          </section>
        )}

        <section id="nr1SnapshotVersionsPanel" className="nr1-screen-only mt-6 rounded-[24px] border border-[#D9E0E7] bg-white p-6 shadow-[0_18px_50px_rgba(34,49,63,0.08)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#178A8F]">versionamento formal</p>
              <h2 className="mt-1 text-xl font-semibold text-[#132238]">Versoes formais do PGR</h2>
              <p className="mt-1 text-sm text-[#5B6776]">Snapshots congelados em nr1_document_versions para rastreabilidade documental.</p>
            </div>
            <button
              id="nr1RefreshPgrSnapshotsButton"
              type="button"
              onClick={() => void loadFormalPgrSnapshots()}
              disabled={!selectedTenantId || !selectedEstablishmentId || status === "loading"}
              className="rounded-2xl border border-[#D9E0E7] bg-white px-4 py-2 text-sm font-semibold text-[#132238] transition hover:bg-[#F4F7FB] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Atualizar versoes
            </button>
          </div>

          {snapshotVersions.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm text-[#5B6776]">
              Nenhum snapshot formal listado para o estabelecimento selecionado.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#D9E0E7]">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#F4F7FB] text-xs uppercase tracking-[0.08em] text-[#5B6776]">
                  <tr>
                    <th className="px-4 py-3">Versao</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Gerado em</th>
                    <th className="px-4 py-3">Substitui</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotVersions.map((snapshot) => (
                    <tr key={snapshot.id} className="border-t border-[#D9E0E7]">
                      <td className="px-4 py-3 font-semibold text-[#132238]">v{snapshot.version}</td>
                      <td className="px-4 py-3 text-[#22313F]">{snapshot.document_type}</td>
                      <td className="px-4 py-3 text-[#22313F]">{snapshot.status}</td>
                      <td className="px-4 py-3 text-[#22313F]">{dateText(snapshot.generated_at)}</td>
                      <td className="px-4 py-3 text-[#5B6776]">{snapshot.supersedes_document_id ? "Sim" : "Nao"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {report ? (
          <section id="nr1-pgr-print-area" className="mt-6 rounded-[24px] border border-[#D9E0E7] bg-white p-8 shadow-[0_18px_50px_rgba(34,49,63,0.08)]">
            <header className="nr1-print-cover border-b border-slate-300 pb-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#178A8F]">Programa de Gerenciamento de Riscos</p>
                  <h1 className="mt-3 text-3xl font-bold text-slate-950">Relatorio estruturado do PGR</h1>
                  <p className="mt-2 text-sm text-slate-600">Documento gerado a partir da base NR1 do icanHelp.</p>
                </div>
                <div className="nr1-print-badge rounded-2xl px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[#115e59]">
                  PGR / GRO
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p><strong>Gerado em:</strong> {generatedAt ? dateText(generatedAt) : "-"}</p>
                <p><strong>Tenant:</strong> {text(scope.tenantId)}</p>
                <p><strong>Estabelecimento:</strong> {text(scope.establishmentId)}</p>
                <p><strong>Perfil:</strong> {text(scope.membershipRole)}</p>
              </div>
            </header>

            <SectionTitle>1. Identificacao</SectionTitle>
            <InfoGrid
              items={[
                ["Empresa", company.legal_name ?? company.trade_name],
                ["Nome fantasia", company.trade_name],
                ["CNPJ", company.cnpj],
                ["CNAE principal", company.cnae_main],
                ["Grau de risco", company.risk_grade],
                ["Estabelecimento", establishment.name],
                ["Cidade/UF", `${text(establishment.city)} / ${text(establishment.state)}`],
                ["Trabalhadores", establishment.employee_count],
              ]}
            />

            <SectionTitle>2. Resumo quantitativo</SectionTitle>
            {summary ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {Object.entries(summary).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{key}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <SectionTitle>3. Inventario de riscos</SectionTitle>
            {risks.length > 0 ? (
              <div className="mt-4 space-y-4">
                {risks.map((item, index) => (
                  <article key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-950">{index + 1}. {text(item.title, "Risco sem titulo")}</h3>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <p><strong>Categoria:</strong> {text(item.risk_category)}</p>
                      <p><strong>Nivel:</strong> {text(item.risk_level)}</p>
                      <p><strong>Classificacao:</strong> {text(item.classification)}</p>
                      <p><strong>Grupo exposto:</strong> {text(item.exposed_group)}</p>
                      <p className="md:col-span-2"><strong>Perigo/Fonte:</strong> {text(item.hazard_description ?? item.source_circumstance)}</p>
                      <p className="md:col-span-2"><strong>Medida recomendada:</strong> {text(item.recommended_measure)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum risco registrado para este estabelecimento." />
            )}

            <SectionTitle>4. Plano de acao</SectionTitle>
            {actionPlans.length > 0 ? (
              <div className="mt-4 space-y-4">
                {actionPlans.map((item, index) => (
                  <article key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-950">{index + 1}. {text(item.title, "Acao sem titulo")}</h3>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <p><strong>Prioridade:</strong> {text(item.priority)}</p>
                      <p><strong>Status:</strong> {text(item.status)}</p>
                      <p><strong>Responsavel:</strong> {text(item.responsible_name)}</p>
                      <p><strong>Prazo:</strong> {dateText(item.due_date)}</p>
                      <p className="md:col-span-2"><strong>Descricao:</strong> {text(item.description)}</p>
                      <p className="md:col-span-2"><strong>Indicador:</strong> {text(item.completion_indicator)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum plano de acao registrado para este estabelecimento." />
            )}

            <SectionTitle>5. Acompanhamentos</SectionTitle>
            {actionFollowups.length > 0 ? (
              <div className="mt-4 space-y-3">
                {actionFollowups.map((item, index) => (
                  <div key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p><strong>{index + 1}. Status:</strong> {text(item.status)}</p>
                    <p><strong>Data:</strong> {dateText(item.followup_date ?? item.created_at)}</p>
                    <p><strong>Descricao:</strong> {text(item.description ?? item.notes)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum acompanhamento registrado para os planos deste estabelecimento." />
            )}

            <SectionTitle>6. Evidencias</SectionTitle>
            {evidenceItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {evidenceItems.map((item, index) => (
                  <div key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p><strong>{index + 1}. Titulo:</strong> {text(item.title)}</p>
                    <p><strong>Tipo:</strong> {text(item.evidence_type)}</p>
                    <p><strong>Status:</strong> {text(item.validation_status)}</p>
                    <p><strong>Referencia:</strong> {dateText(item.reference_date)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhuma evidencia registrada para este estabelecimento." />
            )}

            <SectionTitle>7. Trilha de auditoria</SectionTitle>
            {auditEvents.length > 0 ? (
              <div className="mt-4 space-y-3">
                {auditEvents.slice(0, 25).map((item, index) => (
                  <div key={String(item.id ?? index)} className="nr1-print-avoid rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p><strong>{index + 1}. Evento:</strong> {text(item.event_type)}</p>
                    <p><strong>Entidade:</strong> {text(item.entity_type)}</p>
                    <p><strong>Data:</strong> {dateText(item.created_at)}</p>
                    <p><strong>Motivo:</strong> {text(item.reason)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum evento de auditoria registrado para este estabelecimento." />
            )}

            <PrintFooter />
          </section>
        ) : (
          <section id="nr1-pgr-print-area" className="mt-6 rounded-[24px] border border-dashed border-[#D9E0E7] bg-white p-8 text-center text-sm text-[#5B6776]">
            Gere o relatorio para visualizar a versao imprimivel do PGR.
          </section>
        )}

        {reportPayload ? (
          <section className="nr1-screen-only mt-6 rounded-[24px] border border-[#D9E0E7] bg-white p-6 shadow-[0_18px_50px_rgba(34,49,63,0.08)]">
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

function PgrProfessionalApprovalPanel() {
  const [tenantId, setTenantId] = useState("");
  const [establishmentId, setEstablishmentId] = useState("");
  const [documentVersionId, setDocumentVersionId] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [professionalRole, setProfessionalRole] = useState("");
  const [professionalCouncil, setProfessionalCouncil] = useState("");
  const [professionalRegistration, setProfessionalRegistration] = useState("");
  const [professionalState, setProfessionalState] = useState("");
  const [approvalStatement, setApprovalStatement] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function submitApproval() {
    setFeedback("");

    if (!tenantId.trim()) {
      setFeedback("Informe o tenant_id antes de registrar a aprovacao.");
      return;
    }

    if (!establishmentId.trim()) {
      setFeedback("Informe o establishment_id antes de registrar a aprovacao.");
      return;
    }

    if (!documentVersionId.trim()) {
      setFeedback("Informe o ID da versao formal do PGR.");
      return;
    }

    if (!professionalName.trim()) {
      setFeedback("Informe o nome do responsavel ou profissional.");
      return;
    }

    const token =
      window.localStorage.getItem("sb-access-token") ||
      window.localStorage.getItem("access_token") ||
      "";

    if (!token) {
      setFeedback("Sessao local nao encontrada. Faca login novamente antes de registrar a aprovacao.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/nr1/pgr-approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-icanhelp-tenant": tenantId.trim(),
          "x-icanhelp-establishment": establishmentId.trim(),
        },
        body: JSON.stringify({
          tenant_id: tenantId.trim(),
          establishment_id: establishmentId.trim(),
          document_version_id: documentVersionId.trim(),
          approval_status: "draft",
          professional_name: professionalName.trim(),
          professional_role: professionalRole.trim() || null,
          professional_council: professionalCouncil.trim() || null,
          professional_registration: professionalRegistration.trim() || null,
          professional_state: professionalState.trim() || null,
          approval_statement: approvalStatement.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback(payload?.error || "Nao foi possivel registrar o rascunho de aprovacao profissional.");
        return;
      }

      setFeedback("Rascunho de aprovacao profissional registrado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado ao registrar aprovacao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-500">Validacao formal</p>
        <h2 className="text-xl font-bold text-slate-900">Aprovacao profissional do PGR</h2>
        <p className="mt-1 text-sm text-slate-600">
          Registre o ato formal de validacao sobre uma versao gerada do relatorio PGR. Esta etapa nao substitui analise tecnica quando necessaria.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Tenant ID
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="tenant_id"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Estabelecimento ID
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={establishmentId}
            onChange={(event) => setEstablishmentId(event.target.value)}
            placeholder="establishment_id"
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          ID da versao formal do PGR
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={documentVersionId}
            onChange={(event) => setDocumentVersionId(event.target.value)}
            placeholder="document_version_id"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Nome do responsavel ou profissional
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalName}
            onChange={(event) => setProfessionalName(event.target.value)}
            placeholder="Nome completo"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Funcao
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalRole}
            onChange={(event) => setProfessionalRole(event.target.value)}
            placeholder="Responsavel tecnico, consultor, SST..."
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Conselho
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalCouncil}
            onChange={(event) => setProfessionalCouncil(event.target.value)}
            placeholder="CREA, CRP, CRM, outro"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Registro
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalRegistration}
            onChange={(event) => setProfessionalRegistration(event.target.value)}
            placeholder="Numero de registro"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          UF
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={professionalState}
            onChange={(event) => setProfessionalState(event.target.value)}
            placeholder="SC"
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Declaracao de aprovacao
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={approvalStatement}
            onChange={(event) => setApprovalStatement(event.target.value)}
            placeholder="Declaro que revisei a versao formal do PGR indicada e registro a validacao profissional nos limites das informacoes disponiveis."
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-500">
          O registro gera vinculo com a versao formal do PGR e trilha de auditoria.
        </p>

        <button
          type="button"
          onClick={submitApproval}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Registrando..." : "Registrar aprovacao"}
        </button>
      </div>

      {feedback ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}


