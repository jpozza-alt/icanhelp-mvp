import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as nodeModule from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const CREATED_TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FOREIGN_TENANT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TOKEN = "offline-test-token";
const SUPABASE_ORIGIN = "https://supabase.test.invalid";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(testDirectory, "..");
const dependencyRoot = process.env.ICANHELP_TEST_NODE_MODULES?.trim();
const dependencyRequire = dependencyRoot
  ? createRequire(path.join(dependencyRoot, "__offline_test_resolver.cjs"))
  : createRequire(import.meta.url);
const typescript = dependencyRequire("typescript") as {
  ModuleKind: { ESNext: number };
  ScriptTarget: { ES2022: number };
  JsxEmit: { ReactJSX: number };
  transpileModule(
    source: string,
    options: {
      fileName: string;
      compilerOptions: {
        module: number;
        target: number;
        jsx: number;
      };
    }
  ): { outputText: string };
};

type JsxNode = {
  type: unknown;
  props: Record<string, unknown>;
  key?: unknown;
};

type FetchCall = {
  url: string;
  method: string;
  body: string;
  headers: Headers;
};

type RouteFetchMode = {
  authUserId?: string | null;
  ownedMemberships?: Array<{ tenant_id: string; role: string }>;
  selectedMembership?: { tenant_id: string; role: string } | null;
  createRows?: Array<{ tenant_id: string; role: string }>;
  createError?: string;
};

type HookContext = Record<string, unknown>;
type ResolveHook = (
  specifier: string,
  context: HookContext,
  nextResolve: (specifier: string, context: HookContext) => unknown
) => unknown;
type LoadHook = (
  url: string,
  context: HookContext,
  nextLoad: (url: string, context: HookContext) => unknown
) => unknown;
const registerHooks = (
  nodeModule as unknown as {
    registerHooks(hooks: { resolve: ResolveHook; load: LoadHook }): void;
  }
).registerHooks;

function dataModule(source: string) {
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
}

const reactModule = dataModule(`
  const harness = globalThis.__icanhelpOnboardingHarness;
  export const useState = (...args) => harness.useState(...args);
  export const useCallback = (callback) => callback;
  export const useEffect = (effect) => harness.useEffect(effect);
`);
const jsxRuntimeModule = dataModule(`
  const node = (type, props, key) => ({ type, props: props || {}, key });
  export const Fragment = Symbol.for("offline.fragment");
  export const jsx = node;
  export const jsxs = node;
`);
const navigationModule = dataModule(`
  export const useRouter = () => globalThis.__icanhelpOnboardingHarness.router;
`);
const supabaseModule = dataModule(`
  export const createClient = () => globalThis.__icanhelpOnboardingHarness.supabase;
`);

let mockBrowserModules = false;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (mockBrowserModules) {
      if (specifier === "react") return { shortCircuit: true, url: reactModule };
      if (specifier === "react/jsx-runtime") {
        return { shortCircuit: true, url: jsxRuntimeModule };
      }
      if (specifier === "next/navigation") {
        return { shortCircuit: true, url: navigationModule };
      }
      if (specifier === "@supabase/supabase-js") {
        return { shortCircuit: true, url: supabaseModule };
      }
    }

    if (dependencyRoot && !specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.includes(":")) {
      try {
        return {
          shortCircuit: true,
          url: pathToFileURL(dependencyRequire.resolve(specifier)).href,
        };
      } catch {
        // Let Node produce the normal resolution error when this is not a package.
      }
    }

    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && new URL(url).pathname.endsWith(".tsx")) {
      const fileName = fileURLToPath(url);
      const source = readFileSync(fileName, "utf8");
      const output = typescript.transpileModule(source, {
        fileName,
        compilerOptions: {
          module: typescript.ModuleKind.ESNext,
          target: typescript.ScriptTarget.ES2022,
          jsx: typescript.JsxEmit.ReactJSX,
        },
      });
      return { format: "module", shortCircuit: true, source: output.outputText };
    }
    return nextLoad(url, context);
  },
});

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_ORIGIN;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "offline-anon-key";
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.DATABASE_URL;

