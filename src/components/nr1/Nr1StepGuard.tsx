"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isNr1DiagnosticoLocalCompleted } from "@/lib/nr1-diagnostico-local";

type StepKey = "diagnostico-inicial" | "setores" | "riscos" | "plano-de-acao";

type Nr1StepGuardProps = {
  stepKey: StepKey;
  title: string;
  description: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

const ROUTES: Record<StepKey, string> = {
  "diagnostico-inicial": "/dashboard/nr1/diagnostico-inicial",
  setores: "/dashboard/nr1/setores",
  riscos: "/dashboard/nr1/riscos",
  "plano-de-acao": "/dashboard/nr1/plano-de-acao",
};

export function Nr1StepGuard(props: Nr1StepGuardProps) {
  const [ready, setReady] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(false);

  useEffect(() => {
    setLocalCompleted(isNr1DiagnosticoLocalCompleted());
    setReady(true);
  }, []);

  const requiresDiagnostico = useMemo(() => {
    return props.stepKey === "riscos" || props.stepKey === "plano-de-acao";
  }, [props.stepKey]);

  if (!ready) {
    return (
      <section className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
        <h2 className="text-2xl font-semibold text-[#132238]">Preparando etapa</h2>
        <p className="mt-3 text-sm leading-7 text-[#60718A]">
          Validando o estado local do diagnostico inicial.
        </p>
      </section>
    );
  }

  if (!requiresDiagnostico || localCompleted) {
    return <>{props.children ?? null}</>;
  }

  return (
    <section className="rounded-[24px] border border-[#FFE3AA] bg-[#FFF8EA] p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#C88A16]">
        Bloqueio por pre-requisito
      </div>

      <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
        Diagnostico inicial pendente
      </h2>

      <p className="mt-3 text-sm leading-7 text-[#60718A]">
        Conclua o diagnostico inicial para liberar esta etapa. Depois disso, o bloqueio pode
        migrar apenas para setores ou riscos subsequentes.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={ROUTES["diagnostico-inicial"]}
          className="inline-flex rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
        >
          Abrir diagnostico inicial
        </Link>

        <Link
          href={ROUTES.setores}
          className="inline-flex rounded-[14px] border border-[#DBE5F0] bg-white px-4 py-3 text-sm font-semibold text-[#132238] transition hover:bg-[#F8FBFF]"
        >
          Ir para setores
        </Link>
      </div>
    </section>
  );
}

export default Nr1StepGuard;