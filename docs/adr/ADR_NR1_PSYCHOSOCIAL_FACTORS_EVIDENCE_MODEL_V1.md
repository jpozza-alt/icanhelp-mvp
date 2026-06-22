# ADR NR1 — Modelo de Evidência por Fator Psicossocial

## Status

Aceito como arquitetura-alvo.  
Implementação condicionada a Data Discovery do banco real, DDL revisado, RLS revisado e patch específico posterior.

## Contexto

O módulo NR-1 do icanHelp já possui fluxo de diagnóstico guiado da rotina real da atividade, incluindo etapa de verificação de fatores da organização do trabalho.

O modelo atual do formulário psicossocial usa campos booleanos por fator, por exemplo:

- `has_work_overload`
- `has_excessive_pressure`
- `has_role_ambiguity`
- `has_low_autonomy`
- `has_leadership_support_failure`
- `has_peer_conflict`
- `has_hostile_public_contact`
- `has_constant_interruptions`
- `has_task_accumulation`
- `has_communication_difficulty`
- `has_remote_isolation`
- `has_badly_managed_change`
- `has_report_channel`

Além desses booleanos, existe apenas um campo geral `notes`.

Esse modelo é suficiente para um MVP inicial, mas é frágil para uso real porque não diferencia:

- fator não observado;
- fator observado com indício;
- fator que precisa ser investigado;
- fator não aplicável;
- fonte usada para responder;
- nível de confiança da informação;
- pendência de validação;
- evidência mínima que justifica a marcação.

A pessoa que preenche pode não ser especialista em SST. O produto deve orientar a coleta por evidências, sem exigir interpretação técnica avançada e sem induzir diagnóstico clínico, registro de sintomas individuais, CID, prontuário, nomes ou dados pessoais sensíveis.

## Decisão

O icanHelp NR-1 deve evoluir para um modelo de triagem psicossocial orientada por evidência, com uma entidade filha por fator analisado.

A tabela atual `nr1_diagnosis_psychosocial` deve permanecer como registro agregador da etapa psicossocial, mantendo compatibilidade com o fluxo existente.

A arquitetura-alvo deve criar uma tabela filha, conceitualmente denominada:

`nr1_diagnosis_psychosocial_factors`

Cada linha representa um fator da organização do trabalho analisado dentro de uma sessão psicossocial.

## Estrutura conceitual da tabela filha

Campos esperados:

- `id`
- `tenant_id`
- `diagnosis_psychosocial_id`
- `diagnosis_session_id`
- `factor_key`
- `factor_label`
- `status`
- `confidence_level`
- `sources`
- `justification`
- `investigation_pending`
- `pending_action`
- `evidence_summary`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

## Status por fator

Valores conceituais:

- `not_observed`
- `evidence_found`
- `needs_investigation`
- `not_applicable`

Interpretação:

- `not_observed`: não há indício observado ou informado.
- `evidence_found`: há indício ocupacional com justificativa mínima.
- `needs_investigation`: não há informação suficiente; exige pendência de apuração.
- `not_applicable`: o fator não se aplica à atividade analisada.

## Nível de confiança

Valores conceituais:

- `low`
- `medium`
- `high`

Interpretação:

- `low`: informação incompleta ou dependente de confirmação.
- `medium`: relato agregado, observação de rotina ou confirmação simples.
- `high`: registro documental, indicador interno, confirmação por mais de uma fonte ou evidência robusta.

## Fontes de informação

O campo `sources` deve ser estruturado como lista, preferencialmente `jsonb`, contendo fontes como:

- observação da rotina;
- liderança/gestor;
- RH;
- SST;
- CIPA;
- relatos agregados de trabalhadores;
- registros de jornada;
- registros de horas extras;
- registros de afastamento agregados;
- retrabalho;
- reclamações internas;
- indicadores de rotatividade;
- documentos internos;
- outra fonte.

A fonte nunca deve conter nome de trabalhador, CID, prontuário, sintoma clínico individual ou diagnóstico de saúde.

