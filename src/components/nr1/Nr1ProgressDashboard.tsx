"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  NR1_JOURNEY_STEPS,
  getNr1JourneyProgress,
  getNr1JourneyStepById,
  resolveNr1JourneyTarget,
  type Nr1JourneyProgressState,
  type Nr1JourneyStepId,
} from "@/lib/nr1-journey";
import { useNr1JourneyState } from "@/hooks/useNr1JourneyState";

type Nr1ProgressDashboardProps = {
  currentStep?: Nr1JourneyStepId;
};

type StepStatus = "complete" | "available" | "blocked";

function getStepStatus(
  stepId: Nr1JourneyStepId,
  state: Nr1JourneyProgressState,
  targetStepId: Nr1JourneyStepId,
): StepStatus {
  const step = getNr1JourneyStepById(stepId);

  if (step?.isComplete(state)) {
    return "complete";
  }

  if (stepId === targetStepId) {
    return "available";
  }

  return "blocked";
}

function getStatusLabel(status: StepStatus) {
  if (status === "complete") {
    return "Concluida";
  }

  if (status === "available") {
    return "Disponivel agora";
  }

  return "Bloqueada";
}

function getKpiValue(value: boolean) {
  return value ? "Sim" : "Nao";
}

export function Nr1ProgressDashboard({
  currentStep = "diagnostico-inicial",
}: Nr1ProgressDashboardProps) {
  const router = useRouter();
  const journeyState = useNr1JourneyState();

  const progress = useMemo(
    () => getNr1JourneyProgress(journeyState),
    [journeyState],
  );

  const target = useMemo(
    () => resolveNr1JourneyTarget(journeyState, currentStep),
    [journeyState, currentStep],
  );

  const currentDefinition = useMemo(
    () => getNr1JourneyStepById(currentStep),
    [currentStep],
  );

  const refreshedAtLabel = useMemo(() => {
    if (!journeyState.refreshedAt) {
      return "Ainda nao carregado";
    }

    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(journeyState.refreshedAt));
    } catch {
      return journeyState.refreshedAt;
    }
  }, [journeyState.refreshedAt]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Painel de progresso NR1
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Visao da jornada em tempo real
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Veja o que ja foi concluido, o que falta e qual e a proxima etapa liberada da jornada.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Atualizacao do painel</p>
            <p className="mt-1">{journeyState.isLoading ? "Carregando..." : refreshedAtLabel}</p>
            {journeyState.error ? (
              <p className="mt-2 text-xs text-rose-600">{journeyState.error}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Progresso geral
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{progress.percent}%</p>
            <p className="mt-2 text-sm text-slate-600">
              {progress.completedSteps} de {progress.totalSteps} etapas concluidas
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Etapa atual
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {currentDefinition?.title ?? "Jornada NR1"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {currentDefinition?.description ?? "Acompanhe a jornada passo a passo."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Proxima acao
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{target.step.title}</p>
            <p className="mt-2 text-sm text-slate-600">{target.step.description}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Jornada iniciada
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {getKpiValue(journeyState.hasJourneyProgress)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              O painel considera dados reais ja detectados nas etapas.
            </p>
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Mapa das etapas</h3>
                <p className="mt-1 text-sm text-slate-600">
                  O sistema marca o que ja esta concluido e destaca a proxima etapa liberada.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {NR1_JOURNEY_STEPS.map((step, index) => {
                const status = getStepStatus(step.id, journeyState, target.step.id);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => router.push(step.href)}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">{step.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                      </div>
                    </div>

                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                      {getStatusLabel(status)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900">Leitura rapida do estado</h3>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span>Diagnostico inicial</span>
                  <strong className="text-slate-900">{getKpiValue(journeyState.hasDiagnosis)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span>Setores cadastrados</span>
                  <strong className="text-slate-900">{getKpiValue(journeyState.hasDepartments)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span>Riscos detectados</span>
                  <strong className="text-slate-900">{getKpiValue(journeyState.hasRisks)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span>Plano de acao</span>
                  <strong className="text-slate-900">{getKpiValue(journeyState.hasActionPlans)}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900">Proxima acao recomendada</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                O sistema sempre aponta a primeira etapa ainda incompleta para evitar salto indevido ou retrabalho.
              </p>
              <button
                type="button"
                onClick={() => router.push(target.step.href)}
                disabled={Boolean(journeyState.isLoading)}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {journeyState.isLoading ? "Carregando painel..." : `Ir para ${target.step.title}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Nr1ProgressDashboard;
