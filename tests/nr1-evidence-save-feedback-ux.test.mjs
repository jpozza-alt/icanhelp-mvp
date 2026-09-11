import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const page = fs.readFileSync(
  path.join(
    root,
    "app/dashboard/nr1/evidencias-acompanhamento/page.tsx"
  ),
  "utf8"
);

test("post-save feedback clearly says evidence is saved", () => {
  assert.match(
    page,
    /Evidência salva com sucesso\./
  );

  assert.match(
    page,
    /Ela já está registrada e vinculada ao Plano de Ação\./
  );

  assert.match(
    page,
    /Registro: Salvo/
  );
});

test("saved state is visually separated from validation state", () => {
  assert.match(
    page,
    /Validação: Aguardando validação/
  );

  assert.match(
    page,
    /return "Aguardando validação";/
  );

  assert.match(
    page,
    /Validação: \{formatValidationStatus\(item\.validation_status\)\}/
  );
});

test("internal pending validation contract remains unchanged", () => {
  assert.match(
    page,
    /validation_status: "pending_validation"/
  );

  assert.match(
    page,
    /validation_status: form\.validation_status\.trim\(\) \|\| null/
  );

  assert.match(
    page,
    /=== "pending_validation"/
  );
});

test("technical backend success copy is removed", () => {
  assert.doesNotMatch(
    page,
    /Evidência gravada com sucesso no backend real\./
  );
});

test("saved evidence can be located and highlighted", () => {
  assert.match(
    page,
    /lastSavedEvidenceId/
  );

  assert.match(
    page,
    /highlightedEvidenceId/
  );

  assert.match(
    page,
    /"evidence-item-" \+ lastSavedEvidenceId/
  );

  assert.match(
    page,
    /"evidence-item-" \+ item\.id/
  );

  assert.match(
    page,
    /scrollIntoView/
  );

  assert.match(
    page,
    /Ver evidência salva/
  );
});

test("dashboard labels use layperson wording", () => {
  assert.match(
    page,
    /evidências salvas/
  );

  assert.match(
    page,
    /aguardando validação/
  );

  assert.match(
    page,
    /vinculadas a Plano de Ação/
  );

  assert.match(
    page,
    /vinculadas a acompanhamento/
  );
});

test("official evidence persistence and V7 context remain intact", () => {
  assert.match(
    page,
    /useNr1WorkspaceContext/
  );

  assert.match(
    page,
    /fetch\("\/api\/nr1\/evidence-items\?tenantId="/
  );

  assert.match(
    page,
    /linked_entity_type: linkedEntityType/
  );

  assert.match(
    page,
    /linked_entity_id: linkedEntityId/
  );
});