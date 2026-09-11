import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const journey = fs.readFileSync(
  path.join(root, "src/lib/nr1-journey.ts"),
  "utf8"
);

const evidencePage = fs.readFileSync(
  path.join(
    root,
    "app/dashboard/nr1/evidencias-acompanhamento/page.tsx"
  ),
  "utf8"
);

const workspace = fs.readFileSync(
  path.join(root, "app/dashboard/nr1/workspace/page.tsx"),
  "utf8"
);

test("canonical journey recognizes evidence as completed", () => {
  assert.match(
    journey,
    /hasEvidence\?: boolean;/
  );

  assert.match(
    journey,
    /if \(state\.hasEvidence\) completed\.push\("evidencias"\);/
  );

  assert.match(
    journey,
    /id: "evidencias"[\s\S]*?isComplete: \(state\) => Boolean\(state\.hasEvidence\)/
  );
});

test("evidence page advances full progress when a real evidence exists", () => {
  assert.match(
    evidencePage,
    /const hasEvidence = items\.length > 0;/
  );

  assert.match(
    evidencePage,
    /hasActionPlans: actionPlans\.length > 0,\s*hasEvidence,/
  );

  assert.match(
    evidencePage,
    /\[jwt, tenantId, selectedEstablishmentId, actionPlans\.length, hasEvidence\]/
  );
});

test("evidence page directs the journey to health and trainings", () => {
  assert.match(
    evidencePage,
    /activeModule=\{hasEvidence \? "Saúde e treinamentos" : "Evidências"\}/
  );

  assert.match(
    evidencePage,
    /\/dashboard\/nr1\/saude-treinamentos/
  );

  assert.match(
    evidencePage,
    /Ir para Saúde e treinamentos/
  );

  assert.match(
    evidencePage,
    /A evidência continua aguardando validação humana/
  );
});

test("workspace reads evidence with GET semantics only", () => {
  assert.match(
    workspace,
    /const \[evidenceItems, setEvidenceItems\]/
  );

  assert.match(
    workspace,
    /const loadEvidenceItems = useCallback/
  );

  assert.match(
    workspace,
    /buildUrl\("\/api\/nr1\/evidence-items"/
  );

  const loader = workspace.match(
    /const loadEvidenceItems = useCallback[\s\S]*?\n  }, \[\]\);/
  );

  assert.ok(loader);

  assert.doesNotMatch(
    loader[0],
    /method:\s*"(POST|PATCH|DELETE)"/
  );
});

test("workspace completes evidence and focuses health and trainings", () => {
  assert.match(
    workspace,
    /const hasEvidence =\s*evidenceItems\.length > 0;/
  );

  assert.match(
    workspace,
    /hasAnyActionPlan && !hasEvidence[\s\S]*?\? "evidencias"[\s\S]*?hasAnyActionPlan && hasEvidence[\s\S]*?\? "saude-treinamentos"/
  );

  assert.match(
    workspace,
    /step\.id === "evidencias" && hasEvidence/
  );

  assert.match(
    workspace,
    /hasActionPlans: hasAnyActionPlan,\s*hasEvidence,/
  );
});

test("workspace primary action opens health and trainings", () => {
  assert.match(
    workspace,
    /journeyFocusStepId === "saude-treinamentos"/
  );

  assert.match(
    workspace,
    /window\.location\.href = "\/dashboard\/nr1\/saude-treinamentos"/
  );

  assert.match(
    workspace,
    /workspaceV2EffectiveActiveModule/
  );

  assert.match(
    workspace,
    /Ir para Saúde e treinamentos/
  );
});

test("pending validation and human review remain preserved", () => {
  assert.match(
    evidencePage,
    /validation_status: "pending_validation"/
  );

  assert.match(
    evidencePage,
    /Validação: Aguardando validação/
  );

  assert.match(
    evidencePage,
    /useNr1WorkspaceContext/
  );

  assert.match(
    workspace,
    /hasPendingGeneratedRiskReview/
  );

  assert.match(
    workspace,
    /selectedGeneratedRiskNeedsHumanReview/
  );
});