const tenantsRouteUrl = pathToFileURL(
  path.join(projectDirectory, "app/api/tenants/route.ts")
).href;
const selectRouteUrl = pathToFileURL(
  path.join(projectDirectory, "app/api/tenant/select/route.ts")
).href;
const nextServerUrl = pathToFileURL(
  dependencyRequire.resolve("next/server.js")
).href;
const nextServer = await import(nextServerUrl);
const tenantsRoute = await import(tenantsRouteUrl);
const selectRoute = await import(selectRouteUrl);

class OnboardingHarness {
  private states: unknown[] = [];
  private cursor = 0;
  private effects: Array<() => unknown> = [];

  sessionToken = TOKEN;
  tree: JsxNode | null = null;
  pageFetch: typeof fetch = async () => {
    throw new Error("Page fetch was not configured");
  };
  replaceCalls: string[] = [];
  refreshCalls = 0;

  readonly router = {
    replace: (destination: string) => this.replaceCalls.push(destination),
    refresh: () => {
      this.refreshCalls += 1;
    },
  };

  readonly supabase = {
    auth: {
      getSession: async () => ({
        data: {
          session: this.sessionToken
            ? { access_token: this.sessionToken }
            : null,
        },
      }),
    },
  };

  useState<T>(initial: T): [T, (value: T | ((current: T) => T)) => void] {
    const index = this.cursor++;
    if (!(index in this.states)) this.states[index] = initial;
    return [
      this.states[index] as T,
      (value) => {
        const current = this.states[index] as T;
        this.states[index] = typeof value === "function"
          ? (value as (current: T) => T)(current)
          : value;
      },
    ];
  }

  useEffect(effect: () => unknown) {
    this.effects.push(effect);
  }

  reset() {
    this.states = [];
    this.cursor = 0;
    this.effects = [];
    this.sessionToken = TOKEN;
    this.tree = null;
    this.replaceCalls = [];
    this.refreshCalls = 0;
  }

  render(Page: () => JsxNode) {
    this.cursor = 0;
    this.effects = [];
    this.tree = Page();
    return this.tree;
  }

  async runInitialEffects() {
    const effects = [...this.effects];
    this.effects = [];
    for (const effect of effects) effect();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

const harness = new OnboardingHarness();
Object.defineProperty(globalThis, "__icanhelpOnboardingHarness", {
  configurable: true,
  value: harness,
});

mockBrowserModules = true;
const onboardingModule = await import(
  `${pathToFileURL(path.join(projectDirectory, "app/onboarding/page.tsx")).href}?offline-behavioral`
);
mockBrowserModules = false;
const OnboardingPage = onboardingModule.default as () => JsxNode;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requestDetails(input: string | URL | Request, init?: RequestInit): FetchCall {
  const request = input instanceof Request ? input : null;
  return {
    url: request?.url ?? String(input),
    method: (init?.method ?? request?.method ?? "GET").toUpperCase(),
    body: typeof init?.body === "string" ? init.body : "",
    headers: new Headers(init?.headers ?? request?.headers),
  };
}

function installRouteFetch(mode: RouteFetchMode = {}) {
  const calls: FetchCall[] = [];
  globalThis.fetch = async (input, init) => {
    const call = requestDetails(input, init);
    calls.push(call);
    const url = new URL(call.url);
    assert.equal(url.origin, SUPABASE_ORIGIN, `egress externo tentado: ${call.url}`);

    if (url.pathname === "/auth/v1/user") {
      if (mode.authUserId === null) return json({ message: "invalid token" }, 401);
      return json({
        id: mode.authUserId ?? USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "rh@example.invalid",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00.000Z",
      });
    }

    if (url.pathname === "/rest/v1/tenant_memberships") {
      if (url.searchParams.get("role") === "eq.owner") {
        return json(mode.ownedMemberships ?? []);
      }
      return json(mode.selectedMembership ?? null);
    }

    if (url.pathname === "/rest/v1/rpc/icanhelp_create_initial_tenant") {
      if (mode.createError) {
        return json({ message: mode.createError, code: "XX000" }, 400);
      }
      return json(
        mode.createRows ?? [{ tenant_id: CREATED_TENANT, role: "owner" }]
      );
    }

    throw new Error(`Fetch local inesperado: ${call.method} ${call.url}`);
  };
  return calls;
}

function apiRequest(
  pathname: string,
  options: { bearer?: string; body?: Record<string, unknown> } = {}
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.bearer) headers.set("authorization", `Bearer ${options.bearer}`);
  return new nextServer.NextRequest(`https://icanhelp.test${pathname}`, {
    method: "POST",
    headers,
    body: JSON.stringify(options.body ?? {}),
  });
}

function nodes(root: unknown): JsxNode[] {
  const found: JsxNode[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as JsxNode;
    if ("type" in node && "props" in node) {
      found.push(node);
      visit(node.props.children);
    }
  };
  visit(root);
  return found;
}

function visibleText(root: unknown) {
  const parts: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string" || typeof value === "number") {
      parts.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      visit((value as JsxNode).props?.children);
    }
  };
  visit(root);
  return parts.join(" ");
}

