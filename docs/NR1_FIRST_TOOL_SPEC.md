# NR1 FIRST TOOL SPEC

## Nome da ferramenta
NR1 - Levantamento Preliminar e AEP Inicial

## Objetivo
Disponibilizar a primeira ferramenta operacional de NR-1 do icanHelp para registrar:
- caracterizacao do estabelecimento, setor ou atividade
- levantamento preliminar de perigos e riscos
- identificacao de perigos
- avaliacao inicial dos riscos
- classificacao inicial
- necessidade de medidas de prevencao
- ponte para inventario de riscos e plano de acao

## Justificativa
Essa ferramenta e a porta de entrada do GRO/PGR.
Sem ela nao existe trilha consistente para:
- identificar perigos
- registrar grupos expostos
- apontar lesoes ou agravos possiveis
- classificar prioridade
- iniciar plano de acao

## Escopo da versao 1
A versao 1 deve atender o fluxo minimo abaixo:

1. Selecionar tenant
2. Informar unidade, setor ou atividade
3. Informar processo e ambiente de trabalho
4. Registrar atividade analisada
5. Registrar perigo identificado
6. Registrar fonte ou circunstancia
7. Registrar grupo de trabalhadores expostos
8. Registrar possiveis lesoes ou agravos a saude
9. Registrar medidas ja existentes
10. Avaliar severidade
11. Avaliar probabilidade
12. Gerar nivel de risco
13. Classificar prioridade
14. Definir necessidade de plano de acao
15. Salvar registro auditavel

## Direcao funcional
A ferramenta deve servir para:
- AEP inicial
- levantamento preliminar
- fatores ergonomicos
- fatores de risco psicossociais relacionados ao trabalho
- base do inventario de riscos
- uso futuro em fluxos SST mais amplos

## Regra de ouro
Nao fazer diagnostico clinico individual.
O foco e sempre:
- trabalho
- condicoes de trabalho
- organizacao do trabalho
- perigos
- riscos
- medidas de prevencao
- acompanhamento

## Relacao com NR-1
A ferramenta deve refletir o ciclo:
- identificar perigos
- avaliar riscos
- classificar riscos
- definir medidas de prevencao
- alimentar inventario de riscos
- alimentar plano de acao

## Relacao com NR-17
Quando o risco for ergonomico ou psicossocial relacionado ao trabalho, a ferramenta deve permitir registrar aspectos de:
- organizacao do trabalho
- demandas
- autonomia
- suporte
- comunicacao
- reconhecimento
- relacoes interpessoais
- mudancas organizacionais
- eventos traumaticos ou violentos
- condicoes de execucao da atividade

## Relacao com Pasini
A ferramenta deve permitir uso em:
- pesquisa de clima
- diagnostico organizacional
- devolutiva estruturada
- plano de melhoria
- pessoas e cultura
- engajamento
- suporte a liderancas

## Modelo de dados funcional da versao 1
Cada registro deve conter no minimo:

### Bloco A - contexto
- tenant_id
- establishment_name
- unit_name
- sector_name
- activity_name
- process_description
- environment_description

### Bloco B - identificacao do perigo
- risk_category
- risk_type
- hazard_title
- hazard_description
- source_or_circumstance
- external_hazard_flag

### Bloco C - exposicao
- exposed_group_description
- workers_count_estimate
- exposure_characterization
- routine_flag
- change_related_flag

### Bloco D - efeitos
- possible_injuries_or_health_effects

### Bloco E - controles atuais
- existing_prevention_measures
- prevention_effectiveness_notes

### Bloco F - avaliacao
- severity_level
- probability_level
- risk_level
- risk_priority
- immediate_action_required_flag

### Bloco G - encaminhamento
- action_plan_needed_flag
- recommended_action_summary
- monitoring_notes

### Bloco H - trilha
- status
- version
- created_at
- created_by
- updated_at
- updated_by

## Taxonomia inicial sugerida

### risk_category
- physical
- chemical
- biological
- ergonomic
- psychosocial_related_to_work
- accident

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

## Regras de negocio da versao 1
1. tenant_id obrigatorio
2. trilha e versionamento obrigatorios
3. soft delete obrigatorio em futura implementacao de tabela
4. immediate_action_required_flag deve ser marcado quando houver risco evidente
5. action_plan_needed_flag deve ser marcado quando a classificacao exigir resposta
6. riscos psicossociais devem ser sempre relacionados ao trabalho
7. nao registrar conteudo clinico individual de trabalhador

## Saida esperada da ferramenta
A ferramenta deve permitir gerar:
- registro auditavel da AEP inicial
- base de inventario de riscos
- base de classificacao por prioridade
- insumo para plano de acao

## Ordem logica de implementacao
1. especificacao funcional
2. contrato de dados
3. tabela tenant-scoped
4. rotas CRUD
5. UI minima
6. seed de exemplos NR-1
7. prova funcional

## Fora do escopo da versao 1
- dashboard analitico
- relatorio PDF
- workflow de aprovacao complexo
- anexos
- assinatura ICP
- matriz de risco configuravel por tenant
- automacao de plano de acao multi-etapas

## Decisao arquitetural
Essa ferramenta deve nascer como modulo operacional proprio e nao apenas como knowledge-item.
Mesmo assim, ela pode se conectar aos knowledge-items como biblioteca de apoio e fundamento.

## Nome tecnico sugerido do modulo
nr1-assessments

## Resultado esperado
Ao final da primeira entrega tecnica, o usuario deve conseguir registrar uma avaliacao inicial de risco ocupacional por tenant, com foco em levantamento preliminar e AEP, preservando fundamento, versao e trilha.
