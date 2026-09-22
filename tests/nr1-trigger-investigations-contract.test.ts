import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const routePath = "app/api/nr1/trigger-investigations/route.ts";

test("gatilho abre investigacao sem criar risco ou plano de acao", () => {
  const route = read(routePath);

  assert.match(
    route,
    /\.from\("nr1_trigger_investigations"\)[\s\S]*?\.insert\(payload\)/
  );

  assert.doesNotMatch(route, /\.from\("nr1_risks"\)/);
  assert.doesNotMatch(route, /\.from\("nr1_action_plans"\)/);
});

test("rota usa cliente autenticado e nao usa service role", () => {
  const route = read(routePath);

  assert.match(route, /createNr1UserClientFromBearer\(bearerToken\)/);
  assert.doesNotMatch(route, /createNr1AdminClient/);
  assert.doesNotMatch(route, /service[_-]?role/i);
});

test("somente owner ou admin podem abrir investigacao", () => {
  const route = read(routePath);

  assert.match(
    route,
    /if \(!isTenantAdminRole\(scope\.role\)\) \{[\s\S]*?return json\(403,/
  );

  assert.match(route, /nr1_trigger_investigation_open_forbidden/);
});

test("investigacao inicia sem classificacao automatica de risco", () => {
  const route = read(routePath);

  assert.match(route, /initial_answer: "yes"/);
  assert.match(route, /official_message_shown: true/);
  assert.match(route, /investigation_status: "in_investigation"/);

  assert.match(
    route,
    /Este ponto nao e automaticamente um risco\. Vamos entender melhor a situacao antes de classificar\./
  );
});
