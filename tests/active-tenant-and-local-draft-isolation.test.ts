import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { NextRequest } from "next/server.js";

import { GET, POST } from "../app/api/tenants/active/route.ts";
import { GET as GET_ALIAS, POST as POST_ALIAS } from "../app/api/tenant/select/route.ts";
import {
  clearNr1DiagnosticoLocalDraft,
  completeNr1DiagnosticoLocalDraft,
  getNr1DiagnosticoLocalStorageKey,
  isNr1DiagnosticoLocalCompleted,
  readNr1DiagnosticoLocalDraft,
  writeNr1DiagnosticoLocalDraft,
} from "../src/lib/nr1-diagnostico-local.ts";
import {
  clearNr1PlanoLocalDraft,
  getNr1PlanoLocalStorageKey,
  readNr1PlanoLocalDraft,
  writeNr1PlanoLocalDraft,
} from "../src/lib/nr1-plano-local.ts";
import {
  clearNr1RiscosLocalDraft,
  completeNr1RiscosLocalDraft,
  getNr1RiscosLocalStorageKey,
  isNr1RiscosLocalCompleted,
  readNr1RiscosLocalDraft,
  writeNr1RiscosLocalDraft,
} from "../src/lib/nr1-riscos-local.ts";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ESTABLISHMENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TOKEN = "test-access-token";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

type FetchMode = {
  authUserId?: string | null;
  membership?: { tenant_id: string; role: string } | null;
  membershipError?: boolean;
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installSupabaseFetch(mode: FetchMode = {}) {
  const calls: string[] = [];
  const authUserId = mode.authUserId === undefined ? USER_A : mode.authUserId;
  const membership = mode.membership === undefined
    ? { tenant_id: TENANT, role: "owner" }
    : mode.membership;

  globalThis.fetch = async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push(url);

    if (url.includes("/auth/v1/user")) {
      if (!authUserId) return jsonResponse({ message: "invalid token" }, 401);
      return jsonResponse({
        id: authUserId,
        aud: "authenticated",
        role: "authenticated",
        email: "test@example.invalid",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00.000Z",
      });
    }

    if (url.includes("/rest/v1/tenant_memberships")) {
      if (mode.membershipError) {
        return jsonResponse(
          { message: "membership failed", code: "XX000", details: null, hint: null },
          500
        );
      }
      return jsonResponse(membership);
    }

    throw new Error(`Unexpected test fetch: ${url}`);
  };

  return calls;
}

function request(
  method: "GET" | "POST",
  options: { bearer?: string; userId?: string; tenantId?: string; bodyTenantId?: string } = {}
): NextRequest {
  const headers = new Headers();
  if (options.bearer) headers.set("authorization", `Bearer ${options.bearer}`);

  const cookies: string[] = [];
  if (options.tenantId) cookies.push(`icanhelp_tenant=${options.tenantId}`);
  if (options.userId) cookies.push(`icanhelp_tenant_user=${options.userId}`);
  if (cookies.length > 0) {
    cookies.push(`icanhelp_establishment=${ESTABLISHMENT}`);
    headers.set("cookie", cookies.join("; "));
  }

  if (method === "POST") headers.set("content-type", "application/json");

  return new NextRequest("https://icanhelp.test/api/tenants/active", {
    method,
    headers,
    body: method === "POST" ? JSON.stringify({ tenantId: options.bodyTenantId ?? TENANT }) : undefined,
  });
}

function cookieHeader(response: Response): string {
  return response.headers.get("set-cookie") ?? "";
}

function assertContextCookiesCleared(response: Response) {
  const cookies = cookieHeader(response);
  assert.match(cookies, /icanhelp_tenant=;/);
  assert.match(cookies, /icanhelp_tenant_user=;/);
  assert.match(cookies, /icanhelp_establishment=;/);
  assert.match(cookies, /Max-Age=0/i);
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: storage },
});

