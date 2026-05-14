# Plano tecnico de implementacao controlada - Investigacao de Gatilhos NR1

## 1. Objetivo

Definir o plano tecnico controlado para futura implementacao da Investigacao de Gatilhos no modulo NR1 do icanHelp.

Este documento nao implementa codigo.
Este documento nao cria rota real.
Este documento nao cria migration real.
Este documento nao altera banco.
Este documento nao faz deploy.

## 2. Base documental obrigatoria

Este plano depende dos seguintes documentos ja fechados:

- docs/nr1/ESPECIFICACAO_FUNCIONAL_E_CONTRATO_API_INVESTIGACAO_GATILHOS.md
- docs/nr1/CHECKLIST_VALIDACAO_TECNICA_CONTRATO_INVESTIGACAO_GATILHOS.md

## 3. Decisao consolidada

A implementacao futura deve preservar:

- gatilho nao fecha risco automaticamente
- gatilho abre investigacao
- investigacao gera sugestao
- sugestao sensivel exige validacao tecnica
- assedio, violencia e risco grave exigem escalonamento especializado

## 4. Principio de seguranca

Antes de qualquer codigo ou banco, a implementacao deve ser planejada para garantir:

- tenant_id obrigatorio
- RLS obrigatorio
- isolamento por tenant_memberships
- nenhum service_role em rota comum
- nenhum tenant_id aceito do payload
- nenhum fechamento automatico de alerta critico
- auditoria para toda mudanca relevante
- autosave separado de versao formal

## 5. Sequencia controlada de implementacao

### Fase 0 - Preparacao documental

Status: em planejamento.

Objetivo:
confirmar que contrato, checklist, schema real e rotas existentes estao compativeis.

Criterios de entrada:

- contrato API fechado
- checklist tecnico fechado
- validacao contra schema e rotas com PASS
- working tree limpo
- sem banco pendente
- sem deploy pendente

Criterios de saida:

- plano tecnico criado
- ordem de execucao definida
- riscos de implementacao documentados

### Fase 1 - Planejamento da migration real

Objetivo:
transformar a migration candidata em decisao tecnica revisavel, sem aplicar banco automaticamente.

Entrada:

- DDL rascunho validada
- migration candidata em quarentena documental
- Data Discovery recente
- plano aprovado

Saida esperada:

- decisao formal sobre usar ou ajustar a migration candidata
- checklist de RLS revisado
- script de preflight para migration
- nenhuma aplicacao automatica ainda

Bloqueios:

- nao aplicar migration sem comando especifico
- nao mover arquivo para supabase/migrations sem decisao formal
- nao executar SQL direto no banco sem preflight

### Fase 2 - Planejamento das rotas

Objetivo:
planejar a criacao futura das rotas da Investigacao de Gatilhos seguindo o padrao NR1 existente.

Rotas previstas:

- GET /api/nr1/trigger-investigations
- POST /api/nr1/trigger-investigations
- GET /api/nr1/trigger-investigations/[id]
- PATCH /api/nr1/trigger-investigations/[id]
- PUT /api/nr1/trigger-investigations/[id]/answers
- POST /api/nr1/trigger-investigations/[id]/generate-result
- POST /api/nr1/trigger-investigations/[id]/send-to-risk
- POST /api/nr1/trigger-investigations/[id]/send-to-action-plan

Regras:

- seguir o padrao de app/api/nr1 existente
- resolver usuario autenticado
- resolver tenant por contexto seguro
- validar membership
- filtrar por tenant_id
- auditar evento relevante
- retornar 404 para recurso de outro tenant

### Fase 3 - Planejamento do modelo de dados

Tabelas previstas:

- public.nr1_trigger_investigations
- public.nr1_trigger_investigation_answers

Campos minimos esperados em nr1_trigger_investigations:

- id
- tenant_id
- establishment_id
- department_id
- activity_id
- diagnosis_session_id
- trigger_type
- source
- source_record_id
- status
- alert_level
- description
- exposed_people_count
- result_suggestion
- requires_technical_validation
- can_complete
- responsible_user_id
- created_at
- created_by
- updated_at
- updated_by
- archived_at
- archived_by

