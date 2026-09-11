import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const workspace = fs.readFileSync(
  path.join(root, "app/dashboard/nr1/workspace/page.tsx"),
  "utf8"
);

const shell = fs.readFileSync(
  path.join(root, "src/components/nr1/Nr1WorkspaceV2Shell.tsx"),
  "utf8"
);

const journey = fs.readFileSync(
  path.join(root, "src/lib/nr1-journey.ts"),
  "utf8"
);

test("inventory and action plan are separate official workspace sections", () => {
  assert.match(
    workspace,
    /requestedSection === "riscos" \? "riscos" : null/
  );

  assert.match(
    workspace,
    /requestedSection === "plano"/
  );

  assert.match(
    workspace,
    /effectiveActiveSection === "riscos" \|\| effectiveActiveSection === "plano"/
  );

  const planStart = journey.indexOf('id: "plano-de-acao"');
  const evidenceStart = journey.indexOf('id: "evidencias"', planStart);

  assert.ok(planStart >= 0);
  assert.ok(evidenceStart > planStart);

  const planStep = journey.slice(planStart, evidenceStart);

  assert.match(
    planStep,
    /href:\s*"\/dashboard\/nr1\/workspace\?section=plano"/
  );

  assert.doesNotMatch(
    planStep,
    /href:\s*"\/dashboard\/nr1\/plano-de-acao"/
  );
});

test("three competing columns are removed from layperson flow", () => {
  assert.doesNotMatch(
    workspace,
    /xl:grid-cols-\[1fr_1fr_1fr\]/
  );

  assert.match(
    workspace,
    /Outras ações · Adicionar risco manual/
  );

  assert.match(
    workspace,
    /showManualRiskForm/
  );

  assert.match(
    workspace,
    /Cadastro manual de risco/
  );
});

test("inventory focuses risk review before action planning", () => {
  assert.match(
    workspace,
    /Inventário de riscos/
  );

  assert.match(
    workspace,
    /Revisar risco selecionado/
  );

  assert.match(
    workspace,
    /Riscos encontrados/
  );

  assert.match(
    workspace,
    /Criar Plano de Ação/
  );

  assert.match(
    workspace,
    /\/dashboard\/nr1\/workspace\?section=plano/
  );
});

test("human review gate remains intact", () => {
  assert.match(
    workspace,
    /Confirmar risco e liberar Plano de Ação/
  );

  assert.match(
    workspace,
    /selectedGeneratedRiskNeedsHumanReview/
  );

  assert.match(
    workspace,
    /Plano de Ação bloqueado até a confirmação humana do risco sugerido/
  );

  assert.match(
    workspace,
    /disabled=\{actionPlanStatus === "saving" \|\| selectedGeneratedRiskNeedsHumanReview\}/
  );
});

test("action plan is a three step guided layperson flow", () => {
  assert.match(
    workspace,
    /Plano de Ação guiado/
  );

  assert.match(
    workspace,
    /Passo \{actionPlanGuideStep\} de 3/
  );

  assert.match(
    workspace,
    /O que vamos fazer\?/
  );

  assert.match(
    workspace,
    /Quem fará e até quando\?/
  );

  assert.match(
    workspace,
    /Como vamos acompanhar e comprovar\?/
  );

  assert.match(
    workspace,
    /setActionPlanGuideStep\(2\)/
  );

  assert.match(
    workspace,
    /setActionPlanGuideStep\(3\)/
  );
});

test("technical values are translated in the layperson UI", () => {
  assert.match(
    workspace,
    /<option value="organizational">Medida organizacional<\/option>/
  );

  assert.match(
    workspace,
    /<option value="medium">Média<\/option>/
  );

  assert.match(
    workspace,
    /<strong>Em aberto<\/strong>/
  );

  assert.match(
    workspace,
    /formatRiskCategory/
  );

  assert.match(
    workspace,
    /formatRiskLevel/
  );

  assert.doesNotMatch(
    workspace,
    /placeholder="Tipo da medida"/
  );
});

test("journey orientation remains visible while scrolling", () => {
  assert.match(
    shell,
    /lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto/
  );

  assert.match(
    shell,
    /sticky top-0 z-40/
  );

  assert.match(
    shell,
    /Foco da jornada:/
  );

  assert.match(
    shell,
    /Próxima ação:/
  );
});

test("official APIs remain the workspace persistence path", () => {
  assert.match(
    workspace,
    /\/api\/nr1\/risks/
  );

  assert.match(
    workspace,
    /\/api\/nr1\/action-plans/
  );

  assert.match(
    workspace,
    /action:\s*"confirm_human_review"/
  );
});

test("after action plan the next best action points to evidence", () => {
  assert.match(
    workspace,
    /Registrar evidências da execução/
  );

  assert.match(
    workspace,
    /Ir para Evidências/
  );

  assert.match(
    workspace,
    /\/dashboard\/nr1\/evidencias-acompanhamento/
  );
});
