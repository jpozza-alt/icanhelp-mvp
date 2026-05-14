# Checklist tecnico de validacao do contrato - Investigacao de Gatilhos NR1

## 1. Objetivo

Validar tecnicamente a especificacao funcional e o contrato de API da Investigacao de Gatilhos antes de qualquer implementacao de rota real, migration real ou alteracao de banco.

Este checklist existe para impedir que uma especificacao documental vire codigo ou banco sem validacao minima de seguranca, tenant_id, RLS, estados, auditoria e aderencia ao fluxo NR1.

## 2. Documento base

Documento validado por este checklist:

`docs/nr1/ESPECIFICACAO_FUNCIONAL_E_CONTRATO_API_INVESTIGACAO_GATILHOS.md`

## 3. Regra de seguranca desta etapa

Esta etapa nao aplica banco.
Esta etapa nao cria migration real.
Esta etapa nao cria rota real.
Esta etapa nao faz deploy.
Esta etapa nao altera dados.
Esta etapa nao usa JWT.
Esta etapa nao usa senha.
Esta etapa nao usa service_role.

## 4. Decisao funcional obrigatoria

A implementacao futura deve preservar esta regra:

- gatilho nao fecha risco automaticamente
- gatilho abre investigacao
- investigacao gera sugestao
- sugestao sensivel exige validacao tecnica
- assedio, violencia e risco grave exigem escalonamento especializado

## 5. Checklist de autenticacao e tenant

Antes de implementar qualquer endpoint, confirmar:

- [ ] O usuario precisa estar autenticado.
- [ ] O tenant_id nao vem do payload do cliente.
- [ ] O tenant_id e derivado de contexto seguro.
- [ ] O usuario precisa possuir membership no tenant.
- [ ] Todo endpoint filtra por tenant_id.
- [ ] Registro de outro tenant retorna 404 ou vazio, nunca 403 com vazamento de existencia.
- [ ] Nenhum endpoint comum usa service_role.
- [ ] Headers canonicos de tenant devem ser definidos antes da implementacao.
- [ ] Erro de tenant ausente deve ser padronizado.
- [ ] Erro de usuario sem membership deve ser padronizado.

## 6. Checklist de RLS

Antes de qualquer migration real, confirmar:

- [ ] Tabela nr1_trigger_investigations tera RLS habilitado.
- [ ] Tabela nr1_trigger_investigation_answers tera RLS habilitado.
- [ ] Policies usarao tenant_memberships.
- [ ] SELECT limitado a membros do tenant.
- [ ] INSERT limitado a membros do tenant.
- [ ] UPDATE limitado a membros do tenant.
- [ ] DELETE fisico proibido na primeira versao.
- [ ] Arquivamento deve ser logico.
- [ ] tenant_id obrigatorio nas duas tabelas.
- [ ] establishment_id obrigatorio quando houver contexto de estabelecimento.
- [ ] Nenhuma policy deve permitir acesso cross-tenant.

## 7. Checklist do contrato de API

### 7.1 GET /api/nr1/trigger-investigations

- [ ] Lista apenas registros do tenant atual.
- [ ] Aceita filtros seguros.
- [ ] Suporta establishmentId.
- [ ] Suporta departmentId.
- [ ] Suporta activityId.
- [ ] Suporta status.
- [ ] Suporta triggerType.
- [ ] Suporta alertLevel.
- [ ] Possui limit e offset.
- [ ] Nao retorna dados sensiveis desnecessarios.
- [ ] Nao lista registros arquivados por padrao, salvo filtro explicito.

### 7.2 POST /api/nr1/trigger-investigations

- [ ] Cria investigacao com tenant_id derivado do contexto.
- [ ] Valida establishmentId.
- [ ] Valida triggerType.
- [ ] Bloqueia triggerType fora da lista oficial.
- [ ] Exige contexto operacional minimo.
- [ ] Cria status inicial correto.
- [ ] Gera evento de auditoria.
- [ ] Nao aceita tenant_id no payload.
- [ ] Nao aceita status critico diretamente do payload.

### 7.3 GET /api/nr1/trigger-investigations/[id]

- [ ] Retorna apenas se pertencer ao tenant atual.
- [ ] Retorna 404 para inexistente.
- [ ] Retorna 404 para registro de outro tenant.
- [ ] Inclui contexto da investigacao.
- [ ] Inclui respostas vinculadas.
- [ ] Inclui resultado preliminar, se existir.
- [ ] Nao expande dados alem do necessario.

