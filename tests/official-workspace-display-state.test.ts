import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("1. hook consulta empresa e estabelecimento pelo contexto oficial autenticado", () => {
  const source = read("src/hooks/useNr1WorkspaceDisplayState.ts");

  assert.match(source, /\/api\/nr1\/companies/);
  assert.match(source, /\/api\/nr1\/establishments/);
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.match(source, /"x-icanhelp-tenant": context\.tenantId/);
  assert.match(source, /context\.companyId/);
  assert.match(source, /context\.establishmentId/);
});

test("2. barra de contexto deixa de usar as chaves legadas de nome em localStorage", () => {
  const source = read("src/components/nr1/Nr1WorkspaceContextBar.tsx");

  assert.doesNotMatch(source, /nr1_workspace_company/);
  assert.doesNotMatch(source, /nr1_workspace_establishment/);
  assert.doesNotMatch(source, /readStoredValue/);

  assert.match(source, /useNr1WorkspaceContext/);
  assert.match(source, /useNr1WorkspaceDisplayState/);
  assert.match(source, /Origem: Contexto oficial/);
});

test("3. resumo de setores usa o estado oficial da API", () => {
  const source = read("src/components/nr1/Nr1ProgressDashboard.tsx");

  assert.match(source, /useNr1SetoresApiState/);
  assert.match(source, /const setoresCompleted = setoresApiState\.isComplete/);

  assert.doesNotMatch(source, /isNr1SetoresLocalCompleted/);
});

test("4. resumo usa nomes oficiais e remove os fallbacks Empresa local e Estabelecimento local", () => {
  const source = read("src/components/nr1/Nr1ProgressDashboard.tsx");

  assert.match(source, /useNr1WorkspaceDisplayState/);
  assert.match(source, /displayState\.companyName/);
  assert.match(source, /displayState\.establishmentName/);

  assert.doesNotMatch(source, /Empresa local/);
  assert.doesNotMatch(source, /Estabelecimento local/);
});

test("5. APIs existentes oferecem os campos necessarios para a exibicao oficial", () => {
  const companies = read("app/api/nr1/companies/route.ts");
  const establishments = read("app/api/nr1/establishments/route.ts");

  assert.match(companies, /legal_name: row\.legal_name/);
  assert.match(companies, /trade_name: row\.trade_name/);

  assert.match(establishments, /company_id: row\.company_id/);
  assert.match(establishments, /name: row\.name/);
});
