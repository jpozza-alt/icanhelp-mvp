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