function pageFetch(responder: (call: FetchCall) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  harness.pageFetch = async (input, init) => {
    const call = requestDetails(input, init);
    assert.match(call.url, /^\/api\/(tenants|tenant\/select)$/);
    calls.push(call);
    return responder(call);
  };
  globalThis.fetch = (input, init) => harness.pageFetch(input, init);
  return calls;
}

async function loadPage(accesses: unknown[] = []) {
  const calls = pageFetch((call) => {
    assert.equal(call.url, "/api/tenants");
    assert.equal(call.method, "GET");
    return json(accesses);
  });
  harness.render(OnboardingPage);
  await harness.runInitialEffects();
  return { calls, tree: harness.render(OnboardingPage) };
}

function findByType(root: unknown, type: string) {
  return nodes(root).filter((node) => node.type === type);
}

test.beforeEach(() => {
  harness.reset();
});

test("não autenticado é negado antes de qualquer leitura ou gravação", async () => {
  const calls = installRouteFetch();
  const response = await tenantsRoute.POST(
    apiRequest("/api/tenants", { body: { name: "Empresa Teste" } })
  );
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test("nome inválido não alcança a RPC de criação", async () => {
  const calls = installRouteFetch();
  const response = await tenantsRoute.POST(
    apiRequest("/api/tenants", { bearer: TOKEN, body: { name: " x " } })
  );
  assert.equal(response.status, 400);
  assert.equal(calls.filter((call) => call.url.includes("/rpc/")).length, 0);
});

test("owner existente recebe conflito e não duplica tenant", async () => {
  const calls = installRouteFetch({
    ownedMemberships: [{ tenant_id: CREATED_TENANT, role: "owner" }],
  });
  const response = await tenantsRoute.POST(
    apiRequest("/api/tenants", {
      bearer: TOKEN,
      body: { name: "Empresa Teste" },
    })
  );
  assert.equal(response.status, 409);
  assert.equal(calls.filter((call) => call.url.includes("/rpc/")).length, 0);
});

test("usuário autorizado sem tenant próprio executa exatamente uma criação", async () => {
  const calls = installRouteFetch();
  const response = await tenantsRoute.POST(
    apiRequest("/api/tenants", {
      bearer: TOKEN,
      body: { name: " Empresa Teste " },
    })
  );
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    ok: true,
    id: CREATED_TENANT,
    tenant_id: CREATED_TENANT,
    role: "owner",
  });
  const rpcCalls = calls.filter((call) => call.url.includes("/rpc/"));
  assert.equal(rpcCalls.length, 1);
  assert.deepEqual(JSON.parse(rpcCalls[0].body), { p_name: "Empresa Teste" });
  assert.equal(rpcCalls[0].headers.get("apikey"), "offline-anon-key");
  assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY, undefined);
});

test("tenant de terceiro não pode ser ativado nem gerar cookie", async () => {
  const calls = installRouteFetch({ selectedMembership: null });
  const response = await selectRoute.POST(
    apiRequest("/api/tenant/select", {
      bearer: TOKEN,
      body: { tenantId: FOREIGN_TENANT },
    })
  );
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(calls.filter((call) => call.url.includes("tenant_memberships")).length, 1);
});

