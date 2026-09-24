# DECISAO DE ARQUITETURA - VALIDACAO HUMANA E TECNICA DOS GATILHOS V1

Data: 23/09/2026

## 1. Objetivo

Definir como o resultado sugerido de uma investigacao de gatilho deve ser revisado antes de eventual conversao em risco ocupacional.

Fluxo oficial:

GATILHO
→ INVESTIGACAO
→ RESPOSTAS
→ RESULTADO SUGERIDO
→ VALIDACAO HUMANA
→ VALIDACAO TECNICA, QUANDO OBRIGATORIA
→ RISCO

---

## 2. Regra central

O resultado produzido pelo motor nao e risco confirmado.

O sistema deve preservar separadamente:

- resultado sugerido pelo motor;
- decisao humana;
- validacao tecnica, quando obrigatoria;
- eventual conversao posterior em risco.

Nenhuma dessas etapas deve sobrescrever silenciosamente a anterior.

---

## 3. Campo technical_validation_required

technical_validation_required significa:

"Este caso exige validacao tecnica."

Este campo nao deve ser alterado para false apenas porque a validacao foi realizada.

A realizacao da validacao deve possuir registro proprio.

---

## 4. Data Discovery

Foram identificados no projeto os seguintes padroes:

### nr1_diagnosis_review

Possui:

- reviewed_at;
- reviewed_by;
- reviewer_comment.

Esse padrao representa revisao humana, mas nao possui decisao estruturada suficiente para controlar validacao tecnica.

### nr1_evidence_items

Possui:

- validation_status.

Esse campo e especifico do ciclo de evidencias e nao deve ser reutilizado para investigacoes.

### nr1_pgr_approvals

Possui modelo mais completo de aprovacao profissional, incluindo:

- approval_status;
- approved_at;
- approved_by;
- professional_name;
- professional_role;
- professional_council;
- professional_registration;
- professional_state;
- revogacao;
- source_snapshot_json.

Esse padrao deve orientar a modelagem da validacao tecnica dos gatilhos.

---

## 5. Entidade propria de validacao

Criar, apos revisao de DDL, entidade:

nr1_trigger_investigation_validations

Finalidade:

Registrar cada decisao humana ou tecnica relacionada ao resultado sugerido de uma investigacao.

A validacao deve possuir historico proprio e nao depender apenas de campos booleanos na investigacao.

---

## 6. Tipos de validacao

Campo sugerido:

validation_type

Valores:

- human;
- technical.

human:

Revisao realizada por usuario autorizado antes de qualquer conversao em risco.

technical:

Validacao realizada quando technical_validation_required = true ou quando a revisao humana encaminhar o caso para avaliacao tecnica.

---

## 7. Status da validacao

Campo sugerido:

validation_status

Valores iniciais:

- pending;
- validated;
- rejected;
- needs_more_information;
- revoked.

pending:

Validacao ainda nao concluida.

validated:

O responsavel concluiu a avaliacao e registrou sua decisao.

rejected:

O resultado sugerido nao foi aceito.

needs_more_information:

Nao ha elementos suficientes para decidir.

revoked:

Validacao anteriormente realizada foi formalmente revogada.

---

## 8. Decisao sobre o resultado

A validacao deve registrar separadamente a decisao tomada.

Campo sugerido:

decision_type

Valores:

- confirm_result;
- adjust_result;
- reject_result;
- request_more_information.

Quando decision_type = adjust_result, registrar:

validated_result

Valores permitidos devem seguir os resultados tecnicos oficiais:

- no_relevant_indication;
- attention_point;
- possible_risk_factor;
- suggested_risk.

technical_validation_required e critical_alert_required sao sinalizadores independentes e nao fazem parte de validated_result.

---

## 9. Campos minimos sugeridos

- id;
- tenant_id;
- establishment_id;
- trigger_investigation_id;
- validation_type;
- validation_status;
- decision_type;
- suggested_result_snapshot;
- validated_result;
- notes;
- validator_user_id;
- professional_name;
- professional_role;
- professional_council;
- professional_registration;
- professional_state;
- source_snapshot_json;
- validated_at;
- created_at;
- created_by;
- updated_at;
- updated_by;
- revoked_at;
- revoked_by;
- revocation_reason.

