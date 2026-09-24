import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const routePath =
  "app/api/nr1/trigger-investigations/[id]/complete/route.ts";

test("rota usa cliente autenticado e nao usa service role", () => {
  const route = read(routePath);

  assert.match(
    route,
    /createNr1UserClientFromBearer\(bearerToken\)/,
  );

  assert.doesNotMatch(route, /createNr1AdminClient/);
  assert.doesNotMatch(route, /service[_-]?role/i);
});

test("somente owner ou admin podem concluir investigacao", () => {
  const route = read(routePath);

  assert.match(
    route,
    /if \(!isTenantAdminRole\(scope\.role\)\) \{[\s\S]*?return json\(403,/,
  );

  assert.match(
    route,
    /nr1_trigger_investigation_complete_forbidden/,
  );
});

test("rota carrega respostas da investigacao no mesmo tenant", () => {
  const route = read(routePath);

  assert.match(
    route,
    /\.from\("nr1_trigger_investigation_answers"\)/,
  );

  assert.match(
    route,
    /\.eq\("tenant_id", scope\.tenantId\)/,
  );

  assert.match(
    route,
    /\.eq\(\s*"trigger_investigation_id",\s*investigationId,/,
  );
});

test("conclusao usa o motor oficial de resultado", () => {
  const route = read(routePath);

  assert.match(
    route,
    /evaluateTriggerInvestigation\(/,
  );

  assert.match(
    route,
    /investigation\.trigger_type/,
  );
});

test("investigacao incompleta nao e concluida", () => {
  const route = read(routePath);

  assert.match(
    route,
    /if \(!evaluation\.complete\)/,
  );

  assert.match(
    route,
    /nr1_trigger_investigation_incomplete/,
  );
});

test("resultado concluido fica separado do status do processo", () => {
  const route = read(routePath);

  assert.match(
    route,
    /investigation_status: "completed"/,
  );

  assert.match(
    route,
    /suggested_result:\s*evaluation\.suggestedResult/,
  );

  assert.match(
    route,
    /technical_validation_required:\s*evaluation\.technicalValidationRequired/,
  );

  assert.match(
    route,
    /critical_alert_required:\s*evaluation\.criticalAlertRequired/,
  );
});

test("conclusao registra eventos de auditoria esperados", () => {
  const route = read(routePath);

  assert.match(
    route,
    /trigger_investigation_completed/,
  );

  assert.match(
    route,
    /trigger_result_suggested/,
  );

  assert.match(
    route,
    /technical_validation_required/,
  );

  assert.match(
    route,
    /critical_alert_generated/,
  );
});

test("concluir investigacao nao cria risco nem plano de acao", () => {
  const route = read(routePath);

  assert.doesNotMatch(
    route,
    /\.from\("nr1_risks"\)/,
  );

  assert.doesNotMatch(
    route,
    /\.from\("nr1_action_plans"\)/,
  );

  assert.doesNotMatch(
    route,
    /generated_risk_id\s*:/,
  );

  assert.doesNotMatch(
    route,
    /generated_action_plan_id\s*:/,
  );
});
