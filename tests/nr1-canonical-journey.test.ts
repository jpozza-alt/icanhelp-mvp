import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveNr1CanonicalJourney,
  resolveNr1CanonicalDiagnosisStatus,
  type Nr1CanonicalJourneyFacts,
  type Nr1CanonicalJourneyStepId,
} from "../src/lib/nr1-journey.ts";

function facts(
  overrides: Partial<Nr1CanonicalJourneyFacts> = {},
): Nr1CanonicalJourneyFacts {
  return {
    hasCompany: false,
    hasEstablishment: false,
    hasDepartments: false,
    allRelevantDepartmentsHaveActivities: false,
    diagnosisStatus: "not_started",
    investigationRequired: false,
    investigationsResolved: false,
    validationRequired: false,
    validationsResolved: false,
    risksRequiringConversion: 0,
    risksPendingClassification: 0,
    risksPendingTreatmentDecision: 0,
    actionPlansRequired: 0,
    actionPlansMissing: 0,
    pgrReadiness: "unknown",
    pgrPreviewGenerated: false,
    pgrFormalizationEnabled: false,
    pgrFormalized: false,
    ...overrides,
  };
}

function step(
  result: ReturnType<typeof resolveNr1CanonicalJourney>,
  id: Nr1CanonicalJourneyStepId,
) {
  return result.steps.find((item) => item.id === id)!;
}

test("jornada começa pela empresa", () => {
  const result = resolveNr1CanonicalJourney(facts());

  assert.equal(result.currentStepId, "empresa");
  assert.equal(result.nextAction?.stepId, "empresa");
  assert.equal(step(result, "empresa").status, "not_started");
  assert.equal(step(result, "estabelecimento").available, false);
});

test("investigação e validação saem do denominador quando não aplicáveis", () => {
  const result = resolveNr1CanonicalJourney(
    facts({
      hasCompany: true,
      hasEstablishment: true,
      hasDepartments: true,
      allRelevantDepartmentsHaveActivities: true,
      diagnosisStatus: "completed",
    }),
  );

  assert.equal(step(result, "investigacao").status, "not_applicable");
  assert.equal(step(result, "validacao").status, "not_applicable");
  assert.equal(step(result, "plano-de-acao").status, "not_applicable");
  assert.equal(step(result, "formalizacao-pgr").status, "not_applicable");

  assert.equal(result.progress.total, 7);
});

test("investigação pendente bloqueia inventário", () => {
  const result = resolveNr1CanonicalJourney(
    facts({
      hasCompany: true,
      hasEstablishment: true,
      hasDepartments: true,
      allRelevantDepartmentsHaveActivities: true,
      diagnosisStatus: "completed",
      investigationRequired: true,
      investigationsResolved: false,
    }),
  );

  assert.equal(step(result, "investigacao").status, "pending");
  assert.equal(result.currentStepId, "investigacao");
  assert.equal(step(result, "inventario-riscos").available, false);
  assert.ok(result.blockingReasons.includes("investigation_pending"));
});

test("validação pendente bloqueia inventário", () => {
  const result = resolveNr1CanonicalJourney(
    facts({
      hasCompany: true,
      hasEstablishment: true,
      hasDepartments: true,
      allRelevantDepartmentsHaveActivities: true,
      diagnosisStatus: "completed",
      investigationRequired: true,
      investigationsResolved: true,
      validationRequired: true,
      validationsResolved: false,
    }),
  );

  assert.equal(step(result, "validacao").status, "pending");
  assert.equal(result.currentStepId, "validacao");
  assert.equal(step(result, "inventario-riscos").available, false);
  assert.ok(result.blockingReasons.includes("validation_pending"));
});

test("resultado validado aguardando conversão mantém inventário pendente", () => {
  const result = resolveNr1CanonicalJourney(
    facts({
      hasCompany: true,
      hasEstablishment: true,
      hasDepartments: true,
      allRelevantDepartmentsHaveActivities: true,
      diagnosisStatus: "completed",
      investigationRequired: true,
      investigationsResolved: true,
      validationRequired: true,
      validationsResolved: true,
      risksRequiringConversion: 1,
    }),
  );

  assert.equal(step(result, "inventario-riscos").status, "pending");
  assert.ok(result.blockingReasons.includes("risk_conversion_pending"));
});

