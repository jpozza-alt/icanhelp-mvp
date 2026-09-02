import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as ts from "typescript";

type BackendContext = { tenantId: string | null; establishmentId: string | null };
type HydrationRequest = { context: BackendContext; departmentId: string; activityId: string };
type RequestJson = (path: string, options?: RequestInit, context?: BackendContext) => Promise<unknown>;
type HydrationResult = {
  activityId: string;
  departmentId: string;
  sessionId: string;
  contextSaved: boolean;
  form: {
    work_description: string;
    exposed_people_count: string;
    work_routine_type: string;
    process_changes_frequency: string;
    has_external_work: boolean;
    has_multi_company_interaction: boolean;
    incident_history: string;
    notes: string;
  };
};
type HydrationToken = { requestId: number };
type HydrationCoordinator = {
  begin(): HydrationToken;
  cancel(): void;
  markEdited(): void;
  canApply(token: HydrationToken): boolean;
};
type WorkspaceTestApi = {
  loadWorkspaceDiagnosisHydration(
    request: HydrationRequest,
    requestJson: RequestJson
  ): Promise<HydrationResult>;
  createDiagnosisHydrationCoordinator(): HydrationCoordinator;
};

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ESTABLISHMENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DEPARTMENT_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DEPARTMENT_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ACTIVITY_A = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ACTIVITY_B = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const SESSION_A = "11111111-1111-4111-8111-111111111111";
const SESSION_B = "22222222-2222-4222-8222-222222222222";
const CONTEXT = { tenantId: TENANT, establishmentId: ESTABLISHMENT };

async function loadWorkspaceTestApi(): Promise<WorkspaceTestApi> {
  const pageUrl = new URL("../app/dashboard/nr1/workspace/page.tsx", import.meta.url);
  const source = await readFile(pageUrl, "utf8");
  const instrumentedSource =
    source +
    "\nexport { loadWorkspaceDiagnosisHydration, createDiagnosisHydrationCoordinator };\n";
  const transpiled = ts.transpileModule(instrumentedSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: "workspace-page.tsx",
  });

  const moduleRecord: { exports: Record<string, unknown> } = { exports: {} };
  const requireStub = (id: string): unknown => {
    if (id === "react") {
      return {
        useCallback: (value: unknown) => value,
        useEffect: () => undefined,
        useMemo: (factory: () => unknown) => factory(),
        useRef: (value: unknown) => ({ current: value }),
        useState: (value: unknown) => [value, () => undefined],
      };
    }
    if (id === "react/jsx-runtime") {
      return { Fragment: Symbol("Fragment"), jsx: () => null, jsxs: () => null };
    }
    if (id === "@supabase/supabase-js") return { createClient: () => ({ auth: {} }) };
    if (id === "@/lib/nr1-plan-features-client") {
      return { getNr1PlanFeatures: async () => ({}) };
    }
    if (id === "@/lib/nr1-journey") return { NR1_JOURNEY_STEPS: [] };
    if (id === "@/components/nr1/Nr1WorkspaceV2Shell") {
      return { __esModule: true, default: () => null };
    }
    throw new Error("Unexpected module in workspace test: " + id);
  };

  const script = new vm.Script(transpiled.outputText, { filename: "workspace-page.cjs" });
  script.runInNewContext({
    module: moduleRecord,
    exports: moduleRecord.exports,
    require: requireStub,
    process: { env: {} },
    console,
    URLSearchParams,
    Headers,
    setTimeout,
    clearTimeout,
  });

  return moduleRecord.exports as WorkspaceTestApi;
}

function sessionItem(input: {
  id: string;
  departmentId: string;
  activityId: string;
  tenantId?: string;
  establishmentId?: string;
}) {
  return {
    id: input.id,
    tenant_id: input.tenantId ?? TENANT,
    establishment_id: input.establishmentId ?? ESTABLISHMENT,
    department_id: input.departmentId,
    activity_id: input.activityId,
  };
}

function contextItem(sessionId: string, text: string) {
  return {
    tenant_id: TENANT,
    diagnosis_session_id: sessionId,
    work_description: text,
    exposed_people_count: 12,
    work_routine_type: "turnos",
    process_changes_frequency: "mensal",
    has_external_work: true,
    has_multi_company_interaction: false,
    incident_history: "Sinais agregados",
    notes: "Observacao",
  };
}

function deferred<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

