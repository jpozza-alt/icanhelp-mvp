"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  isNr1DiagnosticoLocalCompleted,
  readNr1DiagnosticoLocalDraft,
} from "@/lib/nr1-diagnostico-local";

type Nr1JourneyStepId = "diagnostico-inicial" | "setores" | "riscos" | "plano-de-acao";

type Nr1ProgressDashboardProps = {
  currentStep?: Nr1JourneyStepId;
  className?: string;
  [key: string]: unknown;
};

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Nr1ProgressDashboard(props: Nr1ProgressDashboardProps) {
  const [localCompleted, setLocalCompleted] = useState(false);
  const [empresaNome, setEmpresaNome] = useState("Empresa local");
  const [estabelecimentoNome, setEstabelecimentoNome] = useState("Estabelecimento local");

  useEffect(() => {
    setLocalCompleted(isNr1DiagnosticoLocalCompleted());
    const draft = readNr1DiagnosticoLocalDraft();

    if (draft.empresaNome.trim()) {
      setEmpresaNome(draft.empresaNome.trim());
    }

    if (draft.estabelecimentoNome.trim()) {
      setEstabelecimentoNome(draft.estabelecimentoNome.trim());
    }
  }, []);

  const nextHref = useMemo(() => {
    if (!localCompleted) return "/dashboard/nr1/diagnostico-inicial";
    if (props.currentStep === "plano-de-acao") return "/dashboard/nr1/plano-de-acao";
    return "/dashboard/nr1/riscos";
  }, [localCompleted, props.currentStep]);

  const nextLabel = useMemo(() => {
    if (!localCompleted) return "Concluir diagnostico";
    if (props.currentStep === "plano-de-acao") return "Ir para plano";
    return "Ir para riscos";
  }, [localCompleted, props.currentStep]);

  return (
    <section
      className={joinClassNames(
        "rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]",
        props.className
      )}
    >
      <div className="flex flex-col gap-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#60718A]">
            Resumo local
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
            {empresaNome} - {estabelecimentoNome}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] p-4">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#60718A]">
              diagnostico inicial
            </div>
            <div className="mt-2 text-base font-semibold text-[#132238]">
              {localCompleted ? "Concluido" : "Pendente"}
            </div>
          </div>

          <div className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] p-4">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#60718A]">
              bloqueio por diagnostico
            </div>
            <div className="mt-2 text-base font-semibold text-[#132238]">
              {localCompleted ? "Removido" : "Ativo"}
            </div>
          </div>

          <div className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] p-4">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#60718A]">
              proximo passo
            </div>
            <div className="mt-2 text-base font-semibold text-[#132238]">
              {localCompleted ? "Riscos e plano" : "Concluir diagnostico"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/nr1/diagnostico-inicial"
            className="inline-flex rounded-[14px] border border-[#DBE5F0] bg-white px-4 py-3 text-sm font-semibold text-[#132238] transition hover:bg-[#F8FBFF]"
          >
            Abrir diagnostico
          </Link>

          <Link
            href={nextHref}
            className="inline-flex rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
          >
            {nextLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Nr1ProgressDashboard;