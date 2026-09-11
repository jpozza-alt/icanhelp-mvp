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

test("global plans are separated from selected risk plans", () => {
  assert.match(workspace, /allActionPlans/);
  assert.match(workspace, /loadedAllActionPlans/);
  assert.match(workspace, /loadActionPlans\(currentContext, effectiveRiskId\)/);
});

test("journey has one canonical focus", () => {
  assert.match(workspace, /const journeyFocusStepId =/);
  assert.match(workspace, /step\.id === journeyFocusStepId/);
});

test("plan completion uses establishment plans", () => {
  assert.match(workspace, /allActionPlans\.length > 0/);
  assert.match(workspace, /step\.id === "plano-de-acao" && hasAnyActionPlan/);
});

test("after plan the focus is evidence", () => {
  assert.match(workspace, /\? "evidencias"/);
  assert.match(workspace, /Registrar evidências da execução/);
  assert.match(workspace, /Ir para Evidências/);
});

test("sidebar displays journey focus", () => {
  assert.match(shell, /Foco da jornada:/);
  assert.match(shell, />Foco<\/span>/);
});

test("human risk review remains preserved", () => {
  assert.match(workspace, /Confirmar risco e liberar Plano de Ação/);
  assert.match(workspace, /selectedGeneratedRiskNeedsHumanReview/);
});