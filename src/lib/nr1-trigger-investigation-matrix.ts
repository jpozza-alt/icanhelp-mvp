export const TRIGGER_INVESTIGATION_OFFICIAL_MESSAGE =
  "Este ponto não é automaticamente um risco. Vamos entender melhor a situação antes de classificar."

export const TRIGGER_INVESTIGATION_TYPES = [
  "deadline_pressure",
  "public_service",
  "remote_or_hybrid_work",
  "third_parties",
  "repetitive_work",
  "prolonged_sitting",
  "intermediate_leadership",
  "frequent_changes",
  "task_accumulation",
  "frequent_conflicts",
  "harassment_or_violence",
] as const

export type TriggerInvestigationType =
  (typeof TRIGGER_INVESTIGATION_TYPES)[number]

export type TriggerInvestigationQuestion = {
  key: string
  label: string
  kind: "yes_no" | "text"
  required: boolean
}

export type TriggerInvestigationDefinition = {
  type: TriggerInvestigationType
  label: string
  initialQuestion: string
  critical: boolean
  questions: TriggerInvestigationQuestion[]
}

function yesNo(
  key: string,
  label: string,
): TriggerInvestigationQuestion {
  return { key, label, kind: "yes_no", required: true }
}

function text(
  key: string,
  label: string,
): TriggerInvestigationQuestion {
  return { key, label, kind: "text", required: true }
}

export const TRIGGER_INVESTIGATION_MATRIX: Record<
  TriggerInvestigationType,
  TriggerInvestigationDefinition
