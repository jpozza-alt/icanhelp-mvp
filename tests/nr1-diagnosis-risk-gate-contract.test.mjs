import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const route = readFileSync(resolve(root, "app/api/nr1/diagnosis-review/route.ts"), "utf8");
const workspace = readFileSync(resolve(root, "app/dashboard/nr1/workspace/page.tsx"), "utf8");

test("pending investigation blocks risk persistence", () => {
  assert.match(route, /reason: "investigation_required"/);
  assert.match(route, /factor\.investigation_pending === true/);
  const gate = route.indexOf('reason: "investigation_required"');
  const insert = route.indexOf(".insert(riskPayload)");
  assert.ok(gate >= 0);
  assert.ok(insert > gate);
});

test("zero confirmed evidence blocks risk persistence", () => {
  assert.match(route, /evidenceFoundLabels\.length === 0/);
  assert.match(route, /reason: "no_confirmed_evidence"/);
  const gate = route.indexOf('reason: "no_confirmed_evidence"');
  const insert = route.indexOf(".insert(riskPayload)");
  assert.ok(gate >= 0);
  assert.ok(insert > gate);
});

test("unsupported automatic evidence does not enter risk matrix", () => {
  assert.match(route, /const hasSupportingEvidence =/);
  assert.match(route, /cleanText\(factor\.status\) === "evidence_found" && hasSupportingEvidence\(factor\)/);
  assert.match(route, /status === "evidence_found" && !hasSupportingEvidence\(factor\)/);
});

test("workspace handles blocked generation before using risk id", () => {
  assert.match(workspace, /generatedRiskRecord\?\.generated === false/);
  assert.match(workspace, /generatedRiskReason === "investigation_required"/);
  assert.match(workspace, /Este ponto nao e automaticamente um risco\./);
  assert.match(workspace, /generatedRiskReason === "no_confirmed_evidence"/);
  assert.match(workspace, /generatedRiskReason === "existing_requires_manual_review"/);
  const blocked = workspace.indexOf("generatedRiskRecord?.generated === false");
  const riskIdRead = workspace.indexOf("const riskId =", blocked);
  assert.ok(blocked >= 0);
  assert.ok(riskIdRead > blocked);
});
