# Especificacao Funcional e Contrato de API - Investigacao de Gatilhos NR1

## 1. Objetivo

Criar a especificacao funcional e o contrato inicial de API da tela Investigacao de Gatilhos do modulo NR1.

Esta tela existe para aprofundar gatilhos informados na triagem ou no diagnostico guiado antes de qualquer conversao em risco ocupacional.

Regra central:
gatilho nao fecha risco automaticamente.
gatilho abre investigacao.
investigacao gera sugestao.
sugestao sensivel exige validacao tecnica.

## 2. Escopo desta especificacao

Esta especificacao cobre:

- tela de listagem de investigacoes de gatilhos
- tela de abertura de investigacao
- tela de perguntas de aprofundamento
- tela de resultado preliminar
- estados da investigacao
- eventos de auditoria
- contrato de API
- regras de tenant_id e RLS esperadas
- bloqueios de seguranca

Esta especificacao nao aplica migration no banco.
Esta especificacao nao cria tabela no Supabase.
Esta especificacao nao altera endpoint existente.
Esta especificacao nao faz deploy.

## 3. Publicos do modulo

O modulo deve funcionar para tres perfis:

### 3.1 Cliente final

Usa linguagem simples.
Responde perguntas operacionais.
Nao precisa conhecer NR1, GRO, PGR, AEP ou AET.

### 3.2 Empresa parceira SST

Pode revisar tecnicamente sugestoes.
Pode validar classificacoes.
Pode complementar evidencias e medidas.

### 3.3 Pasini Consultoria

Pode atuar como camada especializada.
Pode revisar casos psicossociais, organizacionais e sensiveis.
Pode orientar abordagem humana e organizacional.

## 4. Conceito funcional

A Investigacao de Gatilhos e uma etapa intermediaria entre triagem e risco.

Exemplo:

O usuario marca:
"Existe meta e cobranca por prazo."

O sistema nao deve registrar automaticamente:
"Risco psicossocial alto."

O sistema deve abrir investigacao perguntando:

- a cobranca ocorre com que frequencia?
- os prazos sao viaveis?
- ha horas extras recorrentes?
- ha retrabalho?
- ha pessoas acumulando tarefas?
- existe medida de controle?
- existe canal de apoio?
- ha evidencia ou relato coletivo?

Apos isso o sistema pode sugerir:

- sem indicio suficiente
- manter como ponto de observacao
- sugerir perigo relacionado a organizacao do trabalho
- sugerir risco para revisao tecnica
- bloquear conclusao e exigir validacao tecnica

## 5. Gatilhos oficiais cobertos

A primeira versao deve cobrir:

- metas e cobranca por prazo
- atendimento ao publico
- trabalho remoto ou hibrido
- terceirizados
- trabalho repetitivo
- trabalho sentado prolongado
- lideranca intermediaria
- mudancas frequentes
- acumulo de tarefas
- conflitos frequentes
- assedio ou violencia

## 6. Estados da investigacao

Usar somente estes estados:

- draft
- in_progress
- pending_evidence
- pending_technical_validation
- suggested_no_risk
- suggested_monitoring
- suggested_risk
- blocked_critical_alert
- completed
- archived

## 7. Niveis de alerta

### 7.1 Amarelo

Atencao.
Pode continuar, mas exige revisao cuidadosa.

Casos:
- dados incompletos
- evidencia ausente
- resposta parcialmente contraditoria

### 7.2 Laranja

Validacao tecnica recomendada.
Pode registrar, mas nao deve fechar como concluido sem revisao qualificada.

Casos:
- psicossocial relevante
- ergonomia com possivel aprofundamento
- risco alto sugerido
- baixa confianca da classificacao

### 7.3 Vermelho

Encaminhamento obrigatorio.
Nao permitir conclusao como resolvido sem validacao humana qualificada.

Casos:
- assedio
- violencia
- risco grave e iminente
- risco evidente sem controle
- ausencia de controle em cenario critico

## 8. Tela 1 - Listagem de investigacoes

### Objetivo

Mostrar todas as investigacoes de gatilhos do estabelecimento selecionado.

### Campos exibidos

- tipo do gatilho
- estabelecimento
- setor
- atividade
- status
- nivel de alerta
- responsavel
- ultima atualizacao
- proxima acao

### Acoes

- abrir investigacao
- continuar investigacao
- revisar resultado
- arquivar
- filtrar por status
- filtrar por tipo de gatilho
- filtrar por alerta

### Regras

