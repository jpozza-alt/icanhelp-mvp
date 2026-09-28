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
  hasEvidence?: boolean;
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
    description: "Qualifique a organização que será avaliada.",
    href: "/dashboard/nr1/workspace",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "estabelecimento",
    order: 3,
    title: "Local de trabalho",
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
    title: "Histórico ocupacional agregado",
    description: "Registre apenas indicadores agregados dos ultimos 24 meses.",
    href: "/dashboard/nr1/workspace",
    availability: "planned",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "diagnostico-inicial",
    order: 8,
    title: "Diagnóstico guiado",
    description: "Avalie fatores da organizacao do trabalho sem diagnostico clinico.",
    href: "/dashboard/nr1/entrar",
    availability: "available",
    countsTowardProgress: true,
    isComplete: (state) => state.hasDiagnosis,
  },
  {
    id: "resultado-diagnostico",
    order: 9,
    title: "Resultado do diagnóstico",
    description: "Revise prioridades, lacunas e escalonamentos necessarios.",
    href: "/dashboard/nr1/workspace",
    availability: "planned",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "riscos",
    order: 10,
    title: "Inventário de riscos",
    description: "Consolide os riscos identificados.",
    href: "/dashboard/nr1/workspace?section=riscos",
    availability: "available",
    countsTowardProgress: true,
    isComplete: (state) => state.hasRisks,
  },
  {
    id: "plano-de-acao",
    order: 11,
    title: "Plano de ação",
    description: "Transforme riscos em acao acompanhavel.",
    href: "/dashboard/nr1/workspace?section=plano",
    availability: "available",
    countsTowardProgress: true,
    isComplete: (state) => state.hasActionPlans,
  },
  {
    id: "evidencias",
    order: 12,
    title: "Evidências",
    description: "Vincule comprovacoes e acompanhe a execucao.",
    href: "/dashboard/nr1/evidencias-acompanhamento",
    availability: "available",
    countsTowardProgress: false,
    isComplete: (state) => Boolean(state.hasEvidence),
  },
  {
    id: "saude-treinamentos",
    order: 13,
    title: "Saúde e treinamentos",
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
    title: "Revisões e auditoria",
    description: "Revise dados e acompanhe a trilha do processo.",
    href: "/dashboard/nr1/trilha-acompanhamento",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
  {
    id: "geracao-pgr",
    order: 16,
    title: "Geração do PGR",
    description: "Revise e gere a versao formal do PGR.",
    href: "/dashboard/nr1/relatorio-pgr",
    availability: "available",
    countsTowardProgress: false,
    isComplete: incompleteUntilSupported,
  },
] satisfies readonly Nr1JourneyStep[];

export type Nr1FullJourneyProgressState = {
  hasCompany: boolean;
  hasEstablishment: boolean;
  hasDepartments: boolean;
  hasActivities: boolean;
  hasDiagnosis: boolean;
  hasRisks: boolean;
  hasActionPlans: boolean;
  hasEvidence?: boolean;
};

export function getNr1FullJourneyCompletedStepIds(
  state: Nr1FullJourneyProgressState,
): Nr1JourneyStepId[] {
  const completed: Nr1JourneyStepId[] = ["boas-vindas"];

  if (state.hasCompany) completed.push("empresa");
  if (state.hasEstablishment) completed.push("estabelecimento");
  if (state.hasDepartments) completed.push("setores");
  if (state.hasActivities) completed.push("atividades");
  if (state.hasDiagnosis) completed.push("diagnostico-inicial");
  if (state.hasRisks) completed.push("riscos");
  if (state.hasActionPlans) completed.push("plano-de-acao");
  if (state.hasEvidence) completed.push("evidencias");

  return completed;
}

export function getNr1FullJourneyProgress(
  state: Nr1FullJourneyProgressState,
) {
  const completedStepIds =
    getNr1FullJourneyCompletedStepIds(state);
  const completedSteps = completedStepIds.length;
  const totalSteps = NR1_JOURNEY_STEPS.length;
  const percent =
    totalSteps === 0
      ? 0
      : Math.round((completedSteps / totalSteps) * 100);

  return {
    completedStepIds,
    completedSteps,
    totalSteps,
    percent,
  };
}

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

/**
 * Jornada canônica NR-1.
 *
 * Este contrato é intencionalmente separado da jornada legada acima.
 * Durante a consolidação, consumidores serão migrados gradualmente para
 * este resolver antes da remoção das APIs antigas.
 */
