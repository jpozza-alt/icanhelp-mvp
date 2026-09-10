import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

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

test("generated diagnosis risk exposes direct official inventory review action", () => {
  assert.match(
    workspace,
    /href="\/dashboard\/nr1\/workspace\?section=riscos"[\s\S]{0,500}Revisar risco no Inventário/
  );

  assert.match(
    workspace,
    /handleGeneratePreliminaryRiskFromDiagnosis\(\)/
  );

  assert.match(
    workspace,
    />\s*Gerar risco sugerido\s*</
  );
});

test("post-generation copy keeps human review explicit", () => {
  assert.match(
    workspace,
    /O risco sugerido foi gerado e precisa de revisão humana antes de qualquer consolidação\./
  );

  assert.match(
    workspace,
    /Risco sugerido pronto para revisão humana no Inventário de Riscos\. Revise e confirme antes de seguir para o Plano de Ação\./
  );
});

test("workspace menu keeps inventory label and internal risk module key", () => {
  assert.match(
    shell,
    /<span>\{module === "Riscos" \? "Inventário de riscos" : module\}<\/span>/
  );

  assert.match(
    shell,
    /Riscos:\s*"riscos"/
  );
});

test("canonical inventory journey route points to official workspace section", () => {
  const riskStart = journey.indexOf('id: "riscos"');
  const planStart = journey.indexOf('id: "plano-de-acao"', riskStart);

  assert.ok(riskStart >= 0);
  assert.ok(planStart > riskStart);

  const riskStep = journey.slice(riskStart, planStart);

  assert.match(
    riskStep,
    /title:\s*"Inventário de riscos"/
  );

  assert.match(
    riskStep,
    /href:\s*"\/dashboard\/nr1\/workspace\?section=riscos"/
  );

  assert.doesNotMatch(
    riskStep,
    /href:\s*"\/dashboard\/nr1\/riscos"/
  );
});

test("workspace route selects official risk section without backend persistence", () => {
  assert.match(
    workspace,
    /new URLSearchParams\(window\.location\.search\)\.get\("section"\)/
  );

  assert.match(
    workspace,
    /requestedSection === "riscos" \? "riscos" : null/
  );

  assert.match(
    workspace,
    /const effectiveActiveSection =[\s\S]*requestedWorkspaceSection \?\? draft\.activeSection;/
  );

  assert.match(
    workspace,
    /effectiveActiveSection === "riscos"/
  );

  const routeStart =
    workspace.indexOf("const [requestedWorkspaceSection");

  const routeEnd =
    workspace.indexOf(
      "const previousWorkspaceModeRef",
      routeStart
    );

  assert.ok(routeStart >= 0);
  assert.ok(routeEnd > routeStart);

  const routeBlock =
    workspace.slice(routeStart, routeEnd);

  assert.doesNotMatch(routeBlock, /patchDraft\(/);
  assert.doesNotMatch(routeBlock, /method:\s*"POST"/);
  assert.doesNotMatch(routeBlock, /method:\s*"PATCH"/);
  assert.doesNotMatch(routeBlock, /method:\s*"DELETE"/);
});

test("workspace diagnosis journey status uses official hydrated diagnosis state", () => {
  assert.match(
    workspace,
    /const officialDiagnosisReady = Boolean\([\s\S]*diagnosisSessionId[\s\S]*diagnosisContextSaved[\s\S]*psychosocialDiagnosisSaved[\s\S]*\);/
  );

  assert.match(
    workspace,
    /step\.id === "diagnostico-inicial" && officialDiagnosisReady/
  );

  assert.doesNotMatch(
    workspace,
    /step\.id === "diagnostico-inicial" && Boolean\(draft\.checklist\.diagnosis_started\)/
  );
});

test("existing generated diagnosis risk remains rehydrated after reload", () => {
  assert.ok(
    workspace.includes(
      "function generatedDiagnosisRiskIdForSession("
    )
  );

  assert.ok(
    workspace.includes(
      'firstString(item, ["diagnosis_session_id"])'
    )
  );

  assert.ok(
    workspace.includes(
      "itemSessionId === sessionId"
    )
  );

  assert.ok(
    workspace.includes(
      'itemCategory === "psychosocial"'
    )
  );

  assert.ok(
    workspace.includes(
      'itemStatus === "identified"'
    )
  );

  assert.ok(
    workspace.includes(
      "!itemDeletedAt"
    )
  );

  assert.match(
    workspace,
    /setDiagnosisRiskId\(\s*generatedDiagnosisRiskIdForSession\(\s*risks,\s*diagnosisSessionId\s*\)\s*\)/
  );
});

test("diagnosis risk rehydration helper remains read only", () => {
  const helperStart =
    workspace.indexOf(
      "function generatedDiagnosisRiskIdForSession("
    );

  const helperEnd =
    workspace.indexOf(
      "function displayName(",
      helperStart
    );

  assert.ok(helperStart >= 0);
  assert.ok(helperEnd > helperStart);

  const helper =
    workspace.slice(
      helperStart,
      helperEnd
    );

  assert.doesNotMatch(helper, /\.insert\(/);
  assert.doesNotMatch(helper, /\.update\(/);
  assert.doesNotMatch(helper, /\.delete\(/);
  assert.doesNotMatch(helper, /method:\s*"POST"/);
  assert.doesNotMatch(helper, /method:\s*"PATCH"/);
  assert.doesNotMatch(helper, /method:\s*"DELETE"/);
});