- listar apenas registros do tenant atual
- exigir establishment_id quando o modulo estiver em contexto de estabelecimento
- nao mostrar investigacoes de outro tenant
- arquivamento deve ser logico

## 9. Tela 2 - Nova investigacao

### Objetivo

Criar uma investigacao de gatilho vinculada a estabelecimento, setor, atividade ou diagnostico.

### Campos

- trigger_type
- establishment_id
- department_id
- activity_id
- diagnosis_session_id
- source
- source_record_id
- description
- exposed_people_count
- responsible_user_id

### Regras

- tenant_id obrigatorio
- trigger_type obrigatorio
- establishment_id obrigatorio quando houver estabelecimento selecionado
- pelo menos um contexto operacional deve existir: department_id, activity_id ou diagnosis_session_id
- status inicial deve ser draft ou in_progress
- criar evento de auditoria trigger_investigation_created

## 10. Tela 3 - Perguntas de aprofundamento

### Objetivo

Coletar informacoes suficientes para diferenciar gatilho simples de possivel risco ocupacional.

### Estrutura

Cada gatilho deve carregar uma matriz de perguntas propria.

Cada pergunta deve conter:

- question_key
- label
- help_text
- answer_type
- required
- options
- risk_signal_weight
- technical_validation_signal
- critical_alert_signal

### Tipos de resposta

- yes_no
- scale_1_5
- single_choice
- multiple_choice
- short_text
- long_text
- number
- date

### Regras

- autosave obrigatorio
- permitir salvar rascunho
- respostas sensiveis nao devem fechar risco automaticamente
- respostas de assedio ou violencia devem gerar alerta vermelho
- respostas contraditorias devem gerar alerta amarelo ou laranja
- cada resposta deve manter tenant_id e investigation_id

## 11. Tela 4 - Resultado preliminar

### Objetivo

Apresentar conclusao provisoria da investigacao.

### Blocos

#### 11.1 Resumo do gatilho

- gatilho investigado
- local
- grupo exposto
- quantidade de pessoas
- status atual

#### 11.2 Sinais identificados

- sinais fortes
- sinais moderados
- sinais ausentes
- dados faltantes

#### 11.3 Sugestao do sistema

Valores permitidos:

- sem indicio suficiente para risco
- manter em monitoramento
- sugerir risco para revisao
- exigir validacao tecnica
- bloquear por alerta critico

#### 11.4 Encaminhamento

- incluir no inventario
- abrir plano de acao
- solicitar evidencia
- encaminhar para SST
- encaminhar para Pasini
- manter como observacao

### Regras

- resultado preliminar nao equivale a laudo
- resultado sensivel exige validacao tecnica
- caso vermelho nao pode ser concluido automaticamente
- toda mudanca de status gera trilha

## 12. Eventos de auditoria

Registrar eventos para:

- trigger_investigation_created
- trigger_investigation_updated
- trigger_answer_saved
- trigger_investigation_submitted
- trigger_result_generated
- trigger_result_revised
- trigger_sent_to_risk_inventory
- trigger_sent_to_action_plan
- trigger_technical_validation_requested
- trigger_critical_alert_generated
- trigger_investigation_completed
- trigger_investigation_archived

Campos minimos da trilha:

- tenant_id
- establishment_id
- module_name
- screen_key
- entity_type
- entity_id
- event_type
- old_value_json
- new_value_json
- persistence_type
- user_id
- created_at
- reason

## 13. Contrato de API inicial

### 13.1 GET /api/nr1/trigger-investigations

Objetivo:
listar investigacoes do tenant e estabelecimento atual.

Query params:

- establishmentId
- departmentId
- activityId
- status
- triggerType
- alertLevel
- limit
- offset

Resposta 200:

{
  "items": [],
  "total": 0,
  "limit": 50,
  "offset": 0
}

Regras:

- exigir usuario autenticado
- resolver tenant por contexto seguro
- filtrar por tenant_id
- nao usar service_role no fluxo comum

### 13.2 POST /api/nr1/trigger-investigations

Objetivo:
criar investigacao.

Payload:

{
  "establishmentId": "uuid",
  "departmentId": "uuid",
  "activityId": "uuid",
  "diagnosisSessionId": "uuid",
  "triggerType": "deadline_pressure",
  "source": "triage",
  "sourceRecordId": "uuid",
  "description": "texto",
  "exposedPeopleCount": 0
}

Resposta 201:

{
  "id": "uuid",
  "status": "in_progress"
}

Validacoes:

