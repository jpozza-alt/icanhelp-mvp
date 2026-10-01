import { expect, test, type Page } from "@playwright/test";

const email = process.env.PW_MVP_EMAIL!;
const password = process.env.PW_MVP_PASSWORD!;

async function fillVisible(
  page: Page,
  placeholder: string,
  value: string,
) {
  const input = page
    .locator(`[placeholder="${placeholder}"]:visible`)
    .first();

  if ((await input.count()) > 0 && (await input.isVisible())) {
    await input.fill(value);
    return true;
  }

  return false;
}

async function clickVisibleButton(
  page: Page,
  pattern: RegExp,
) {
  const button = page
    .locator("button:visible")
    .filter({ hasText: pattern })
    .first();

  if ((await button.count()) > 0 && (await button.isVisible())) {
    await button.click();
    return true;
  }

  return false;
}

test("MVP empresa nova chega do login ao diagnostico", async ({
  page,
}) => {
  test.setTimeout(180_000);

  page.on("pageerror", (error) => {
    console.log(
      `[PAGE_ERROR] ${error.stack || error.message}`,
    );
  });

  page.on("console", (message) => {
    if (
      message.type() === "error" ||
      message.type() === "warning"
    ) {
      console.log(
        `[BROWSER_${message.type().toUpperCase()}] ${message.text()}`,
      );
    }
  });

  page.on("requestfailed", (request) => {
    console.log(
      `[REQUEST_FAILED] ${request.method()} ${request.url()} :: ${
        request.failure()?.errorText || "unknown"
      }`,
    );
  });

  // LOGIN REAL NO SUPABASE LOCAL
  await page.goto("/login");

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);

  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .click();

  await expect(page).not.toHaveURL(/\/login/, {
    timeout: 30_000,
  });

  // WORKSPACE REAL
  await page.goto("/dashboard/nr1/workspace");

  await page.waitForLoadState("domcontentloaded");

  // Aguarda o React realmente hidratar o CTA antes do clique.
  const cnpjInput = page.locator(
    '[placeholder="00.000.000/0000-00"]:visible',
  );

  if ((await cnpjInput.count()) === 0) {
    const startButton = page.getByRole("button", {
      name: "Começar agora",
      exact: true,
    });

    await expect(startButton).toBeVisible({
      timeout: 20_000,
    });

    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const target = buttons.find(
        (button) => button.textContent?.trim() === "Começar agora",
      );

      if (!target) {
        return false;
      }

      return Object.keys(target).some(
        (key) =>
          key.startsWith("__reactProps$") ||
          key.startsWith("__reactFiber$"),
      );
    }, {
      timeout: 20_000,
    });

    console.log("[PW_HYDRATION] START_BUTTON_REACT_READY=True");

    await startButton.click();

    await expect(cnpjInput).toBeVisible({
      timeout: 10_000,
    });

    console.log("[PW_HYDRATION] GUIDED_SETUP_OPENED=True");
  }

  // Estado alternativo: base parcialmente iniciada.
  if ((await cnpjInput.count()) === 0) {
    const reviewButton = page.getByRole("button", {
      name: "Revisar triagem",
      exact: true,
    });

    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click();

      await expect(cnpjInput).toBeVisible({
        timeout: 10_000,
      });
    }
  }
  // ==========================================================
  // EMPRESA
  // ==========================================================

  await expect(
    page.locator('[placeholder="00.000.000/0000-00"]:visible'),
  ).toBeVisible({
    timeout: 20_000,
  });

  await fillVisible(
    page,
    "00.000.000/0000-00",
    "11.444.777/0001-61",
  );

  // O fluxo exige que a consulta de CNPJ seja tentada.
  const lookup = page
    .locator("button:visible")
    .filter({
      hasText: /buscar.*cnpj|consultar.*cnpj|buscar dados/i,
    })
    .first();

  if ((await lookup.count()) > 0) {
    await lookup.click();
    await page.waitForTimeout(1000);
  }

  for (let i = 0; i < 10; i++) {
    await fillVisible(
      page,
      "Razão social",
      "Empresa Ficticia PW MVP",
    );

    await fillVisible(
      page,
      "Nome fantasia",
      "PW MVP",
    );

    await fillVisible(
      page,
      "CNAE principal",
      "6201501",
    );

    await fillVisible(
      page,
      "ME, EPP, medio porte ou grande porte",
      "EPP",
    );

    await fillVisible(
      page,
      "Ex.: 45",
      "12",
    );

    if (
      (await page
        .locator(
          '[placeholder="Nome do local de trabalho"]:visible',
        )
        .count()) > 0
    ) {
      break;
    }

    const advanced = await clickVisibleButton(
      page,
      /salvar e continuar|cadastrar empresa|continuar/i,
    );

    if (!advanced) {
      break;
    }

    await page.waitForTimeout(500);
  }

  // ==========================================================
  // ESTABELECIMENTO
  // ==========================================================

  const establishmentName = page.locator(
    '[placeholder="Nome do local de trabalho"]:visible',
  );

  await expect(establishmentName).toBeVisible({
    timeout: 20_000,
  });

  await establishmentName.fill("Matriz PW MVP");

  // Microetapa 1 -> microetapa 2
  const establishmentAdvance = await clickVisibleButton(
    page,
    /continuar|proximo|avancar/i,
  );

  if (!establishmentAdvance) {
    throw new Error(
      "Nao foi possivel avancar da microetapa Nome do local para Cidade/UF",
    );
  }

  const cityInput = page.locator(
    '[placeholder="Cidade"]:visible',
  );

  await expect(cityInput).toBeVisible({
    timeout: 20_000,
  });

  await cityInput.fill("Cidade Ficticia");

  const ufInput = page.locator(
    '[placeholder="UF"]:visible',
  );

  await expect(ufInput).toBeVisible({
    timeout: 20_000,
  });

  await ufInput.fill("SC");

  const saveEstablishment = page
    .locator("button:visible")
    .filter({
      hasText: /salvar local de trabalho e continuar/i,
    })
    .first();

  await expect(saveEstablishment).toBeVisible({
    timeout: 20_000,
  });

  await saveEstablishment.click();

  await expect(
    page.locator('[placeholder="Nome do setor"]:visible'),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] ESTABLISHMENT_MICROSTEPS=PASS");
  // ==========================================================
  // SETOR
  // ==========================================================

  const departmentName = page.locator(
    '[placeholder="Nome do setor"]:visible',
  );

  await expect(departmentName).toBeVisible({
    timeout: 20_000,
  });

  await departmentName.fill("Administrativo PW MVP");

  // Microetapa 1 -> microetapa 2
  const departmentAdvance = await clickVisibleButton(
    page,
    /continuar|proximo|avancar/i,
  );

  if (!departmentAdvance) {
    throw new Error(
      "Nao foi possivel avancar da microetapa Nome do setor para Numero de pessoas",
    );
  }

  const peopleInput = page.locator(
    '[placeholder="Numero de pessoas no setor"]:visible',
  );

  await expect(peopleInput).toBeVisible({
    timeout: 20_000,
  });

  await peopleInput.fill("6");

  const saveDepartment = page
    .locator("button:visible")
    .filter({
      hasText: /salvar setor/i,
    })
    .first();

  await expect(saveDepartment).toBeVisible({
    timeout: 20_000,
  });

  await saveDepartment.click();

  const finishDepartments = page
    .locator("button:visible")
    .filter({
      hasText: /concluir setores e cadastrar atividades/i,
    })
    .first();

  await expect(finishDepartments).toBeVisible({
    timeout: 20_000,
  });

  await finishDepartments.click();

  await expect(
    page.locator('[placeholder="Nome da atividade"]:visible'),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] DEPARTMENT_MICROSTEPS=PASS");
  // ==========================================================
  // ATIVIDADE
  // ==========================================================

  // Selecionar o setor da atividade.
  const activityDepartmentSelect = page
    .locator("select:visible")
    .first();

  await expect(activityDepartmentSelect).toBeVisible({
    timeout: 20_000,
  });

  const departmentOptionCount =
    await activityDepartmentSelect.locator("option").count();

  if (departmentOptionCount < 2) {
    throw new Error(
      "Nenhum setor disponivel para vincular a atividade",
    );
  }

  await activityDepartmentSelect.selectOption({
    index: 1,
  });

  // Microetapa 1 — nome da atividade.
  const activityName = page.locator(
    '[placeholder="Nome da atividade"]:visible',
  );

  await expect(activityName).toBeVisible({
    timeout: 20_000,
  });

  await activityName.fill(
    "Atendimento administrativo",
  );

  const activityAdvance = await clickVisibleButton(
    page,
    /continuar|proximo|avancar/i,
  );

  if (!activityAdvance) {
    throw new Error(
      "Nao foi possivel avancar da microetapa Nome da atividade para descricao real",
    );
  }

  // Microetapa 2 — descrição real da atividade.
  const activityDescription = page.locator(
    '[placeholder="Ex.: atende clientes, confere documentos, lança informações no sistema e responde solicitações por telefone."]:visible',
  );

  await expect(activityDescription).toBeVisible({
    timeout: 20_000,
  });

  await activityDescription.fill(
    "Atende demandas administrativas, confere documentos e registra informacoes no sistema.",
  );

  // Última microetapa faz submit da atividade.
  const saveActivity = page
    .locator("button:visible")
    .filter({
      hasText: /salvar atividade|cadastrar atividade/i,
    })
    .first();

  await expect(saveActivity).toBeVisible({
    timeout: 20_000,
  });

  await saveActivity.click();

  // O botão só habilita depois que todos os setores possuem atividade.
  const finishActivities = page
    .locator("button:visible")
    .filter({
      hasText: /concluir atividades e abrir diagnostico/i,
    })
    .first();

  await expect(finishActivities).toBeVisible({
    timeout: 20_000,
  });

  await expect(finishActivities).toBeEnabled({
    timeout: 20_000,
  });

  await finishActivities.click();

  console.log("[PW_MVP] ACTIVITY_MICROSTEPS=PASS");
  // ==========================================================
  // PRIMEIRO GATE DO DIAGNOSTICO
  // ==========================================================

  await expect(
    page.getByRole("heading", {
      name: /como o trabalho acontece/i,
    }),
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    page.locator(
      '[placeholder="Descreva a rotina real da atividade."]:visible',
    ),
  ).toBeVisible();

  console.log("PW_MVP_SLICE1=PASS");

  // ==========================================================
  // SLICE 2 — DIAGNOSTICO -> INVESTIGACAO -> RISCO -> INVENTARIO
  // ==========================================================

  test.setTimeout(300_000);

  // Inicia formalmente a sessão, se o botão ainda estiver disponível.
  const startDiagnosis = page
    .getByRole("button", {
      name: /começar análise da atividade/i,
    })
    .first();

  if (
    (await startDiagnosis.count()) > 0 &&
    (await startDiagnosis.isVisible())
  ) {
    await startDiagnosis.click();
  }

  // ----------------------------------------------------------
  // ETAPA 01 — CONTEXTO
  // ----------------------------------------------------------

  await page
    .locator(
      '[placeholder="Descreva a rotina real da atividade."]:visible',
    )
    .fill(
      "Atividade administrativa com demanda recorrente, prazos curtos, interrupções frequentes e períodos de acúmulo de tarefas.",
    );

  await page
    .locator(
      '[placeholder="Quantas pessoas fazem essa atividade?"]:visible',
    )
    .fill("6");

  await page
    .locator(
      '[placeholder*="Como é a rotina?"]:visible',
    )
    .fill("Rotina por demanda com picos frequentes");

  await page
    .locator(
      '[placeholder*="Mudanças no processo?"]:visible',
    )
    .fill("Mudanças mensais");

  await page
    .locator(
      '[placeholder="Registre sinais agregados observados."]:visible',
    )
    .fill(
      "A equipe relata de forma agregada aumento de fila, retrabalho e necessidade frequente de priorização de demandas.",
    );

  await page
    .locator(
      '[placeholder="Registre observações complementares."]:visible',
    )
    .fill(
      "Há concentração de demandas em determinados períodos e necessidade de reorganização da carga de trabalho.",
    );

  await page
    .getByRole("button", {
      name: /salvar contexto e seguir/i,
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: /investigar características da organização do trabalho/i,
    }),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] DIAGNOSIS_CONTEXT=PASS");

  // ----------------------------------------------------------
  // ETAPA 02 — SINAIS PSICOSSOCIAIS
  // ----------------------------------------------------------

  const overloadLabel = page
    .locator("label")
    .filter({
      hasText: /sobrecarga de trabalho/i,
    })
    .first();

  await expect(overloadLabel).toBeVisible({
    timeout: 20_000,
  });

  await overloadLabel
    .locator('input[type="checkbox"]')
    .check();

  const interruptionsLabel = page
    .locator("label")
    .filter({
      hasText: /interrupções constantes/i,
    })
    .first();

  if (
    (await interruptionsLabel.count()) > 0 &&
    (await interruptionsLabel.isVisible())
  ) {
    await interruptionsLabel
      .locator('input[type="checkbox"]')
      .check();
  }

  const accumulationLabel = page
    .locator("label")
    .filter({
      hasText: /acúmulo de tarefas/i,
    })
    .first();

  if (
    (await accumulationLabel.count()) > 0 &&
    (await accumulationLabel.isVisible())
  ) {
    await accumulationLabel
      .locator('input[type="checkbox"]')
      .check();
  }

  await page
    .locator(
      'textarea[placeholder^="O que justifica os itens marcados?"]:visible',
    )
    .fill(
      "Volume recorrente acima da capacidade normal em períodos de pico, interrupções simultâneas e acúmulo de tarefas na equipe.",
    );

  await page
    .getByRole("button", {
      name: /salvar sinais complementares/i,
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: /revisar sinais antes da conversão em risco/i,
    }),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] PSYCHOSOCIAL_SIGNALS=PASS");

  // ----------------------------------------------------------
  // INVESTIGACAO DO GATILHO
  // ----------------------------------------------------------

  const investigateButton = page
    .getByRole("button", {
      name: /sim, investigar/i,
    })
    .first();

  await expect(investigateButton).toBeVisible({
    timeout: 20_000,
  });

  await investigateButton.click();

  await expect(
    page.getByText(/perguntas de aprofundamento/i).first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  // Cenário oficial do motor para deadline_pressure => suggested_risk.
  // Ordem oficial das respostas:
  // goals_clear=yes
  // deadlines_feasible=no
  // staffing_sufficient=no
  // frequent_overtime=no
  // breaks_respected=yes
  // leadership_prioritizes=yes
  // pressure_respectful=yes
  // aggressive_pressure=no
  // frequent_rework=no
  // related_events=yes

  const yesNoSelects = page
    .locator("select:visible")
    .filter({
      has: page.locator('option[value="unknown"]'),
    });
  const selectCount = await yesNoSelects.count();

  if (selectCount !== 10) {
    throw new Error(
      `Cenario deadline_pressure esperava 10 perguntas, encontrou ${selectCount}`,
    );
  }

  const deadlinePressureAnswers = [
    "yes",
    "no",
    "no",
    "no",
    "yes",
    "yes",
    "yes",
    "no",
    "no",
    "yes",
  ];

  for (let i = 0; i < deadlinePressureAnswers.length; i += 1) {
    await yesNoSelects
      .nth(i)
      .selectOption(deadlinePressureAnswers[i]);

    await page.waitForTimeout(350);
  }

  // Responde campos textuais do aprofundamento.
  const investigationTextareas = page.locator(
    'textarea[placeholder="Descreva de forma objetiva."]:visible',
  );

  const textareaCount =
    await investigationTextareas.count();

  for (let i = 0; i < textareaCount; i += 1) {
    const textarea = investigationTextareas.nth(i);

    await textarea.fill(
      "Situação recorrente observada na organização do trabalho, com impacto sobre a capacidade da equipe de atender a demanda normal.",
    );

    await textarea.blur();
    await page.waitForTimeout(350);
  }

  const completeInvestigation = page
    .getByRole("button", {
      name: /concluir investigação/i,
    })
    .first();

  await expect(completeInvestigation).toBeEnabled({
    timeout: 20_000,
  });

  await completeInvestigation.click();

  await expect(
    page.getByText(/resultado sugerido/i).first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] TRIGGER_INVESTIGATION=PASS");

  const diagnosisReviewButton = page.getByRole("button", {
    name: /confirmar revisão do diagnóstico/i,
  });

  await expect(diagnosisReviewButton).toBeVisible({
    timeout: 20_000,
  });

  await expect(diagnosisReviewButton).toBeEnabled({
    timeout: 20_000,
  });

  await diagnosisReviewButton.click();

  await expect(
    page.getByText(/revisão do diagnóstico confirmada/i).first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] DIAGNOSIS_REVIEW=PASS");

  // Para esta Slice queremos provar o caminho realmente convertível.
  await expect(
    page.getByText(/^Risco sugerido$/i).first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  // ----------------------------------------------------------
  // VALIDACAO HUMANA
  // ----------------------------------------------------------

  const confirmResult = page
    .getByRole("button", {
      name: /^confirmar resultado$/i,
    })
    .first();

  await expect(confirmResult).toBeVisible({
    timeout: 20_000,
  });

  await confirmResult.click();

  await expect(
    page
      .getByText(/resultado confirmado pela revisão humana/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] HUMAN_VALIDATION=PASS");

  // ----------------------------------------------------------
  // VALIDACAO TECNICA — SOMENTE SE EXIGIDA
  // ----------------------------------------------------------

  const technicalValidation = page
    .getByRole("button", {
      name: /registrar validação técnica/i,
    })
    .first();

  if (
    (await technicalValidation.count()) > 0 &&
    (await technicalValidation.isVisible())
  ) {
    await technicalValidation.click();

    await expect(
      page.getByText(/validação técnica concluída/i).first(),
    ).toBeVisible({
      timeout: 20_000,
    });

    console.log("[PW_MVP] TECHNICAL_VALIDATION=PASS");
  } else {
    console.log("[PW_MVP] TECHNICAL_VALIDATION=NOT_REQUIRED");
  }

  // ----------------------------------------------------------
  // CONVERSAO EXPLICITA
  // ----------------------------------------------------------

  const convertRisk = page
    .getByRole("button", {
      name: /^converter em risco$/i,
    })
    .first();

  await expect(convertRisk).toBeVisible({
    timeout: 20_000,
  });

  await convertRisk.click();

  await expect(
    page.getByText(/convertido em risco/i).first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] EXPLICIT_RISK_CONVERSION=PASS");

  // ----------------------------------------------------------
  // INVENTARIO
  // ----------------------------------------------------------

  const reviewInventory = page
    .getByRole("link", {
      name: /revisar risco no inventário/i,
    })
    .first();

  if (
    (await reviewInventory.count()) > 0 &&
    (await reviewInventory.isVisible())
  ) {
    await reviewInventory.click();
  } else {
    await page.goto(
      "/dashboard/nr1/workspace?section=riscos",
    );
  }

  await expect(
    page.getByRole("heading", {
      name: /inventário de riscos/i,
    }),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] INVENTORY_REACHED=PASS");
  console.log("PW_MVP_SLICE2=PASS");

  // ----------------------------------------------------------
  // SLICE 3 — INVENTARIO -> CONFIRMACAO HUMANA -> PLANO
  // ----------------------------------------------------------

  const confirmInventoryRisk = page
    .getByRole("button", {
      name: /confirmar risco e liberar plano de ação/i,
    })
    .first();

  await expect(confirmInventoryRisk).toBeVisible({
    timeout: 20_000,
  });

  await expect(confirmInventoryRisk).toBeEnabled({
    timeout: 20_000,
  });

  await confirmInventoryRisk.click();

  await expect(
    page
      .getByText(/risco confirmado por revisão humana/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] INVENTORY_RISK_HUMAN_CONFIRMATION=PASS");

  const openActionPlan = page
    .getByRole("button", {
      name: /^criar plano de ação$/i,
    })
    .first();

  await expect(openActionPlan).toBeVisible({
    timeout: 20_000,
  });

  await openActionPlan.click();

  await expect(
    page.getByRole("heading", {
      name: /^plano de ação$/i,
    }),
  ).toBeVisible({
    timeout: 20_000,
  });

  // ----------------------------------------------------------
  // PLANO — PASSO 1
  // ----------------------------------------------------------

  const actionTitle = page
    .getByPlaceholder(/organizar fluxo de demandas/i)
    .first();

  const actionDescription = page
    .getByPlaceholder(/descreva a ação de melhoria/i)
    .first();

  await expect(actionTitle).toBeVisible({
    timeout: 20_000,
  });

  await actionTitle.fill(
    "Revisar organização do trabalho e distribuição de demandas",
  );

  await actionDescription.fill(
    "Revisar a distribuição das demandas, prioridades e capacidade da equipe, com participação da liderança e dos trabalhadores envolvidos.",
  );

  const continueStep1 = page
    .getByRole("button", {
      name: /^continuar$/i,
    })
    .first();

  await expect(continueStep1).toBeEnabled({
    timeout: 20_000,
  });

  await continueStep1.click();

  // ----------------------------------------------------------
  // PLANO — PASSO 2
  // ----------------------------------------------------------

  const responsible = page
    .getByPlaceholder(/rh, gestor da área, liderança/i)
    .first();

  await expect(responsible).toBeVisible({
    timeout: 20_000,
  });

  await responsible.fill("RH e liderança do setor");

  const dueDate = page.locator('input[type="date"]:visible').first();

  await expect(dueDate).toBeVisible({
    timeout: 20_000,
  });

  await dueDate.fill("2026-10-31");

  const continueStep2 = page
    .getByRole("button", {
      name: /^continuar$/i,
    })
    .first();

  await expect(continueStep2).toBeEnabled({
    timeout: 20_000,
  });

  await continueStep2.click();

  // ----------------------------------------------------------
  // PLANO — PASSO 3
  // ----------------------------------------------------------

  const monitoring = page
    .getByPlaceholder(/revisão semanal, reunião mensal, checklist/i)
    .first();

  const evidenceMethod = page
    .getByPlaceholder(/ata, checklist, registro, foto, documento/i)
    .first();

  const completionIndicator = page
    .getByPlaceholder(/resultado verificável/i)
    .first();

  await expect(monitoring).toBeVisible({
    timeout: 20_000,
  });

  await monitoring.fill(
    "Revisão quinzenal das demandas, prazos e distribuição da carga de trabalho.",
  );

  await evidenceMethod.fill(
    "Ata de reunião, checklist de acompanhamento e registro das alterações adotadas.",
  );

  await completionIndicator.fill(
    "Distribuição de demandas revisada e rotina de acompanhamento implantada.",
  );

  const createActionPlan = page
    .getByRole("button", {
      name: /criar plano vinculado ao risco/i,
    })
    .first();

  await expect(createActionPlan).toBeEnabled({
    timeout: 20_000,
  });

  await createActionPlan.click();

  await expect(
    page
      .getByText(/plano de ação criado e vinculado ao risco/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] ACTION_PLAN_CREATED=PASS");
  console.log("[PW_MVP] RISK_TO_ACTION=PASS");
  console.log("PW_MVP_SLICE3=PASS");

  // ----------------------------------------------------------
  // SLICE 4 — PLANO DE ACAO -> ACOMPANHAMENTO -> EVIDENCIA
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // ACOMPANHAMENTO DO PLANO DE ACAO
  // ----------------------------------------------------------

  await page.goto(
    "/dashboard/nr1/trilha-acompanhamento",
  );

  await expect(
    page
      .getByText(
        /registre como o plano de ação foi verificado/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] FOLLOWUP_PAGE_REACHED=PASS");

  const followupPlanSelect = page
    .locator("label")
    .filter({
      hasText: /^Plano de ação$/i,
    })
    .locator("..")
    .locator("select")
    .first();

  await expect(followupPlanSelect).toBeVisible({
    timeout: 20_000,
  });

  await expect
    .poll(
      async () =>
        await followupPlanSelect
          .locator('option:not([value=""]):not([disabled])')
          .count(),
      {
        timeout: 20_000,
        message:
          "Aguardar carregamento do Plano de Ação na tela de acompanhamento.",
      },
    )
    .toBeGreaterThan(0);

  const followupPlanOptions = await followupPlanSelect
    .locator('option:not([value=""]):not([disabled])')
    .evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
      })),
    );

  if (followupPlanOptions.length === 0) {
    throw new Error(
      "Nenhum Plano de Ação elegível encontrado na tela de acompanhamento.",
    );
  }

  if (!(await followupPlanSelect.inputValue())) {
    await followupPlanSelect.selectOption(
      followupPlanOptions[0].value,
    );
  }

  await expect(followupPlanSelect).not.toHaveValue("");

  console.log(
    "[PW_MVP] FOLLOWUP_ACTION_PLAN_SELECTED=PASS",
  );

  const followupDateField = page
    .locator('input[type="date"]')
    .first();

  await expect(followupDateField).toBeVisible({
    timeout: 20_000,
  });

  const followupDate = new Date()
    .toISOString()
    .slice(0, 10);

  await followupDateField.fill(followupDate);

  const executionField = page
    .getByPlaceholder(
      /como a execução foi verificada/i,
    )
    .first();

  await expect(executionField).toBeVisible({
    timeout: 20_000,
  });

  await executionField.fill(
    "Execução acompanhada pelo RH e pela liderança responsável, com conferência da reorganização das demandas.",
  );

  const inspectionField = page
    .getByPlaceholder(
      /resultado da inspeção/i,
    )
    .first();

  await inspectionField.fill(
    "Inspeção realizada sem identificação de desvio que impeça a continuidade da medida.",
  );

  const effectivenessField = page
    .getByPlaceholder(
      /resultado da efetividade/i,
    )
    .first();

  await effectivenessField.fill(
    "Medida acompanhada e considerada adequada para continuidade nesta verificação.",
  );

  const continuityField = page
    .getByPlaceholder(
      /checagem de continuidade/i,
    )
    .first();

  await continuityField.fill(
    "Manter acompanhamento periódico da organização do trabalho e da distribuição das demandas.",
  );

  const workerParticipationField = page
    .getByPlaceholder(
      /registro da participação dos trabalhadores/i,
    )
    .first();

  await workerParticipationField.fill(
    "Trabalhadores consultados durante o acompanhamento da medida.",
  );

  const followupNotesField = page
    .getByPlaceholder(
      /observações complementares do acompanhamento/i,
    )
    .first();

  await followupNotesField.fill(
    "Registro E2E do acompanhamento vinculado ao Plano de Ação.",
  );

  const saveFollowupButton = page
    .getByRole("button", {
      name: /^Salvar acompanhamento$/i,
    })
    .first();

  await expect(saveFollowupButton).toBeEnabled({
    timeout: 20_000,
  });

  await saveFollowupButton.click();

  await expect(
    page
      .getByText(
        /^Acompanhamento salvo com sucesso\.$/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    page
      .getByText(
        /registro e2e do acompanhamento vinculado ao plano de ação/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] FOLLOWUP_CREATED=PASS");
  console.log("[PW_MVP] ACTION_FOLLOWUP=PASS");

  // ----------------------------------------------------------
  // EVIDENCIA VINCULADA AO PLANO DE ACAO
  // ----------------------------------------------------------

  await page.goto(
    "/dashboard/nr1/evidencias-acompanhamento",
  );

  await expect(
    page.getByText(/evidências reais do estabelecimento/i).first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] EVIDENCE_PAGE_REACHED=PASS");

  // ----------------------------------------------------------
  // VINCULO COM PLANO DE ACAO
  // ----------------------------------------------------------

  const planSelect = page
    .locator("#evidence-help-plan select")
    .first();

  await expect(planSelect).toBeVisible({
    timeout: 20_000,
  });

  const currentPlanValue = await planSelect.inputValue();

  if (!currentPlanValue) {
    const planOptions = await planSelect
      .locator("option")
      .evaluateAll((options) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            disabled: (option as HTMLOptionElement).disabled,
          }))
          .filter(
            (option) =>
              option.value.trim().length > 0 &&
              !option.disabled,
          ),
      );

    if (planOptions.length === 0) {
      await expect
        .poll(
          async () =>
            await planSelect
              .locator('option:not([value=""])')
              .count(),
          {
            timeout: 20_000,
            message:
              "Aguardar o carregamento assíncrono dos Planos de Ação na tela de Evidências.",
          },
        )
        .toBeGreaterThan(0);

      const loadedPlanOptions = await planSelect
        .locator('option:not([value=""]):not([disabled])')
        .evaluateAll((options) =>
          options.map((option) => ({
            value: (option as HTMLOptionElement).value,
            disabled: (option as HTMLOptionElement).disabled,
          })),
        );

      if (loadedPlanOptions.length === 0) {
        throw new Error(
          "Nenhum Plano de Ação elegível encontrado na tela de Evidências.",
        );
      }

      await planSelect.selectOption(loadedPlanOptions[0].value);
    }

    if (planOptions.length > 0) {
      await planSelect.selectOption(planOptions[0].value);
    }
  }

  await expect(planSelect).not.toHaveValue("");

  console.log("[PW_MVP] EVIDENCE_ACTION_PLAN_LINK_SELECTED=PASS");

  // ----------------------------------------------------------
  // TITULO
  // ----------------------------------------------------------

  const evidenceTitle = page
    .getByPlaceholder(
      /checklist de acompanhamento da rotina/i,
    )
    .first();

  await expect(evidenceTitle).toBeVisible({
    timeout: 20_000,
  });

  await evidenceTitle.fill(
    "Checklist de acompanhamento da reorganização do trabalho",
  );

  // ----------------------------------------------------------
  // TIPO DA EVIDENCIA
  // ----------------------------------------------------------

  const evidenceType = page
    .locator("#evidence-help-type select")
    .first();

  await expect(evidenceType).toBeVisible({
    timeout: 20_000,
  });

  const typeOptions = await evidenceType
    .locator("option")
    .evaluateAll((options) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          disabled: (option as HTMLOptionElement).disabled,
        }))
        .filter(
          (option) =>
            option.value.trim().length > 0 &&
            !option.disabled,
        ),
    );

  if (typeOptions.length === 0) {
    throw new Error(
      "Nenhum tipo de evidência elegível encontrado.",
    );
  }

  const preferredType =
    typeOptions.find(
      (option) =>
        option.value.toLowerCase() === "checklist",
    ) ?? typeOptions[0];

  await evidenceType.selectOption(preferredType.value);

  // ----------------------------------------------------------
  // RESPONSAVEL — CAMPO OPCIONAL
  // ----------------------------------------------------------

  const responsibleField = page
    .locator("#evidence-help-responsible input")
    .first();

  if (
    (await responsibleField.count()) > 0 &&
    (await responsibleField.isVisible())
  ) {
    await responsibleField.fill(
      "RH e liderança do setor",
    );
  }

  // ----------------------------------------------------------
  // DESCRICAO
  // ----------------------------------------------------------

  const evidenceDescription = page
    .getByPlaceholder(
      /registro do acompanhamento realizado após a reorganização do fluxo de trabalho/i,
    )
    .first();

  await expect(evidenceDescription).toBeVisible({
    timeout: 20_000,
  });

  await evidenceDescription.fill(
    "Registro do acompanhamento realizado após a revisão da distribuição de demandas, prioridades e capacidade da equipe.",
  );

  // ----------------------------------------------------------
  // SALVAR EVIDENCIA
  // ----------------------------------------------------------

  const saveEvidence = page
    .locator("#evidence-help-save")
    .first();

  await expect(saveEvidence).toBeVisible({
    timeout: 20_000,
  });

  await expect(saveEvidence).toBeEnabled({
    timeout: 20_000,
  });

  await saveEvidence.click();

  await expect(
    page
      .getByText(/^Evidência salva com sucesso\.$/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    page
      .getByText(/Validação:\s*Aguardando validação/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  // O registro precisa continuar visível após releitura,
  // preservando vínculo e rastreabilidade.
  await expect(
    page
      .getByText(
        /checklist de acompanhamento da reorganização do trabalho/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] EVIDENCE_CREATED=PASS");
  console.log("[PW_MVP] ACTION_TO_EVIDENCE=PASS");
  console.log("PW_MVP_SLICE4=PASS");

  // ----------------------------------------------------------
  // SLICE 5 — EVIDENCIA -> PREVIA ESTRUTURADA DO PGR
  // ----------------------------------------------------------

  await page.goto(
    "/dashboard/nr1/relatorio-pgr",
  );

  const generatePgrPreviewButton = page
    .locator("#nr1GeneratePgrReportButton")
    .first();

  await expect(generatePgrPreviewButton).toBeVisible({
    timeout: 20_000,
  });

  await expect(generatePgrPreviewButton).toBeEnabled({
    timeout: 20_000,
  });

  console.log("[PW_MVP] PGR_PAGE_REACHED=PASS");

  await generatePgrPreviewButton.click();

  await expect(
    page
      .getByText(
        /prévia do pgr carregada/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 30_000,
  });

  const pgrPrintArea = page
    .locator("#nr1-pgr-print-area")
    .first();

  await expect(pgrPrintArea).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    pgrPrintArea
      .getByText(
        /prévia estruturada do pgr/i,
      )
      .first(),
  ).toBeVisible();

  console.log("[PW_MVP] PGR_PREVIEW_GENERATED=PASS");

  // O plano criado na mesma jornada precisa aparecer
  // na consolidação do PGR.
  await expect(
    pgrPrintArea
      .getByText(
        /revisar organização do trabalho e distribuição de demandas/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log(
    "[PW_MVP] PGR_ACTION_PLAN_PRESENT=PASS",
  );

  // O acompanhamento criado na Slice 4 precisa ser
  // consolidado na mesma prévia.
  await expect(
    pgrPrintArea
      .getByText(
        /registro e2e do acompanhamento vinculado ao plano de ação/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log(
    "[PW_MVP] PGR_FOLLOWUP_PRESENT=PASS",
  );

  // A evidência criada na mesma jornada também precisa
  // estar presente no documento consolidado.
  await expect(
    pgrPrintArea
      .getByText(
        /checklist de acompanhamento da reorganização do trabalho/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log(
    "[PW_MVP] PGR_EVIDENCE_PRESENT=PASS",
  );

  console.log(
    "[PW_MVP] PGR_PREVIEW_COHERENCE=PASS",
  );
  console.log(
    "[PW_MVP] PGR_GENERATION=PARTIAL_PREVIEW_ONLY",
  );
  console.log("PW_MVP_SLICE5=PASS");

  // ----------------------------------------------------------
  // SLICE 6 — TRILHA DE AUDITORIA + RETOMADA DA JORNADA
  // ----------------------------------------------------------

  // A prévia precisa consolidar a trilha formal produzida
  // pelas etapas percorridas nesta mesma execução.
  await expect(
    pgrPrintArea
      .getByText(/^9\.\s*Trilha de auditoria$/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    pgrPrintArea
      .getByText(/Movimentações registradas:/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    pgrPrintArea
      .getByText(/Plano de ação criado/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    pgrPrintArea
      .getByText(/Acompanhamento do plano registrado/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    pgrPrintArea
      .getByText(/Evidência registrada/i)
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log("[PW_MVP] AUDIT_TRAIL=PASS");

  // Confirma que existe uma seleção persistida de
  // empresa + estabelecimento antes da saída da tela.
  const storedSelectionBeforeReentry = await page.evaluate(() => {
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith("nr1_workspace_selection:"),
    );

    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);

        if (!raw) {
          continue;
        }

        const parsed = JSON.parse(raw) as {
          companyId?: string;
          establishmentId?: string;
        };

        if (
          String(parsed.companyId || "").trim() &&
          String(parsed.establishmentId || "").trim()
        ) {
          return {
            key,
            companyId: String(parsed.companyId).trim(),
            establishmentId: String(
              parsed.establishmentId,
            ).trim(),
          };
        }
      } catch {
        // Ignora entrada inválida e continua procurando
        // a seleção oficial da jornada.
      }
    }

    return null;
  });

  expect(storedSelectionBeforeReentry).not.toBeNull();

  if (!storedSelectionBeforeReentry) {
    throw new Error(
      "Seleção persistida de empresa/estabelecimento não encontrada antes da retomada.",
    );
  }

  console.log(
    "[PW_MVP] REENTRY_SELECTION_PERSISTED_BEFORE_EXIT=PASS",
  );

  // Simula a saída da etapa final e retorno ao ponto de
  // entrada operacional da jornada.
  await page.goto(
    "/dashboard/nr1/workspace",
  );

  await expect(
    page.getByText(/Carregando sua jornada NR-1/i),
  ).toHaveCount(0, {
    timeout: 30_000,
  });

  // Uma empresa já construída não pode voltar ao onboarding
  // como se fosse uma jornada nova.
  await expect(
    page.getByText(
      /Vamos começar pela base da empresa/i,
    ),
  ).toHaveCount(0, {
    timeout: 20_000,
  });

  const existingBaseResume = page
    .getByText(
      /Encontramos uma base ja iniciada/i,
    )
    .first();

  if (
    (await existingBaseResume.count()) > 0 &&
    (await existingBaseResume.isVisible())
  ) {
    const openOverviewButton = page
      .getByRole("button", {
        name: /Abrir vis[aã]o geral/i,
      })
      .first();

    await expect(openOverviewButton).toBeVisible({
      timeout: 20_000,
    });

    await openOverviewButton.click();
  }

  const storedSelectionAfterReentry = await page.evaluate(
    (expectedKey) => {
      const raw =
        window.localStorage.getItem(expectedKey);

      if (!raw) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw) as {
          companyId?: string;
          establishmentId?: string;
        };

        return {
          companyId: String(
            parsed.companyId || "",
          ).trim(),
          establishmentId: String(
            parsed.establishmentId || "",
          ).trim(),
        };
      } catch {
        return null;
      }
    },
    storedSelectionBeforeReentry.key,
  );

  expect(storedSelectionAfterReentry).not.toBeNull();

  expect(
    storedSelectionAfterReentry?.companyId,
  ).toBe(
    storedSelectionBeforeReentry.companyId,
  );

  expect(
    storedSelectionAfterReentry?.establishmentId,
  ).toBe(
    storedSelectionBeforeReentry.establishmentId,
  );

  console.log(
    "[PW_MVP] REENTRY_CONTEXT_RESTORED=PASS",
  );

  // Prova final de persistência funcional:
  // após sair e retornar, o mesmo contexto precisa
  // conseguir reconstruir a prévia com os registros
  // produzidos anteriormente.
  await page.goto(
    "/dashboard/nr1/relatorio-pgr",
  );

  const regeneratePgrPreviewButton = page
    .locator("#nr1GeneratePgrReportButton")
    .first();

  await expect(
    regeneratePgrPreviewButton,
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    regeneratePgrPreviewButton,
  ).toBeEnabled({
    timeout: 30_000,
  });

  await regeneratePgrPreviewButton.click();

  await expect(
    page
      .getByText(/prévia do pgr carregada/i)
      .first(),
  ).toBeVisible({
    timeout: 30_000,
  });

  const reentryPgrPrintArea = page
    .locator("#nr1-pgr-print-area")
    .first();

  await expect(
    reentryPgrPrintArea,
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    reentryPgrPrintArea
      .getByText(
        /revisar organização do trabalho e distribuição de demandas/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    reentryPgrPrintArea
      .getByText(
        /registro e2e do acompanhamento vinculado ao plano de ação/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    reentryPgrPrintArea
      .getByText(
        /checklist de acompanhamento da reorganização do trabalho/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  console.log(
    "[PW_MVP] REENTRY_DATA_PERSISTENCE=PASS",
  );
  console.log(
    "[PW_MVP] REENTRY_PERSISTENCE=PASS",
  );
  console.log("PW_MVP_SLICE6=PASS");
});
