import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canCreateNr1Company } from "../src/lib/nr1-company-creation-access.ts";

function allowed(role, count, portfolio = false, partner = false) {
  return canCreateNr1Company({
    membershipRole: role,
    companyCount: count,
    portfolioEnabled: portfolio,
    partnerModeEnabled: partner,
  });
}

test("cliente owner sem empresa pode cadastrar apenas a primeira", () => {
  assert.equal(allowed("owner", 0), true);
  assert.equal(allowed("owner", 1), false);
  assert.equal(allowed("owner", 2), false);
});

test("cliente admin segue a mesma regra; member nao cadastra", () => {
  assert.equal(allowed("admin", 0), true);
  assert.equal(allowed("admin", 1), false);
  assert.equal(allowed("member", 0), false);
  assert.equal(allowed("member", 1, true, true), false);
  assert.equal(allowed(null, 0), false);
});

test("parceiro requer ambas as capacidades e papel interno apropriado", () => {
  assert.equal(allowed("owner", 2, true, true), true);
  assert.equal(allowed("admin", 1, true, true), true);
  assert.equal(allowed("owner", 2, true, false), false);
  assert.equal(allowed("owner", 2, false, true), false);
});

test("falha de contagem nunca libera novo cadastro", () => {
  for (const count of [-1, NaN, Number.POSITIVE_INFINITY, 1.5]) {
    assert.equal(allowed("owner", count, true, true), false);
  }
});

test("fonte server bloqueia acao sensivel pelo RPC e front usa capacidade do servidor", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const api = readFileSync(join(root, "app/api/nr1/companies/route.ts"), "utf8");
  const ui = readFileSync(join(root, "app/dashboard/nr1/workspace/page.tsx"), "utf8");
  assert.match(api, /rpc\("icanhelp_nr1_create_company"/);
  assert.match(api, /canCreateCompany: canCreateNr1Company/);
  assert.match(ui, /setCanCreateCompany\(\(payload as \{ canCreateCompany\?: boolean \}\)\.canCreateCompany === true\)/);
  assert.match(ui, /\{\(membershipRole === "owner" \|\| membershipRole === "admin"\) && canCreateCompany && \(/);
});

test("proposta SQL tem bloqueio de execucao e RPC com trava transacional", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const sql = readFileSync(join(root, "_review/PROPOSTA_RLS_MULTIEMPRESA_NAO_APLICAR.sql.txt"), "utf8");
  assert.match(sql, /raise exception 'PROPOSTA_NAO_EXECUTAR/i);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /REVOKE INSERT ON public\.nr1_companies/);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.tenant_subscriptions/);
  assert.match(sql, /multi_company_portfolio/);
  assert.match(sql, /partner_mode/);
  assert.match(sql, /NOT EXISTS \(/i);
});

test("revisao da triagem usa PATCH com tenant e id sem criar outra empresa", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const api = readFileSync(join(root, "app/api/nr1/companies/route.ts"), "utf8");
  const ui = readFileSync(join(root, "app/dashboard/nr1/workspace/page.tsx"), "utf8");
  assert.match(api, /export async function PATCH\(req: NextRequest\)/);
  assert.match(api, /\.update\(payload\)/);
  assert.match(api, /\.eq\("tenant_id", scope\.tenantId\)/);
  assert.match(api, /\.eq\("id", companyId\)/);
  assert.match(api, /isTenantAdminRole\(scope\.role\)/);
  assert.match(ui, /setEditingCompanyId\(existingId\)/);
  assert.match(ui, /method: editingCompanyId \? "PATCH" : "POST"/);
  assert.match(ui, /if \(!editingCompanyId && createdCompanyId\)/);
  assert.match(ui, /setEditingCompanyId\(null\)/);
  assert.match(api, /rpc\("icanhelp_nr1_create_company"/);
});