test("plano só é obrigatório quando algum risco exige ação", () => {
  const result = resolveNr1CanonicalJourney(
    facts({
      hasCompany: true,
      hasEstablishment: true,
      hasDepartments: true,
      allRelevantDepartmentsHaveActivities: true,
      diagnosisStatus: "completed",
      actionPlansRequired: 2,
      actionPlansMissing: 1,
    }),
  );

  assert.equal(step(result, "inventario-riscos").status, "completed");
  assert.equal(step(result, "plano-de-acao").status, "pending");
  assert.equal(result.currentStepId, "plano-de-acao");
  assert.ok(result.blockingReasons.includes("action_plan_missing"));
});

test("execução do plano e evidências não fazem parte do progresso obrigatório", () => {
  const result = resolveNr1CanonicalJourney(
    facts({
      hasCompany: true,
      hasEstablishment: true,
      hasDepartments: true,
      allRelevantDepartmentsHaveActivities: true,
      diagnosisStatus: "completed",
      actionPlansRequired: 1,
      actionPlansMissing: 0,
      pgrReadiness: "ready",
      pgrPreviewGenerated: true,
    }),
  );

  assert.equal(step(result, "plano-de-acao").status, "completed");
  assert.equal(step(result, "prontidao-pgr").status, "completed");
  assert.equal(step(result, "previa-pgr").status, "completed");
  assert.equal(result.progress.percent, 100);
  assert.equal(result.currentStepId, null);
});

test("prévia pode existir mesmo antes da prontidão formal", () => {
  const result = resolveNr1CanonicalJourney(
    facts({
      hasCompany: true,
      hasEstablishment: true,
      hasDepartments: true,
      allRelevantDepartmentsHaveActivities: true,
      diagnosisStatus: "completed",
      pgrReadiness: "not_ready",
      pgrPreviewGenerated: true,
    }),
  );

  assert.equal(step(result, "previa-pgr").status, "completed");
  assert.equal(step(result, "prontidao-pgr").status, "pending");
  assert.equal(result.currentStepId, "prontidao-pgr");
});

test("formalização permanece fora da jornada enquanto desabilitada", () => {
  const result = resolveNr1CanonicalJourney(
    facts({
      hasCompany: true,
      hasEstablishment: true,
      hasDepartments: true,
      allRelevantDepartmentsHaveActivities: true,
      diagnosisStatus: "completed",
      pgrReadiness: "ready",
      pgrPreviewGenerated: true,
      pgrFormalizationEnabled: false,
    }),
  );

  assert.equal(step(result, "formalizacao-pgr").status, "not_applicable");
  assert.equal(result.progress.percent, 100);
});

test("diagnóstico canônico fica não iniciado sem sessão persistente", () => {
  assert.equal(
    resolveNr1CanonicalDiagnosisStatus({
      hasSession: false,
      hasContext: false,
      hasPsychosocial: false,
    }),
    "not_started",
  );
});

test("diagnóstico canônico fica em andamento enquanto faltar bloco obrigatório", () => {
  assert.equal(
    resolveNr1CanonicalDiagnosisStatus({
      hasSession: true,
      hasContext: true,
      hasPsychosocial: false,
    }),
    "in_progress",
  );

  assert.equal(
    resolveNr1CanonicalDiagnosisStatus({
      hasSession: true,
      hasContext: false,
      hasPsychosocial: true,
    }),
    "in_progress",
  );
});

test("diagnóstico canônico conclui apenas com sessão, contexto e psicossocial persistidos", () => {
  assert.equal(
    resolveNr1CanonicalDiagnosisStatus({
      hasSession: true,
      hasContext: true,
      hasPsychosocial: true,
    }),
    "completed",
  );
});