const scopeA = { userId: USER_A, tenantId: TENANT, establishmentId: ESTABLISHMENT };
const scopeB = { userId: USER_B, tenantId: TENANT, establishmentId: ESTABLISHMENT };

test.beforeEach(() => {
  storage.clear();
});

test("1. GET sem bearer retorna 401 e limpa contexto nas duas rotas", async () => {
  for (const handler of [GET, GET_ALIAS]) {
    const response = await handler(request("GET", { tenantId: TENANT, userId: USER_A }));
    assert.equal(response.status, 401);
    assertContextCookiesCleared(response);
  }
});

test("2. bearer invalido retorna 401 e limpa contexto", async () => {
  installSupabaseFetch({ authUserId: null });
  const response = await GET(request("GET", { bearer: TOKEN, tenantId: TENANT, userId: USER_A }));
  assert.equal(response.status, 401);
  assertContextCookiesCleared(response);
});

test("3. cookie de outro usuario retorna 404 sem consultar membership", async () => {
  const calls = installSupabaseFetch({ authUserId: USER_B });
  const response = await GET(request("GET", { bearer: TOKEN, tenantId: TENANT, userId: USER_A }));
  assert.equal(response.status, 404);
  assertContextCookiesCleared(response);
  assert.equal(calls.filter((url) => url.includes("tenant_memberships")).length, 0);
});

test("4. cookie proprio e membership valida retornam tenant e role nas duas rotas", async () => {
  for (const handler of [GET, GET_ALIAS]) {
    installSupabaseFetch();
    const response = await handler(request("GET", { bearer: TOKEN, tenantId: TENANT, userId: USER_A }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      tenantId: TENANT,
      tenant_id: TENANT,
      activeTenantId: TENANT,
      active_tenant_id: TENANT,
      establishmentId: ESTABLISHMENT,
      establishment_id: ESTABLISHMENT,
      activeEstablishmentId: ESTABLISHMENT,
      active_establishment_id: ESTABLISHMENT,
      role: "owner",
    });
  }
});

test("5. membership ausente retorna 404 e limpa contexto", async () => {
  installSupabaseFetch({ membership: null });
  const response = await GET(request("GET", { bearer: TOKEN, tenantId: TENANT, userId: USER_A }));
  assert.equal(response.status, 404);
  assertContextCookiesCleared(response);
});

test("6. erro de membership retorna 500 sem apagar cookie ainda nao invalidado", async () => {
  installSupabaseFetch({ membershipError: true });
  const response = await GET(request("GET", { bearer: TOKEN, tenantId: TENANT, userId: USER_A }));
  assert.equal(response.status, 500);
  assert.equal(cookieHeader(response), "");
});

test("7. POST valido vincula tenant ao usuario e limpa estabelecimento nas duas rotas", async () => {
  for (const handler of [POST, POST_ALIAS]) {
    installSupabaseFetch();
    const response = await handler(request("POST", { bearer: TOKEN, bodyTenantId: TENANT }));
    assert.equal(response.status, 200);
    const cookies = cookieHeader(response);
    assert.match(cookies, new RegExp(`icanhelp_tenant=${TENANT}`));
    assert.match(cookies, new RegExp(`icanhelp_tenant_user=${USER_A}`));
    assert.match(cookies, /icanhelp_establishment=;/);
    assert.match(cookies, /Max-Age=0/i);
  }
});

test("8. o mesmo tenant e estabelecimento geram chaves diferentes por usuario", () => {
  assert.notEqual(getNr1DiagnosticoLocalStorageKey(scopeA), getNr1DiagnosticoLocalStorageKey(scopeB));
  assert.notEqual(getNr1RiscosLocalStorageKey(scopeA), getNr1RiscosLocalStorageKey(scopeB));
  assert.notEqual(getNr1PlanoLocalStorageKey(scopeA), getNr1PlanoLocalStorageKey(scopeB));
});

