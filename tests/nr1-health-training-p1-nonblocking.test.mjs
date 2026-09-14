import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const page = fs.readFileSync(
  path.join(
    root,
    "app/dashboard/nr1/saude-treinamentos/page.tsx"
  ),
  "utf8"
);

const journey = fs.readFileSync(
  path.join(
    root,
    "src/lib/nr1-journey.ts"
  ),
  "utf8"
);

test("health and training is support and does not block PGR navigation", () => {
  assert.match(
    page,
    /nextBestActionPrimaryHref="\/dashboard\/nr1\/relatorio-pgr"/
  );

  assert.match(
    page,
    /nextBestActionPrimaryLabel="Continuar para o PGR"/
  );

  assert.match(
    page,
    /nextBestActionSecondaryHref="#nr1-health-training-content"/
  );

  assert.match(
    page,
    /nextBestActionSecondaryLabel="Ver registros"/
  );

  assert.match(
    page,
    /Etapa de apoio ao PGR/
  );

  assert.match(
    page,
    /não bloqueia a revisão e a geração do PGR/
  );

  assert.match(
    page,
    /Não crie registros apenas para concluir a jornada/
  );
});

test("training status contract matches existing API", () => {
  const statusBlock = page.match(
    /const STATUS_SUGGESTIONS = \[[\s\S]*?\] as const;/
  );

  assert.ok(statusBlock);

  const text = statusBlock[0];

  assert.match(text, /value: "up_to_date", label: "Em dia"/);
  assert.match(text, /value: "due_soon", label: "Vence em breve"/);
  assert.match(text, /value: "overdue", label: "Vencido"/);

  assert.doesNotMatch(text, /"planned"/);
  assert.doesNotMatch(text, /"pending"/);
  assert.doesNotMatch(text, /"scheduled"/);
  assert.doesNotMatch(text, /"in_progress"/);
  assert.doesNotMatch(text, /"completed"/);
  assert.doesNotMatch(text, /"expired"/);
  assert.doesNotMatch(text, /"cancelled"/);
  assert.doesNotMatch(text, /"not_required"/);
});

test("status fields expose human labels while retaining API values", () => {
  assert.doesNotMatch(
    page,
    /training-status-options/
  );

  assert.match(
    page,
    /value=\{trainingForm\.status\}/
  );

  assert.match(
    page,
    /value=\{editingTrainingForm\.status\}/
  );

  assert.match(
    page,
    /\{STATUS_SUGGESTIONS\.map\(\(option\) => \(/
  );

  assert.match(
    page,
    /value=\{option\.value\}/
  );

  assert.match(
    page,
    /\{option\.label\}/
  );
});

test("health and training is not automatically marked complete", () => {
  assert.match(
    journey,
    /id: "saude-treinamentos"[\s\S]*?isComplete: incompleteUntilSupported/
  );

  assert.doesNotMatch(
    journey,
    /completed\.push\("saude-treinamentos"\)/
  );
});

test("canonical V7 context and canonical progress remain intact", () => {
  assert.match(
    page,
    /useNr1WorkspaceContext/
  );

  assert.match(
    page,
    /getNr1FullJourneyProgress/
  );

  assert.match(
    page,
    /progressPercent=\{journeyProgressPercent\}/
  );

  assert.doesNotMatch(
    page,
    /progressPercent=\{92\}/
  );
});

test("existing API routes are preserved", () => {
  assert.match(
    page,
    /\/api\/nr1\/occupational-health-refs/
  );

  assert.match(
    page,
    /\/api\/nr1\/training-records/
  );

  assert.match(
    page,
    /method: "POST"/
  );

  assert.match(
    page,
    /method: "PATCH"/
  );
});