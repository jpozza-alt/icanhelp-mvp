import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const page = fs.readFileSync(
  path.join(
    root,
    "app/dashboard/nr1/relatorio-pgr/page.tsx"
  ),
  "utf8"
);

test("PGR inherits the canonical V7 workspace context", () => {
  assert.match(
    page,
    /useNr1WorkspaceContext/
  );

  assert.match(
    page,
    /const workspaceContextState = useNr1WorkspaceContext\(\);/
  );

  assert.match(
    page,
    /tenantId: effectiveTenantId,[\s\S]*?companyId: effectiveCompanyId,[\s\S]*?establishmentId: effectiveEstablishmentId/
  );

  assert.doesNotMatch(
    page,
    /fetch\(["']\/api\/tenants["']/
  );

  assert.doesNotMatch(
    page,
    /tenantItems\[0\]\.id/
  );

  assert.doesNotMatch(
    page,
    /handleTenantChange/
  );

  assert.doesNotMatch(
    page,
    /queryEstablishmentId/
  );

  assert.match(
    page,
    /setSelectedTenantId\(effectiveTenantId\)/
  );

  assert.match(
    page,
    /setSelectedEstablishmentId\([\s\S]*?effectiveEstablishmentId/
  );
});

test("PGR displays canonical journey progress instead of local 0 50 100 progress", () => {
  assert.match(
    page,
    /getNr1FullJourneyProgress/
  );

  assert.match(
    page,
    /const previewProgress = journeyProgressPercent;/
  );

  assert.match(
    page,
    /progressPercent=\{previewProgress\}/
  );

  assert.doesNotMatch(
    page,
    /const previewProgress = report \? 100 : topSelectorScopeReady \? 50 : 0/
  );

  assert.match(
    page,
    /hasEvidence:[\s\S]*?evidenceItems\.length > 0/
  );

  assert.match(
    page,
    /hasRisks:[\s\S]*?hasRiskReadyForActionPlan/
  );

  assert.match(
    page,
    /hasDiagnosis/
  );
});

test("PGR context is read only on this screen", () => {
  assert.doesNotMatch(
    page,
    /onChange=\{\(event\) => void handleTenantChange/
  );

  assert.doesNotMatch(
    page,
    /setSelectedEstablishmentId\(event\.target\.value\)/
  );

  assert.match(
    page,
    /Empresa[\s\S]*?\{activeCompanyName\}/
  );

  assert.match(
    page,
    /Local de trabalho[\s\S]*?\{activeEstablishmentName\}/
  );
});

test("support document remains explicitly separate from formal PGR operations", () => {
  assert.match(
    page,
    /const FORMAL_PGR_OPERATIONS_ENABLED = false;/
  );

  assert.match(
    page,
    /\/api\/nr1\/pgr-report\?establishmentId=/
  );

  assert.match(
    page,
    /\/api\/nr1\/pgr-support-document/
  );

  assert.match(
    page,
    /Documento Estruturado de Apoio à Formalização do PGR/
  );

  assert.match(
    page,
    /Imprimir \/ salvar em PDF/
  );

  assert.match(
    page,
    /id="nr1CreatePgrSupportDocumentButton"/
  );

  assert.doesNotMatch(
    page,
    /const FORMAL_PGR_OPERATIONS_ENABLED = true;/
  );
});
