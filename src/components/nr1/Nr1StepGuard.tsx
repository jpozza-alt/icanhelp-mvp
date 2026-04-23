"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isNr1DiagnosticoLocalCompleted } from "@/lib/nr1-diagnostico-local";
import { isNr1SetoresLocalCompleted } from "@/lib/nr1-setores-local";

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
  const [diagnosticoCompleted, setDiagnosticoCompleted] = useState(false);
  const [setoresCompleted, setSetoresCompleted] = useState(false);

  useEffect(() => {
    setDiagnosticoCompleted(isNr1DiagnosticoLocalCompleted());
    setSetoresCompleted(isNr1SetoresLocalCompleted());
    setReady(true);
  }, []);

  const guardState = useMemo(() => {
    if (props.stepKey === "diagnostico-inicial") {
      return { allowed: true, missing: "" };
    }

    if (props.stepKey === "setores") {
      if (!diagnosticoCompleted) {
        return { allowed: false, missing: "diagnostico" };
      }
      return { allowed: true, missing: "" };
    }

    if (!diagnosticoCompleted) {
      return { allowed: false, missing: "diagnostico" };
    }

    if (!setoresCompleted) {
      return { allowed: false, missing: "setores" };
    }

    return { allowed: true, missing: "" };
  }, [diagnosticoCompleted, props.stepKey, setoresCompleted]);

  if (!ready) {
    return (
      <section className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
        <h2 className="text-2xl font-semibold text-[#132238]">Preparando etapa</h2>
        <p className="mt-3 text-sm leading-7 text-[#60718A]">
          Validando os pre-requisitos locais da jornada.
        </p>
      </section>
    );
  }

  if (guardState.allowed) {
    return <>{props.children ?? null}</>;
  }

  const blockedTitle =
    guardState.missing === "diagnostico"
      ? "Diagnostico inicial pendente"
      : "Setores e atividades pendentes";

  const blockedDescription =
    guardState.missing === "diagnostico"
      ? "Conclua o diagnostico inicial antes de liberar esta etapa."
      : "Conclua a etapa de setores e atividades para liberar riscos e plano de acao.";

  const primaryHref =
    guardState.missing === "diagnostico"
      ? ROUTES["diagnostico-inicial"]
      : ROUTES.setores;

  const primaryLabel =
    guardState.missing === "diagnostico"
      ? "Abrir diagnostico inicial"
      : "Abrir setores e atividades";

  return (
    <section className="rounded-[24px] border border-[#FFE3AA] bg-[#FFF8EA] p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#C88A16]">
        Bloqueio por pre-requisito
      </div>

      <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
        {blockedTitle}
      </h2>

      <p className="mt-3 text-sm leading-7 text-[#60718A]">
        {blockedDescription}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={primaryHref}
          className="inline-flex rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
        >
          {primaryLabel}
        </Link>

        <Link
          href={ROUTES["diagnostico-inicial"]}
          className="inline-flex rounded-[14px] border border-[#DBE5F0] bg-white px-4 py-3 text-sm font-semibold text-[#132238] transition hover:bg-[#F8FBFF]"
        >
          Ir para diagnostico
        </Link>
      </div>
    </section>
  );
}

export default Nr1StepGuard;