Campos minimos esperados em nr1_trigger_investigation_answers:

- id
- tenant_id
- investigation_id
- question_key
- answer_value
- notes
- persistence_type
- created_at
- created_by
- updated_at
- updated_by

Regras:

- tenant_id obrigatorio
- FKs revisadas antes de migration real
- RLS habilitado nas duas tabelas
- policies por tenant_memberships
- delete fisico bloqueado na primeira versao
- arquivamento logico

### Fase 4 - Planejamento dos testes locais

Testes minimos:

- usuario sem login recebe erro controlado
- usuario sem membership nao acessa dados
- usuario de tenant A nao acessa tenant B
- GET lista somente dados do tenant atual
- POST ignora tenant_id do payload
- PATCH nao troca tenant_id
- answers salva rascunho
- generate-result nao conclui dados insuficientes
- alerta vermelho bloqueia conclusao
- send-to-risk nao fecha risco automaticamente
- send-to-action-plan cria vinculo correto
- audit event e gerado nos eventos relevantes

### Fase 5 - Planejamento dos testes remotos

Testes minimos:

- autenticar usuario real
- obter tenant real
- executar GET remoto
- executar POST remoto controlado
- validar RLS remoto
- validar cross-tenant negativo
- validar auditoria remota
- validar que nao houve vazamento de dados
- registrar evidencias em _debug

### Fase 6 - Planejamento da tela

Tela futura:

- listagem de investigacoes
- nova investigacao
- perguntas de aprofundamento
- resultado preliminar
- encaminhamento para risco
- encaminhamento para plano de acao
- alerta tecnico
- validacao tecnica

Regras de UX:

- linguagem leiga para cliente final
- modo tecnico para parceiro SST
- suporte a validacao especializada pela Pasini
- status de salvamento visivel
- proxima acao clara
- fundamento tecnico em camada secundaria

## 6. Ordem recomendada de execucao futura

A ordem segura e:

1. Criar preflight de migration sem aplicar banco.
2. Validar migration candidata contra schema real novamente.
3. Gerar plano de testes da migration.
4. Somente depois decidir se aplica migration real.
5. Criar rotas em modo minimo e testavel.
6. Criar testes locais autenticados.
7. Criar testes remotos autenticados.
8. Criar tela somente depois do contrato de rota validado.
9. Integrar com riscos e plano de acao.
10. Gerar closeout final.

## 7. Nao fazer agora

Nesta fase, esta proibido:

- aplicar migration real
- mover arquivo de quarentena para supabase/migrations
- criar rota real
- editar app/api/nr1
- alterar schema
- fazer deploy
- usar JWT
- usar senha
- usar service_role
- fazer commit automatico neste script
- fazer push automatico neste script

## 8. Riscos de implementacao

### Risco 1 - Converter gatilho em risco automatico

Mitigacao:
manter regra de investigacao intermediaria.

### Risco 2 - Quebra de isolamento multi-tenant

Mitigacao:
tenant_id derivado do contexto seguro e RLS por tenant_memberships.

### Risco 3 - Alerta critico fechado indevidamente

Mitigacao:
blocked_critical_alert nao pode virar completed sem validacao tecnica.

### Risco 4 - Autosave poluir versao formal

Mitigacao:
separar persistence_type draft de formal.

### Risco 5 - Criar rota antes da tabela

Mitigacao:
planejar migration e preflight antes da implementacao de endpoints reais.

### Risco 6 - Criar tabela antes do contrato estar maduro

Mitigacao:
usar checklist tecnico e decisao formal antes da migration real.

## 9. Definition of Done deste plano

Este plano esta pronto quando:

- documento criado em docs/nr1
- contem fases de implementacao
- contem bloqueios de seguranca
- contem ordem futura de execucao
- contem regra de nao alterar banco
- contem regra de nao criar rotas
- contem regra de nao fazer deploy
- contem proximo passo unico
- working tree fica apenas com este arquivo novo

## 10. Proximo passo unico recomendado

Gerar commit local deste plano tecnico, depois push e closeout documental.

Apos o closeout, o proximo ciclo deve ser preflight da migration candidata, ainda sem aplicar banco.
