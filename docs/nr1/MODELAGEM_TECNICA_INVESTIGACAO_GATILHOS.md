# MODELAGEM TECNICA - INVESTIGACAO DE GATILHOS DO MODULO NR-1

Fonte funcional:
docs/nr1/MATRIZ_PERGUNTAS_APROFUNDAMENTO_GATILHOS.md

Fonte da regra:
docs/nr1/REGRA_OFICIAL_GATILHO_NAO_E_RISCO.md

## 1. Objetivo

Este documento define a modelagem tecnica inicial para armazenar, rastrear e processar investigacoes abertas por gatilhos do Diagnostico Guiado do modulo NR-1.

Regra central:

Gatilho nao fecha risco.
Gatilho abre investigacao.
Investigacao gera sugestao.
Sugestao sensivel exige validacao tecnica.

---

## 2. Conceito funcional

Um gatilho e uma caracteristica da atividade ou da organizacao do trabalho que exige aprofundamento antes de qualquer classificacao de risco.

Exemplos:

- metas e cobranca por prazo;
- atendimento ao publico;
- trabalho remoto ou hibrido;
- terceirizados;
- trabalho repetitivo;
- trabalho sentado prolongado;
- lideranca intermediaria;
- mudancas frequentes;
- acumulo de tarefas;
- conflitos frequentes;
- assedio ou violencia.

Nenhum desses itens deve criar risco automaticamente.

---

## 3. Entidade principal sugerida

Nome sugerido:

nr1_trigger_investigations

Finalidade:

Guardar a investigacao aberta quando o usuario marcar SIM para um gatilho.

## 3.1 Campos minimos

- id
- tenant_id
- establishment_id
- department_id
- work_activity_id
- diagnosis_session_id
- trigger_type
- trigger_label
- investigation_status
- initial_answer
- official_message_shown
- answers_json
- intensity
- frequency
- duration
- exposed_people_count
- existing_controls
- controls_effectiveness
- evidence_status
- possible_harms
- suggested_result
- suggested_severity
- suggested_probability
- suggested_priority
- technical_validation_required
- critical_alert_required
- generated_risk_id
- generated_action_plan_item_id
- created_by
- created_at
- updated_by
- updated_at
- completed_by
- completed_at
- reviewed_by
- reviewed_at
- review_notes

---

## 4. Tipos de gatilho

Campo:

trigger_type

Valores sugeridos:

- deadline_pressure
- public_service
- remote_or_hybrid_work
- third_parties
- repetitive_work
- prolonged_sitting
- intermediate_leadership
- frequent_changes
- task_accumulation
- frequent_conflicts
- harassment_or_violence

---

## 5. Estados da investigacao

Campo:

investigation_status

Valores sugeridos:

- not_started
- in_investigation
- saved_draft
- completed
- no_relevant_indication
- attention_point
- possible_risk_factor
- suggested_risk
- pending_technical_validation
- critical_alert
- converted_to_risk
- archived

## 5.1 Regra dos estados

not_started:
Gatilho identificado, mas investigacao ainda nao aberta.

in_investigation:
Usuario esta respondendo perguntas de aprofundamento.

saved_draft:
Investigacao salva, mas incompleta.

completed:
Perguntas minimas respondidas.

no_relevant_indication:
Nao ha indicio relevante no momento.

attention_point:
Existe ponto de atencao, mas ainda sem risco sugerido.

possible_risk_factor:
Existe possivel fator de risco, mas ainda requer avaliacao.

suggested_risk:
Sistema sugere risco apos aprofundamento.

pending_technical_validation:
Nao deve ser tratado como fechado sem revisao qualificada.

critical_alert:
Nao permitir conclusao automatica.

converted_to_risk:
Investigacao gerou registro formal de risco.

archived:
Investigacao arquivada sem conversao em risco, mantendo trilha.

---

## 6. Resultados sugeridos

Campo:

suggested_result

Valores sugeridos:

- no_relevant_indication
- attention_point
- possible_risk_factor
- suggested_risk
- pending_technical_validation
- critical_alert

---

## 7. Campos derivados para classificacao

As respostas simples do usuario devem alimentar internamente:

- intensity
- frequency
- duration
- exposed_people_count
- existing_controls
- controls_effectiveness
- evidence_status
- possible_harms
- suggested_severity
- suggested_probability
- suggested_priority
- technical_validation_required
- critical_alert_required

## 7.1 Intensidade

Valores sugeridos:

- low
- medium
- high
- unknown

