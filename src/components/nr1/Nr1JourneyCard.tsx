"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  NR1_JOURNEY_STEPS,
  getNr1JourneyPreviousStep,
  getNr1JourneyProgress,
  getNr1JourneyStepById,
  resolveNr1JourneyTarget,
  type Nr1JourneyStepId,
} from "@/lib/nr1-journey";
import { useNr1JourneyState } from "@/hooks/useNr1JourneyState";

type Nr1JourneyCardProps = {
  currentStep: Nr1JourneyStepId;
};

function buildPrimaryButtonLabel(args: {
  isLoading: boolean;
  currentStep: Nr1JourneyStepId;
  targetStepId: Nr1JourneyStepId;
  targetTitle: string;
  allCompleted: boolean;
}) {
  if (args.isLoading) {
    return "Carregando jornada...";
  }

  if (args.allCompleted) {
    return "Abrir plano de acao";
  }

  if (args.currentStep === args.targetStepId) {
    return "Continuar jornada";
  }

  return "Continuar jornada: " + args.targetTitle;
}

export function Nr1JourneyCard({ currentStep }: Nr1JourneyCardProps) {
  const router = useRouter();
  const journeyState = useNr1JourneyState();

  const currentStepDefinition = useMemo(
    () => getNr1JourneyStepById(currentStep),
    [currentStep],
  );

  const target = useMemo(
    () => resolveNr1JourneyTarget(journeyState, currentStep),
    [journeyState, currentStep],
  );

  const previousStep = useMemo(
    () => getNr1JourneyPreviousStep(currentStep),
    [currentStep],
  );

  const progress = useMemo(
    () => getNr1JourneyProgress(journeyState),
    [journeyState],
  );

  const allCompleted = progress.completedSteps === progress.totalSteps;
  const primaryLabel = buildPrimaryButtonLabel({
    isLoading: Boolean(journeyState.isLoading),
    currentStep,
    targetStepId: target.step.id,
    targetTitle: target.step.title,
    allCompleted,
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Jornada NR1
          </span>
          <h2 className="text-2xl font-semibold text-slate-900">
            {currentStepDefinition?.title ?? "Jornada NR1"}
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            {journeyState.error
              ? "Nao foi possivel confirmar todas as etapas automaticamente. O botao ainda leva para a melhor proxima etapa calculada."
              : "O botao principal sempre leva para a proxima etapa real da jornada, sem depender da ordem tecnica."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Progresso: {progress.completedSteps} de {progress.totalSteps}
            </span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: progress.percent + "%" }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {NR1_JOURNEY_STEPS.map((step) => {
            const isCurrent = step.id === currentStep;
            const isComplete = step.isComplete(journeyState);

            return (
              <div
                key={step.id}
                className={
                  "rounded-2xl border p-4 transition-all " +
                  (isCurrent
                    ? "border-slate-900 bg-slate-900 text-white"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-700")
                }
              >
                <div className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
                  {isCurrent ? "Atual" : isComplete ? "Concluido" : "Pendente"}
                </div>
                <div className="mt-2 text-base font-semibold">{step.title}</div>
                <p className="mt-2 text-sm leading-5 opacity-90">{step.description}</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {previousStep ? (
            <button
              type="button"
              onClick={() => router.push(previousStep.href)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Voltar
            </button>
          ) : null}

          <button
            type="button"
            disabled={Boolean(journeyState.isLoading)}
            onClick={() => router.push(target.step.href)}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {primaryLabel}
          </button>

          <button
            type="button"
            onClick={() => void journeyState.refresh()}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Atualizar estado
          </button>
        </div>
      </div>
    </section>
  );
}

export default Nr1JourneyCard;