> = {
  deadline_pressure: {
    type: "deadline_pressure",
    label: "Metas e cobrança por prazo",
    initialQuestion:
      "Existem metas, prazos curtos ou cobrança por resultado?",
    critical: false,
    questions: [
      yesNo("goals_clear", "As metas são claras para os trabalhadores?"),
      yesNo("deadlines_feasible", "Os prazos costumam ser possíveis de cumprir?"),
      yesNo("staffing_sufficient", "A equipe é suficiente para a quantidade de trabalho?"),
      yesNo("frequent_overtime", "Há horas extras frequentes para cumprir metas?"),
      yesNo("breaks_respected", "As pausas e intervalos são respeitados?"),
      yesNo("leadership_prioritizes", "A liderança ajuda a priorizar as tarefas?"),
      yesNo("pressure_respectful", "A cobrança é feita de forma respeitosa?"),
      yesNo("aggressive_pressure", "Há cobrança agressiva, humilhante ou abusiva?"),
      yesNo("frequent_rework", "Há retrabalho frequente?"),
      yesNo(
        "related_events",
        "Há queixas, conflitos, incidentes ou afastamentos relacionados a essa cobrança?",
      ),
    ],
  },

  public_service: {
    type: "public_service",
    label: "Atendimento ao público",
    initialQuestion:
      "Existe atendimento ao público, clientes, usuários ou pacientes?",
    critical: false,
    questions: [
      yesNo("public_contact_frequent", "O contato com o público é frequente?"),
      yesNo("works_alone", "O trabalhador atende sozinho?"),
      yesNo("queue_pressure", "Há fila, espera ou pressão por rapidez?"),
      yesNo("public_conflict", "Há conflito frequente com o público?"),
      yesNo("verbal_aggression", "Há agressividade verbal?"),
      yesNo("threat_history", "Já houve ameaça?"),
      yesNo("physical_aggression", "Já houve agressão física?"),
      yesNo("difficult_situation_protocol", "Existe protocolo para situações difíceis?"),
      yesNo("leadership_support", "Existe apoio da liderança em casos de conflito?"),
      yesNo(
        "occurrence_records",
        "Há registro de ocorrências, queixas ou afastamentos relacionados?",
      ),
    ],
  },

  remote_or_hybrid_work: {
    type: "remote_or_hybrid_work",
    label: "Trabalho remoto ou híbrido",
    initialQuestion: "Existe trabalho remoto ou híbrido?",
    critical: false,
    questions: [
      yesNo("long_isolation", "O trabalhador atua isolado por longos períodos?"),
      yesNo("team_communication_difficulty", "Há dificuldade de comunicação com a equipe?"),
      yesNo("leadership_access_difficulty", "Há dificuldade de acesso à liderança?"),
      yesNo("after_hours_messages", "Há excesso de mensagens fora do horário?"),
      yesNo("permanent_availability", "Há expectativa de disponibilidade permanente?"),
      yesNo("workday_control", "Há controle adequado da jornada?"),
      yesNo("breaks_ergonomics_guidance", "Há orientação sobre pausas e ergonomia?"),
      yesNo("work_conditions_monitoring", "Há acompanhamento das condições de trabalho?"),
      yesNo("isolation_overload_conflict", "Há queixas de isolamento, sobrecarga ou conflito?"),
      yesNo("remote_support_measures", "Existem medidas de apoio para o trabalho remoto?"),
    ],
  },

  third_parties: {
    type: "third_parties",
    label: "Terceirizados",
    initialQuestion:
      "Há terceirizados atuando no estabelecimento ou na atividade?",
    critical: false,
    questions: [
      yesNo("same_workplace", "Os terceirizados atuam no mesmo local dos trabalhadores da empresa?"),
      text("third_party_activities", "Quais atividades eles realizam?"),
      yesNo("shared_risks", "Eles compartilham riscos com a equipe interna?"),
      yesNo("integrated_prevention", "Existem medidas integradas de prevenção?"),
      yesNo("responsible_defined", "Existe responsável definido por cada empresa?"),
      yesNo("risk_communication", "Há comunicação entre as empresas sobre riscos?"),
      yesNo("combined_measures_evidence", "Há documentos ou evidências das medidas combinadas?"),
      yesNo("simultaneous_activities", "Há atividades simultâneas que aumentam o risco?"),
      yesNo(
        "responsibility_conflict",
        "Há conflito de responsabilidade entre contratante e contratada?",
      ),
      yesNo("third_party_incidents", "Há histórico de incidentes envolvendo terceiros?"),
    ],
  },

  repetitive_work: {
    type: "repetitive_work",
    label: "Trabalho repetitivo",
    initialQuestion: "Existe trabalho repetitivo?",
    critical: false,
    questions: [
      yesNo("daily_repetition", "A repetição ocorre todos os dias?"),
      yesNo("large_shift_share", "A repetição ocupa grande parte da jornada?"),
      yesNo("sufficient_breaks", "Há pausas suficientes?"),
      yesNo("task_rotation", "Há alternância de tarefas?"),
      yesNo("intense_pace", "O ritmo de trabalho é intenso?"),
      yesNo("force_pressure_twisting", "Há exigência de força, pressão ou torção?"),
      yesNo("pain_discomfort", "Há queixas de dor ou desconforto?"),
      yesNo("preliminary_ergonomic_assessment", "Há avaliação ergonômica preliminar?"),
      yesNo("existing_controls", "Existem medidas de controle?"),
      yesNo("controls_effective", "As medidas existentes parecem funcionar?"),
    ],
  },

  prolonged_sitting: {
    type: "prolonged_sitting",
    label: "Trabalho sentado prolongado",
    initialQuestion:
      "O trabalho exige permanência sentada por longos períodos?",
    critical: false,
    questions: [
      yesNo("many_hours_sitting", "O trabalhador permanece sentado por muitas horas seguidas?"),
      yesNo("postural_breaks", "Há pausas ou alternância postural?"),
      yesNo("adequate_chair", "A cadeira é adequada?"),
      yesNo("adequate_desk", "A mesa é adequada?"),
      yesNo("adequate_monitor", "O monitor está em posição adequada?"),
      yesNo("foot_support", "Há apoio para pés, quando necessário?"),
      yesNo("pain_discomfort", "Há queixas de dor ou desconforto?"),
      yesNo("posture_guidance", "Há orientação sobre postura?"),
      yesNo("preliminary_ergonomic_assessment", "Há avaliação ergonômica preliminar?"),
      yesNo("workstation_adjustments", "Existem medidas de ajuste do posto de trabalho?"),
    ],
  },

  intermediate_leadership: {
    type: "intermediate_leadership",
    label: "Liderança intermediária",
    initialQuestion:
      "Existe liderança direta ou intermediária sobre a equipe?",
    critical: false,
    questions: [
      yesNo("leadership_roles_clear", "As responsabilidades da liderança são claras?"),
      yesNo("knows_who_to_contact", "A equipe sabe a quem recorrer?"),
      yesNo("leadership_problem_support", "A liderança oferece apoio para resolver problemas?"),
      yesNo("leadership_communication_clear", "A comunicação da liderança é clara?"),
      yesNo("leadership_conflicts", "Há conflitos frequentes com a liderança?"),
      yesNo("aggressive_humiliating_pressure", "Há cobrança agressiva ou humilhante?"),
      yesNo("unequal_treatment", "Há tratamento desigual entre trabalhadores?"),
      yesNo("priority_feedback_missing", "Há falta de retorno sobre prioridades?"),
      yesNo("report_channel", "Há canal para relatar problemas?"),
      yesNo(
        "management_related_events",
        "Há queixas, conflitos ou afastamentos relacionados à gestão?",
      ),
    ],
  },

  frequent_changes: {
    type: "frequent_changes",
    label: "Mudanças frequentes",
    initialQuestion:
      "Há mudanças frequentes em processos, equipe, metas, sistemas ou organização do trabalho?",
    critical: false,
    questions: [
      yesNo("advance_communication", "As mudanças são comunicadas antes de acontecer?"),
      yesNo("sufficient_guidance", "Os trabalhadores recebem orientação suficiente?"),
      yesNo("change_training", "Há treinamento quando muda o processo?"),
      yesNo("workload_after_change", "Há aumento de trabalho após as mudanças?"),
      yesNo("responsibility_confusion", "Há confusão sobre responsabilidades?"),
      yesNo("rework_from_poor_guidance", "Há retrabalho por falta de orientação?"),
      yesNo("recurring_resistance_conflict", "Há resistência ou conflito recorrente?"),
      yesNo("post_change_followup", "Há acompanhamento depois da mudança?"),
      yesNo("responsible_people_defined", "Existem responsáveis definidos?"),
      yesNo(
        "change_related_events",
        "Há queixas, incidentes ou afastamentos relacionados às mudanças?",
      ),
    ],
  },

  task_accumulation: {
    type: "task_accumulation",
    label: "Acúmulo de tarefas",
    initialQuestion: "Há acúmulo de tarefas em poucas pessoas?",
    critical: false,
    questions: [
      yesNo("accumulation_frequent", "O acúmulo é frequente?"),
      yesNo("staff_shortage", "Ocorre por falta de pessoal?"),
      yesNo("task_division_failure", "Ocorre por falha na divisão de tarefas?"),
      yesNo("competing_urgent_tasks", "Há tarefas urgentes concorrendo entre si?"),
      yesNo("frequent_overtime", "Há horas extras frequentes?"),
      yesNo("constant_interruptions", "Há interrupções constantes?"),
      yesNo("breaks_impaired", "Há pausas prejudicadas?"),
      yesNo("quality_or_rework", "Há queda de qualidade ou retrabalho?"),
      yesNo("team_complaints", "Há queixas da equipe?"),
      yesNo("related_leave_conflict", "Há afastamentos ou conflitos relacionados?"),
    ],
  },

  frequent_conflicts: {
    type: "frequent_conflicts",
    label: "Conflitos frequentes",
    initialQuestion:
      "Há conflitos frequentes entre colegas, liderança, clientes ou terceiros?",
    critical: false,
    questions: [
      text("conflict_frequency", "Os conflitos são pontuais ou recorrentes?"),
      yesNo("same_people_or_sectors", "Envolvem as mesmas pessoas ou setores?"),
      yesNo("routine_impact", "Há impacto na rotina de trabalho?"),
      yesNo("verbal_aggression", "Há agressividade verbal?"),
      yesNo("threat", "Há ameaça?"),
      yesNo("humiliation", "Há humilhação?"),
      yesNo("report_channel", "Existe canal de relato?"),
      yesNo("investigation_procedure", "Existe procedimento de apuração?"),
      yesNo("leadership_action", "A liderança atua para resolver?"),
      yesNo(
        "conflict_records",
        "Há registros, queixas ou afastamentos relacionados?",
      ),
    ],
  },

  harassment_or_violence: {
    type: "harassment_or_violence",
    label: "Assédio ou violência",
    initialQuestion:
      "Há relato, indício ou suspeita de assédio, violência, ameaça ou humilhação no trabalho?",
    critical: true,
    questions: [
      yesNo(
        "harassment_violence_threat_humiliation",
        "O relato envolve assédio, violência, ameaça ou humilhação?",
      ),
      yesNo("still_happening", "O fato ainda está acontecendo?"),
      yesNo("immediate_risk", "Há risco imediato para alguém?"),
      yesNo("internal_report_channel", "Existe canal interno de denúncia?"),
      yesNo(
        "referred_to_responsible",
        "O caso já foi encaminhado a responsável competente?",
      ),
      yesNo("confidentiality_needed", "Existe necessidade de preservar sigilo?"),
      yesNo("formal_evidence", "Existe evidência ou registro formal?"),
      yesNo(
        "immediate_protection_needed",
        "Há pessoa ou grupo exposto que precisa de proteção imediata?",
      ),
    ],
  },
}

export function getTriggerInvestigationDefinition(
  type: TriggerInvestigationType,
): TriggerInvestigationDefinition {
  return TRIGGER_INVESTIGATION_MATRIX[type]
}
