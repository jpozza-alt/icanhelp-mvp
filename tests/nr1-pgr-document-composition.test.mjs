import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const route = fs.readFileSync(
  path.join(root, "app/api/nr1/pgr-report/route.ts"),
  "utf8"
);

const page = fs.readFileSync(
  path.join(root, "app/dashboard/nr1/relatorio-pgr/page.tsx"),
  "utf8"
);

test("PGR report consolidates GRO criteria and technical sources in read-only mode", () => {
  assert.match(route, /\.from\("nr1_gro_criteria"\)/);
  assert.match(route, /\.from\("nr1_diagnosis_sessions"\)/);
  assert.match(route, /\.from\("nr1_diagnosis_ergonomics"\)/);
  assert.match(route, /\.from\("nr1_diagnosis_fqb"\)/);

  assert.match(route, /groCriteria,/);
  assert.match(route, /diagnosisErgonomics,/);
  assert.match(route, /diagnosisFqb,/);

  assert.doesNotMatch(route, /\.insert\(/);
  assert.doesNotMatch(route, /\.update\(/);
  assert.doesNotMatch(route, /\.upsert\(/);
  assert.doesNotMatch(route, /\.delete\(/);
});

test("PGR preview exposes NR-1 inventory minimum data already present in records", () => {
  assert.match(
    page,
    /3\. Caracterização dos processos, ambientes e atividades/
  );

  assert.match(
    page,
    /4\. Inventário de riscos ocupacionais/
  );

  assert.match(page, /Descrição do perigo:/);
  assert.match(page, /Fonte e\/ou circunstância:/);
  assert.match(page, /Possíveis lesões ou agravos:/);
  assert.match(page, /Grupo de trabalhadores expostos:/);
  assert.match(
    page,
    /Medidas de prevenção\/controles existentes registrados:/
  );
  assert.match(page, /Caracterização da exposição:/);
  assert.match(page, /Severidade:/);
  assert.match(page, /Probabilidade:/);
  assert.match(page, /Nível de risco:/);
  assert.match(page, /Classificação:/);
});

test("GRO/PGR criteria are displayed from persisted criteria and never invented", () => {
  assert.match(
    page,
    /5\. Critérios utilizados no GRO\/PGR/
  );

  assert.match(
    page,
    /Critérios das gradações de severidade/
  );

  assert.match(
    page,
    /Critérios das gradações de probabilidade/
  );

  assert.match(
    page,
    /Níveis de risco resultantes da combinação/
  );

  assert.match(
    page,
    /Critérios de classificação dos riscos/
  );

  assert.match(
    page,
    /Critérios para tomada de decisão/
  );

  assert.match(
    page,
    /A prévia não preencherá critérios por inferência/
  );
});

test("AEP and monitoring data only come from recorded diagnosis technical sources", () => {
  assert.match(
    page,
    /findByDiagnosisSession/
  );

  assert.match(
    page,
    /diagnosisErgonomics/
  );

  assert.match(
    page,
    /diagnosisFqb/
  );

  assert.match(
    page,
    /Não informado no diagnóstico vinculado/
  );
});

test("human review and non-formal boundaries remain explicit", () => {
  assert.match(
    page,
    /Medida recomendada — sugestão para tratamento/
  );

  assert.match(
    page,
    /const FORMAL_PGR_OPERATIONS_ENABLED = false;/
  );

  assert.match(
    page,
    /Prévia estruturada do PGR — não formal/
  );

  assert.match(
    page,
    /Imprimir prévia — não formal/
  );

  assert.match(
    page,
    /useNr1WorkspaceContext/
  );

  assert.match(
    page,
    /getNr1FullJourneyProgress/
  );
});