## Regra de ouro do produto

O sistema não deve perguntar apenas:

“Existe sobrecarga?”  
“Existe pressão?”  
“Existe falha de comunicação?”

O sistema deve conduzir:

- o que observar;
- onde buscar a informação;
- quem pode confirmar;
- qual evidência mínima justifica a marcação;
- o que fazer quando não houver informação suficiente.

## RLS e tenant

A futura tabela filha deve conter `tenant_id` direto, ainda que também referencie `diagnosis_psychosocial_id` e `diagnosis_session_id`.

Motivos:

- facilitar políticas RLS por tenant;
- evitar dependência exclusiva de joins para isolamento;
- simplificar auditoria;
- permitir índices eficientes por tenant, sessão, status e fator;
- reduzir risco de vazamento entre organizações.

A regra mínima de RLS deve seguir o padrão do projeto: somente membros autorizados do tenant podem ler ou escrever registros do respectivo tenant.

## Compatibilidade com o modelo atual

A migração deve preservar compatibilidade com os booleanos atuais enquanto o produto evolui.

Estratégia recomendada:

1. Manter `nr1_diagnosis_psychosocial` como agregador.
2. Criar `nr1_diagnosis_psychosocial_factors` como tabela filha.
3. Adaptar API para aceitar payload estruturado por fator.
4. Durante transição, continuar preenchendo os booleanos atuais como resumo derivado.
5. Usar a tabela filha como fonte principal para relatórios, pendências e PGR.
6. Remover dependência funcional dos booleanos somente após validação de produção.

## Impacto na UX

A tela da Etapa 02 deve evoluir de checkbox simples para escolha orientada:

Para cada fator:

- Não observado
- Há indício
- Precisa investigar
- Não aplicável

Ao selecionar “Há indício”, exigir justificativa mínima e fonte.

Ao selecionar “Precisa investigar”, gerar pendência com fonte recomendada.

Ao selecionar “Não observado” ou “Não aplicável”, permitir justificativa opcional.

## Impacto no PGR

A geração de risco preliminar não deve considerar apenas checkbox marcado.

A geração deve considerar:

- fatores com `evidence_found`;
- fatores com `needs_investigation`;
- qualidade das fontes;
- confiança da informação;
- justificativa mínima;
- contexto real da atividade;
- grupo exposto;
- circunstâncias/fonte do perigo;
- controles existentes;
- necessidade de plano de ação ou investigação adicional.

## Restrições

Esta ADR não autoriza:

- alteração de banco;
- criação de tabela;
- alteração de RLS;
- alteração de Auth;
- alteração de tenant;
- alteração de API;
- alteração de `.env`;
- coleta de dado clínico individual;
- registro de nome de trabalhador;
- registro de CID;
- registro de prontuário;
- diagnóstico psicológico ou psiquiátrico.

## Próximos passos obrigatórios

Antes de qualquer DDL:

1. Rodar Data Discovery do banco real.
2. Confirmar schema real da tabela `nr1_diagnosis_psychosocial`.
3. Confirmar constraints e foreign keys reais.
4. Confirmar políticas RLS existentes.
5. Confirmar padrão de auditoria e `tenant_id`.
6. Elaborar DDL candidato.
7. Revisar DDL/RLS antes de execução.
8. Aplicar apenas com script PowerShell específico, com backup lógico e evidências.

## Decisão final

A arquitetura-alvo para fatores psicossociais no icanHelp NR-1 será:

- tabela agregadora existente para a etapa psicossocial;
- tabela filha por fator analisado;
- status por fator;
- fonte de informação por fator;
- justificativa mínima;
- pendência de investigação;
- nível de confiança;
- isolamento por `tenant_id`;
- compatibilidade temporária com os booleanos atuais.

Essa decisão melhora segurança jurídica, auditabilidade, rastreabilidade, utilidade para o RH/SST e qualidade do futuro inventário de riscos do PGR.