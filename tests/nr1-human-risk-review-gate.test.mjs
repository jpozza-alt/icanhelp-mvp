import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const workspace = fs.readFileSync(
  path.join(root, "app/dashboard/nr1/workspace/page.tsx"),
  "utf8"
);

const risksRoute = fs.readFileSync(
  path.join(root, "app/api/nr1/risks/route.ts"),
  "utf8"
);

const actionPlansRoute = fs.readFileSync(
  path.join(root, "app/api/nr1/action-plans/route.ts"),
  "utf8"
);

const diagnosisReviewRoute = fs.readFileSync(
  path.join(root, "app/api/nr1/diagnosis-review/route.ts"),
  "utf8"
);

test("diagnosis generated risk remains identified before human confirmation", () => {
  assert.match(
    diagnosisReviewRoute,
    /status:\s*"identified"/
  );
});

test("risk API exposes explicit human confirmation transition", () => {
  assert.match(
    risksRoute,
    /export async function PATCH\(req: NextRequest\)/
  );

  assert.match(
    risksRoute,
    /action !== "confirm_human_review"/
  );

  assert.match(
    risksRoute,
    /existingRisk\.status !== "identified"/
  );

  assert.match(
    risksRoute,
    /status:\s*"classified"/
  );

  assert.match(
    risksRoute,
    /event_type:\s*"nr1_risk_human_review_confirmed"/
  );

  const transition =
    risksRoute.indexOf('status: "classified"');

  const audit =
    risksRoute.indexOf(
      'event_type: "nr1_risk_human_review_confirmed"',
      transition
    );

  assert.ok(transition >= 0);
  assert.ok(audit > transition);
});

test("human confirmation is limited to recognized diagnosis generated risk", () => {
  assert.match(
    risksRoute,
    /Risco sugerido a partir da revisao dos pontos/
  );

  assert.match(
    risksRoute,
    /row\.diagnosis_session_id/
  );

  assert.match(
    risksRoute,
    /row\.risk_category === "psychosocial"/
  );

  assert.match(
    risksRoute,
    /risk_not_generated_from_diagnosis/
  );
});

test("action plan backend blocks unconfirmed diagnosis generated risk", () => {
  assert.match(
    actionPlansRoute,
    /risk_human_review_required/
  );

  assert.match(
    actionPlansRoute,
    /ACTION_PLAN_ALLOWED_GENERATED_RISK_STATUSES/
  );

  assert.match(
    actionPlansRoute,
    /"classified"/
  );

  const gate =
    actionPlansRoute.indexOf(
      'error: "risk_human_review_required"'
    );

  const insert =
    actionPlansRoute.indexOf(
      '.from("nr1_action_plans")',
      gate
    );

  assert.ok(gate >= 0);
  assert.ok(insert > gate);
});

test("workspace exposes risk details and explicit confirmation action", () => {
  assert.match(
    workspace,
    /Revisão humana do risco selecionado/
  );

  assert.match(
    workspace,
    /Descrição do perigo/
  );

  assert.match(
    workspace,
    /Fonte ou circunstância/
  );

  assert.match(
    workspace,
    /Grupo exposto/
  );

  assert.match(
    workspace,
    /Possíveis lesões ou agravos/
  );

  assert.match(
    workspace,
    /Controles existentes/
  );

  assert.match(
    workspace,
    /Medida recomendada/
  );

  assert.match(
    workspace,
    /Confirmar risco e liberar Plano de Ação/
  );

  assert.match(
    workspace,
    /method:\s*"PATCH"/
  );

  assert.match(
    workspace,
    /action:\s*"confirm_human_review"/
  );
});

test("workspace blocks action plan submission until selected generated risk is confirmed", () => {
  assert.match(
    workspace,
    /selectedGeneratedRiskNeedsHumanReview/
  );

  assert.match(
    workspace,
    /Confirme o risco sugerido por revisão humana antes de criar o Plano de Ação/
  );

  assert.match(
    workspace,
    /disabled=\{actionPlanStatus === "saving" \|\| selectedGeneratedRiskNeedsHumanReview\}/
  );

  assert.match(
    workspace,
    /Plano de Ação bloqueado até a confirmação humana do risco sugerido/
  );
});

test("workspace keeps generated diagnosis risk rehydrated after classification", () => {
  assert.match(
    workspace,
    /itemStatus === "identified"/
  );

  assert.match(
    workspace,
    /itemStatus === "classified"/
  );

  assert.match(
    workspace,
    /itemStatus === "action_defined"/
  );

  assert.match(
    workspace,
    /itemStatus === "controlled"/
  );
});

test("journey focuses risk review before action plan", () => {
  assert.match(
    workspace,
    /step\.id === "riscos"[\s\S]{0,180}!hasRiskReadyForActionPlan/
  );

  assert.match(
    workspace,
    /step\.id === "plano-de-acao"[\s\S]{0,220}hasRiskReadyForActionPlan[\s\S]{0,120}actionPlans\.length === 0/
  );
});

test("next best action reflects human risk review gate", () => {
  assert.match(
    workspace,
    /Revisar e confirmar o risco sugerido/
  );

  assert.match(
    workspace,
    /Diagnóstico concluído\. O risco sugerido aguarda revisão humana antes do Plano de Ação\./
  );

  assert.match(
    workspace,
    /Definir Plano de Ação para o risco confirmado/
  );
});