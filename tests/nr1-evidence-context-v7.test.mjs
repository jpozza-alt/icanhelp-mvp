import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const page = fs.readFileSync(
  path.join(root, "app/dashboard/nr1/evidencias-acompanhamento/page.tsx"),
  "utf8"
);

test("evidence page consumes canonical V7 context", () => {
  assert.match(page, /useNr1WorkspaceContext/);
  assert.match(page, /workspaceContextState = useNr1WorkspaceContext\(\)/);
  assert.match(page, /setTenantId\(workspaceContextState\.context\.tenantId\)/);
  assert.match(page, /workspaceContextState\.context\.establishmentId/);
});

test("evidence page never selects first tenant implicitly", () => {
  assert.doesNotMatch(page, /setTenantId\(parsedTenants\[0\]\.id\)/);
  assert.doesNotMatch(page, /parsedTenants\[0\]/);
});

test("evidence page has no parallel localStorage context source", () => {
  assert.doesNotMatch(page, /workspaceSelectionStorageKey/);
  assert.doesNotMatch(page, /getStoredWorkspaceEstablishmentId/);
  assert.doesNotMatch(page, /setStoredWorkspaceEstablishmentId/);
  assert.doesNotMatch(page, /handleSelectedEstablishmentChange/);
  assert.doesNotMatch(page, /urlEstablishmentId/);
});

test("establishment shown by evidence page is read-only canonical context", () => {
  assert.match(
    page,
    /value=\{selectedEstablishmentId\}[\s\S]{0,160}className=\{inputClassName\}[\s\S]{0,80}disabled/
  );
  assert.doesNotMatch(
    page,
    /value=\{selectedEstablishmentId\}[\s\S]{0,200}onChange=/
  );
});

test("active establishment is validated inside V7 tenant", () => {
  assert.match(page, /findValidEstablishmentId/);
  assert.match(page, /workspaceContextState\.context\.establishmentId/);
  assert.match(page, /active_establishment_unavailable/);
});

test("previous evidence journey corrections remain intact", () => {
  assert.match(page, /getNr1FullJourneyProgress\(journeyProgressState\)/);
  assert.match(page, /Plano de Ação vinculado/);
  assert.match(page, /Esta evidência comprova/);
  assert.match(page, /hasPendingGeneratedRiskReview/);
  assert.doesNotMatch(page, /progressPercent=\{75\}/);
});