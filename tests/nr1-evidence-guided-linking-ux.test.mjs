import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const evidencePage = fs.readFileSync(
  path.join(root, "app/dashboard/nr1/evidencias-acompanhamento/page.tsx"),
  "utf8"
);

const workspace = fs.readFileSync(
  path.join(root, "app/dashboard/nr1/workspace/page.tsx"),
  "utf8"
);

const shell = fs.readFileSync(
  path.join(root, "src/components/nr1/Nr1WorkspaceV2Shell.tsx"),
  "utf8"
);

const journey = fs.readFileSync(
  path.join(root, "src/lib/nr1-journey.ts"),
  "utf8"
);

test("workspace and evidence derive progress from the same real-state helper", () => {
  assert.match(
    journey,
    /export type Nr1FullJourneyProgressState/
  );
  assert.match(
    journey,
    /export function getNr1FullJourneyProgress\(/
  );
  assert.match(
    workspace,
    /getNr1FullJourneyProgress\(\{[\s\S]{0,500}hasCompany[\s\S]{0,500}hasActionPlans/
  );
  assert.match(
    evidencePage,
    /getNr1FullJourneyProgress\(journeyProgressState\)/
  );
  assert.doesNotMatch(
    evidencePage,
    /EVIDENCE_ENTRY_COMPLETED_STEP_IDS/
  );
  assert.doesNotMatch(
    evidencePage,
    /progressPercent=\{75\}/
  );
});

test("evidence page loads real state with read-only existing endpoints", () => {
  assert.match(evidencePage, /\/api\/nr1\/companies\?/);
  assert.match(evidencePage, /\/api\/nr1\/departments\?/);
  assert.match(evidencePage, /\/api\/nr1\/activities\?/);
  assert.match(evidencePage, /\/api\/nr1\/risks\?/);
  assert.match(evidencePage, /\/api\/nr1\/diagnosis-sessions\?/);
  assert.match(evidencePage, /\/api\/nr1\/diagnosis-context\?/);
  assert.match(evidencePage, /\/api\/nr1\/diagnosis-psychosocial\?/);
  assert.match(evidencePage, /method: "GET"/);
});

test("evidence real state preserves human risk review semantics", () => {
  assert.match(
    evidencePage,
    /hasPendingGeneratedRiskReview/
  );
  assert.match(
    evidencePage,
    /isGeneratedDiagnosisRiskActionReadyRecord/
  );
  assert.match(
    evidencePage,
    /hasRisks: hasRiskReadyForActionPlan/
  );
});

test("evidence page loads existing action plans using the official API", () => {
  assert.match(evidencePage, /\/api\/nr1\/action-plans\?establishmentId=/);
  assert.match(evidencePage, /parseActionPlans/);
  assert.match(evidencePage, /setActionPlans\(parsedActionPlans\)/);
});

test("single action plan may be preselected but multiple plans require human choice", () => {
  assert.match(
    evidencePage,
    /parsedActionPlans\.length === 1[\s\S]{0,140}\? parsedActionPlans\[0\]\.id[\s\S]{0,80}: ""/
  );
  assert.match(
    evidencePage,
    /Existem vários Planos de Ação\. Escolha abaixo qual deles esta evidência comprova\./
  );
});

test("action plan link is shown in human language instead of requiring raw id entry", () => {
  assert.match(evidencePage, /Esta evidência comprova/);
  assert.match(evidencePage, /Plano de Ação vinculado/);
  assert.match(evidencePage, /actionPlans\.map\(\(plan\) =>/);
  assert.match(evidencePage, /plan\.title \|\| "Plano de Ação"/);
});

test("existing evidence persistence contract remains unchanged", () => {
  assert.match(evidencePage, /fetch\("\/api\/nr1\/evidence-items\?tenantId="/);
  assert.match(evidencePage, /linked_entity_type: linkedEntityType/);
  assert.match(evidencePage, /linked_entity_id: linkedEntityId/);
});

test("evidence returns to official plan workspace", () => {
  assert.match(evidencePage, /href="\/dashboard\/nr1\/workspace\?section=plano"/);
  assert.doesNotMatch(evidencePage, /href="\/dashboard\/nr1\/plano-de-acao"/);
});

test("sidebar stays sticky without forcing full viewport height", () => {
  assert.match(
    shell,
    /lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto/
  );
  assert.doesNotMatch(shell, /lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto/);
});