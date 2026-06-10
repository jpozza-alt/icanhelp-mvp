# ADR NR1 Workspace UX V2

## Status

Accepted.

## Data

2026-06-10.

## Contexto

O workspace NR-1/GRO/PGR evoluiu por incrementos sucessivos. A tela passou a conter atalhos, jornada guiada, proxima melhor acao, PGR, cadastros, plano, evidencias e listas. Embora a logica funcional exista, a experiencia visual ficou com aparencia de composicao remendada.

A validacao de produto indicou que:

- o sistema ainda nao parece um SaaS decisorio premium;
- o sidebar nao comunica funcao clara;
- a proxima melhor acao nao esta suficientemente destacada;
- o PGR aparece ou e percebido como elemento deslocado;
- a jornada completa ainda domina a experiencia;
- os formularios e listas tornam a tela longa e pesada;
- a interface nao parece ter nascido da nova estrategia de produto.

A direcao ja adotada para o modulo NR-1 e:

implantacao minima guiada + workspace decisorio + modulos progressivos + trilha completa como rastreabilidade.

Esta ADR define a UX V2 oficial do workspace.

## Decisao

Zerar a UX visual do workspace NR-1, preservando a infraestrutura funcional existente.

Nao sera zerado:

- banco de dados;
- APIs;
- RLS;
- autenticacao;
- tenant;
- rotas;
- logica de salvamento;
- cadastros;
- dados existentes;
- relatorio PGR;
- jornada de 16 etapas como trilha interna.

Sera redesenhado:

- arquitetura visual do workspace;
- sidebar;
- topo;
- hierarquia dos cards;
- protagonismo da proxima melhor acao;
- tratamento da jornada;
- linguagem da interface;
- ordem de decisao;
- layout dos modulos;
- peso visual de listas, formularios e recursos do plano.

## Principio central

O workspace NR-1 deve parecer um assistente de decisao para GRO/PGR, nao uma planilha digital e nao um formulario tecnico longo.

A tela deve responder, em poucos segundos:

1. Em qual empresa/unidade estou?
2. Qual e o status do PGR?
3. Qual e a proxima melhor acao?
4. O que ja esta pronto?
5. O que falta fazer?
6. Onde acesso os modulos principais?

## Estrutura visual oficial

A UX V2 sera composta por quatro zonas principais.

### 1. Sidebar contextual

A sidebar deixa de ser decorativa e passa a ter funcao objetiva.

Ela deve conter:

- marca icanHelp NR-1;
- empresa ativa;
- unidade ativa;
- status resumido do PGR;
- progresso macro;
- navegacao por modulos;
- acesso secundario a trilha completa;
- indicador de salvamento discreto.

Ela nao deve conter:

- textos longos;
- jornada de 16 etapas expandida por padrao;
- recursos do plano em destaque;
- blocos promocionais;
- elementos que compitam com o workspace principal.

Papel da sidebar:

"onde estou, qual o status e para onde posso ir."

### 2. Header de contexto

O topo deve ser limpo, compacto e institucional.

Deve conter:

- titulo: Workspace NR-1;
- subtitulo curto;
- empresa/unidade ativa quando houver;
- status do PGR;
- salvamento automatico;
- acao secundaria para resumo do PGR.

O PGR nao deve abrir a tela como bloco grande ou hero. Ele e resultado/documento de consolidacao, nao a primeira acao mental do usuario.

### 3. Hero de proxima melhor acao

A proxima melhor acao deve ser o protagonista da tela.

Deve conter:

- etiqueta: Proxima melhor acao;
- titulo de decisao;
- explicacao curta;
- botao primario unico;
- resultado esperado;
- motivos da recomendacao;
- opcao secundaria discreta para revisar base ou contexto.

Este bloco deve aparecer antes de listas, formulários extensos, jornada completa ou recursos do plano.

### 4. Macroblocos do PGR

A experiencia principal deve ser organizada em cinco macroblocos:

1. Preparar base
2. Mapear o trabalho
3. Identificar e priorizar riscos
4. Executar plano de acao
5. Documentar e acompanhar o PGR

Cada macrobloco deve ter:

- status;
- descricao curta;
- acao principal;
- contagem resumida de itens;
- indicacao visual de pronto, atual ou pendente.

