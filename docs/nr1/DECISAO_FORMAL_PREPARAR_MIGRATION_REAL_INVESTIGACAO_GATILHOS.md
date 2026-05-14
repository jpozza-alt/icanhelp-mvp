# Decisao formal - preparar migration real da Investigacao de Gatilhos

## 1. Decisao

Fica formalmente autorizado preparar a migration candidata da Investigacao de Gatilhos como migration real em etapa futura controlada.

Esta decisao ainda nao aplica banco.
Esta decisao ainda nao move arquivo para supabase/migrations.
Esta decisao ainda nao executa SQL.
Esta decisao ainda nao cria rota real.
Esta decisao ainda nao faz deploy.

## 2. Migration candidata autorizada para preparacao

Arquivo candidato:

`docs/nr1/migration_candidates/20260514_190011_create_nr1_trigger_investigations_candidate.sql`

Migration real futura prevista:

`supabase/migrations/20260514_190011_create_nr1_trigger_investigations_candidate.sql`

## 3. Base da decisao

A decisao se baseia no preflight fechado com PASS:

`C:\icanhelp-mvp\_debug\closeout_preflight_quarantine_candidate_migration_trigger_investigations_20260514_194711`

Confirmacoes do preflight:

- migration candidata existe
- migration real ainda nao existe
- candidata esta em quarentena documental
- candidata nao esta em supabase/migrations
- tabelas propostas ainda nao existem no banco
- sem falhas
- sem warnings
- sem SQL destrutivo
- contem tenant_id
- contem establishment_id
- contem trigger_type
- contem status
- contem validacao tecnica
- contem alerta critico
- contem RLS
- contem policies por tenant_memberships
- contem indices

## 4. Escopo autorizado

Esta decisao autoriza apenas a proxima etapa de preparacao controlada:

- preparar copia ou movimentacao futura da candidata para supabase/migrations
- manter o mesmo conteudo validado no preflight
- gerar prova de que a migration real foi preparada
- manter banco sem alteracao
- manter deploy sem alteracao
- manter rotas sem alteracao

## 5. Escopo nao autorizado

Esta decisao nao autoriza:

- aplicar migration no banco
- executar SQL no Supabase
- criar tabelas reais no banco
- criar rota real
- editar app/api/nr1
- fazer deploy
- usar service_role
- usar JWT
- inserir dados
- alterar dados existentes
- apagar dados
- remover a copia em quarentena sem registro

## 6. Regras obrigatorias para a proxima etapa

A proxima etapa deve:

- verificar branch main
- verificar HEAD esperado
- verificar working tree clean
- confirmar que a candidata existe em docs/nr1/migration_candidates
- confirmar que a migration real ainda nao existe
- preparar a migration real sem aplicar banco
- gerar resumo PASS/FAIL
- registrar NO_DB_WRITE=True
- registrar NO_DEPLOY=True
- registrar NO_ROUTE_CREATED=True
- registrar NO_SQL_EXECUTED=True

## 7. Decisao tecnica

A migration candidata pode ser preparada como migration real porque:

- passou no preflight
- nao contem SQL destrutivo
- contem estrutura das duas tabelas propostas
- contem tenant_id
- contem RLS
- contem policies por tenant_memberships
- esta alinhada ao contrato API
- esta alinhada ao plano tecnico controlado
- ainda nao foi aplicada ao banco

## 8. Regra central preservada

Gatilho nao fecha risco automaticamente.
Gatilho abre investigacao.
Investigacao gera sugestao.
Sugestao sensivel exige validacao tecnica.
Assedio, violencia e risco grave exigem escalonamento especializado.

## 9. Proximo passo unico recomendado

Preparar a migration real a partir da candidata em quarentena, ainda sem aplicar banco.