test("owner existente vê somente a entrada no tenant já vinculado", async () => {
  const { calls, tree } = await loadPage([
    { tenant_id: CREATED_TENANT, name: "Empresa Existente", role: "owner" },
  ]);
  assert.doesNotMatch(visibleText(tree), /Cadastrar minha empresa/);
  assert.match(visibleText(tree), /Sua organização própria já está criada/);
  assert.equal(calls.filter((call) => call.method === "POST").length, 0);
});

test("validação local do formulário não dispara criação", async () => {
  const { calls, tree } = await loadPage([]);
  const input = nodes(tree).find((node) => node.props.id === "organization-name");
  assert.ok(input);
  (input.props.onChange as (event: { target: { value: string } }) => void)({
    target: { value: "x" },
  });
  const form = findByType(harness.render(OnboardingPage), "form")[0];
  await (form.props.onSubmit as (event: { preventDefault(): void }) => Promise<void>)({
    preventDefault() {},
  });
  const rendered = harness.render(OnboardingPage);
  assert.match(visibleText(rendered), /Informe o nome da empresa ou organização/);
  assert.equal(calls.filter((call) => call.method === "POST").length, 0);
});

test("criação bem-sucedida ativa exatamente o tenant retornado e abre o workspace", async () => {
  await loadPage([]);
  const calls = pageFetch((call) => {
    if (call.url === "/api/tenants") {
      return json({ ok: true, tenant_id: CREATED_TENANT, role: "owner" }, 201);
    }
    if (call.url === "/api/tenant/select") return json({ ok: true });
    throw new Error(`Endpoint inesperado: ${call.url}`);
  });
  let tree = harness.render(OnboardingPage);
  const input = nodes(tree).find((node) => node.props.id === "organization-name");
  assert.ok(input);
  (input.props.onChange as (event: { target: { value: string } }) => void)({
    target: { value: " Empresa Nova " },
  });
  tree = harness.render(OnboardingPage);
  const form = findByType(tree, "form")[0];
  await (form.props.onSubmit as (event: { preventDefault(): void }) => Promise<void>)({
    preventDefault() {},
  });
  assert.deepEqual(calls.map((call) => call.url), [
    "/api/tenants",
    "/api/tenant/select",
  ]);
  assert.deepEqual(JSON.parse(calls[0].body), { name: "Empresa Nova" });
  assert.deepEqual(JSON.parse(calls[1].body), { tenantId: CREATED_TENANT });
  assert.deepEqual(harness.replaceCalls, ["/dashboard/nr1/workspace"]);
  assert.equal(harness.refreshCalls, 1);
});

test("falhas de criação e ativação interrompem o fluxo sem redirecionamento", async () => {
  for (const failure of ["create", "activate"] as const) {
    harness.reset();
    await loadPage([]);
    const calls = pageFetch((call) => {
      if (call.url === "/api/tenants") {
        return failure === "create"
          ? json({ error: "tenant_create_failed", message: "Falha ao criar." }, 500)
          : json({ ok: true, tenant_id: CREATED_TENANT }, 201);
      }
      return json({ error: "tenant_forbidden", message: "Falha ao ativar." }, 403);
    });
    let tree = harness.render(OnboardingPage);
    const input = nodes(tree).find((node) => node.props.id === "organization-name");
    assert.ok(input);
    (input.props.onChange as (event: { target: { value: string } }) => void)({
      target: { value: "Empresa Nova" },
    });
    tree = harness.render(OnboardingPage);
    const form = findByType(tree, "form")[0];
    await (form.props.onSubmit as (event: { preventDefault(): void }) => Promise<void>)({
      preventDefault() {},
    });
    const rendered = harness.render(OnboardingPage);
    const text = visibleText(rendered);
    assert.match(
      text,
      failure === "create" ? /Falha ao criar/ : /tenant_forbidden/
    );
    assert.doesNotMatch(text, /Espaço criado\. Abrindo a jornada NR-1/);
    assert.deepEqual(harness.replaceCalls, []);
    assert.equal(harness.refreshCalls, 0);
    assert.equal(
      calls.filter((call) => call.url === "/api/tenant/select").length,
      failure === "create" ? 0 : 1
    );
  }
});
