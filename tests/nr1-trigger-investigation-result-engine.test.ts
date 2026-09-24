import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateTriggerInvestigation,
  type TriggerInvestigationAnswerInput,
} from "../src/lib/nr1-trigger-investigation-result-engine.ts";

const healthyDeadlinePressure: TriggerInvestigationAnswerInput = {
  goals_clear: "yes",
  deadlines_feasible: "yes",
  staffing_sufficient: "yes",
  frequent_overtime: "no",
  breaks_respected: "yes",
  leadership_prioritizes: "yes",
  pressure_respectful: "yes",
  aggressive_pressure: "no",
  frequent_rework: "no",
  related_events: "no",
};

test("investigacao incompleta nao produz resultado definitivo", () => {
  const answers = {
    ...healthyDeadlinePressure,
  };

  delete answers.related_events;

  const result = evaluateTriggerInvestigation(
    "deadline_pressure",
    answers,
  );

  assert.equal(result.complete, false);
  assert.equal(result.suggestedResult, null);
  assert.deepEqual(
    result.missingQuestionKeys,
    ["related_events"],
  );
});

test("cenario adequado resulta em sem indicio relevante", () => {
  const result = evaluateTriggerInvestigation(
    "deadline_pressure",
    healthyDeadlinePressure,
  );

  assert.equal(result.complete, true);
  assert.equal(
    result.suggestedResult,
    "no_relevant_indication",
  );
  assert.equal(
    result.technicalValidationRequired,
    false,
  );
  assert.equal(
    result.criticalAlertRequired,
    false,
  );
});

test("uma unica dimensao desfavoravel gera ponto de atencao", () => {
  const result = evaluateTriggerInvestigation(
    "deadline_pressure",
    {
      ...healthyDeadlinePressure,
      deadlines_feasible: "no",
    },
  );

  assert.equal(
    result.suggestedResult,
    "attention_point",
  );

  assert.deepEqual(result.adverseGroups, {
    exposureOrFrequency: true,
    control: false,
    impactOrEvidence: false,
  });
});

test("duas dimensoes desfavoraveis geram possivel fator de risco", () => {
  const result = evaluateTriggerInvestigation(
    "deadline_pressure",
    {
      ...healthyDeadlinePressure,
      deadlines_feasible: "no",
      staffing_sufficient: "no",
    },
  );

  assert.equal(
    result.suggestedResult,
    "possible_risk_factor",
  );

  assert.deepEqual(result.adverseGroups, {
    exposureOrFrequency: true,
    control: true,
    impactOrEvidence: false,
  });
});

test("exposicao mais falha de controle mais impacto pode gerar risco sugerido", () => {
  const result = evaluateTriggerInvestigation(
    "deadline_pressure",
    {
      ...healthyDeadlinePressure,
      deadlines_feasible: "no",
      staffing_sufficient: "no",
      related_events: "yes",
    },
  );

  assert.equal(
    result.suggestedResult,
    "suggested_risk",
  );

  assert.equal(
    result.technicalValidationRequired,
    false,
  );

  assert.equal(
    result.criticalAlertRequired,
    false,
  );
});

test("resposta unknown exige validacao tecnica", () => {
  const result = evaluateTriggerInvestigation(
    "deadline_pressure",
    {
      ...healthyDeadlinePressure,
      goals_clear: "unknown",
    },
  );

  assert.equal(result.complete, true);

  assert.equal(
    result.suggestedResult,
    "no_relevant_indication",
  );

  assert.equal(
    result.technicalValidationRequired,
    true,
  );

  assert.deepEqual(
    result.unknownQuestionKeys,
    ["goals_clear"],
  );
});

test("ameaca no atendimento ao publico preserva resultado tecnico e gera alerta critico", () => {
  const result = evaluateTriggerInvestigation(
    "public_service",
    {
      public_contact_frequent: "yes",
      works_alone: "no",
      queue_pressure: "no",
      public_conflict: "no",
      verbal_aggression: "no",
      threat_history: "yes",
      physical_aggression: "no",
      difficult_situation_protocol: "yes",
      leadership_support: "yes",
      occurrence_records: "yes",
    },
  );

  assert.equal(result.complete, true);

  assert.equal(
    result.suggestedResult,
    "possible_risk_factor",
  );

  assert.equal(
    result.technicalValidationRequired,
    true,
  );

  assert.equal(
    result.criticalAlertRequired,
    true,
  );

  assert.deepEqual(
    result.criticalQuestionKeys,
    ["threat_history"],
  );
});

test("gatilho de assedio ou violencia nunca e concluido automaticamente como comum", () => {
  const result = evaluateTriggerInvestigation(
    "harassment_or_violence",
    {
      harassment_violence_threat_humiliation: "no",
      still_happening: "no",
      immediate_risk: "no",
      internal_report_channel: "yes",
      referred_to_responsible: "yes",
      confidentiality_needed: "no",
      formal_evidence: "yes",
      immediate_protection_needed: "no",
    },
  );

  assert.equal(result.complete, true);

  assert.equal(
    result.suggestedResult,
    "no_relevant_indication",
  );

  assert.equal(
    result.technicalValidationRequired,
    true,
  );

  assert.equal(
    result.criticalAlertRequired,
    true,
  );
});

test("valor invalido impede conclusao da investigacao", () => {
  const result = evaluateTriggerInvestigation(
    "deadline_pressure",
    {
      ...healthyDeadlinePressure,
      goals_clear: "talvez",
    },
  );

  assert.equal(result.complete, false);
  assert.equal(result.suggestedResult, null);

  assert.deepEqual(
    result.invalidQuestionKeys,
    ["goals_clear"],
  );
});

