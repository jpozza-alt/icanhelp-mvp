"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Phase = "checking" | "redirecting-login" | "ready" | "failed";

const WORKSPACE_PATH = "/dashboard/nr1/workspace";
const STORAGE_COMPANY = "nr1_workspace_company";
const STORAGE_ESTABLISHMENT = "nr1_workspace_establishment";

const companyOptions = [
  "Pasini Consultoria",
  "Empresa Modelo A",
  "Empresa Modelo B",
];

const establishmentOptionsByCompany: Record<string, string[]> = {
  "Pasini Consultoria": ["Estabelecimento Matriz", "Unidade Operacional", "Frente Externa"],
  "Empresa Modelo A": ["Matriz A", "Filial A1"],
  "Empresa Modelo B": ["Matriz B", "Base Campo B"],
};

const summaryCards = [
  { value: "workspace", label: "porta oficial da area autenticada" },
  { value: "contexto", label: "empresa e estabelecimento ativos" },
  { value: "4", label: "atalhos operacionais" },
  { value: "NR-1", label: "jornada ativa" },
];

async function waitForSession() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await supabase.auth.getSession();
    if (result.data.session) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function buildQuery(company: string, establishment: string, contextSaved: boolean) {
  if (!contextSaved || !company || !establishment) {
    return "";
  }

  return (
    "?company=" +
    encodeURIComponent(company) +
    "&establishment=" +
    encodeURIComponent(establishment)
  );
}

