"use client";

import type { ReactNode } from "react";
import {
  getNr1JourneyStepById,
  type Nr1JourneyStepId,
} from "../../lib/nr1-journey";

type Nr1WorkspaceV2ShellProps = {
  companyName?: string;
  establishmentName?: string;
  pgrStatus?: string;
  progressPercent?: number;
  progressDescription?: string;
  activeModule?: string;
  modules?: string[];
  pendingItems?: string[];
  nextBestActionLabel?: string;
  nextBestActionTitle?: string;
  nextBestActionDescription?: string;
  nextBestActionPrimaryHref?: string;
  nextBestActionPrimaryLabel?: string;
  nextBestActionPrimaryOnClick?: () => void;
  nextBestActionSecondaryHref?: string;
  nextBestActionSecondaryLabel?: string;
  nextBestActionReasons?: string[];
  pgrHref?: string;
  moduleHref?: string;
  topContextSlot?: ReactNode;
  children?: ReactNode;
};

const defaultModules = ["Base", "Mapeamento", "Riscos", "Plano", "Evidências", "PGR"];

const defaultModuleStepIds: Readonly<Record<string, Nr1JourneyStepId>> = {
  Base: "empresa",
  Mapeamento: "atividades",
  Riscos: "riscos",
  Plano: "plano-de-acao",
  "Evidências": "evidencias",
  PGR: "geracao-pgr",
};

function resolveDefaultModuleHref(module: string, fallbackHref: string) {
  const stepId = defaultModuleStepIds[module];

  if (!stepId) {
    return fallbackHref;
  }

  return getNr1JourneyStepById(stepId)?.href ?? fallbackHref;
}

const defaultPendingItems = [
  "Confirmar atividade principal do local de trabalho",
  "Iniciar análise guiada da rotina real",
  "Registrar primeira leitura de risco",
];

const defaultNextBestActionReasons = [
  "Empresa, local de trabalho, setor e atividade já existem.",
  "A próxima decisão depende da rotina real de trabalho.",
  "O PGR precisa de riscos priorizados e evidências.",
];

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function Nr1WorkspaceV2Shell({
  companyName = "Empresa não selecionada",
  establishmentName = "Local de trabalho não selecionado",
  pgrStatus = "Em construção",
  progressPercent = 20,
  progressDescription = "Base pronta. Próximo foco: mapear a rotina real de trabalho.",
  activeModule = "Mapeamento",
  modules = defaultModules,
  pendingItems = defaultPendingItems,
  nextBestActionLabel = "Próxima melhor ação",
  nextBestActionTitle = "Mapear a rotina real da atividade principal",
  nextBestActionDescription = "A base inicial está pronta. Agora o sistema deve entender como o trabalho acontece na prática para transformar essa leitura em riscos, prioridades e plano de ação.",
  nextBestActionPrimaryHref = "/dashboard/nr1/workspace",
  nextBestActionPrimaryLabel = "Iniciar análise guiada",
  nextBestActionPrimaryOnClick,
  nextBestActionSecondaryHref = "/dashboard/nr1/workspace",
  nextBestActionSecondaryLabel = "Revisar base",
  nextBestActionReasons = defaultNextBestActionReasons,
  pgrHref = "/dashboard/nr1/relatorio-pgr",
  moduleHref = "/dashboard/nr1/workspace",
  topContextSlot,
  children,
}: Nr1WorkspaceV2ShellProps) {
  const safeProgress = clampProgress(progressPercent);
  const progressWidth = `${safeProgress}%`;

  return (
    <div className="min-h-screen bg-[#f4efe7] text-[#10243e]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[292px_1fr]">
        <aside className="border-r border-[#e2d4bf] bg-[#10243e] px-5 py-6 text-white">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d8bd78]">
              icanHelp NR-1
            </p>
            <h1 className="mt-3 text-xl font-semibold tracking-tight">
              Workspace GRO/PGR
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Navegação, contexto e progresso. O preenchimento acontece no módulo em foco.
            </p>
          </div>

          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8bd78]">
              Contexto ativo
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-white/50">Empresa</p>
                <p className="mt-1 font-semibold">{companyName}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Local de trabalho</p>
                <p className="mt-1 font-semibold">{establishmentName}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">PGR</p>
                <a
                  href={pgrHref}
                  className="mt-1 inline-flex rounded-full bg-[#d8bd78]/15 px-3 py-1 text-xs font-semibold text-[#f4ddb0] hover:bg-[#d8bd78]/25"
                >
                  {pgrStatus}
                </a>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Progresso</p>
              <p className="text-2xl font-semibold text-[#d8bd78]">{safeProgress}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#d8bd78]" style={{ width: progressWidth }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/55">{progressDescription}</p>
          </section>

          <nav className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-3">
            {modules.map((module) => {
              const isActive = module === activeModule;
              const moduleDestination = resolveDefaultModuleHref(module, moduleHref);

              return (
                <a
                  key={module}
                  href={moduleDestination}
                  className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-[#10243e]"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{module}</span>
                  {isActive ? <span className="text-xs">Atual</span> : null}
                </a>
              );
            })}
          </nav>

          <section className="mt-5 rounded-3xl border border-white/10 bg-[#0b1729] p-5">
            <p className="text-sm font-semibold">Pendências do foco atual</p>
            <div className="mt-4 space-y-2">
              {pendingItems.map((item) => (
                <div key={item} className="flex gap-2 rounded-2xl bg-white/[0.06] p-3 text-xs leading-5 text-white/65">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#d8bd78]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="px-5 py-6 lg:px-8">
          <section className="rounded-[2rem] border border-[#d8bd78] bg-[#10243e] p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d8bd78]">
              {nextBestActionLabel}
            </p>
            <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">{nextBestActionTitle}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
                  {nextBestActionDescription}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={nextBestActionPrimaryHref}
                  onClick={(event) => {
                    if (!nextBestActionPrimaryOnClick) return;
                    event.preventDefault();
                    nextBestActionPrimaryOnClick();
                  }}
                  className="inline-flex justify-center rounded-2xl bg-[#d8bd78] px-5 py-3 text-sm font-bold text-[#10243e]"
                >
                  {nextBestActionPrimaryLabel}
                </a>
                <a
                  href={nextBestActionSecondaryHref}
                  className="inline-flex justify-center rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white"
                >
                  {nextBestActionSecondaryLabel}
                </a>
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {nextBestActionReasons.slice(0, 3).map((item) => (
                <div key={item} className="rounded-2xl bg-white/[0.07] p-3 text-xs leading-5 text-white/70">
                  {item}
                </div>
              ))}
            </div>
          </section>

          {topContextSlot ? (
            <div className="mt-5">
              {topContextSlot}
            </div>
          ) : null}

          {children ? <section className="mt-5">{children}</section> : null}
        </section>
      </div>
    </div>
  );
}