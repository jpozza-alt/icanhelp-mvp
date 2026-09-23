import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const routePath = "app/api/nr1/diagnosis-psychosocial/route.ts";

test("sinal psicossocial marcado exige investigacao e nao vira evidencia automaticamente", () => {
  const route = read(routePath);

  assert.match(
    route,
    /status: row\[factor\.key\] === true \? "needs_investigation" : "not_observed"/
  );

  assert.match(
    route,
    /investigation_pending: row\[factor\.key\] === true/
  );

  assert.match(
    route,
    /Aprofundar este ponto antes de classificar como fator de risco/
  );

  assert.doesNotMatch(
    route,
    /status: row\[factor\.key\] === true \? "evidence_found"/
  );
});