test("9. usuario B nao le rascunhos gravados pelo usuario A", () => {
  writeNr1DiagnosticoLocalDraft({ observacoes: "segredo A" }, scopeA);
  writeNr1RiscosLocalDraft({ observacoes: "risco A" }, scopeA);
  writeNr1PlanoLocalDraft({ observacoes: "plano A" }, scopeA);
  assert.equal(readNr1DiagnosticoLocalDraft(scopeB).observacoes, "");
  assert.equal(readNr1RiscosLocalDraft(scopeB).observacoes, "");
  assert.equal(readNr1PlanoLocalDraft(scopeB).observacoes, "");
});

test("10. chaves legadas nao sao lidas nem migradas automaticamente", async () => {
  storage.setItem(`icanhelp:nr1:diagnostico-inicial:${TENANT}:${ESTABLISHMENT}`, JSON.stringify({ observacoes: "legado" }));
  storage.setItem(`icanhelp:nr1:riscos:${TENANT}:${ESTABLISHMENT}`, JSON.stringify({ observacoes: "legado" }));
  storage.setItem("icanhelp:nr1:plano:tenant-local:estabelecimento-local", JSON.stringify({ observacoes: "legado" }));
  assert.equal(readNr1DiagnosticoLocalDraft(scopeA).observacoes, "");
  assert.equal(readNr1RiscosLocalDraft(scopeA).observacoes, "");
  assert.equal(readNr1PlanoLocalDraft(scopeA).observacoes, "");
  const source = await readFile(new URL("../app/dashboard/nr1/plano-de-acao/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /readNr1PlanoLocalDraft\(\)/);
  assert.doesNotMatch(source, /legacyDraft|shouldMigrate|hasPlanoContent/);
});

test("11. clear remove apenas a chave do usuario corrente", () => {
  writeNr1DiagnosticoLocalDraft({ observacoes: "A" }, scopeA);
  writeNr1DiagnosticoLocalDraft({ observacoes: "B" }, scopeB);
  writeNr1RiscosLocalDraft({ observacoes: "A" }, scopeA);
  writeNr1RiscosLocalDraft({ observacoes: "B" }, scopeB);
  writeNr1PlanoLocalDraft({ observacoes: "A" }, scopeA);
  writeNr1PlanoLocalDraft({ observacoes: "B" }, scopeB);
  clearNr1DiagnosticoLocalDraft(scopeA);
  clearNr1RiscosLocalDraft(scopeA);
  clearNr1PlanoLocalDraft(scopeA);
  assert.equal(readNr1DiagnosticoLocalDraft(scopeB).observacoes, "B");
  assert.equal(readNr1RiscosLocalDraft(scopeB).observacoes, "B");
  assert.equal(readNr1PlanoLocalDraft(scopeB).observacoes, "B");
});

test("12. user, tenant e estabelecimento vazios falham fechado", () => {
  const invalidScopes = [
    { userId: "", tenantId: TENANT, establishmentId: ESTABLISHMENT },
    { userId: USER_A, tenantId: "", establishmentId: ESTABLISHMENT },
    { userId: USER_A, tenantId: TENANT, establishmentId: "" },
  ];
  for (const scope of invalidScopes) {
    assert.throws(() => getNr1DiagnosticoLocalStorageKey(scope));
    assert.throws(() => getNr1RiscosLocalStorageKey(scope));
    assert.throws(() => getNr1PlanoLocalStorageKey(scope));
  }
});

test("13. conclusao local de A nao libera o estado local de B", () => {
  completeNr1DiagnosticoLocalDraft(scopeA);
  completeNr1RiscosLocalDraft(scopeA);
  assert.equal(isNr1DiagnosticoLocalCompleted(scopeA), true);
  assert.equal(isNr1RiscosLocalCompleted(scopeA), true);
  assert.equal(isNr1DiagnosticoLocalCompleted(scopeB), false);
  assert.equal(isNr1RiscosLocalCompleted(scopeB), false);
});