A jornada de 16 etapas fica como rastreabilidade e detalhamento, nao como navegação principal.

## Hierarquia oficial da tela

A ordem visual recomendada para o workspace e:

1. Sidebar contextual.
2. Header de contexto.
3. Hero de proxima melhor acao.
4. Painel de macroblocos.
5. Checklist inteligente de pendencias.
6. Modulos principais.
7. Trilha completa recolhida.
8. Listas detalhadas e historico.

## Tratamento da jornada de 16 etapas

A jornada de 16 etapas deve continuar existindo porque serve para:

- rastreabilidade;
- auditoria;
- completude;
- orientacao tecnica;
- validacao do caminho ate o PGR.

Porem, ela nao deve dominar a experiencia.

Ela deve aparecer como:

- painel colapsavel;
- drawer;
- item secundario da sidebar;
- detalhe dentro dos macroblocos.

Texto recomendado:

"Trilha completa do PGR. Use esta visao para auditoria e rastreabilidade. O trabalho do dia a dia e conduzido pelos macroblocos e pela proxima melhor acao."

## Papel dos formularios

Formularios nao devem dominar a tela inicial.

Eles devem aparecer:

- dentro do modulo ativo;
- em cards progressivos;
- em drawer;
- em etapas curtas;
- com uma pergunta ou grupo logico por vez.

A tela inicial nao deve parecer cadastro bruto.

## Papel dos recursos do plano

Recursos do plano nao devem ocupar destaque central na experiencia NR-1.

Eles podem aparecer:

- em area administrativa;
- no rodape da sidebar;
- como aviso discreto;
- em pagina propria de plano.

Nao devem competir com a proxima melhor acao.

## Linguagem oficial

A linguagem deve ser humana, direta e decisoria.

Preferir:

- "Proxima melhor acao"
- "Base pronta"
- "Mapear o trabalho"
- "Identificar e priorizar riscos"
- "Executar plano de acao"
- "Documentar e acompanhar o PGR"
- "Fatores psicossociais relacionados ao trabalho"
- "Condicoes de trabalho"
- "Sinais de atencao"
- "Medidas de prevencao"

Evitar:

- excesso de termos tecnicos;
- "diagnostico psicossocial" como rotulo principal;
- linguagem clinica;
- blocos longos;
- botoes demais com o mesmo peso;
- "jornada" como elemento dominante.

## Fatores psicossociais

O modulo nao faz diagnostico clinico individual.

A UX deve tratar fatores psicossociais como fatores relacionados a organizacao do trabalho, tais como:

- pressao de prazo;
- demandas emocionais;
- conflitos de papel;
- baixa autonomia;
- lideranca;
- comunicacao;
- carga de trabalho;
- relacoes de trabalho;
- exposicao a violencia, assedio ou situacoes criticas.

Casos de assedio, violencia ou risco grave devem ser tratados com escalonamento especializado.

## Primeiros patches da UX V2

A execucao deve seguir esta ordem:

1. Criar shell visual V2 do workspace.
2. Reestruturar sidebar como painel contextual.
3. Transformar proxima melhor acao em hero.
4. Inserir painel de cinco macroblocos.
5. Recolher jornada completa.
6. Rebaixar recursos do plano.
7. Modularizar formularios e listas.
8. Revisar linguagem psicossocial.
9. Separar o arquivo grande do workspace em componentes menores, somente apos estabilizar a UX.

## Criterios de aceite

A UX V2 sera considerada correta quando:

- a tela nao parecer remendada;
- a sidebar tiver funcao clara;
- a proxima melhor acao for o foco visual;
- o PGR estiver presente sem dominar o topo;
- a jornada completa estiver disponivel, mas secundaria;
- o usuario leigo souber o que fazer;
- os formularios nao dominarem a primeira dobra;
- a interface parecer SaaS B2B premium;
- nao houver mojibake ou textos quebrados;
- nao houver alteracao de banco, RLS, auth, tenant ou ENV para ajustes visuais.

## Consequencias

Esta decisao autoriza redesenhar o workspace visualmente, mesmo que isso implique remover ou rebaixar blocos existentes.

Nao autoriza mudancas de banco, RLS, tenant, autenticacao, APIs, politicas de acesso ou infraestrutura.

Qualquer alteracao estrutural de dados deve ter ADR e etapa propria.
