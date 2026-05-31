"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type RequestRow = {
  id: string;
  status: string | null;
  company_legal_name: string | null;
  company_trade_name: string | null;
  company_cnpj: string | null;
  requester_name: string | null;
  requester_role_title: string | null;
  requester_email: string | null;
  requester_phone: string | null;
  job_title: string | null;
  position_count: number | null;
  vacancy_information_status: string | null;
  recommended_package: string | null;
  selected_package: string | null;
  payment_terms: string | null;
  govbr_signature_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const packageLabels: Record<string, string> = {
  essential: "Essencial",
  strategic: "Estrategico",
  premium: "Premium",
};

const paymentLabels: Record<string, string> = {
  avista: "A vista",
  "50_50": "50% na contratacao e 50% no fechamento",
  outra_condicao_negociada: "Outra condicao negociada",
};

const statusLabels: Record<string, string> = {
  new: "Novo",
  pending_consultancy_review: "Pendente de analise",
  proposal_ready: "Proposta pronta",
  pending_govbr_signature: "Aguardando gov.br",
  contracted_signed: "Contratado",
  canceled: "Cancelado",
  in_review: "Em analise",
  contacted: "Contato realizado",
  proposal_sent: "Proposta enviada",
  hired: "Contratado",
  archived: "Arquivado",
};

const vacancyLabels: Record<string, string> = {
  complete: "Informacoes completas",
  partial: "Informacoes parciais",
  none: "Sem informacoes estruturadas",
};

function text(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function labelFrom(map: Record<string, string>, value: string | null | undefined) {
  return value ? map[value] || value : "-";
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function PasiniSolicitacoesPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [openingPdfId, setOpeningPdfId] = useState("");

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return null;
    }

    return createClient(supabaseUrl, anonKey);
  }, []);

  const loadRequests = useCallback(async () => {
    if (!supabase) {
      setStatus("error");
      setMessage("Configuracao publica do Supabase indisponivel.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const sessionResult = await supabase.auth.getSession();
    const token = sessionResult.data.session?.access_token;

    if (!token) {
      setStatus("error");
      setMessage("Acesso restrito. Entre com uma conta autorizada da consultoria.");
      return;
    }

    const response = await fetch("/api/pasini/recruitment-requests", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    const payload = (await response.json()) as {
      requests?: RequestRow[];
      error?: string;
    };

    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error || "Nao foi possivel carregar as solicitacoes.");
      return;
    }

    setRequests(payload.requests || []);
    setStatus("ready");
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  async function openPdf(requestId: string) {
    if (!supabase) {
      setMessage("Configuracao publica do Supabase indisponivel.");
      return;
    }

    setOpeningPdfId(requestId);
    setMessage("");

    const sessionResult = await supabase.auth.getSession();
    const token = sessionResult.data.session?.access_token;

    if (!token) {
      setOpeningPdfId("");
      setMessage("Acesso restrito. Entre com uma conta autorizada da consultoria.");
      return;
    }

    const response = await fetch(
      "/api/pasini/recruitment-requests/" + requestId + "/proposal-pdf",
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    if (!response.ok) {
      setOpeningPdfId("");
      setMessage("Nao foi possivel abrir o PDF desta solicitacao.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setOpeningPdfId("");
  }

  return (
    <main className="min-h-screen bg-[#101b3b] px-6 py-8 text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#dcbe7e]">
              Querino & Pasini Consultoria
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Solicitacoes recebidas
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/70 md:text-base">
              Painel interno para acompanhar pedidos de analise enviados pela landing de recrutamento e selecao.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests()}
            className="rounded-full border border-[#dcbe7e]/70 px-5 py-3 text-sm font-semibold text-[#dcbe7e] transition hover:bg-[#dcbe7e] hover:text-[#101b3b]"
          >
            Atualizar lista
          </button>
        </header>

        {message ? (
          <div className="rounded-3xl border border-[#dcbe7e]/30 bg-white/[0.06] px-5 py-4 text-sm text-white/80">
            {message}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Total</p>
            <p className="mt-3 text-3xl font-semibold">{requests.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Pendentes</p>
            <p className="mt-3 text-3xl font-semibold">
              {requests.filter((item) => item.status === "pending_consultancy_review" || item.status === "new").length}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Em assinatura</p>
            <p className="mt-3 text-3xl font-semibold">
              {requests.filter((item) => item.status === "pending_govbr_signature").length}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Contratadas</p>
            <p className="mt-3 text-3xl font-semibold">
              {requests.filter((item) => item.status === "contracted_signed" || item.status === "hired").length}
            </p>
          </div>
        </section>

        {status === "loading" ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/70">
            Carregando solicitacoes...
          </div>
        ) : null}

        {status === "ready" && requests.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/70">
            Nenhuma solicitacao recebida ainda.
          </div>
        ) : null}

        {requests.length > 0 ? (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <div className="grid grid-cols-12 gap-4 border-b border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              <div className="col-span-3">Empresa</div>
              <div className="col-span-3">Vaga</div>
              <div className="col-span-2">Plano</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Acoes</div>
            </div>

            <div className="divide-y divide-white/10">
              {requests.map((item) => (
                <article key={item.id} className="grid grid-cols-12 gap-4 px-5 py-5 text-sm">
                  <div className="col-span-12 md:col-span-3">
                    <p className="font-semibold text-white">
                      {text(item.company_trade_name, text(item.company_legal_name, "Empresa sem nome"))}
                    </p>
                    <p className="mt-1 text-white/55">{text(item.company_cnpj)}</p>
                    <p className="mt-2 text-xs text-white/45">
                      {text(item.requester_name)} | {text(item.requester_email)}
                    </p>
                  </div>

                  <div className="col-span-12 md:col-span-3">
                    <p className="font-semibold text-white">{text(item.job_title, "Vaga nao informada")}</p>
                    <p className="mt-1 text-white/55">
                      {item.position_count || 1} vaga(s) | {labelFrom(vacancyLabels, item.vacancy_information_status)}
                    </p>
                    <p className="mt-2 text-xs text-white/45">Recebido em {formatDate(item.created_at)}</p>
                  </div>

                  <div className="col-span-12 md:col-span-2">
                    <p className="text-white/80">Sugerido: {labelFrom(packageLabels, item.recommended_package)}</p>
                    <p className="mt-1 text-white/80">Escolhido: {labelFrom(packageLabels, item.selected_package)}</p>
                    <p className="mt-1 text-xs text-white/45">{labelFrom(paymentLabels, item.payment_terms)}</p>
                  </div>

                  <div className="col-span-12 md:col-span-2">
                    <span className="inline-flex rounded-full border border-[#dcbe7e]/40 px-3 py-1 text-xs font-semibold text-[#dcbe7e]">
                      {labelFrom(statusLabels, item.status)}
                    </span>
                    <p className="mt-2 text-xs text-white/45">gov.br: {text(item.govbr_signature_status)}</p>
                  </div>

                  <div className="col-span-12 flex items-center justify-start md:col-span-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => void openPdf(item.id)}
                      disabled={openingPdfId === item.id}
                      className="rounded-full bg-[#dcbe7e] px-4 py-2 text-xs font-semibold text-[#101b3b] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                    >
                      {openingPdfId === item.id ? "Abrindo..." : "Abrir PDF"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

