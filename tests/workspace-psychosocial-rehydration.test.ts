import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as ts from "typescript";

type BackendContext = {
  tenantId: string | null;
  establishmentId: string | null;
};

type PsychosocialForm = {
  has_work_overload: boolean;
  has_excessive_pressure: boolean;
  has_role_ambiguity: boolean;
  has_low_autonomy: boolean;
  has_leadership_support_failure: boolean;
  has_peer_conflict: boolean;
  has_hostile_public_contact: boolean;
  has_constant_interruptions: boolean;
  has_task_accumulation: boolean;
  has_communication_difficulty: boolean;
  has_remote_isolation: boolean;
  has_badly_managed_change: boolean;
  has_report_channel: boolean;
  notes: string;
};

type PsychosocialHydrationResult = {
  sessionId: string;
  saved: boolean;
  form: PsychosocialForm;
};

type RequestJson = (
  path: string,
  options?: RequestInit,
  context?: BackendContext
) => Promise<unknown>;

type HydrationToken = {
  requestId: number;
};

type HydrationCoordinator = {
  begin(): HydrationToken;
  cancel(): void;
  markEdited(): void;
  canApply(token: HydrationToken): boolean;
};

type WorkspaceTestApi = {
  loadWorkspacePsychosocialHydration(
    request: {
      context: BackendContext;
      sessionId: string;
    },
    requestJson: RequestJson
  ): Promise<PsychosocialHydrationResult>;

  createDiagnosisHydrationCoordinator(): HydrationCoordinator;
};

const TENANT =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const OTHER_TENANT =
  "99999999-9999-4999-8999-999999999999";

const ESTABLISHMENT =
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const SESSION =
  "11111111-1111-4111-8111-111111111111";

const OTHER_SESSION =
  "22222222-2222-4222-8222-222222222222";

const CONTEXT: BackendContext = {
  tenantId: TENANT,
  establishmentId: ESTABLISHMENT,
};

async function loadWorkspaceTestApi(): Promise<WorkspaceTestApi> {
  const pageUrl =
    new URL(
      "../app/dashboard/nr1/workspace/page.tsx",
      import.meta.url
    );

  const source =
    await readFile(pageUrl, "utf8");

  const instrumentedSource =
    source +
    "\nexport { loadWorkspacePsychosocialHydration, createDiagnosisHydrationCoordinator };\n";

  const transpiled =
    ts.transpileModule(
      instrumentedSource,
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
        fileName: "workspace-page.tsx",
      }
    );

  const moduleRecord: {
    exports: Record<string, unknown>;
  } = {
    exports: {},
  };

  const requireStub =
    (id: string): unknown => {
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
        return {
          Fragment: Symbol("Fragment"),
          jsx: () => null,
          jsxs: () => null,
        };
      }

      if (id === "@supabase/supabase-js") {
        return {
          createClient: () => ({
            auth: {},
          }),
        };
      }

      if (id === "@/lib/nr1-plan-features-client") {
        return {
          getNr1PlanFeatures: async () => ({}),
        };
      }

      if (id === "@/lib/nr1-journey") {
        return {
          NR1_JOURNEY_STEPS: [],
        };
      }

      if (id === "@/components/nr1/Nr1WorkspaceV2Shell") {
        return {
          __esModule: true,
          default: () => null,
        };
      }

      throw new Error(
        "Unexpected module in workspace psychosocial test: " + id
      );
    };

  const script =
    new vm.Script(
      transpiled.outputText,
      {
        filename: "workspace-page.cjs",
      }
    );

  script.runInNewContext({
    module: moduleRecord,
    exports: moduleRecord.exports,
    require: requireStub,
    process: {
      env: {},
    },
    console,
    URLSearchParams,
    Headers,
    setTimeout,
    clearTimeout,
  });

  return moduleRecord.exports as WorkspaceTestApi;
}

function psychosocialItem(
  overrides: Partial<Record<keyof PsychosocialForm, unknown>> & {
    tenant_id?: string;
    diagnosis_session_id?: string;
  } = {}
) {
  return {
    tenant_id: TENANT,
    diagnosis_session_id: SESSION,

    has_work_overload: true,
    has_excessive_pressure: false,
    has_role_ambiguity: false,
    has_low_autonomy: false,
    has_leadership_support_failure: false,
    has_peer_conflict: false,
    has_hostile_public_contact: false,
    has_constant_interruptions: true,
    has_task_accumulation: true,
    has_communication_difficulty: false,
    has_remote_isolation: false,
    has_badly_managed_change: false,
    has_report_channel: false,

    notes:
      "Sobrecarga, interrupcoes constantes e acumulo de tarefas observados na rotina.",

    ...overrides,
  };
}

function deferred<T>() {
  let resolvePromise!: (value: T) => void;

  const promise =
    new Promise<T>((resolve) => {
      resolvePromise = resolve;
    });

  return {
    promise,
    resolve: resolvePromise,
  };
}

