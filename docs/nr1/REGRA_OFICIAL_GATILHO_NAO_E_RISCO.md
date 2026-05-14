# REGRA OFICIAL - GATILHO NAO E RISCO AUTOMATICO

## 1. Decisao oficial de produto

No modulo NR-1 do icanHelp, caracteristicas do trabalho como metas, cobranca por prazo, atendimento ao publico, trabalho remoto ou hibrido, presenca de terceirizados, lideranca intermediaria, trabalho repetitivo ou trabalho sentado prolongado nao devem ser classificadas automaticamente como risco ocupacional.

Esses itens devem funcionar como gatilhos de investigacao na triagem.

A triagem aponta sinais. O diagnostico confirma ou descarta risco.

---

## 2. Regra principal

Quando o usuario marcar SIM para algum gatilho, o sistema nao deve criar risco automaticamente.

O sistema deve abrir perguntas de aprofundamento sobre:

- intensidade;
- frequencia;
- duracao;
- quantidade de pessoas expostas;
- contexto da atividade;
- controles existentes;
- eficacia dos controles;
- evidencias;
- possiveis lesoes ou agravos;
- historico de queixas, incidentes, afastamentos ou conflitos;
- necessidade de validacao tecnica.

Somente depois desse aprofundamento o sistema podera sugerir uma classificacao.

---

## 3. Resultados possiveis apos o aprofundamento

O sistema podera classificar o item como:

1. Sem indicio relevante no momento
2. Ponto de atencao
3. Possivel fator de risco
4. Risco sugerido
5. Pendente de validacao tecnica
6. Alerta critico

---

## 4. Texto obrigatorio de interface

Quando um gatilho for identificado, a interface deve mostrar:

"Este ponto nao e automaticamente um risco. Vamos entender melhor a situacao antes de classificar."

---

## 5. Exemplos de gatilhos

### Metas e cobranca por prazo

Nao e risco automatico.

O sistema deve investigar:

- as metas sao claras?
- os prazos sao possiveis?
- a equipe e suficiente?
- ha horas extras frequentes?
- as pausas sao respeitadas?
- existe apoio da lideranca?
- existe cobranca agressiva, humilhante ou abusiva?
- ha queixas, conflitos, afastamentos ou incidentes relacionados?

### Atendimento ao publico

Nao e risco automatico.

O sistema deve investigar:

- ha conflito frequente?
- ha agressividade verbal ou fisica?
- ha ameaca?
- o trabalhador atende sozinho?
- existe protocolo para situacoes dificeis?
- existe apoio da lideranca?
- ha registro de ocorrencias?

### Trabalho remoto ou hibrido

Nao e risco automatico.

O sistema deve investigar:

- ha isolamento relevante?
- ha excesso de disponibilidade?
- ha dificuldade de comunicacao?
- ha falha de apoio da lideranca?
- ha controle inadequado de jornada?
- ha dificuldade de separar trabalho e descanso?

### Terceirizados

Nao e risco automatico.

O sistema deve investigar:

- eles atuam no mesmo local?
- quais atividades realizam?
- quais riscos compartilham?
- existem medidas integradas?
- existem documentos e responsabilidades definidos?
- ha comunicacao entre as empresas?

### Trabalho repetitivo

Nao e risco automatico.

O sistema deve investigar:

- a repeticao e frequente?
- ha pausas?
- ha alternancia de tarefas?
- ha desconforto relatado?
- ha ritmo intenso?
- ha controle existente?

### Trabalho sentado prolongado

Nao e risco automatico.

O sistema deve investigar:

- o mobiliario e adequado?
- ha pausas?
- ha alternancia postural?
- ha desconforto?
- ha avaliacao ergonomica?
- ha orientacao ao trabalhador?

---

## 6. Grau de risco da empresa

O usuario comum nao deve ser obrigado a informar manualmente o grau de risco da empresa.

O sistema deve tentar inferir esse dado por:

- CNPJ;
- CNAE;
- ramo de atividade;
- cadastro ja existente.

Se o sistema nao conseguir inferir, deve permitir que o usuario continue a jornada e mostrar:

"Grau de risco nao identificado automaticamente. Voce pode continuar e revisar este dado depois com contador, profissional de SST ou responsavel tecnico."

---

## 7. Classificacao de risco ocupacional

O usuario comum deve responder perguntas em linguagem simples.

O sistema deve converter internamente as respostas em criterios tecnicos, como:

- severidade;
- probabilidade;
- prioridade;
- necessidade de acao;
- necessidade de validacao tecnica.

---

## 8. Validacao tecnica obrigatoria

O sistema deve exigir validacao tecnica quando houver:

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
- qualquer cenario sensivel.

---

## 9. Impacto nos tres registros do projeto

### 9.1 Prompt-fonte / conhecimento do projeto

Esta regra deve orientar todas as conversas futuras sobre o modulo NR-1.

### 9.2 Documento funcional do modulo NR-1

Esta regra deve constar como regra oficial de produto para triagem, diagnostico guiado, riscos, plano de acao e alertas.

### 9.3 Backlog tecnico

Esta regra deve virar implementacao nas telas, entidades, eventos, estados e validacoes do modulo.

---

## 10. Frase oficial

Caracteristica do trabalho nao e risco automatico.

Caracteristica do trabalho e gatilho de investigacao.

A triagem aponta sinais.

O diagnostico confirma ou descarta risco.