## 7.2 Frequencia

Valores sugeridos:

- rare
- occasional
- frequent
- daily
- unknown

## 7.3 Duracao

Valores sugeridos:

- short
- moderate
- long
- continuous
- unknown

## 7.4 Eficacia dos controles

Valores sugeridos:

- effective
- partially_effective
- ineffective
- no_control
- unknown

## 7.5 Status de evidencia

Valores sugeridos:

- no_evidence
- weak_evidence
- partial_evidence
- sufficient_evidence
- not_applicable

## 7.6 Severidade sugerida

Valores sugeridos:

- low
- medium
- high
- critical
- unknown

## 7.7 Probabilidade sugerida

Valores sugeridos:

- low
- medium
- high
- unknown

## 7.8 Prioridade sugerida

Valores sugeridos:

- low
- medium
- high
- urgent
- pending_validation

---

## 8. Regras de validacao tecnica

Campo:

technical_validation_required

Deve ser true quando houver:

- risco alto;
- risco grave ou iminente;
- assedio;
- violencia;
- maquina sem protecao;
- trabalho em altura;
- espaco confinado;
- eletricidade;
- risco psicossocial complexo;
- dados insuficientes;
- respostas contraditorias;
- ausencia de evidencia minima;
- cenario sensivel.

Campo:

critical_alert_required

Deve ser true quando houver:

- ameaca;
- agressao;
- violencia;
- assedio grave;
- risco imediato a vida ou saude;
- perigo evidente sem controle;
- bloqueio necessario de conclusao automatica.

---

## 9. Entidade de respostas sugerida

Nome sugerido:

nr1_trigger_investigation_answers

Finalidade:

Guardar respostas individualizadas da matriz de perguntas.

Campos minimos:

- id
- tenant_id
- trigger_investigation_id
- question_key
- question_text
- answer_value
- answer_text
- answer_weight
- requires_detail
- detail_text
- created_by
- created_at
- updated_by
- updated_at

Observacao:

As respostas tambem podem ser guardadas em answers_json na entidade principal em uma primeira versao. A tabela separada deve ser considerada se for necessario consultar, auditar e gerar relatorios por pergunta.

---

## 10. Eventos de auditoria

Eventos sugeridos:

- trigger_marked_yes
- official_message_shown
- trigger_investigation_started
- trigger_question_answered
- trigger_investigation_saved
- trigger_investigation_completed
- trigger_result_suggested
- technical_validation_required
- critical_alert_generated
- investigation_converted_to_risk
- investigation_archived
- investigation_reopened

Campos minimos do evento:

- tenant_id
- establishment_id
- module_name
- screen_key
- entity_type
- entity_id
- event_type
- old_value_json
- new_value_json
- user_id
- created_at
- reason

---

## 11. Relacao com inventario de riscos

A investigacao nao deve criar automaticamente um item no inventario.

Fluxo correto:

1. Gatilho marcado.
2. Investigacao aberta.
3. Perguntas respondidas.
4. Sistema sugere resultado.
5. Se houver risco sugerido, o usuario valida.
6. Se necessario, responsavel tecnico valida.
7. So entao pode gerar ou atualizar risco no inventario.

Campo de vinculo:

generated_risk_id

---

## 12. Relacao com plano de acao

A investigacao nao deve criar automaticamente acao definitiva.

Fluxo correto:

1. Investigacao sugere necessidade de acao.
2. Usuario revisa sugestao.
3. Se caso sensivel, exige validacao tecnica.
4. Apos validacao, pode gerar item no plano de acao.

Campo de vinculo:

generated_action_plan_item_id

---

## 13. Regra de interface

Quando o usuario marcar SIM para um gatilho, mostrar:

"Este ponto nao e automaticamente um risco. Vamos entender melhor a situacao antes de classificar."

A interface deve mostrar tambem:

- status da investigacao;
- pendencias;
- se ha necessidade de validacao tecnica;
- se ha alerta critico;
- proxima acao recomendada.

---

## 14. Regras por tipo de gatilho

## 14.1 Metas e cobranca por prazo

trigger_type:
deadline_pressure

Campos derivados mais importantes:

- intensity
- frequency
- duration
- exposed_people_count
- controls_effectiveness
- possible_harms
- suggested_priority
- technical_validation_required

Pode sugerir:

- attention_point
- possible_risk_factor
- suggested_risk
- pending_technical_validation
- critical_alert, se houver abuso, assedio ou adoecimento relacionado

## 14.2 Atendimento ao publico

