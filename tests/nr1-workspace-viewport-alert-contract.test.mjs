import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const workspace = readFileSync(resolve(root, "app/dashboard/nr1/workspace/page.tsx"), "utf8");

test("diagnosis feedback is rendered as a viewport alert", () => {
  assert.match(workspace, /pointer-events-none fixed left-1\/2 top-4 z-\[10050\]/);
  assert.match(workspace, /role=\{diagnosisError \? "alert" : "status"\}/);
  assert.match(workspace, /aria-live=\{diagnosisError \? "assertive" : "polite"\}/);
  assert.match(workspace, /Fechar aviso/);
});

test("old inline diagnosis feedback is removed", () => {
  assert.doesNotMatch(workspace, /mx-6 mt-6 rounded-2xl border border-red-200 bg-red-50/);
  assert.doesNotMatch(workspace, /mx-6 mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/);
});

test("viewport alert can be dismissed without changing persisted data", () => {
  assert.match(workspace, /setDiagnosisError\(null\);/);
  assert.match(workspace, /setDiagnosisSuccess\(null\);/);
});
