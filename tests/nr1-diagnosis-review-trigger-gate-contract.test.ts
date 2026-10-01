import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const routePath = "app/api/nr1/diagnosis-review/route.ts";

test("geracao de risco consulta investigacoes de gatilho da mesma sessao", () => {
  const route = read(routePath);

  assert.match(route, /\.from\("nr1_trigger_investigations"\)/);
  assert.match(route, /\.eq\("tenant_id", params\.scope\.tenantId\)/);
  assert.match(route, /\.eq\("establishment_id", params\.establishmentId\)/);
  assert.match(
    route,
    /\.eq\("diagnosis_session_id", params\.diagnosisSessionId\)/
  );
  assert.match(route, /\.is\("deleted_at", null\)/);
});

test("conversao explicita avalia somente a investigacao escolhida", () => {
  const route = read(routePath);

  assert.match(
    route,
    /conversionInvestigation\.investigation_status/
  );

  assert.match(
    route,
    /!== "completed"/
  );

  assert.doesNotMatch(
    route,
    /unresolvedOtherTriggerInvestigations/
  );
});

test("trava de investigacao ocorre antes da consulta ou criacao do risco", () => {
  const route = read(routePath);

  const triggerGateIndex = route.indexOf(
    '.from("nr1_trigger_investigations")'
  );

  const riskLookupIndex = route.indexOf(
    '.from("nr1_risks")'
  );

  assert.notEqual(triggerGateIndex, -1);
  assert.notEqual(riskLookupIndex, -1);

  assert.ok(
    triggerGateIndex < riskLookupIndex,
    "a investigacao deve ser verificada antes do fluxo de risco"
  );
});
