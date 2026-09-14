import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const page = fs.readFileSync(
  path.join(
    root,
    "app/dashboard/nr1/saude-treinamentos/page.tsx"
  ),
  "utf8"
);

const journey = fs.readFileSync(
  path.join(root, "src/lib/nr1-journey.ts"),
  "utf8"
);

test("health and training uses canonical V7 workspace context", () => {
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
    /workspaceContextState\.context\.tenantId/
  );

  assert.match(
    page,
    /workspaceContextState\.context\.establishmentId/
  );

  assert.doesNotMatch(
    page,
    /async function resolveContext/
  );

  assert.doesNotMatch(
    page,
    /fetchJson\("\/api\/tenants\/active"/
  );
});

test("health and training uses canonical real journey progress", () => {
  assert.match(
    page,
    /getNr1FullJourneyProgress/
  );

  assert.match(
    page,
    /hasEvidence: evidenceItems\.length > 0/
  );

  assert.match(
    page,
    /progressPercent=\{journeyProgressPercent\}/
  );

  assert.doesNotMatch(
    page,
    /progressPercent=\{92\}/
  );
});

test("health and training does not auto-complete its own step", () => {
  assert.match(
    journey,
    /id: "saude-treinamentos"[\s\S]*?isComplete: incompleteUntilSupported/
  );

  assert.doesNotMatch(
    journey,
    /completed\.push\("saude-treinamentos"\)/
  );
});

test("technical tenant and establishment ids are hidden from primary UX", () => {
  assert.doesNotMatch(
    page,
    />tenantId<\/span>/
  );

  assert.doesNotMatch(
    page,
    />establishment_id<\/span>/
  );

  assert.doesNotMatch(
    page,
    /tenantId obrigatorio/
  );

  assert.doesNotMatch(
    page,
    /establishment_id obrigatorio/
  );

  assert.match(
    page,
    />\s*Empresa\s*<\/span>/
  );

  assert.match(
    page,
    />\s*Local de trabalho\s*<\/span>/
  );
});

test("shell receives human company and establishment names", () => {
  assert.match(
    page,
    /companyName=\{companyName \|\| "Carregando empresa\.\.\."\}/
  );

  assert.match(
    page,
    /establishmentName=\{establishmentName \|\| "Carregando local de trabalho\.\.\."\}/
  );

  assert.match(
    page,
    /setCompanyName/
  );

  assert.match(
    page,
    /setEstablishmentName/
  );
});

test("existing health and training mutation routes remain present", () => {
  assert.match(
    page,
    /\/api\/nr1\/occupational-health-refs/
  );

  assert.match(
    page,
    /\/api\/nr1\/training-records/
  );

  assert.match(
    page,
    /method: "POST"/
  );

  assert.match(
    page,
    /method: "PATCH"/
  );
});

test("health screen keeps current focus on health and training", () => {
  assert.match(
    page,
    /activeModule="Saúde e treinamentos"/
  );

  assert.match(
    page,
    /Conferir saúde ocupacional e treinamentos/
  );

  assert.match(
    page,
    /Evidências concluídas\. Foco atual: conferir saúde ocupacional e treinamentos\./
  );
});