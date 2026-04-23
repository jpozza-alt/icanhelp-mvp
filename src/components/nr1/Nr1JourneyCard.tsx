"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isNr1DiagnosticoLocalCompleted } from "@/lib/nr1-diagnostico-local";
import { isNr1SetoresLocalCompleted } from "@/lib/nr1-setores-local";

type Nr1JourneyStepId = "diagnostico-inicial" | "setores" | "riscos" | "plano-de-acao";

type Nr1JourneyCardProps = {
  currentStep?: Nr1JourneyStepId;
  className?: string;
  [key: string]: unknown;
};

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Nr1JourneyCard(props: Nr1JourneyCardProps) {
  const [diagnosticoCompleted, setDiagnosticoCompleted] = useState(false);
  const [setoresCompleted, setSetoresCompleted] = useState(false);

  useEffect(() => {
    setDiagnosticoCompleted(isNr1DiagnosticoLocalCompleted());
    setSetoresCompleted(isNr1SetoresLocalCompleted());
  }, []);

  const currentStep = props.currentStep ?? "diagnostico-inicial";

  const card = useMemo(() => {
    if (!diagnosticoCompleted) {
      return {
        title: "Concluir diagnostico inicial",
        description:
          "A primeira liberacao real da jornada depende do diagnostico inicial preenchido e concluido.",
        href: "/dashboard/nr1/diagnostico-inicial",
        buttonLabel: "Abrir diagnostico",
        badge: "pendente",
        badgeClassName: "border-[#FFE3AA] bg-[#FFF8EA] text-[#C88A16]",
      };
    }

    if (!setoresCompleted) {
      return {
        title: "Concluir setores e atividades",
        description:
          "A proxima liberacao da jornada depende da etapa de setores preenchida e concluida.",
        href: "/dashboard/nr1/setores",
        buttonLabel: "Abrir setores",
        badge: "pendente",
        badgeClassName: "border-[#FFE3AA] bg-[#FFF8EA] text-[#C88A16]",
      };
    }

    if (currentStep === "plano-de-acao") {
      return {
        title: "Setores concluidos",
        description: "Os pre-requisitos locais foram atendidos. Agora voce pode seguir em plano de acao.",
        href: "/dashboard/nr1/plano-de-acao",
        buttonLabel: "Ir para plano",
        badge: "liberado",
        badgeClassName: "border-[#C8F0DA] bg-[#EBFBF3] text-[#20865A]",
      };
    }

    return {
      title: "Setores concluidos",
      description: "Os pre-requisitos locais foram atendidos. Agora voce pode seguir em riscos.",
      href: "/dashboard/nr1/riscos",
      buttonLabel: "Ir para riscos",
      badge: "liberado",
      badgeClassName: "border-[#C8F0DA] bg-[#EBFBF3] text-[#20865A]",
    };
  }, [currentStep, diagnosticoCompleted, setoresCompleted]);

  return (
    <article
      className={joinClassNames(
        "rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]",
        props.className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#132238]">{card.title}</h2>
          <p className="mt-3 text-sm leading-7 text-[#60718A]">{card.description}</p>
        </div>

        <span
          className={`rounded-full border px-[10px] py-[7px] text-xs font-bold uppercase tracking-[0.08em] ${card.badgeClassName}`}
        >
          {card.badge}
        </span>
      </div>

      <div className="mt-5">
        <Link
          href={card.href}
          className="inline-flex rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
        >
          {card.buttonLabel}
        </Link>
      </div>
    </article>
  );
}

export default Nr1JourneyCard;