test(
  "reidrata todos os fatores psicossociais e a justificativa da sessao correta",
  async () => {
    const api =
      await loadWorkspaceTestApi();

    const calls: Array<{
      path: string;
      method: string;
      context?: BackendContext;
    }> = [];

    const result =
      await api.loadWorkspacePsychosocialHydration(
        {
          context: CONTEXT,
          sessionId: SESSION,
        },
        async (path, options, context) => {
          calls.push({
            path,
            method: options?.method ?? "GET",
            context,
          });

          return {
            item: psychosocialItem(),
          };
        }
      );

    assert.equal(result.saved, true);
    assert.equal(result.sessionId, SESSION);

    assert.equal(
      result.form.has_work_overload,
      true
    );

    assert.equal(
      result.form.has_constant_interruptions,
      true
    );

    assert.equal(
      result.form.has_task_accumulation,
      true
    );

    assert.equal(
      result.form.has_excessive_pressure,
      false
    );

    assert.equal(
      result.form.has_role_ambiguity,
      false
    );

    assert.equal(
      result.form.has_low_autonomy,
      false
    );

    assert.equal(
      result.form.has_leadership_support_failure,
      false
    );

    assert.equal(
      result.form.has_peer_conflict,
      false
    );

    assert.equal(
      result.form.has_hostile_public_contact,
      false
    );

    assert.equal(
      result.form.has_communication_difficulty,
      false
    );

    assert.equal(
      result.form.has_remote_isolation,
      false
    );

    assert.equal(
      result.form.has_badly_managed_change,
      false
    );

    assert.equal(
      result.form.has_report_channel,
      false
    );

    assert.equal(
      result.form.notes,
      "Sobrecarga, interrupcoes constantes e acumulo de tarefas observados na rotina."
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "GET");
    assert.deepEqual(
      calls[0].context,
      CONTEXT
    );

    const url =
      new URL(
        calls[0].path,
        "https://icanhelp.test"
      );

    assert.equal(
      url.pathname,
      "/api/nr1/diagnosis-psychosocial"
    );

    assert.equal(
      url.searchParams.get("tenantId"),
      TENANT
    );

    assert.equal(
      url.searchParams.get("establishmentId"),
      ESTABLISHMENT
    );

    assert.equal(
      url.searchParams.get("diagnosisSessionId"),
      SESSION
    );
  }
);

test(
  "ausencia de registro psicossocial mantem formulario vazio sem criar dados",
  async () => {
    const api =
      await loadWorkspaceTestApi();

    const methods: string[] = [];

    const result =
      await api.loadWorkspacePsychosocialHydration(
        {
          context: CONTEXT,
          sessionId: SESSION,
        },
        async (_path, options) => {
          methods.push(
            options?.method ?? "GET"
          );

          return {
            item: null,
          };
        }
      );

    assert.equal(result.saved, false);
    assert.equal(
      result.form.has_work_overload,
      false
    );
    assert.equal(
      result.form.has_constant_interruptions,
      false
    );
    assert.equal(
      result.form.has_task_accumulation,
      false
    );
    assert.equal(result.form.notes, "");
    assert.deepEqual(methods, ["GET"]);
  }
);

test(
  "registro de outro tenant nao entra no estado visivel",
  async () => {
    const api =
      await loadWorkspaceTestApi();

    const result =
      await api.loadWorkspacePsychosocialHydration(
        {
          context: CONTEXT,
          sessionId: SESSION,
        },
        async () => ({
          item: psychosocialItem({
            tenant_id: OTHER_TENANT,
          }),
        })
      );

    assert.equal(result.saved, false);
    assert.equal(
      result.form.has_work_overload,
      false
    );
    assert.equal(
      result.form.has_constant_interruptions,
      false
    );
    assert.equal(
      result.form.has_task_accumulation,
      false
    );
  }
);

test(
  "registro de outra sessao nao entra no estado visivel",
  async () => {
    const api =
      await loadWorkspaceTestApi();

    const result =
      await api.loadWorkspacePsychosocialHydration(
        {
          context: CONTEXT,
          sessionId: SESSION,
        },
        async () => ({
          item: psychosocialItem({
            diagnosis_session_id: OTHER_SESSION,
          }),
        })
      );

    assert.equal(result.saved, false);
    assert.equal(
      result.form.has_task_accumulation,
      false
    );
  }
);

test(
  "edicao iniciada pelo RH invalida resposta psicossocial tardia",
  async () => {
    const api =
      await loadWorkspaceTestApi();

    const coordinator =
      api.createDiagnosisHydrationCoordinator();

    const delayed =
      deferred<unknown>();

    let visibleTaskAccumulation =
      false;

    const token =
      coordinator.begin();

    const hydration =
      api.loadWorkspacePsychosocialHydration(
        {
          context: CONTEXT,
          sessionId: SESSION,
        },
        async () => delayed.promise
      ).then((result) => {
        if (coordinator.canApply(token)) {
          visibleTaskAccumulation =
            result.form.has_task_accumulation;
        }
      });

    coordinator.markEdited();

    visibleTaskAccumulation =
      false;

    delayed.resolve({
      item: psychosocialItem({
        has_task_accumulation: true,
      }),
    });

    await hydration;

    assert.equal(
      visibleTaskAccumulation,
      false
    );
  }
);

test(
  "workspace conecta reidratacao oficial e protege edicao dos fatores",
  async () => {
    const pageUrl =
      new URL(
        "../app/dashboard/nr1/workspace/page.tsx",
        import.meta.url
      );

    const source =
      await readFile(pageUrl, "utf8");

    assert.match(
      source,
      /loadWorkspacePsychosocialHydration\(\{[\s\S]*?sessionId:\s*hydratedDiagnosis\.sessionId/
    );

    assert.match(
      source,
      /setPsychosocialForm\(hydratedPsychosocial\.form\)/
    );

    assert.match(
      source,
      /setPsychosocialDiagnosisSaved\(hydratedPsychosocial\.saved\)/
    );

    assert.match(
      source,
      /setPsychosocialForm\(\{\s*\.\.\.INITIAL_PSYCHOSOCIAL_FORM\s*\}\)/
    );

    assert.match(
      source,
      /function updatePsychosocialForm[\s\S]*?diagnosisHydrationCoordinatorRef\.current\.markEdited\(\)/
    );

    assert.match(
      source,
      /updatePsychosocialForm\(\{\s*\[key\]:\s*event\.target\.checked\s*\}/
    );

    assert.match(
      source,
      /updatePsychosocialForm\(\{\s*notes:\s*event\.target\.value\s*\}\)/
    );
  }
);