- establishmentId obrigatorio
- triggerType obrigatorio
- triggerType deve estar na lista oficial
- usuario precisa pertencer ao tenant
- tenant_id deve ser derivado do contexto, nao do payload

### 13.3 GET /api/nr1/trigger-investigations/[id]

Objetivo:
abrir investigacao especifica.

Resposta 200:

{
  "id": "uuid",
  "triggerType": "deadline_pressure",
  "status": "in_progress",
  "alertLevel": "yellow",
  "context": {},
  "answers": [],
  "result": {}
}

Regras:

- retornar somente se o registro pertencer ao tenant atual
- retornar 404 se nao existir ou se for de outro tenant

### 13.4 PATCH /api/nr1/trigger-investigations/[id]

Objetivo:
atualizar dados gerais ou status permitido.

Payload:

{
  "description": "texto",
  "status": "pending_evidence",
  "responsibleUserId": "uuid",
  "reason": "texto"
}

Regras:

- nao permitir concluir alerta vermelho sem validacao tecnica
- exigir reason para mudanca de status sensivel
- gerar audit_event

### 13.5 PUT /api/nr1/trigger-investigations/[id]/answers

Objetivo:
salvar respostas em lote com autosave.

Payload:

{
  "answers": [
    {
      "questionKey": "frequency",
      "answerValue": "frequent",
      "notes": "texto"
    }
  ],
  "persistenceType": "draft"
}

Resposta 200:

{
  "saved": true,
  "lastSavedAt": "datetime"
}

Regras:

- autosave nao gera versao formal
- resposta sensivel pode gerar alerta
- manter audit trail leve ou evento consolidado

### 13.6 POST /api/nr1/trigger-investigations/[id]/generate-result

Objetivo:
gerar resultado preliminar.

Payload:

{
  "persistenceType": "formal",
  "reason": "gerar resultado preliminar"
}

Resposta 200:

{
  "suggestion": "suggested_risk",
  "alertLevel": "orange",
  "requiresTechnicalValidation": true,
  "canComplete": false
}

Regras:

- calcular sugestao com base nas respostas
- nao inventar conclusao quando dados forem insuficientes
- gerar audit_event formal
- se alerta vermelho, bloquear conclusao automatica

### 13.7 POST /api/nr1/trigger-investigations/[id]/send-to-risk

Objetivo:
encaminhar resultado para inventario de riscos.

Payload:

{
  "reason": "texto"
}

Resposta 200:

{
  "riskDraftId": "uuid",
  "status": "sent_to_risk_inventory"
}

Regras:

- permitido somente para sugestao validada ou pendente de revisao tecnica
- nao criar risco final automaticamente em caso sensivel
- registrar origem da investigacao

### 13.8 POST /api/nr1/trigger-investigations/[id]/send-to-action-plan

Objetivo:
abrir acao recomendada vinculada a investigacao.

Payload:

{
  "actionTitle": "texto",
  "actionDescription": "texto",
  "responsibleUserId": "uuid",
  "dueDate": "date",
  "reason": "texto"
}

Resposta 200:

{
  "actionPlanItemId": "uuid",
  "status": "sent_to_action_plan"
}

Regras:

- acao deve herdar tenant_id e establishment_id
- acao deve manter vinculo com investigation_id
- gerar trilha

## 14. Regras RLS esperadas

As tabelas futuras devem seguir o mesmo principio das entidades NR1:

- tenant_id obrigatorio
- RLS habilitado
- policies baseadas em tenant_memberships
- usuario autenticado so acessa registros do tenant em que possui membership
- nenhuma query do client deve depender de service_role
- service_role apenas em fluxo administrativo controlado, se indispensavel

## 15. Entidades futuras previstas

As entidades ja documentadas em DDL candidata sao:

- public.nr1_trigger_investigations
- public.nr1_trigger_investigation_answers

Estas entidades ainda nao devem ser aplicadas ao banco antes da aprovacao funcional e tecnica deste contrato.

## 16. Definition of Done desta etapa

A etapa esta pronta quando:

- este documento existir em docs/nr1
- o documento contiver especificacao funcional
- o documento contiver contrato de API
- o documento deixar claro que nao houve banco
- o documento deixar claro que nao houve deploy
- o documento deixar claro que nao houve commit automatico
- o working tree mostrar apenas este arquivo novo ou alterado

## 17. Proxima etapa recomendada

Depois de revisar este documento, a proxima acao unica sera gerar um checklist de validacao tecnica do contrato antes de transformar isso em backlog ou implementacao.
