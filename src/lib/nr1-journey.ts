export const NR1_JOURNEY_STEP_IDS = [
  "boas-vindas",
  "empresa",
  "estabelecimento",
  "setores",
  "atividades",
  "grupo-exposto",
  "historico-ocupacional",
  "diagnostico-inicial",
  "resultado-diagnostico",
  "riscos",
  "plano-de-acao",
  "evidencias",
  "saude-treinamentos",
  "terceiros",
  "revisoes-auditoria",
  "geracao-pgr",
] as const;

export type Nr1JourneyStepId = (typeof NR1_JOURNEY_STEP_IDS)[number];

export const NR1_LEGACY_JOURNEY_STEP_IDS = [
  "diagnostico-inicial",
  "setores",
  "riscos",
  "plano-de-acao",
] as const satisfies readonly Nr1JourneyStepId[];

export type Nr1LegacyJourneyStepId =
  (typeof NR1_LEGACY_JOURNEY_STEP_IDS)[number];

export type Nr1JourneyStepAvailability = "available" | "planned";
export type Nr1JourneyProgressState = {
  hasDiagnosis: boolean;
  hasDepartments: boolean;
  hasRisks: boolean;
  hasActionPlans: boolean;
  isLoading?: boolean;
  error?: string | null;
  refreshedAt?: string | null;
};

export type Nr1JourneyStep = {
  id: Nr1JourneyStepId;
  order: number;
  title: string;
  description: string;
  href: string;
  availability: Nr1JourneyStepAvailability;
  countsTowardProgress: boolean;
  isComplete: (state: Nr1JourneyProgressState) => boolean;
};
const incompleteUntilSupported = () => false;

