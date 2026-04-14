# NR1 FIRST TOOL DATA CONTRACT

## Modulo
nr1-assessments

## Entidade principal
nr1_assessments

## Objetivo
Registrar avaliacoes iniciais de levantamento preliminar, identificacao de perigos e AEP com trilha auditavel, versionamento e isolamento por tenant.

## Chave primaria
- id uuid primary key

## Campos obrigatorios
- tenant_id uuid not null
- establishment_name text not null
- activity_name text not null
- risk_category text not null
- hazard_title text not null
- hazard_description text not null
- source_or_circumstance text not null
- exposed_group_description text not null
- possible_injuries_or_health_effects text not null
- severity_level integer not null
- probability_level integer not null
- risk_level text not null
- risk_priority text not null
- immediate_action_required_flag boolean not null default false
- action_plan_needed_flag boolean not null default false
- status text not null default 'draft'
- version integer not null default 1
- created_at timestamptz not null default now()
- created_by uuid null
- updated_at timestamptz not null default now()
- updated_by uuid null

## Campos opcionais
- unit_name text null
- sector_name text null
- process_description text null
- environment_description text null
- risk_type text null
- external_hazard_flag boolean not null default false
- workers_count_estimate integer null
- exposure_characterization text null
- routine_flag boolean not null default true
- change_related_flag boolean not null default false
- existing_prevention_measures text null
- prevention_effectiveness_notes text null
- recommended_action_summary text null
- monitoring_notes text null
- deleted_at timestamptz null
- deleted_by uuid null

## Enums funcionais

### risk_category
- physical
- chemical
- biological
- ergonomic
- psychosocial_related_to_work
- accident

### risk_level
- very_high
- high
- medium
- low

### risk_priority
- very_high
- high
- medium
- low

### status
- draft
- reviewed
- approved
- archived

## Faixas numericas iniciais

### severity_level
Inteiro de 1 a 5:
- 1 = leve
- 2 = menor
- 3 = moderada
- 4 = maior
- 5 = morte ou consequencia maxima

### probability_level
Inteiro de 1 a 5:
- 1 = muito improvavel
- 2 = pouco provavel
- 3 = possivel
- 4 = provavel
- 5 = muito provavel

## Regra inicial de derivacao do risk_level
Multiplicacao:
- score = severity_level * probability_level

Mapeamento inicial:
- 1 a 5 = low
- 6 a 10 = medium
- 12 a 16 = high
- 20 a 25 = very_high

## Regras de negocio
1. tenant_id obrigatorio
2. RLS obrigatorio
3. soft delete obrigatorio
4. version incrementa a cada update relevante
5. updated_at deve ser atualizado em toda alteracao
6. immediate_action_required_flag deve ser true quando houver risco ocupacional evidente ou risco muito alto
7. action_plan_needed_flag deve ser true quando risk_priority for medium, high ou very_high
8. risk_category = psychosocial_related_to_work nao pode receber conteudo clinico individual
9. workers_count_estimate, quando informado, deve ser maior que zero
10. deleted_at e deleted_by devem ser preenchidos juntos

## Validacoes textuais minimas
- establishment_name: minimo 3 caracteres
- activity_name: minimo 3 caracteres
- hazard_title: minimo 3 caracteres
- hazard_description: minimo 10 caracteres
- source_or_circumstance: minimo 5 caracteres
- exposed_group_description: minimo 5 caracteres
- possible_injuries_or_health_effects: minimo 5 caracteres

## Campos que exigem especial cuidado
### psychosocial_related_to_work
Quando risk_category = psychosocial_related_to_work, priorizar campos relacionados a:
- organizacao do trabalho
- excesso ou baixa demanda
- autonomia
- suporte
- reconhecimento
- conflitos
- comunicacao
- mudancas organizacionais
- violencia ou evento traumatico
- isolamento

### external_hazard_flag
Quando true, registrar perigo externo previsivel relacionado ao trabalho.

### change_related_flag
Quando true, indicar que a avaliacao surgiu de mudanca, introducao de processo ou alteracao de condicao de trabalho.

## Resposta minima esperada da API
### GET list
- ok
- items[]
- request_id

### GET by id
- ok
- item
- request_id

### POST
- ok
- item
- request_id

### PATCH
- ok
- item
- request_id

### DELETE
- ok
- request_id

## Estrutura minima esperada do item retornado
- id
- tenant_id
- establishment_name
- unit_name
- sector_name
- activity_name
- process_description
- environment_description
- risk_category
- risk_type
- hazard_title
- hazard_description
- source_or_circumstance
- external_hazard_flag
- exposed_group_description
- workers_count_estimate
- exposure_characterization
- routine_flag
- change_related_flag
- possible_injuries_or_health_effects
- existing_prevention_measures
- prevention_effectiveness_notes
- severity_level
- probability_level
- risk_level
- risk_priority
- immediate_action_required_flag
- action_plan_needed_flag
- recommended_action_summary
- monitoring_notes
- status
- version
- created_at
- created_by
- updated_at
- updated_by
- deleted_at
- deleted_by

## Indices sugeridos
- idx_nr1_assessments_tenant_id
- idx_nr1_assessments_tenant_status
- idx_nr1_assessments_tenant_risk_category
- idx_nr1_assessments_tenant_risk_priority
- idx_nr1_assessments_tenant_activity_name
- idx_nr1_assessments_deleted_at

## Ordem logica seguinte
1. contrato de dados
2. migration SQL da tabela
3. rotas CRUD
4. UI minima
5. seed de exemplo
6. smoke
