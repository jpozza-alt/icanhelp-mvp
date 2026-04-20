"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const PROTECTED_TARGET = "/dashboard/nr1/diagnostico-inicial";
const RETURN_TARGET = "/dashboard/nr1/entrar?afterLogin=1";

type Phase = "checking" | "redirecting-login" | "ready" | "failed";

function Nr1EntryBridgeContent() {
  const searchParams = useSearchParams();
  const afterLogin = searchParams.get("afterLogin") === "1";

  const [phase, setPhase] = useState<Phase>("checking");
  const [detail, setDetail] = useState("Verificando sua sessao antes de abrir a jornada.");

  const loginUrl = useMemo(() => {
    return "/login?next=" + encodeURIComponent(RETURN_TARGET);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        for (let attempt = 0; attempt < 12; attempt++) {
          const result = await supabase.auth.getSession();
          if (result.data.session) {
            if (!cancelled) {
              setPhase("ready");
              setDetail("Sessao encontrada. Abrindo diagnostico.");
              window.location.assign(PROTECTED_TARGET);
            }
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        if (afterLogin) {
          if (!cancelled) {
            setPhase("failed");
            setDetail("A sessao nao ficou disponivel mesmo depois do login. Use o botao abaixo para tentar novamente.");
          }
          return;
        }

        if (!cancelled) {
          setPhase("redirecting-login");
          setDetail("Voce precisa entrar antes de abrir o diagnostico. Redirecionando para o login.");
          window.location.assign(loginUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setPhase("failed");
          setDetail("Falha ao verificar a sessao. Tente novamente.");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [afterLogin, loginUrl]);

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-6 py-10 text-[#22313F]">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#D9E0E7] bg-white p-8 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
          icanHelp
        </div>

        <h1 className="mt-4 text-3xl font-semibold leading-tight">
          Abrindo a jornada NR-1
        </h1>

        <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
          {detail}
        </p>

        <div className="mt-8 rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-5 text-sm leading-7 text-[#5B6B79]">
          Estado atual: <strong>{phase}</strong>
        </div>

        {phase === "failed" ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.assign(loginUrl)}
              className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white"
            >
              Entrar novamente
            </button>

            <button
              type="button"
              onClick={() => window.location.assign(RETURN_TARGET)}
              className="rounded-xl border border-[#D9E0E7] bg-white px-5 py-3 text-sm font-semibold text-[#22313F]"
            >
              Tentar de novo
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function Nr1EntryBridgePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F7F8FA] px-6 py-10 text-[#22313F]">
          <div className="mx-auto max-w-3xl rounded-3xl border border-[#D9E0E7] bg-white p-8 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              icanHelp
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">Abrindo a jornada NR-1</h1>
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">Preparando a verificacao da sua sessao.</p>
          </div>
        </main>
      }
    >
      <Nr1EntryBridgeContent />
    </Suspense>
  );
}