### 7.4 PATCH /api/nr1/trigger-investigations/[id]

- [ ] Atualiza apenas campos permitidos.
- [ ] Exige reason para mudanca sensivel.
- [ ] Bloqueia conclusao de alerta vermelho sem validacao tecnica.
- [ ] Gera audit_event.
- [ ] Preserva tenant_id.
- [ ] Preserva vinculos estruturais sensiveis.
- [ ] Nao permite troca de tenant_id.
- [ ] Nao permite troca indevida de establishment_id.

### 7.5 PUT /api/nr1/trigger-investigations/[id]/answers

- [ ] Salva respostas em lote.
- [ ] Suporta autosave.
- [ ] Diferencia draft de formal.
- [ ] Valida questionKey.
- [ ] Valida answerValue conforme tipo.
- [ ] Mantem tenant_id.
- [ ] Mantem investigation_id.
- [ ] Resposta sensivel pode gerar alerta.
- [ ] Nao gera versao formal a cada autosave.
- [ ] Nao perde historico relevante.

### 7.6 POST /api/nr1/trigger-investigations/[id]/generate-result

- [ ] Gera resultado preliminar.
- [ ] Nao inventa conclusao com dados insuficientes.
- [ ] Retorna suggestion.
- [ ] Retorna alertLevel.
- [ ] Retorna requiresTechnicalValidation.
- [ ] Retorna canComplete.
- [ ] Alerta vermelho bloqueia conclusao automatica.
- [ ] Resultado sensivel exige validacao tecnica.
- [ ] Gera evento formal de auditoria.

### 7.7 POST /api/nr1/trigger-investigations/[id]/send-to-risk

- [ ] Encaminha para inventario sem fechar risco automaticamente.
- [ ] Cria rascunho de risco ou vinculo pendente.
- [ ] Preserva origem da investigacao.
- [ ] Exige reason.
- [ ] Bloqueia caso critico sem validacao tecnica.
- [ ] Gera trilha.
- [ ] Herda tenant_id.
- [ ] Herda establishment_id.

### 7.8 POST /api/nr1/trigger-investigations/[id]/send-to-action-plan

- [ ] Cria item de plano de acao vinculado.
- [ ] Exige titulo da acao.
- [ ] Exige descricao da acao.
- [ ] Exige responsavel quando aplicavel.
- [ ] Exige prazo quando aplicavel.
- [ ] Herda tenant_id.
- [ ] Herda establishment_id.
- [ ] Mantem investigation_id.
- [ ] Gera trilha.

## 8. Checklist de estados

Confirmar se todos os estados foram implementados exatamente como contrato:

- [ ] draft
- [ ] in_progress
- [ ] pending_evidence
- [ ] pending_technical_validation
- [ ] suggested_no_risk
- [ ] suggested_monitoring
- [ ] suggested_risk
- [ ] blocked_critical_alert
- [ ] completed
- [ ] archived

Regras:

- [ ] completed nao pode ser usado em alerta vermelho sem validacao.
- [ ] archived deve ser exclusao logica.
- [ ] pending_technical_validation deve bloquear fechamento automatico.
- [ ] blocked_critical_alert deve exigir acao humana qualificada.
- [ ] status deve gerar audit_event quando mudar.

## 9. Checklist de gatilhos oficiais

Confirmar suporte aos gatilhos:

- [ ] metas e cobranca por prazo
- [ ] atendimento ao publico
- [ ] trabalho remoto ou hibrido
- [ ] terceirizados
- [ ] trabalho repetitivo
- [ ] trabalho sentado prolongado
- [ ] lideranca intermediaria
- [ ] mudancas frequentes
- [ ] acumulo de tarefas
- [ ] conflitos frequentes
- [ ] assedio ou violencia

Regra:

- [ ] Nenhum destes gatilhos pode virar risco automaticamente apenas por ter sido marcado.

## 10. Checklist de alertas tecnicos

### 10.1 Alerta amarelo

- [ ] Dados incompletos.
- [ ] Evidencia ausente.
- [ ] Resposta parcialmente contraditoria.
- [ ] Permite continuar, mas sinaliza revisao.

### 10.2 Alerta laranja

- [ ] Psicossocial relevante.
- [ ] Ergonomia com possivel aprofundamento.
- [ ] Risco alto sugerido.
- [ ] Baixa confianca da classificacao.
- [ ] Exige validacao tecnica recomendada.