export const NR1_CANONICAL_JOURNEY_STEP_IDS = [
  "empresa",
  "estabelecimento",
  "mapeamento",
  "diagnostico",
  "investigacao",
  "validacao",
  "inventario-riscos",
  "plano-de-acao",
  "prontidao-pgr",
  "previa-pgr",
  "formalizacao-pgr",
] as const;

export type Nr1CanonicalJourneyStepId =
  (typeof NR1_CANONICAL_JOURNEY_STEP_IDS)[number];

export type Nr1CanonicalDiagnosisStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export type Nr1CanonicalJourneyStepStatus =
  | Nr1CanonicalDiagnosisStatus
  | "pending"
  | "not_applicable";

export type Nr1CanonicalDiagnosisFacts = {
  hasSession: boolean;
  hasContext: boolean;
  hasPsychosocial: boolean;
};

export function resolveNr1CanonicalDiagnosisStatus(
  facts: Nr1CanonicalDiagnosisFacts,
): Nr1CanonicalDiagnosisStatus {
  if (!facts.hasSession) {
    return "not_started";
  }

  if (facts.hasContext && facts.hasPsychosocial) {
    return "completed";
  }

  return "in_progress";
}

export type Nr1CanonicalJourneyBlockingReason =
  | "company_required"
  | "establishment_required"
  | "departments_required"
  | "activities_required"
  | "mapping_required"
  | "diagnosis_required"
  | "investigation_pending"
  | "validation_pending"
  | "risk_conversion_pending"
  | "risk_classification_pending"
  | "risk_treatment_decision_pending"
  | "inventory_required"
  | "action_plan_missing"
  | "pgr_readiness_unknown"
  | "pgr_not_ready"
  | "pgr_preview_required";

export type Nr1CanonicalJourneyFacts = {
  hasCompany: boolean;
  hasEstablishment: boolean;

  hasDepartments: boolean;
  allRelevantDepartmentsHaveActivities: boolean;

  diagnosisStatus: Nr1CanonicalDiagnosisStatus;

  investigationRequired: boolean;
  investigationsResolved: boolean;

  validationRequired: boolean;
  validationsResolved: boolean;

  risksRequiringConversion: number;
  risksPendingClassification: number;
  risksPendingTreatmentDecision: number;

  actionPlansRequired: number;
  actionPlansMissing: number;

  pgrReadiness?: "unknown" | "ready" | "not_ready";
  pgrPreviewGenerated?: boolean;

  pgrFormalizationEnabled?: boolean;
  pgrFormalized?: boolean;
};

export type Nr1CanonicalResolvedJourneyStep = {
  id: Nr1CanonicalJourneyStepId;
  title: string;
  href: string;
  status: Nr1CanonicalJourneyStepStatus;
  available: boolean;
  blockingReasons: Nr1CanonicalJourneyBlockingReason[];
};

export type Nr1CanonicalJourneyResolution = {
  steps: Nr1CanonicalResolvedJourneyStep[];
  currentStepId: Nr1CanonicalJourneyStepId | null;
  nextAction: {
    stepId: Nr1CanonicalJourneyStepId;
    href: string;
    label: string;
  } | null;
  progress: {
    completed: number;
    total: number;
    percent: number;
  };
  blockingReasons: Nr1CanonicalJourneyBlockingReason[];
};

const NR1_CANONICAL_JOURNEY_STEP_META: Record<
  Nr1CanonicalJourneyStepId,
  { title: string; href: string }
> = {
  empresa: {
    title: "Empresa",
    href: "/dashboard/nr1/workspace",
  },
  estabelecimento: {
    title: "Estabelecimento",
    href: "/dashboard/nr1/workspace",
  },
  mapeamento: {
    title: "Mapeamento",
    href: "/dashboard/nr1/workspace",
  },
  diagnostico: {
    title: "Diagnóstico",
    href: "/dashboard/nr1/workspace",
  },
  investigacao: {
    title: "Investigação",
    href: "/dashboard/nr1/workspace",
  },
  validacao: {
    title: "Validação",
    href: "/dashboard/nr1/workspace",
  },
  "inventario-riscos": {
    title: "Inventário de riscos",
    href: "/dashboard/nr1/workspace?section=riscos",
  },
  "plano-de-acao": {
    title: "Plano de ação",
    href: "/dashboard/nr1/workspace?section=plano",
  },
  "prontidao-pgr": {
    title: "Prontidão do PGR",
    href: "/dashboard/nr1/relatorio-pgr",
  },
  "previa-pgr": {
    title: "Prévia do PGR",
    href: "/dashboard/nr1/relatorio-pgr",
  },
  "formalizacao-pgr": {
    title: "Formalização do PGR",
    href: "/dashboard/nr1/relatorio-pgr",
  },
};

