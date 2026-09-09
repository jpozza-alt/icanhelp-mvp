import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync(
  "app/dashboard/nr1/workspace/page.tsx",
  "utf8"
);

const activitiesRoute = readFileSync(
  "app/api/nr1/activities/route.ts",
  "utf8"
);

function between(
  source: string,
  startMarker: string,
  endMarker: string
): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  assert.ok(start >= 0, `missing start marker: ${startMarker}`);
  assert.ok(end > start, `missing end marker: ${endMarker}`);

  return source.slice(start, end);
}

test("guided activity does not advance from step one without a valid activity name", () => {
  const block = between(
    workspace,
    "  function handleContinueGuidedMicroStep(): void {",
    "  const statusLabel"
  );

  const activityGuard = block.indexOf(
    'onboardingCurrentStep.key === "atividade" && onboardingMicroStepIndex === 0'
  );

  const nameValidation = block.indexOf(
    "activityForm.name.trim().length < 3"
  );

  const errorMessage = block.indexOf(
    'setFormError("Informe uma atividade com pelo menos 3 caracteres antes de continuar.");'
  );

  const nextStep = block.indexOf(
    'setGuidedSetupChoice("review");'
  );

  assert.ok(activityGuard >= 0);
  assert.ok(nameValidation > activityGuard);
  assert.ok(errorMessage > nameValidation);
  assert.ok(nextStep > errorMessage);
});

test("guided activity continuation does not create or persist an activity", () => {
  const block = between(
    workspace,
    "  function handleContinueGuidedMicroStep(): void {",
    "  const statusLabel"
  );

  assert.equal(block.includes("/api/nr1/activities"), false);
  assert.equal(block.includes("handleCreateActivity"), false);
  assert.equal(block.includes("fetchJson("), false);
});

test("guided activity uses the approved human question and helper", () => {
  assert.ok(
    workspace.includes(
      'question: "O que a pessoa faz nessa atividade no dia a dia?"'
    )
  );

  assert.ok(
    workspace.includes(
      'helper: "Descreva em uma frase simples as principais tarefas realizadas."'
    )
  );

  assert.equal(
    workspace.includes(
      'question: "O que acontece nessa atividade?"'
    ),
    false
  );
});

test("guided activity description shows a concrete example", () => {
  assert.ok(
    workspace.includes(
      'placeholder="Ex.: atende clientes, confere documentos, lança informações no sistema e responde solicitações por telefone."'
    )
  );
});
test("workspace requires the real activity description before final save", () => {
  const block = between(
    workspace,
    "  async function handleCreateActivity(event: FormEvent<HTMLFormElement>): Promise<void> {",
    "  async function ensureDiagnosisSession(): Promise<string> {"
  );

  const descriptionNormalization = block.indexOf(
    "const activityDescription = activityForm.real_activity_description.trim();"
  );

  const descriptionGuard = block.indexOf(
    "if (!activityDescription)"
  );

  const errorMessage = block.indexOf(
    'setFormError("Descreva o que a pessoa faz nessa atividade antes de salvar.");'
  );

  const activitiesPost = block.indexOf(
    'const path = buildUrl("/api/nr1/activities"'
  );

  assert.ok(descriptionNormalization >= 0);
  assert.ok(descriptionGuard > descriptionNormalization);
  assert.ok(errorMessage > descriptionGuard);
  assert.ok(activitiesPost > errorMessage);
});

test("workspace sends the validated trimmed activity description", () => {
  const block = between(
    workspace,
    "  async function handleCreateActivity(event: FormEvent<HTMLFormElement>): Promise<void> {",
    "  async function ensureDiagnosisSession(): Promise<string> {"
  );

  assert.ok(
    block.includes(
      "real_activity_description: activityDescription,"
    )
  );

  assert.equal(
    block.includes(
      "real_activity_description: activityForm.real_activity_description,"
    ),
    false
  );
});

test("activities API independently rejects an empty real activity description", () => {
  const descriptionNormalization = activitiesRoute.indexOf(
    "const realActivityDescription = cleanText(body.real_activity_description)"
  );

  const descriptionGuard = activitiesRoute.indexOf(
    "if (!realActivityDescription)"
  );

  const errorCode = activitiesRoute.indexOf(
    'error: "invalid_real_activity_description"'
  );

  const insert = activitiesRoute.indexOf(
    '.from("nr1_activities")',
    errorCode
  );

  assert.ok(descriptionNormalization >= 0);
  assert.ok(descriptionGuard > descriptionNormalization);
  assert.ok(errorCode > descriptionGuard);
  assert.ok(insert > errorCode);
});

test("activities API persists the validated real activity description", () => {
  assert.ok(
    activitiesRoute.includes(
      "real_activity_description: realActivityDescription,"
    )
  );

  assert.equal(
    activitiesRoute.includes(
      "real_activity_description: cleanText(body.real_activity_description),"
    ),
    false
  );
});