### 10.3 Alerta vermelho

- [ ] Assedio.
- [ ] Violencia.
- [ ] Risco grave e iminente.
- [ ] Risco evidente sem controle.
- [ ] Ausencia de controle em cenario critico.
- [ ] Bloqueia conclusao automatica.
- [ ] Exige encaminhamento especializado.

## 11. Checklist de auditoria

Eventos obrigatorios:

- [ ] trigger_investigation_created
- [ ] trigger_investigation_updated
- [ ] trigger_answer_saved
- [ ] trigger_investigation_submitted
- [ ] trigger_result_generated
- [ ] trigger_result_revised
- [ ] trigger_sent_to_risk_inventory
- [ ] trigger_sent_to_action_plan
- [ ] trigger_technical_validation_requested
- [ ] trigger_critical_alert_generated
- [ ] trigger_investigation_completed
- [ ] trigger_investigation_archived

Campos minimos:

- [ ] tenant_id
- [ ] establishment_id
- [ ] module_name
- [ ] screen_key
- [ ] entity_type
- [ ] entity_id
- [ ] event_type
- [ ] old_value_json
- [ ] new_value_json
- [ ] persistence_type
- [ ] user_id
- [ ] created_at
- [ ] reason

## 12. Checklist de autosave

- [ ] Autosave salva rascunho.
- [ ] Autosave nao gera versao formal a cada tecla.
- [ ] Autosave mostra status ao usuario.
- [ ] Autosave suporta erro de salvamento.
- [ ] Autosave preserva answers.
- [ ] Autosave preserva contexto.
- [ ] Autosave nao polui auditoria formal.
- [ ] Mudanca formal gera evento formal separado.

## 13. Checklist de modelo de dados

Antes de aplicar migration real, confirmar:

- [ ] Data Discovery recente ainda e valido.
- [ ] Tabelas propostas ainda nao existem.
- [ ] Nomes finais das tabelas estao aprovados.
- [ ] Campos obrigatorios estao aprovados.
- [ ] Indices estao aprovados.
- [ ] FKs estao aprovadas.
- [ ] Soft delete ou archived status esta definido.
- [ ] updated_at esta definido.
- [ ] created_by e updated_by estao definidos ou justificadamente ausentes.
- [ ] As policies foram revisadas contra tenant_memberships.
- [ ] A migration candidata deve sair de quarentena apenas por decisao formal.

## 14. Checklist de UX e linguagem

- [ ] Cliente final ve linguagem simples.
- [ ] Parceiro SST ve campos tecnicos quando necessario.
- [ ] Pasini pode atuar na validacao especializada.
- [ ] Tela principal evita juridiquês.
- [ ] Tela principal evita linguagem clinica individual.
- [ ] Psicossocial e tratado como organizacao do trabalho.
- [ ] Resultado preliminar nao aparece como laudo.
- [ ] Sistema mostra proxima acao clara.
- [ ] Sistema mostra motivo do alerta.
- [ ] Sistema mostra impacto no fluxo.

## 15. Checklist de seguranca negativa

A implementacao nao pode:

- [ ] Aceitar tenant_id do payload.
- [ ] Usar service_role em rota comum.
- [ ] Desabilitar RLS.
- [ ] Fazer bypass de tenant_memberships.
- [ ] Concluir alerta vermelho automaticamente.
- [ ] Transformar gatilho em risco sem investigacao.
- [ ] Apagar registro fisicamente na primeira versao.
- [ ] Expor dados cross-tenant.
- [ ] Criar migration real sem decisao formal.
- [ ] Fazer deploy sem prova local e remota planejada.

## 16. Definition of Done para liberar implementacao

A implementacao de rota ou migration so pode comecar quando este checklist tiver:

- [ ] Validacao de produto.
- [ ] Validacao tecnica.
- [ ] Validacao RLS.
- [ ] Validacao dos estados.
- [ ] Validacao dos alertas.
- [ ] Validacao dos eventos de auditoria.
- [ ] Validacao do contrato de API.
- [ ] Decisao formal sobre migration real.
- [ ] Plano de teste local.
- [ ] Plano de teste remoto.

## 17. Proximo passo recomendado

Depois deste checklist, o proximo passo unico deve ser:

Converter este checklist em backlog tecnico de implementacao controlada OU validar o contrato contra o schema real antes de iniciar codigo.
