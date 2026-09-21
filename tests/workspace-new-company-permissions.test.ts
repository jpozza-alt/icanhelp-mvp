import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("member nao recebe acao Nova empresa na interface", () => {
  const workspace = read("app/dashboard/nr1/workspace/page.tsx");

  assert.match(
    workspace,
    /\(membershipRole === "owner" \|\| membershipRole === "admin"\) && \(/
  );

  assert.match(workspace, /\+ Nova empresa/);

  assert.doesNotMatch(
    workspace,
    /membershipRole === "member".*\+ Nova empresa/s
  );
});

test("membershipRole vem do escopo autenticado da API de empresas", () => {
  const companies = read("app/api/nr1/companies/route.ts");

  assert.match(companies, /membershipRole: scope\.role/);
});

test("backend bloqueia criacao para quem nao for owner ou admin", () => {
  const companies = read("app/api/nr1/companies/route.ts");

  assert.match(
    companies,
    /if \(!isTenantAdminRole\(scope\.role\)\) \{[\s\S]*?return json\(403,/
  );

  assert.match(companies, /nr1_companies_create_forbidden/);
});

test("papel administrativo contempla somente owner e admin", () => {
  const scope = read("src/lib/server/nr1-scope.ts");

  assert.match(
    scope,
    /return role === "owner" \|\| role === "admin"/
  );

  assert.doesNotMatch(
    scope,
    /role === "member"/
  );
});