---

## 10. Snapshot

source_snapshot_json deve preservar, no momento da validacao:

- trigger_type;
- resultado sugerido;
- respostas relevantes;
- technical_validation_required;
- critical_alert_required;
- identificador da investigacao.

A finalidade e permitir auditoria futura mesmo que outros registros sejam posteriormente atualizados.

---

## 11. Validacao humana

Depois que a investigacao estiver completed:

o usuario autorizado deve poder:

- confirmar o resultado sugerido;
- ajustar o resultado;
- rejeitar o resultado;
- solicitar mais informacoes.

Quando a revisao humana for concluida, os campos existentes da investigacao:

- reviewed_at;
- reviewed_by;
- review_notes;

podem ser atualizados como resumo da ultima revisao.

O registro historico canonico da decisao deve permanecer na entidade de validacoes.

---

## 12. Validacao tecnica

Quando:

technical_validation_required = true

a conversao em risco deve permanecer bloqueada ate existir validacao tecnica ativa e concluida.

A validacao tecnica deve permitir registrar, quando aplicavel:

- nome do profissional;
- funcao;
- conselho profissional;
- numero de registro;
- UF;
- observacoes tecnicas.

A obrigatoriedade de conselho ou registro profissional deve depender do tipo de avaliacao e da legislacao aplicavel, nao de uma regra unica para todos os casos.

---

## 13. Alerta critico

Quando:

critical_alert_required = true

a validacao humana nao elimina a necessidade de tratamento especial.

O sistema deve:

- preservar o alerta;
- impedir conversao automatica;
- exigir encaminhamento apropriado;
- exigir validacao tecnica quando aplicavel;
- manter trilha completa das decisoes.

---

## 14. Conversao em risco

A conversao somente podera ocorrer quando:

1. investigacao estiver completed;
2. existir resultado sugerido;
3. existir validacao humana concluida e compativel com a conversao;
4. se technical_validation_required = true, existir validacao tecnica concluida e compativel;
5. nao existir pendencia ativa de informacao;
6. nao existir bloqueio decorrente de alerta critico sem tratamento;
7. usuario confirmar expressamente a conversao.

Nenhuma validacao deve criar risco automaticamente.

---

## 15. Historico

Validacoes nao devem ser sobrescritas para apagar decisoes anteriores.

Quando necessario corrigir ou substituir uma decisao:

- registrar nova validacao;
- revogar ou superseder a anterior;
- preservar auditoria.

---

## 16. Multi-tenant e seguranca

A futura entidade deve obrigatoriamente possuir:

- tenant_id;
- establishment_id;
- trigger_investigation_id;
- RLS;
- FKs tenant-aware;
- escrita apenas por usuario autorizado;
- nenhuma utilizacao de service role no fluxo normal.

---

## 17. Auditoria

Eventos sugeridos:

- trigger_human_review_started;
- trigger_human_review_completed;
- trigger_human_review_rejected;
- trigger_more_information_requested;
- trigger_technical_validation_started;
- trigger_technical_validation_completed;
- trigger_technical_validation_rejected;
- trigger_validation_revoked;
- investigation_converted_to_risk.

---

## 18. Regra para investigation_status

Nao voltar a misturar processo e resultado.

Nesta fase:

- investigation_status = completed permanece valido durante revisoes;
- suggested_result guarda a sugestao do motor;
- validacoes ficam na entidade propria;
- converted_to_risk somente quando houver efetiva conversao.

Nao criar novos estados apenas para representar resultado ou aprovacao.

---

## 19. Regra final

Resultado sugerido nao e decisao humana.

Decisao humana nao substitui validacao tecnica obrigatoria.

Validacao tecnica nao cria risco automaticamente.

Somente apos todas as validacoes exigidas o usuario podera confirmar a conversao em risco.