export default function Nr1WorkspacePage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [detail, setDetail] = useState("Validando sua sessao antes de abrir o workspace.");
  const [company, setCompany] = useState("");
  const [establishment, setEstablishment] = useState("");
  const [contextSaved, setContextSaved] = useState(false);
  const [contextMessage, setContextMessage] = useState("Defina o contexto ativo para liberar os atalhos operacionais.");

  const loginUrl = useMemo(() => {
    return "/login?next=" + encodeURIComponent(WORKSPACE_PATH);
  }, []);

  const establishmentOptions = useMemo(() => {
    return establishmentOptionsByCompany[company] ?? [];
  }, [company]);

  const actions = useMemo(() => {
    const query = buildQuery(company, establishment, contextSaved);

    return [
      {
        title: "Diagnostico inicial",
        href: "/dashboard/nr1/diagnostico-inicial" + query,
        text: "Abrir o ponto inicial da jornada autenticada.",
      },
      {
        title: "Setores e atividades",
        href: "/dashboard/nr1/setores" + query,
        text: "Ir direto para a base operacional.",
      },
      {
        title: "Riscos e prioridades",
        href: "/dashboard/nr1/riscos" + query,
        text: "Abrir a etapa de riscos e prioridades.",
      },
      {
        title: "Plano de acao",
        href: "/dashboard/nr1/plano-de-acao" + query,
        text: "Abrir a etapa de plano de acao.",
      },
    ];
  }, [company, establishment, contextSaved]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const hasSession = await waitForSession();

        if (hasSession) {
          if (!cancelled) {
            setPhase("ready");
            setDetail("Sessao encontrada. Workspace operacional liberado.");
          }
          return;
        }

        if (!cancelled) {
          setPhase("redirecting-login");
          setDetail("Voce precisa entrar antes de abrir o workspace. Redirecionando para o login.");
          window.location.assign(loginUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setPhase("failed");
          setDetail(error instanceof Error ? error.message : "Falha ao validar a sessao.");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [loginUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedCompany = window.localStorage.getItem(STORAGE_COMPANY) ?? "";
    const storedEstablishment = window.localStorage.getItem(STORAGE_ESTABLISHMENT) ?? "";

    if (storedCompany) {
      setCompany(storedCompany);
    }

    if (storedEstablishment) {
      setEstablishment(storedEstablishment);
    }

    if (storedCompany && storedEstablishment) {
      setContextSaved(true);
      setContextMessage("Contexto ativo carregado do navegador.");
    }
  }, []);

  useEffect(() => {
    if (!company) {
      setEstablishment("");
      setContextSaved(false);
      return;
    }

    if (establishment && establishmentOptions.indexOf(establishment) < 0) {
      setEstablishment("");
      setContextSaved(false);
    }
  }, [company, establishment, establishmentOptions]);

  function handleSaveContext() {
    if (!company || !establishment) {
      setContextSaved(false);
      setContextMessage("Preencha empresa e estabelecimento antes de continuar.");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_COMPANY, company);
      window.localStorage.setItem(STORAGE_ESTABLISHMENT, establishment);
    }

    setContextSaved(true);
    setContextMessage("Contexto ativo confirmado. Agora os atalhos operacionais podem ser usados.");
  }

  function handleClearContext() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_COMPANY);
      window.localStorage.removeItem(STORAGE_ESTABLISHMENT);
    }

    setCompany("");
    setEstablishment("");
    setContextSaved(false);
    setContextMessage("Contexto limpo. Defina novamente empresa e estabelecimento.");
  }

  const contextReady = phase === "ready" && contextSaved && !!company && !!establishment;

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#132238]">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0F2337_0%,#13495C_60%,#178A8F_100%)] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
          <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">workspace autenticado</div>
          <h1 className="mt-4 text-[38px] font-semibold leading-tight">Area real da jornada NR-1</h1>
          <p className="mt-3 max-w-[760px] text-base leading-7 text-white/85">
            Esta passa a ser a porta oficial do uso real do modulo. Defina o contexto operacional
            antes de abrir as etapas da jornada.
          </p>
          <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
            Estado atual: {phase}
          </div>
          <div className="mt-3 text-sm leading-7 text-white/85">{detail}</div>
        </section>

        <section className="mt-[18px] grid gap-[18px] md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <div
              key={item.label}
              className="grid gap-2 rounded-[20px] border border-[#DBE5F0] bg-[linear-gradient(180deg,#FFFFFF,#F8FBFF)] p-[18px] shadow-[0_10px_30px_rgba(18,40,70,0.08)]"
            >
              <div className="text-[28px] font-extrabold">{item.value}</div>
              <div className="text-[13px] text-[#60718A]">{item.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-[18px] grid gap-[18px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Contexto ativo</h2>
              <span
                className={
                  contextReady
                    ? "rounded-full border border-[#C8F0DA] bg-[#EBFBF3] px-[10px] py-[7px] text-xs font-bold text-[#20865A]"
                    : "rounded-full border border-[#FFE3AA] bg-[#FFF8EA] px-[10px] py-[7px] text-xs font-bold text-[#C88A16]"
                }
              >
                {contextReady ? "pronto" : "pendente"}
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#60718A]">
              Antes de abrir as etapas, confirme empresa e estabelecimento. Isso organiza a retomada e
              prepara a jornada para uso real.
            </p>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-[#132238]">
                Empresa
                <select
                  value={company}
                  onChange={(event) => {
                    setCompany(event.target.value);
                    setContextSaved(false);
                  }}
                  className="h-14 rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 text-base outline-none transition focus:border-[#13A3A8] focus:bg-white"
                >
                  <option value="">Selecione a empresa</option>
                  {companyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#132238]">
                Estabelecimento
                <select
                  value={establishment}
                  onChange={(event) => {
                    setEstablishment(event.target.value);
                    setContextSaved(false);
                  }}
                  disabled={!company}
                  className="h-14 rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 text-base outline-none transition focus:border-[#13A3A8] focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="">Selecione o estabelecimento</option>
                  {establishmentOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveContext}
                  className="rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
                >
                  Confirmar contexto
                </button>

                <button
                  type="button"
                  onClick={handleClearContext}
                  className="rounded-[14px] border border-[#DBE5F0] bg-white px-4 py-3 text-sm font-semibold text-[#132238] transition hover:bg-[#F8FBFF]"
                >
                  Limpar contexto
                </button>
              </div>

              <div className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] p-4 text-sm leading-7 text-[#60718A]">
                {contextMessage}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Resumo do contexto</h2>
              <span className="rounded-full border border-[#C7EEEE] bg-[#E7F7F7] px-[10px] py-[7px] text-xs font-bold text-[#0F7B83]">
                uso real
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#60718A]">empresa ativa</div>
                <div className="mt-2 text-base font-semibold">{company || "Nao definida"}</div>
              </div>

              <div className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#60718A]">estabelecimento ativo</div>
                <div className="mt-2 text-base font-semibold">{establishment || "Nao definido"}</div>
              </div>

              <div className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#60718A]">prontidao operacional</div>
                <div className="mt-2 text-base font-semibold">{contextReady ? "Pronto para abrir etapas" : "Contexto ainda pendente"}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-[18px] grid gap-[18px] xl:grid-cols-4">
          {actions.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]"
            >
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#60718A]">{item.text}</p>

              {contextReady ? (
                <Link
                  href={item.href}
                  className="mt-5 inline-flex rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
                >
                  Abrir etapa
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex cursor-not-allowed rounded-[14px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 py-3 text-sm font-semibold text-[#60718A] opacity-70"
                >
                  Defina o contexto primeiro
                </button>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}