function createNr1CanonicalJourneyStep(
  id: Nr1CanonicalJourneyStepId,
  status: Nr1CanonicalJourneyStepStatus,
  available: boolean,
  blockingReasons: Nr1CanonicalJourneyBlockingReason[] = [],
): Nr1CanonicalResolvedJourneyStep {
  const meta = NR1_CANONICAL_JOURNEY_STEP_META[id];

  return {
    id,
    title: meta.title,
    href: meta.href,
    status,
    available,
    blockingReasons,
  };
}

export function resolveNr1CanonicalJourney(
  facts: Nr1CanonicalJourneyFacts,
): Nr1CanonicalJourneyResolution {
  const mappingComplete =
    facts.hasDepartments &&
    facts.allRelevantDepartmentsHaveActivities;

  const diagnosisComplete = facts.diagnosisStatus === "completed";

  const investigationResolved =
    !facts.investigationRequired || facts.investigationsResolved;

  const validationResolved =
    !facts.validationRequired || facts.validationsResolved;

  const analysisResolved =
    diagnosisComplete &&
    investigationResolved &&
    validationResolved;

  const inventoryComplete =
    analysisResolved &&
    facts.risksRequiringConversion === 0 &&
    facts.risksPendingClassification === 0 &&
    facts.risksPendingTreatmentDecision === 0;

  const actionPlanApplicable = facts.actionPlansRequired > 0;

  const actionPlanComplete =
    !actionPlanApplicable ||
    (inventoryComplete && facts.actionPlansMissing === 0);

  const steps: Nr1CanonicalResolvedJourneyStep[] = [];

  steps.push(
    createNr1CanonicalJourneyStep(
      "empresa",
      facts.hasCompany ? "completed" : "not_started",
      true,
    ),
  );

  steps.push(
    createNr1CanonicalJourneyStep(
      "estabelecimento",
      facts.hasEstablishment ? "completed" : "not_started",
      facts.hasCompany,
      facts.hasCompany ? [] : ["company_required"],
    ),
  );

  const mappingBlockingReasons: Nr1CanonicalJourneyBlockingReason[] = [];

  if (!facts.hasEstablishment) {
    mappingBlockingReasons.push("establishment_required");
  } else {
    if (!facts.hasDepartments) {
      mappingBlockingReasons.push("departments_required");
    } else if (!facts.allRelevantDepartmentsHaveActivities) {
      mappingBlockingReasons.push("activities_required");
    }
  }

  steps.push(
    createNr1CanonicalJourneyStep(
      "mapeamento",
      mappingComplete
        ? "completed"
        : facts.hasDepartments
          ? "in_progress"
          : "not_started",
      facts.hasEstablishment,
      mappingBlockingReasons,
    ),
  );

  steps.push(
    createNr1CanonicalJourneyStep(
      "diagnostico",
      facts.diagnosisStatus,
      mappingComplete,
      mappingComplete ? [] : ["mapping_required"],
    ),
  );

  if (!facts.investigationRequired) {
    steps.push(
      createNr1CanonicalJourneyStep(
        "investigacao",
        "not_applicable",
        false,
      ),
    );
  } else {
    steps.push(
      createNr1CanonicalJourneyStep(
        "investigacao",
        facts.investigationsResolved ? "completed" : "pending",
        diagnosisComplete,
        diagnosisComplete
          ? facts.investigationsResolved
            ? []
            : ["investigation_pending"]
          : ["diagnosis_required"],
      ),
    );
  }

  if (!facts.validationRequired) {
    steps.push(
      createNr1CanonicalJourneyStep(
        "validacao",
        "not_applicable",
        false,
      ),
    );
  } else {
    steps.push(
      createNr1CanonicalJourneyStep(
        "validacao",
        facts.validationsResolved ? "completed" : "pending",
        diagnosisComplete && investigationResolved,
        !diagnosisComplete
          ? ["diagnosis_required"]
          : !investigationResolved
            ? ["investigation_pending"]
            : facts.validationsResolved
              ? []
              : ["validation_pending"],
      ),
    );
  }

  const inventoryBlockingReasons: Nr1CanonicalJourneyBlockingReason[] = [];

  if (!diagnosisComplete) {
    inventoryBlockingReasons.push("diagnosis_required");
  }

  if (facts.investigationRequired && !facts.investigationsResolved) {
    inventoryBlockingReasons.push("investigation_pending");
  }

  if (facts.validationRequired && !facts.validationsResolved) {
    inventoryBlockingReasons.push("validation_pending");
  }

  if (facts.risksRequiringConversion > 0) {
    inventoryBlockingReasons.push("risk_conversion_pending");
  }

  if (facts.risksPendingClassification > 0) {
    inventoryBlockingReasons.push("risk_classification_pending");
  }

  if (facts.risksPendingTreatmentDecision > 0) {
    inventoryBlockingReasons.push("risk_treatment_decision_pending");
  }

  steps.push(
    createNr1CanonicalJourneyStep(
      "inventario-riscos",
      inventoryComplete
        ? "completed"
        : analysisResolved
          ? "pending"
          : "not_started",
      analysisResolved,
      inventoryBlockingReasons,
    ),
  );

  if (!actionPlanApplicable) {
    steps.push(
      createNr1CanonicalJourneyStep(
        "plano-de-acao",
        "not_applicable",
        false,
      ),
    );
  } else {
    steps.push(
      createNr1CanonicalJourneyStep(
        "plano-de-acao",
        actionPlanComplete ? "completed" : inventoryComplete ? "pending" : "not_started",
        inventoryComplete,
        inventoryComplete
          ? facts.actionPlansMissing > 0
            ? ["action_plan_missing"]
            : []
          : ["inventory_required"],
      ),
    );
  }

  const readinessAvailable = inventoryComplete && actionPlanComplete;
  const pgrReadiness = facts.pgrReadiness ?? "unknown";

  steps.push(
    createNr1CanonicalJourneyStep(
      "prontidao-pgr",
      !readinessAvailable
        ? "not_started"
        : pgrReadiness === "ready"
          ? "completed"
          : pgrReadiness === "not_ready"
            ? "pending"
            : "in_progress",
      readinessAvailable,
      !inventoryComplete
        ? ["inventory_required"]
        : !actionPlanComplete
          ? ["action_plan_missing"]
          : pgrReadiness === "not_ready"
            ? ["pgr_not_ready"]
            : pgrReadiness === "unknown"
              ? ["pgr_readiness_unknown"]
              : [],
    ),
  );

  steps.push(
    createNr1CanonicalJourneyStep(
      "previa-pgr",
      facts.pgrPreviewGenerated ? "completed" : "not_started",
      diagnosisComplete,
      diagnosisComplete ? [] : ["diagnosis_required"],
    ),
  );

  if (!facts.pgrFormalizationEnabled) {
    steps.push(
      createNr1CanonicalJourneyStep(
        "formalizacao-pgr",
        "not_applicable",
        false,
      ),
    );
  } else {
    const formalizationAvailable =
      pgrReadiness === "ready" &&
      Boolean(facts.pgrPreviewGenerated);

    steps.push(
      createNr1CanonicalJourneyStep(
        "formalizacao-pgr",
        facts.pgrFormalized ? "completed" : "not_started",
        formalizationAvailable,
        pgrReadiness !== "ready"
          ? ["pgr_not_ready"]
          : !facts.pgrPreviewGenerated
            ? ["pgr_preview_required"]
            : [],
      ),
    );
  }

  const applicableSteps = steps.filter(
    (step) => step.status !== "not_applicable",
  );

  const completed = applicableSteps.filter(
    (step) => step.status === "completed",
  ).length;

  const total = applicableSteps.length;

  const percent =
    total === 0
      ? 0
      : Math.round((completed / total) * 100);

  const currentStep =
    applicableSteps.find((step) => step.status !== "completed") ?? null;

  const nextActionStep =
    applicableSteps.find(
      (step) => step.status !== "completed" && step.available,
    ) ?? null;

  const blockingReasons = Array.from(
    new Set(
      applicableSteps.flatMap((step) => step.blockingReasons),
    ),
  );

  return {
    steps,
    currentStepId: currentStep?.id ?? null,
    nextAction: nextActionStep
      ? {
          stepId: nextActionStep.id,
          href: nextActionStep.href,
          label: `Continuar: ${nextActionStep.title}`,
        }
      : null,
    progress: {
      completed,
      total,
      percent,
    },
    blockingReasons,
  };
}
