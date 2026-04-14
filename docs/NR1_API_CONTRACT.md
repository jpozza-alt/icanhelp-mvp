# NR1 API CONTRACT

## Objetivo
Definir o contrato canonico da primeira API persistente do modulo NR-1.

## Recurso inicial
nr1_assessments

## Base path
/api/nr1-assessments

## Regras gerais
- Authorization: Bearer <jwt>
- x-icanhelp-tenant: <tenant_id>
- tenant_id nunca vem do body
- DELETE deve ser soft delete
- ordenacao padrao: updated_at desc

## Endpoints canonicos
- GET /api/nr1-assessments
- GET /api/nr1-assessments/:id
- POST /api/nr1-assessments
- PATCH /api/nr1-assessments/:id
- DELETE /api/nr1-assessments/:id

## Body minimo do POST
- establishment_name
- activity_name
- risk_category
- hazard_title
- hazard_description
- source_or_circumstance
- exposed_group_description
- possible_injuries_or_health_effects
- severity_level
- probability_level

## Campos calculados no servidor
- risk_level
- risk_priority
- immediate_action_required_flag
- action_plan_needed_flag

## Status aceitos
- draft
- reviewed
- approved
- archived

## risk_category aceitos
- physical
- chemical
- biological
- ergonomic
- psychosocial_related_to_work
- accident

## Regra inicial de calculo
- score = severity_level * probability_level
- 1 a 5 = low
- 6 a 10 = medium
- 12 a 16 = high
- 20 a 25 = very_high

## Erros canonicos
- unauthorized
- forbidden
- not_found
- validation_error
- conflict
- internal_error

## Ordem tecnica seguinte
1. criar rotas API /api/nr1-assessments
2. plugar auth e tenant header
3. conectar com public.nr1_assessments
4. validar CRUD basico
5. so depois ligar a UI