test("boot reidrata contexto formal e preserva todo o escopo sem POST", async () => {
  const api = await loadWorkspaceTestApi();
  const calls: Array<{ path: string; method: string; context?: BackendContext }> = [];
  const requestJson: RequestJson = async (path, options, context) => {
    calls.push({ path, method: options?.method ?? "GET", context });
    const url = new URL(path, "https://icanhelp.test");

    if (url.pathname.endsWith("/diagnosis-sessions")) {
      return {
        items: [
          sessionItem({ id: SESSION_B, departmentId: DEPARTMENT_B, activityId: ACTIVITY_B }),
          sessionItem({ id: SESSION_A, departmentId: DEPARTMENT_A, activityId: ACTIVITY_A }),
        ],
      };
    }

    return { item: contextItem(SESSION_A, "VALIDACAO ISOLAMENTO USUARIO ATUAL 20260820") };
  };

  const result = await api.loadWorkspaceDiagnosisHydration(
    { context: CONTEXT, departmentId: DEPARTMENT_A, activityId: ACTIVITY_A },
    requestJson
  );

  assert.equal(result.form.work_description, "VALIDACAO ISOLAMENTO USUARIO ATUAL 20260820");
  assert.equal(result.sessionId, SESSION_A);
  assert.equal(result.contextSaved, true);
  assert.equal(Boolean(result.sessionId), true, "estado visual deve indicar analise em andamento");
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.method === "GET"));
  assert.deepEqual(calls.map((call) => call.context), [CONTEXT, CONTEXT]);

  const sessionsUrl = new URL(calls[0].path, "https://icanhelp.test");
  assert.equal(sessionsUrl.searchParams.get("tenantId"), TENANT);
  assert.equal(sessionsUrl.searchParams.get("establishmentId"), ESTABLISHMENT);
  assert.equal(sessionsUrl.searchParams.get("departmentId"), DEPARTMENT_A);
  assert.equal(sessionsUrl.searchParams.get("activityId"), ACTIVITY_A);

  const contextUrl = new URL(calls[1].path, "https://icanhelp.test");
  assert.equal(contextUrl.searchParams.get("tenantId"), TENANT);
  assert.equal(contextUrl.searchParams.get("establishmentId"), ESTABLISHMENT);
  assert.equal(contextUrl.searchParams.get("diagnosisSessionId"), SESSION_A);
});

test("ausencia de sessao mantem formulario vazio e nao consulta contexto", async () => {
  const api = await loadWorkspaceTestApi();
  const calls: string[] = [];
  const result = await api.loadWorkspaceDiagnosisHydration(
    { context: CONTEXT, departmentId: DEPARTMENT_A, activityId: ACTIVITY_A },
    async (_path, options) => {
      calls.push(options?.method ?? "GET");
      return { items: [] };
    }
  );

  assert.equal(result.sessionId, "");
  assert.equal(result.contextSaved, false);
  assert.equal(result.form.work_description, "");
  assert.deepEqual(calls, ["GET"]);
});

test("ausencia de contexto preserva sessao sem erro e sem criar dados", async () => {
  const api = await loadWorkspaceTestApi();
  const methods: string[] = [];
  const result = await api.loadWorkspaceDiagnosisHydration(
    { context: CONTEXT, departmentId: DEPARTMENT_A, activityId: ACTIVITY_A },
    async (path, options) => {
      methods.push(options?.method ?? "GET");
      return path.includes("diagnosis-sessions")
        ? { items: [sessionItem({ id: SESSION_A, departmentId: DEPARTMENT_A, activityId: ACTIVITY_A })] }
        : { item: null };
    }
  );

  assert.equal(result.sessionId, SESSION_A);
  assert.equal(result.contextSaved, false);
  assert.equal(result.form.work_description, "");
  assert.deepEqual(methods, ["GET", "GET"]);
});

test("troca de atividade invalida resposta tardia e nao mistura diagnosticos", async () => {
  const api = await loadWorkspaceTestApi();
  const coordinator = api.createDiagnosisHydrationCoordinator();
  const delayedSessions = deferred<unknown>();
  let visibleText = "";

  const run = async (
    departmentId: string,
    activityId: string,
    sessionId: string,
    text: string,
    delayed: boolean
  ) => {
    const token = coordinator.begin();
    const result = await api.loadWorkspaceDiagnosisHydration(
      { context: CONTEXT, departmentId, activityId },
      async (path, options) => {
        assert.equal(options?.method, "GET");
        if (path.includes("diagnosis-sessions")) {
          if (delayed) return delayedSessions.promise;
          return { items: [sessionItem({ id: sessionId, departmentId, activityId })] };
        }
        return { item: contextItem(sessionId, text) };
      }
    );
    if (coordinator.canApply(token)) visibleText = result.form.work_description;
  };

  const activityA = run(DEPARTMENT_A, ACTIVITY_A, SESSION_A, "Diagnostico A", true);
  const activityB = run(DEPARTMENT_B, ACTIVITY_B, SESSION_B, "Diagnostico B", false);
  await activityB;
  assert.equal(visibleText, "Diagnostico B");

  delayedSessions.resolve({
    items: [sessionItem({ id: SESSION_A, departmentId: DEPARTMENT_A, activityId: ACTIVITY_A })],
  });
  await activityA;
  assert.equal(visibleText, "Diagnostico B");
});

test("digitacao iniciada invalida resposta tardia da hidratacao", async () => {
  const api = await loadWorkspaceTestApi();
  const coordinator = api.createDiagnosisHydrationCoordinator();
  const delayedSessions = deferred<unknown>();
  let visibleText = "";
  const token = coordinator.begin();

  const hydration = api.loadWorkspaceDiagnosisHydration(
    { context: CONTEXT, departmentId: DEPARTMENT_A, activityId: ACTIVITY_A },
    async (path) => path.includes("diagnosis-sessions")
      ? delayedSessions.promise
      : { item: contextItem(SESSION_A, "Texto antigo") }
  ).then((result) => {
    if (coordinator.canApply(token)) visibleText = result.form.work_description;
  });

  coordinator.markEdited();
  visibleText = "Digitacao atual";
  delayedSessions.resolve({
    items: [sessionItem({ id: SESSION_A, departmentId: DEPARTMENT_A, activityId: ACTIVITY_A })],
  });

  await hydration;
  assert.equal(visibleText, "Digitacao atual");
});