trigger_type:
public_service

Campos derivados mais importantes:

- frequency
- intensity
- exposed_people_count
- existing_controls
- controls_effectiveness
- evidence_status
- critical_alert_required

Pode sugerir:

- attention_point
- possible_risk_factor
- suggested_risk
- pending_technical_validation
- critical_alert, se houver ameaca, agressao ou violencia

## 14.3 Trabalho remoto ou hibrido

trigger_type:
remote_or_hybrid_work

Campos derivados mais importantes:

- duration
- frequency
- communication_difficulty
- leadership_support
- controls_effectiveness

Pode sugerir:

- attention_point
- possible_risk_factor
- pending_technical_validation

## 14.4 Terceirizados

trigger_type:
third_parties

Campos derivados mais importantes:

- exposed_people_count
- shared_environment
- integrated_controls
- responsibility_clarity
- evidence_status

Pode sugerir:

- attention_point
- possible_risk_factor
- pending_technical_validation
- critical_alert, se houver risco grave sem controle integrado

## 14.5 Trabalho repetitivo

trigger_type:
repetitive_work

Campos derivados mais importantes:

- frequency
- duration
- intensity
- existing_controls
- controls_effectiveness
- possible_harms

Pode sugerir:

- attention_point
- possible_risk_factor
- suggested_risk
- pending_technical_validation

## 14.6 Trabalho sentado prolongado

trigger_type:
prolonged_sitting

Campos derivados mais importantes:

- duration
- existing_controls
- controls_effectiveness
- evidence_status
- possible_harms

Pode sugerir:

- attention_point
- possible_risk_factor
- suggested_risk
- pending_technical_validation

## 14.7 Lideranca intermediaria

trigger_type:
intermediate_leadership

Campos derivados mais importantes:

- leadership_support
- communication_clarity
- conflict_frequency
- evidence_status
- technical_validation_required

Pode sugerir:

- attention_point
- possible_risk_factor
- pending_technical_validation
- critical_alert, se houver assedio, humilhacao ou violencia

## 14.8 Mudancas frequentes

trigger_type:
frequent_changes

Campos derivados mais importantes:

- frequency
- communication_clarity
- training_provided
- role_clarity
- controls_effectiveness

Pode sugerir:

- attention_point
- possible_risk_factor
- pending_technical_validation

## 14.9 Acumulo de tarefas

trigger_type:
task_accumulation

Campos derivados mais importantes:

- frequency
- intensity
- duration
- exposed_people_count
- controls_effectiveness
- possible_harms

Pode sugerir:

- attention_point
- possible_risk_factor
- suggested_risk
- pending_technical_validation

## 14.10 Conflitos frequentes

trigger_type:
frequent_conflicts

Campos derivados mais importantes:

- frequency
- intensity
- evidence_status
- existing_controls
- critical_alert_required

Pode sugerir:

- attention_point
- possible_risk_factor
- pending_technical_validation
- critical_alert, se houver ameaca, assedio ou violencia

## 14.11 Assedio ou violencia

trigger_type:
harassment_or_violence

Regra:

Nao tratar como pergunta comum.

Deve gerar:

- pending_technical_validation
- critical_alert
- encaminhamento especializado obrigatorio

---

## 15. RLS e multi-tenant

Toda entidade criada para investigacao deve conter:

- tenant_id
- establishment_id, quando aplicavel

Regras obrigatorias:

- RLS habilitado;
- acesso apenas por membro do tenant;
- escrita apenas por usuario autorizado do tenant;
- sem service_role no client;
- sem bypass de tenant_id;
- trilha com usuario e timestamp.

Observacao importante:

Antes de criar tabela real no banco, executar Data Discovery para confirmar schema existente, padroes de RLS e nomes ja usados no projeto.

---

## 16. Definition of Done

A modelagem estara pronta para implementacao quando:

- entidade principal estiver definida;
- campos minimos estiverem definidos;
- tipos de gatilho estiverem definidos;
- estados estiverem definidos;
- eventos estiverem definidos;
- regras de validacao tecnica estiverem definidas;
- relacao com inventario estiver definida;
- relacao com plano de acao estiver definida;
- regra de RLS e tenant_id estiver registrada;
- Data Discovery for executado antes de qualquer DDL real.

---

## 17. Regra final

Nao criar tabela sem Data Discovery.

Nao criar risco automaticamente a partir de gatilho.

Nao criar acao automaticamente sem investigacao.

Nao concluir caso sensivel sem validacao tecnica.
