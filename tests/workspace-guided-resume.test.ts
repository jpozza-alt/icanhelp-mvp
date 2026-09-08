import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "app/dashboard/nr1/workspace/page.tsx",
  "utf8"
);

function between(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + 1);

  assert.ok(start >= 0, `missing start marker: ${startMarker}`);
  assert.ok(end > start, `missing end marker: ${endMarker}`);

  return source.slice(start, end);
}

test("guided continuation resolves the first actually pending step", () => {
  const block = between(
    "  function openGuidedSetupAtPendingStep(): void {",
    "  function handleResumeGateDashboard(): void {"
  );

  const companyIndex = block.indexOf("!hasCompany");
  const establishmentIndex = block.indexOf("!hasEstablishment");
  const departmentIndex = block.indexOf("!hasDepartment");

  assert.ok(companyIndex >= 0);
  assert.ok(establishmentIndex > companyIndex);
  assert.ok(departmentIndex > establishmentIndex);

  assert.ok(block.includes('? "empresa"'));
  assert.ok(block.includes('? "estabelecimento"'));
  assert.ok(block.includes('? "setor"'));
  assert.ok(block.includes(': "atividade"'));

  assert.ok(block.includes("setGuidedStepKey(pendingStep);"));
});

test("workspace continue button uses pending-step continuation", () => {
  const block = between(
    "  const handleWorkspaceV2PrimaryAction = () => {",
    '      patchDraft({ activeSection: "diagnostico" }'
  );

  assert.ok(
    block.includes("openGuidedSetupAtPendingStep();")
  );

  assert.equal(
    block.includes("openGuidedSetupReview();"),
    false
  );
});

test("explicit triage review still starts from company", () => {
  const block = between(
    "  function openGuidedSetupReview(): void {",
    "  function openGuidedSetupAtPendingStep(): void {"
  );

  assert.ok(
    block.includes('setGuidedStepKey("empresa");')
  );
});

test("resume helper performs no business mutation", () => {
  const block = between(
    "  function openGuidedSetupAtPendingStep(): void {",
    "  function handleResumeGateDashboard(): void {"
  );

  assert.equal(/fetch\s*\(/.test(block), false);
  assert.equal(/method:\s*["']POST["']/.test(block), false);
  assert.equal(block.includes("handleCreateCompany"), false);
  assert.equal(block.includes("handleCreateEstablishment"), false);
});