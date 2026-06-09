# ADR NR-1 — Modelo Híbrido de Experiência de Produto

## Status

Aprovado.

## Decisão

O módulo NR-1/GRO/PGR do icanHelp deixará de tratar a jornada linear de 16 etapas como experiência principal do usuário.

A nova direção oficial de produto será:

**implantação mínima guiada + workspace decisório + módulos progressivos + trilha completa como rastreabilidade.**

A jornada de 16 etapas continuará existindo como catálogo interno, trilha de completude, referência de rastreabilidade e estrutura de evolução do PGR. Porém, ela não deve ser apresentada como obrigação linear principal para o usuário leigo.

## Problema

A jornada NR-1 é extensa, técnica e sensível. Quando apresentada como sequência longa de preenchimento, pode gerar:

- sensação de formulário técnico;
- abandono do usuário;
- dificuldade de venda;
- excesso de carga cognitiva;
- confusão entre diagnóstico organizacional e diagnóstico clínico;
- acoplamento técnico excessivo em uma única tela;
- dificuldade de manutenção do código.

## Princípio central

O produto deve funcionar como um **assistente de decisão para GRO/PGR**, não como uma planilha, formulário longo ou manual técnico digitalizado.

O usuário deve entender rapidamente:

1. onde está;
2. o que já está pronto;
3. o que falta;
4. qual é a próxima melhor ação;
5. como isso vira inventário de riscos, plano de ação, evidências e PGR.

## Nova arquitetura de experiência

### 1. Implantação mínima guiada

Objetivo: permitir que o usuário comece com segurança e veja valor rapidamente.

A implantação mínima deve coletar apenas o necessário para abrir o workspace:

- empresa;
- estabelecimento;
- setor ou área inicial;
- atividade principal;
- grupo exposto inicial;
- sinais iniciais relevantes;
- indicação agregada de histórico ocupacional, quando houver.

Essa etapa não deve tentar resolver todo o PGR.

### 2. Workspace decisório

Após a base mínima, a tela principal deve priorizar decisão, não preenchimento.

O workspace deve destacar:

- próxima melhor ação;
- status da base;
- atividades mapeadas;
- riscos em análise;
- plano de ação;
- evidências pendentes;
- situação do PGR.

A pergunta central da tela deve ser: **“o que o usuário precisa fazer agora?”**

### 3. Módulos progressivos

A experiência deve ser organizada em módulos funcionais:

- Cadastro;
- Mapeamento do trabalho;
- Diagnóstico;
- Riscos;
- Plano de ação;
- Evidências;
- PGR;
- Auditoria e revisões.

Cada módulo pode evoluir de forma independente.

### 4. Trilha completa como rastreabilidade

A trilha de 16 etapas continua existindo:

1. Boas-vindas;
2. Empresa;
3. Estabelecimento;
4. Setores;
5. Atividades;
6. Grupo exposto;
7. Histórico ocupacional agregado;
8. Diagnóstico guiado;
9. Resultado do diagnóstico;
10. Inventário de riscos;
11. Plano de ação;
12. Evidências;
13. Saúde e treinamentos;
14. Terceiros;
15. Revisões e auditoria;
16. Geração do PGR.

Essa trilha deve ser usada como mapa, progresso, auditoria e orientação, mas não como fluxo linear obrigatório.

## Macroblocos oficiais

A jornada deve ser explicada ao usuário em 5 macroblocos:

1. Preparar base;
2. Mapear o trabalho;
3. Identificar e priorizar riscos;
4. Executar plano de ação;
5. Documentar e acompanhar o PGR.

## Regras de UX

1. Mostrar sempre a próxima melhor ação.
2. Evitar telas com aparência de formulário longo.
3. Dividir etapas técnicas em perguntas humanas.
4. Exibir campos sob demanda.
5. Separar o que é obrigatório do que é progressivo.
6. Manter a trilha completa visível, mas secundária.
7. Usar linguagem de decisão, não linguagem de burocracia.
8. Preservar rastreabilidade do PGR.
9. Não exigir que o usuário entenda a NR-1 inteira para avançar.
10. Fazer o dashboard orientar o trabalho, não apenas mostrar dados.

## Regras para fatores psicossociais

O sistema não diagnostica pessoas.

O sistema deve identificar fatores da organização do trabalho que possam gerar risco psicossocial, tais como:

- demandas excessivas;
- baixa autonomia;
- pressão de prazo;
- conflitos de papel;
- comunicação deficiente;
- assédio, violência ou situações críticas;
- reconhecimento insuficiente;
- jornadas ou ritmos inadequados;
- falhas na gestão do trabalho.

A interface deve evitar termos que sugiram avaliação clínica individual.

Preferir expressões como:

- fatores psicossociais relacionados ao trabalho;
- condições de trabalho;
- sinais de atenção;
- organização do trabalho;
- medidas de prevenção.

## Modelo recomendado de primeira versão viável

A primeira versão viável deve entregar:

1. triagem inicial;
2. mapa simples da atividade;
3. primeira identificação de riscos;
4. plano de ação básico;
5. evidências;
6. resumo do PGR.

Módulos como terceiros, auditorias avançadas, saúde e treinamentos detalhados, indicadores recorrentes e geração documental completa podem evoluir em ciclos posteriores.

## Roadmap de produto

### Agora

- Reorganizar a experiência em implantação mínima, workspace decisório e trilha completa.
- Criar ou ajustar card de próxima melhor ação.
- Reduzir a centralidade visual da jornada linear.
- Revisar linguagem de psicossocial.
- Identificar acoplamentos grandes no workspace atual.

### Próximo ciclo

- Separar módulos funcionais.
- Melhorar regras de exibição condicional.
- Criar visão de completude do PGR.
- Criar status por macrobloco.
- Melhorar UX por tipo de usuário: RH, SST, consultoria e pequena empresa.

### Futuro

- Templates por CNAE ou atividade.
- Sugestões inteligentes de riscos.
- Biblioteca de medidas preventivas.
- Evidências recorrentes.
- Auditoria e revisão anual.
- Painel multiempresa para consultorias.
- Exportação completa do PGR.

## Consequência prática

A partir desta decisão, novas alterações no módulo NR-1 devem respeitar a seguinte hierarquia:

1. próxima melhor ação;
2. implantação mínima;
3. workspace decisório;
4. módulos progressivos;
5. trilha completa como apoio e rastreabilidade.

A jornada linear de 16 etapas não deve voltar a ser a experiência principal isolada.