export const NR1_JOURNEY_STEPS = [
  {
    id: "boas-vindas",
    order: 1,
    title: "Boas-vindas",
    description: "Conheca o escopo e as regras da jornada NR1.",
    href: "/dashboard/nr1/workspace#nr1-welcome-details",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "empresa",
    order: 2,
    title: "Empresa",
    description: "Qualifique a organizacao que sera avaliada.",
    href: "/dashboard/nr1/workspace",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "estabelecimento",
    order: 3,
    title: "Estabelecimento",
    description: "Defina a unidade abrangida pela jornada.",
    href: "/dashboard/nr1/workspace",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "setores",
    order: 4,
    title: "Setores",
    description: "Cadastre os setores que entram no fluxo.",
    href: "/dashboard/nr1/setores",
    availability: "available",
    countsTowardProgress: true,
    isComplete: (state) => state.hasDepartments,
  },
  {
    id: "atividades",
    order: 5,
    title: "Atividades",
    description: "Descreva as atividades reais de cada setor.",
    href: "/dashboard/nr1/workspace",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "grupo-exposto",
    order: 6,
    title: "Grupo exposto",
    description: "Caracterize grupos expostos sem identificar trabalhadores.",
    href: "/dashboard/nr1/workspace",
    availability: "planned",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "historico-ocupacional",
    order: 7,
    title: "Historico ocupacional agregado",
    description: "Registre apenas indicadores agregados dos ultimos 24 meses.",
    href: "/dashboard/nr1/workspace",
    availability: "planned",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "diagnostico-inicial",
    order: 8,
    title: "Diagnostico guiado",
    description: "Avalie fatores da organizacao do trabalho sem diagnostico clinico.",
    href: "/dashboard/nr1/entrar",
    availability: "available",
    countsTowardProgress: true,
    isComplete: (state) => state.hasDiagnosis,
  },
  {
    id: "resultado-diagnostico",
    order: 9,
    title: "Resultado do diagnostico",
    description: "Revise prioridades, lacunas e escalonamentos necessarios.",
    href: "/dashboard/nr1/workspace",
    availability: "planned",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "riscos",
    order: 10,
    title: "Inventario de riscos",
    description: "Consolide os riscos identificados.",
    href: "/dashboard/nr1/riscos",
    availability: "available",
    countsTowardProgress: true,
    isComplete: (state) => state.hasRisks,
  },
  {
    id: "plano-de-acao",
    order: 11,
    title: "Plano de acao",
    description: "Transforme riscos em acao acompanhavel.",
    href: "/dashboard/nr1/plano-de-acao",
    availability: "available",
    countsTowardProgress: true,
    isComplete: (state) => state.hasActionPlans,
  },
  {
    id: "evidencias",
    order: 12,
    title: "Evidencias",
    description: "Vincule comprovacoes e acompanhe a execucao.",
    href: "/dashboard/nr1/evidencias-acompanhamento",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "saude-treinamentos",
    order: 13,
    title: "Saude e treinamentos",
    description: "Registre referencias ocupacionais e treinamentos sem prontuarios.",
    href: "/dashboard/nr1/saude-treinamentos",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "terceiros",
    order: 14,
    title: "Terceiros",
    description: "Caracterize interfaces e responsabilidades com terceiros.",
    href: "/dashboard/nr1/workspace",
    availability: "planned",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "revisoes-auditoria",
    order: 15,
    title: "Revisoes e auditoria",
    description: "Revise dados e acompanhe a trilha do processo.",
    href: "/dashboard/nr1/trilha-acompanhamento",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "geracao-pgr",
    order: 16,
    title: "Geracao do PGR",
    description: "Revise e gere a versao formal do PGR.",
    href: "/dashboard/nr1/relatorio-pgr",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
] satisfies readonly Nr1JourneyStep[];

const NR1_PROGRESS_STEPS = NR1_LEGACY_JOURNEY_STEP_IDS.map(
  (stepId) => NR1_JOURNEY_STEPS.find((step) => step.id === stepId)!,
);
export function getNr1JourneyStepIndex(stepId: Nr1JourneyStepId): number {
  return NR1_JOURNEY_STEPS.findIndex((step) => step.id === stepId);
}

export function getNr1JourneyStepById(
  stepId: Nr1JourneyStepId,
): Nr1JourneyStep | undefined {
  return NR1_JOURNEY_STEPS.find((step) => step.id === stepId);
}

export function getNr1JourneyPreviousStep(
  currentStep: Nr1JourneyStepId,
): Nr1JourneyStep | null {
  const currentIndex = getNr1JourneyStepIndex(currentStep);

  if (currentIndex <= 0) {
    return null;
  }

  return NR1_JOURNEY_STEPS[currentIndex - 1] ?? null;
}

export function getNr1JourneyProgress(state: Nr1JourneyProgressState) {
  const completedSteps = NR1_PROGRESS_STEPS.filter((step) =>
    step.isComplete(state),
  ).length;
  const totalSteps = NR1_PROGRESS_STEPS.length;
  const percent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

  return {
    completedSteps,
    totalSteps,
    percent,
  };
}

export function resolveNr1JourneyTarget(
  state: Nr1JourneyProgressState,
  currentStep?: Nr1JourneyStepId,
) {
  const firstIncomplete = NR1_PROGRESS_STEPS.find(
    (step) => !step.isComplete(state),
  );

  if (!firstIncomplete) {
    const fallback =
      (currentStep ? getNr1JourneyStepById(currentStep) : undefined) ??
      NR1_PROGRESS_STEPS[NR1_PROGRESS_STEPS.length - 1];

    return {
      step: fallback,
      reason: "completed",
    };
  }

  if (!currentStep) {
    return {
      step: firstIncomplete,
      reason: "next-incomplete",
    };
  }

  const currentIndex = NR1_PROGRESS_STEPS.findIndex(
    (step) => step.id === currentStep,
  );


  const firstIncompleteIndex = NR1_PROGRESS_STEPS.findIndex(
    (step) => step.id === firstIncomplete.id,
  );

  if (currentIndex >= 0 && firstIncompleteIndex <= currentIndex) {
    return {
      step: firstIncomplete,
      reason: "resume-current-or-previous",
    };
  }

  return {
    step: firstIncomplete,
    reason: "next-incomplete",
  };
}
