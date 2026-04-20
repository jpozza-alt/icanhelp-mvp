export type Nr1JourneyStepId =
  | "diagnostico-inicial"
  | "setores"
  | "riscos"
  | "plano-de-acao";

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
  title: string;
  description: string;
  href: string;
  isComplete: (state: Nr1JourneyProgressState) => boolean;
};

export const NR1_JOURNEY_STEPS: Nr1JourneyStep[] = [
  {
    id: "diagnostico-inicial",
    title: "Diagnostico inicial",
    description: "Defina a base da jornada NR1.",
    href: "/dashboard/nr1/entrar",
    isComplete: (state) => state.hasDiagnosis,
  },
  {
    id: "setores",
    title: "Setores",
    description: "Cadastre os setores que entram no fluxo.",
    href: "/dashboard/nr1/setores",
    isComplete: (state) => state.hasDepartments,
  },
  {
    id: "riscos",
    title: "Riscos",
    description: "Consolide os riscos identificados.",
    href: "/dashboard/nr1/riscos",
    isComplete: (state) => state.hasRisks,
  },
  {
    id: "plano-de-acao",
    title: "Plano de acao",
    description: "Transforme riscos em acao acompanhavel.",
    href: "/dashboard/nr1/plano-de-acao",
    isComplete: (state) => state.hasActionPlans,
  },
];

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
  const completedSteps = NR1_JOURNEY_STEPS.filter((step) => step.isComplete(state)).length;
  const totalSteps = NR1_JOURNEY_STEPS.length;
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
  const firstIncomplete = NR1_JOURNEY_STEPS.find((step) => !step.isComplete(state));

  if (!firstIncomplete) {
    const fallback =
      (currentStep ? getNr1JourneyStepById(currentStep) : undefined) ??
      NR1_JOURNEY_STEPS[NR1_JOURNEY_STEPS.length - 1];

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

  const currentIndex = getNr1JourneyStepIndex(currentStep);
  const firstIncompleteIndex = getNr1JourneyStepIndex(firstIncomplete.id);

  if (firstIncompleteIndex <= currentIndex) {
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

