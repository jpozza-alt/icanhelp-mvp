# BACKLOG TECNICO - MODULO NR-1

Este documento registra itens tecnicos, regras de implementacao, entidades, eventos, estados e validacoes do modulo NR-1 do icanHelp.

<!-- BEGIN BACKLOG_REGRA_GATILHO_NAO_E_RISCO -->

## Backlog tecnico - Regra gatilho nao e risco automatico

Fonte oficial vinculada:

docs/nr1/REGRA_OFICIAL_GATILHO_NAO_E_RISCO.md

### Objetivo tecnico

Implementar no modulo NR-1 a regra de que caracteristicas do trabalho nao geram risco automaticamente.

Metas, cobranca por prazo, atendimento ao publico, trabalho remoto ou hibrido, terceirizados, lideranca intermediaria, trabalho repetitivo e trabalho sentado prolongado devem funcionar como gatilhos de investigacao.

### Regra de negocio

Quando o usuario marcar SIM para um gatilho, o sistema deve:

1. nao criar risco automaticamente;
2. mostrar mensagem explicativa;
3. abrir perguntas de aprofundamento;
4. avaliar intensidade, frequencia, duracao, pessoas expostas, controles, eficacia, evidencias e possiveis danos;
5. somente depois sugerir classificacao.

### Texto obrigatorio de interface

"Este ponto nao e automaticamente um risco. Vamos entender melhor a situacao antes de classificar."

### Resultados possiveis apos aprofundamento

- sem indicio relevante no momento;
- ponto de atencao;
- possivel fator de risco;
- risco sugerido;
- pendente de validacao tecnica;
- alerta critico.

### Eventos tecnicos sugeridos

- trigger_marked_yes
- investigation_started
- investigation_saved
- investigation_completed
- risk_suggestion_generated
- technical_validation_required
- critical_alert_generated

### Estados sugeridos

- not_started
- in_investigation
- no_relevant_indication
- attention_point
- possible_risk_factor
- suggested_risk
- pending_technical_validation
- critical_alert

### Impacto em telas

Aplicar esta regra em:

- triagem inicial;
- cadastro de setores;
- cadastro de atividades;
- diagnostico guiado;
- tela de riscos;
- plano de acao;
- evidencias;
- alertas tecnicos.

### Grau de risco da empresa

O usuario comum nao deve ser obrigado a informar manualmente o grau de risco da empresa.

Implementar tentativa de inferencia por:

- CNPJ;
- CNAE;
- ramo de atividade;
- cadastro existente.

Se nao for possivel inferir, permitir continuidade da jornada e marcar o campo como pendente de revisao tecnica.

### Validacao tecnica obrigatoria

Exigir validacao tecnica em casos de:

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

### Definition of Done

A regra estara implementada quando:

- gatilhos nao criarem risco automaticamente;
- a mensagem obrigatoria aparecer na interface;
- perguntas de aprofundamento forem abertas;
- o resultado for classificado somente apos aprofundamento;
- casos sensiveis exigirem validacao tecnica;
- eventos e estados forem registrados;
- a trilha de auditoria registrar mudancas relevantes.

<!-- END BACKLOG_REGRA_GATILHO_NAO_E_RISCO -->

<!-- BEGIN BACKLOG_MATRIZ_PERGUNTAS_APROFUNDAMENTO_GATILHOS -->

## Backlog tecnico - Matriz de perguntas de aprofundamento dos gatilhos

Fonte vinculada:

docs/nr1/MATRIZ_PERGUNTAS_APROFUNDAMENTO_GATILHOS.md

### Objetivo tecnico

Implementar no Diagnostico Guiado a matriz de perguntas de aprofundamento para todos os gatilhos que nao devem gerar risco automaticamente.

### Regra de negocio

Quando o usuario marcar SIM para um gatilho, o sistema deve:

1. nao criar risco automaticamente;
2. mostrar a mensagem oficial;
3. abrir perguntas de aprofundamento;
4. salvar as respostas como investigacao;
5. gerar sugestao somente apos o aprofundamento;
6. exigir validacao tecnica nos casos sensiveis.

### Mensagem oficial de interface

"Este ponto nao e automaticamente um risco. Vamos entender melhor a situacao antes de classificar."

### Gatilhos cobertos

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

### Campos tecnicos derivados

As respostas da matriz devem alimentar:

- trigger_type;
- investigation_status;
- intensity;
- frequency;
- duration;
- exposed_people_count;
- existing_controls;
- controls_effectiveness;
- evidence_status;
- possible_harms;
- suggested_severity;
- suggested_probability;
- suggested_priority;
- technical_validation_required;
- critical_alert_required.

### Eventos tecnicos sugeridos

- trigger_question_answered;
- trigger_investigation_started;
- trigger_investigation_saved;
- trigger_investigation_completed;
- trigger_result_suggested;
- technical_validation_required;
- critical_alert_generated.

### Estados sugeridos

- not_started;
- in_investigation;
- no_relevant_indication;
- attention_point;
- possible_risk_factor;
- suggested_risk;
- pending_technical_validation;
- critical_alert.

### Impacto nas telas

Aplicar em:

- triagem inicial;
- cadastro de setores;
- cadastro de atividades;
- diagnostico guiado;
- resultado do diagnostico;
- tela de riscos;
- plano de acao;
- alertas tecnicos;
- evidencias.

### Definition of Done

A matriz estara implementada quando:

- cada gatilho abrir perguntas especificas;
- nenhum gatilho criar risco automaticamente;
- a mensagem oficial aparecer antes do aprofundamento;
- o sistema salvar as respostas como investigacao;
- o sistema gerar classificacao somente apos aprofundamento;
- casos criticos forem bloqueados ou marcados como pendentes de validacao tecnica;
- eventos relevantes forem registrados em trilha;
- os resultados puderem alimentar inventario e plano de acao somente quando validados conforme a regra.

<!-- END BACKLOG_MATRIZ_PERGUNTAS_APROFUNDAMENTO_GATILHOS -->
