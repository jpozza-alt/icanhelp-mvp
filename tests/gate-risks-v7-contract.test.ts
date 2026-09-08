import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

const TENANT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ESTABLISHMENT_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ESTABLISHMENT_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

async function loadContextModule() {
  return import("../src/lib/nr1-workspace-context.ts");
}

test("V7 escolhe automaticamente somente quando existe um unico tenant", async () => {
  const { selectTenantIdFromCandidates } = await loadContextModule();

  assert.equal(
    selectTenantIdFromCandidates([TENANT_A], () => false),
    TENANT_A
  );
});

test("V7 falha fechado quando ha varios tenants sem selecao inequivoca", async () => {
  const { selectTenantIdFromCandidates } = await loadContextModule();

  assert.throws(
    () =>
      selectTenantIdFromCandidates(
        [TENANT_A, TENANT_B],
        () => false
      ),
    /tenant_selection_ambiguous/
  );
});

test("V7 aceita exatamente um tenant com selecao persistida", async () => {
  const { selectTenantIdFromCandidates } = await loadContextModule();

  assert.equal(
    selectTenantIdFromCandidates(
      [TENANT_A, TENANT_B],
      (tenantId) => tenantId === TENANT_B
    ),
    TENANT_B
  );
});

test("V7 rejeita varios tenants simultaneamente selecionados", async () => {
  const { selectTenantIdFromCandidates } = await loadContextModule();

  assert.throws(
    () =>
      selectTenantIdFromCandidates(
        [TENANT_A, TENANT_B],
        () => true
      ),
    /tenant_selection_ambiguous/
  );
});

test("V7 aceita somente estabelecimento unico no fallback", async () => {
  const { selectEstablishmentCandidate } = await loadContextModule();

  assert.deepEqual(
    selectEstablishmentCandidate([
      {
        id: ESTABLISHMENT_A,
        companyId: "company-a",
      },
    ]),
    {
      id: ESTABLISHMENT_A,
      companyId: "company-a",
    }
  );
});

test("V7 falha fechado quando existem varios estabelecimentos sem selecao", async () => {
  const { selectEstablishmentCandidate } = await loadContextModule();

  assert.throws(
    () =>
      selectEstablishmentCandidate([
        {
          id: ESTABLISHMENT_A,
          companyId: "company-a",
        },
        {
          id: ESTABLISHMENT_B,
          companyId: "company-b",
        },
      ]),
    /establishment_selection_ambiguous/
  );
});

test("V7 context fallback e somente leitura", async () => {
  const source = await readFile(
    new URL(
      "../src/lib/nr1-workspace-context.ts",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(source, /\/api\/tenants\/active/);
  assert.match(source, /\/api\/tenants/);
  assert.match(source, /\/api\/nr1\/establishments/);

  assert.doesNotMatch(
    source,
    /method:\s*["']POST["']/
  );

  assert.doesNotMatch(
    source,
    /localStorage\.(setItem|removeItem|clear)/
  );

  assert.doesNotMatch(
    source,
    /tenantIds\[0\]/
  );

  assert.doesNotMatch(
    source,
    /\.from\s*\(/
  );
});

test("V7 guard distingue falha tecnica de setores realmente pendentes", async () => {
  const source = await readFile(
    new URL(
      "../src/components/nr1/Nr1StepGuard.tsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    source,
    /setoresApiState\.error/
  );

  assert.match(
    source,
    /Nao foi possivel validar o contexto da empresa/
  );

  assert.match(
    source,
    /Setores e atividades pendentes/
  );

  const errorCheck = source.indexOf("setoresApiState.error");
  const sectorsBlock = source.indexOf('missing: "setores"');

  assert.ok(errorCheck >= 0);
  assert.ok(sectorsBlock >= 0);
  assert.ok(errorCheck < sectorsBlock);
});