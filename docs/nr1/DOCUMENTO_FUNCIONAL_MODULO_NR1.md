# DOCUMENTO FUNCIONAL - MODULO NR-1

Este documento registra as regras funcionais oficiais do modulo NR-1 do icanHelp.

<!-- BEGIN REGRA_GATILHO_NAO_E_RISCO -->

## Regra oficial - Gatilho nao e risco automatico

Fonte oficial vinculada:

docs/nr1/REGRA_OFICIAL_GATILHO_NAO_E_RISCO.md

### Decisao funcional

No modulo NR-1 do icanHelp, caracteristicas do trabalho como metas, cobranca por prazo, atendimento ao publico, trabalho remoto ou hibrido, presenca de terceirizados, lideranca intermediaria, trabalho repetitivo ou trabalho sentado prolongado nao devem ser classificadas automaticamente como risco ocupacional.

Esses itens devem funcionar como gatilhos de investigacao na triagem.

A triagem aponta sinais. O diagnostico confirma ou descarta risco.

### Consequencia na experiencia do usuario

Quando o usuario marcar SIM para algum gatilho, o sistema deve mostrar:

"Este ponto nao e automaticamente um risco. Vamos entender melhor a situacao antes de classificar."

Depois disso, o sistema deve aprofundar a analise antes de sugerir qualquer classificacao.

### Consequencia no modulo

Esta regra deve orientar:

- triagem inicial;
- diagnostico guiado;
- sugestao de risco;
- plano de acao;
- evidencias;
- alertas tecnicos;
- validacao tecnica;
- backlog tecnico.

### Grau de risco da empresa

O usuario comum nao deve ser obrigado a informar manualmente o grau de risco da empresa.

O sistema deve tentar inferir esse dado por CNPJ, CNAE, ramo de atividade ou cadastro ja existente.

Se nao conseguir, o usuario pode continuar a jornada e revisar depois com contador, profissional de SST ou responsavel tecnico.

<!-- END REGRA_GATILHO_NAO_E_RISCO -->

<!-- BEGIN MATRIZ_PERGUNTAS_APROFUNDAMENTO_GATILHOS -->

## Matriz de perguntas de aprofundamento dos gatilhos

Fonte vinculada:

docs/nr1/MATRIZ_PERGUNTAS_APROFUNDAMENTO_GATILHOS.md

### Decisao funcional

A matriz de perguntas de aprofundamento passa a orientar o Diagnostico Guiado do modulo NR-1.

Quando um usuario marcar SIM para um gatilho, o sistema nao deve criar risco automaticamente.

O sistema deve:

1. mostrar a mensagem oficial;
2. abrir perguntas de aprofundamento;
3. avaliar contexto, intensidade, frequencia, duracao, pessoas expostas, controles existentes, eficacia, evidencias e possiveis danos;
4. somente depois sugerir classificacao;
5. exigir validacao tecnica em caso sensivel, complexo, grave ou com dados insuficientes.

### Mensagem oficial de interface

"Este ponto nao e automaticamente um risco. Vamos entender melhor a situacao antes de classificar."

### Gatilhos cobertos pela matriz

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

### Resultados possiveis

- sem indicio relevante no momento;
- ponto de atencao;
- possivel fator de risco;
- risco sugerido;
- pendente de validacao tecnica;
- alerta critico.

### Regra final

Gatilho nao fecha risco.

Gatilho abre investigacao.

Investigacao gera sugestao.

Sugestao sensivel exige validacao tecnica.

<!-- END MATRIZ_PERGUNTAS_APROFUNDAMENTO_GATILHOS -->
