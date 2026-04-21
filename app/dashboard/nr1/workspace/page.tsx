"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Phase = "checking" | "redirecting-login" | "ready" | "failed";

const WORKSPACE_PATH = "/dashboard/nr1/workspace";

const cards = [
  { value: "workspace", label: "porta oficial da area autenticada" },
  { value: "1", label: "rota canonica de entrada" },
  { value: "3", label: "atalhos operacionais" },
  { value: "NR-1", label: "jornada ativa" },
];

const actions = [
  { title: "Diagnostico inicial", href: "/dashboard/nr1/diagnostico-inicial", text: "Abrir o ponto inicial da jornada autenticada." },
  { title: "Setores e atividades", href: "/dashboard/nr1/setores", text: "Ir direto para a base operacional." },
  { title: "Riscos e prioridades", href: "/dashboard/nr1/riscos", text: "Abrir a etapa de riscos e prioridades." },
];

async function waitForSession() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await supabase.auth.getSession();
    if (result.data.session) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

export default function Nr1WorkspacePage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [detail, setDetail] = useState("Validando sua sessao antes de abrir o workspace.");

  const loginUrl = useMemo(() => {
    return "/login?next=" + encodeURIComponent(WORKSPACE_PATH);
  }, []);

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

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#132238]">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0F2337_0%,#13495C_60%,#178A8F_100%)] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
          <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">workspace autenticado</div>
          <h1 className="mt-4 text-[38px] font-semibold leading-tight">Area real da jornada NR-1</h1>
          <p className="mt-3 max-w-[760px] text-base leading-7 text-white/85">
            Esta passa a ser a porta oficial do uso real do modulo. A vitrine publica fica fora daqui,
            e o login volta para este hub, nao mais para a ponte antiga.
          </p>
          <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
            Estado atual: {phase}
          </div>
          <div className="mt-3 text-sm leading-7 text-white/85">{detail}</div>
        </section>

        <section className="mt-[18px] grid gap-[18px] md:grid-cols-2 xl:grid-cols-4">
          {cards.map((item) => (
            <div key={item.label} className="grid gap-2 rounded-[20px] border border-[#DBE5F0] bg-[linear-gradient(180deg,#FFFFFF,#F8FBFF)] p-[18px] shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
              <div className="text-[28px] font-extrabold">{item.value}</div>
              <div className="text-[13px] text-[#60718A]">{item.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-[18px] grid gap-[18px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Papel deste hub</h2>
              <span className="rounded-full border border-[#C8F0DA] bg-[#EBFBF3] px-[10px] py-[7px] text-xs font-bold text-[#20865A]">rota canonica</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#60718A]">
              A partir daqui, a navegacao autenticada pode ser reorganizada com contexto, retomada e
              proximo passo claros, sem depender de uma ponte de redirecionamento.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Leitura executiva</h2>
              <span className="rounded-full border border-[#FFE3AA] bg-[#FFF8EA] px-[10px] py-[7px] text-xs font-bold text-[#C88A16]">transicao</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#60718A]">
              Nesta fase, o workspace ainda aponta para algumas rotas antigas da jornada. O objetivo
              agora e estabilizar a navegacao primeiro e migrar as etapas uma a uma depois.
            </p>
          </div>
        </section>

        <section className="mt-[18px] grid gap-[18px] xl:grid-cols-3">
          {actions.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#60718A]">{item.text}</p>
              <Link href={item.href} className="mt-5 inline-flex rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]">
                Abrir etapa
              </Link>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
