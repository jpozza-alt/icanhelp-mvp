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

test("generated diagnosis risk exposes a direct inventory review action", () => {
  assert.match(
    workspace,
    /\{diagnosisRiskId \? \(\s*<a\s+href="\/dashboard\/nr1\/riscos"[\s\S]*?>\s*Revisar risco no Inventário\s*<\/a>\s*\) : \(\s*<button[\s\S]*?handleGeneratePreliminaryRiskFromDiagnosis[\s\S]*?>\s*Gerar risco sugerido\s*<\/button>\s*\)\}/
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

test("risk generation remains the action before a risk exists", () => {
  assert.match(
    workspace,
    /handleGeneratePreliminaryRiskFromDiagnosis\(\)/
  );

  assert.match(
    workspace,
    />\s*Gerar risco sugerido\s*</
  );
});

test("workspace menu uses human-readable inventory label without changing internal module key", () => {
  assert.match(
    shell,
    /<span>\{module === "Riscos" \? "Inventário de riscos" : module\}<\/span>/
  );

  assert.match(
    shell,
    /Riscos:\s*"riscos"/
  );
});

test("canonical journey route for inventory remains unchanged", () => {
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
    /href:\s*"\/dashboard\/nr1\/riscos"/
  );
});