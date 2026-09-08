import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "app/dashboard/nr1/workspace/page.tsx",
  "utf8"
);

const startMarker =
  '  const resolveContext = useCallback(async (): Promise<BackendContext> => {';

const endMarker =
  "  const loadCompanies = useCallback(async";

function resolverBlock(): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);

  assert.ok(start >= 0, "resolveContext start marker must exist");
  assert.ok(end > start, "resolveContext end marker must exist");

  return source.slice(start, end);
}

test("workspace prioritizes official active tenant before membership fallback", () => {
  const block = resolverBlock();

  const activeIndex =
    block.indexOf('readJsonResponse("/api/tenants/active")');

  const tenantsIndex =
    block.indexOf('readJsonResponse("/api/tenants")');

  assert.ok(activeIndex >= 0, "active tenant endpoint must be queried");
  assert.ok(tenantsIndex > activeIndex, "membership fallback must run only after active tenant");
  assert.equal(block.includes('"/api/debug/context"'), false);
  assert.equal(block.includes('"/api/tenant/select"'), false);
  assert.equal(/method:\s*"POST"/.test(block), false);
});

test("workspace does not auto-select ambiguously when multiple tenants exist", () => {
  const block = resolverBlock();

  assert.ok(
    block.includes("tenantCandidates.length === 1"),
    "only one membership may be selected automatically"
  );

  assert.ok(
    block.includes("selection.companyId && selection.establishmentId"),
    "multi-tenant fallback must require a complete stored selection"
  );

  assert.ok(
    block.includes("selectedCandidates.length !== 1"),
    "multi-tenant fallback must require exactly one complete selection"
  );

  assert.ok(
    block.includes('throw new Error("tenant_selection_ambiguous")'),
    "ambiguous memberships must raise an explicit context error"
  );
});

test("active tenant result preserves active establishment when available", () => {
  const block = resolverBlock();

  assert.ok(
    block.includes('"activeEstablishmentId"'),
    "active establishment identifier must be read"
  );

  assert.ok(
    block.includes("establishmentId: activeEstablishmentId || null"),
    "active establishment must be preserved without inventing one"
  );

  assert.ok(
    block.includes("activeResult.response.status !== 404"),
    "only a not-set active tenant may fall back to memberships"
  );
});