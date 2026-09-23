import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const routePath =
  "app/api/nr1/trigger-investigations/[id]/answers/route.ts";

test("respostas ficam vinculadas a investigacao e ao tenant", () => {
  const route = read(routePath);

  assert.match(route, /\.from\("nr1_trigger_investigation_answers"\)/);
  assert.match(route, /tenant_id: scope\.tenantId/);
  assert.match(route, /trigger_investigation_id: investigationId/);
});

test("rota usa cliente autenticado e nao usa service role", () => {
  const route = read(routePath);

  assert.match(route, /createNr1UserClientFromBearer\(bearerToken\)/);
  assert.doesNotMatch(route, /createNr1AdminClient/);
  assert.doesNotMatch(route, /service[_-]?role/i);
});

test("somente owner ou admin podem gravar respostas", () => {
  const route = read(routePath);

  assert.match(
    route,
    /if \(!isTenantAdminRole\(scope\.role\)\) \{[\s\S]*?return json\(403,/
  );

  assert.match(
    route,
    /nr1_trigger_investigation_answer_write_forbidden/
  );
});

test("mesma pergunta e atualizada em vez de duplicada", () => {
  const route = read(routePath);

  assert.match(route, /\.eq\("question_key", questionKey\)/);
  assert.match(route, /existingRows\.length === 0/);
  assert.match(route, /\.update\(\{/);
});

test("investigacao encerrada nao aceita novas respostas", () => {
  const route = read(routePath);

  assert.match(route, /investigation_status === "archived"/);
  assert.match(route, /investigation_status === "converted_to_risk"/);
  assert.match(route, /nr1_trigger_investigation_not_editable/);
});

test("salvar resposta nao cria risco nem plano de acao", () => {
  const route = read(routePath);

  assert.doesNotMatch(route, /\.from\("nr1_risks"\)/);
  assert.doesNotMatch(route, /\.from\("nr1_action_plans"\)/);
  assert.match(route, /investigation_status: "saved_draft"/);
});

test("servidor controla os metadados da pergunta oficial", () => {
  const route = read(routePath);

  assert.match(route, /TRIGGER_INVESTIGATION_MATRIX/);
  assert.match(route, /invalid_question_for_trigger/);
  assert.match(route, /invalid_answer_for_trigger_question/);

  assert.doesNotMatch(route, /body\.question_label/);
  assert.doesNotMatch(route, /body\.answer_order/);
  assert.doesNotMatch(route, /body\.is_required/);

  assert.match(
    route,
    /question_label: canonicalQuestion\.label/
  );

  assert.match(
    route,
    /answer_order: canonicalAnswerOrder/
  );

  assert.match(
    route,
    /is_required: canonicalQuestion\.required/
  );
});

