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

const tour = fs.readFileSync(
  path.join(
    root,
    "src/components/nr1/Nr1GuidedHelpTour.tsx"
  ),
  "utf8"
);

test("evidence screen uses reusable guided help", () => {
  assert.match(
    page,
    /Nr1GuidedHelpTour/
  );

  assert.match(
    page,
    /EVIDENCE_HELP_TOUR_STEPS/
  );

  assert.match(
    page,
    /buttonLabel="Como preencher"/
  );

  assert.match(
    page,
    /storageKey="evidencias-v1"/
  );
});

test("guided help has navigation and can be reopened", () => {
  assert.match(tour, /Pular tour/);
  assert.match(tour, /Anterior/);
  assert.match(tour, /Próximo/);
  assert.match(tour, /Concluir/);
  assert.match(tour, /buttonLabel/);
  assert.match(
    tour,
    /nr1_ui_help_seen:/
  );
});

test("guided help highlights the current field without touching business context", () => {
  assert.match(
    tour,
    /document\.getElementById\(currentStep\.targetId\)/
  );

  assert.match(
    tour,
    /scrollIntoView/
  );

  assert.doesNotMatch(
    tour,
    /nr1_workspace_selection:/
  );

  assert.doesNotMatch(
    tour,
    /\/api\//
  );
});

test("evidence form clearly distinguishes required and optional fields", () => {
  assert.match(
    page,
    /Título da evidência[\s\S]{0,400}Obrigatório/
  );

  assert.match(
    page,
    /Tipo de evidência[\s\S]{0,400}Obrigatório/
  );

  assert.match(
    page,
    /Plano de Ação vinculado[\s\S]{0,500}Obrigatório/
  );

  assert.match(
    page,
    /Data da evidência[\s\S]{0,400}Opcional/
  );

  assert.match(
    page,
    /Responsável[\s\S]{0,400}Opcional/
  );

  assert.match(
    page,
    /Descrição[\s\S]{0,400}Opcional/
  );
});

test("technical evidence fields are not exposed as manual form controls", () => {
  assert.doesNotMatch(
    page,
    /<label[^>]*>Entidade vinculada<\/label>/
  );

  assert.doesNotMatch(
    page,
    /value=\{form\.file_name\}/
  );

  assert.doesNotMatch(
    page,
    /value=\{form\.file_url\}/
  );

  assert.doesNotMatch(
    page,
    /value=\{form\.validation_status\}/
  );
});

test("action plan remains visible in human language and stores formal link", () => {
  assert.match(
    page,
    /Plano de Ação vinculado/
  );

  assert.match(
    page,
    /actionPlans\.map\(\(plan\) =>/
  );

  assert.match(
    page,
    /linked_entity_type: "action_plan"/
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

test("hidden technical values remain in persistence contract", () => {
  assert.match(
    page,
    /file_name: form\.file_name\.trim\(\) \|\| null/
  );

  assert.match(
    page,
    /file_url: form\.file_url\.trim\(\) \|\| null/
  );

  assert.match(
    page,
    /validation_status: form\.validation_status\.trim\(\) \|\| null/
  );

  assert.match(
    page,
    /validation_status: "pending_validation"/
  );
});

test("human review remains explicit after save", () => {
  assert.match(
    page,
    /Pendente de validação/
  );

  assert.match(
    page,
    /revisão humana/
  );

  assert.match(
    page,
    /não é tratado[\s\S]{0,120}automaticamente como comprovação definitiva/
  );
});

test("raw technical id is not requested from lay user", () => {
  assert.doesNotMatch(
    page,
    /Informe o ID vinculado antes de salvar a evidência/
  );

  assert.match(
    page,
    /Escolha o Plano de Ação que esta evidência comprova/
  );
});