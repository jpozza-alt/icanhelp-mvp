# DECISAO DE PRODUTO NR-1: Dashboard Progressivo e Jornada Guiada

Versao: V1
Status: Regra oficial de produto
Modulo: icanHelp NR-1 / PGR Digital
Data: 2026-05-23

## 1. Decisao central

O dashboard do icanHelp NR-1 nao deve nascer completo.

O primeiro acesso deve iniciar com boas-vindas, explicacao do SaaS, objetivo da jornada e convite para uma experiencia guiada.

A primeira acao operacional obrigatoria e identificar a empresa pelo CNPJ.

Depois da identificacao da empresa, o dashboard deve surgir limpo, com destaque para os dados cadastrais e apenas as ferramentas coerentes com a etapa atual.

## 2. Regra de ouro de UX

Primeiro acesso nao e dashboard.
Primeiro acesso e orientacao + CNPJ.

O usuario nao deve ser lancado diretamente em uma tela cheia de cards, menus, graficos ou ferramentas antes de entender o caminho.

## 3. Fluxo oficial do primeiro acesso

1. Boas-vindas com letras maiores que a interface operacional.
2. Explicacao do proposito do SaaS.
3. Explicacao dos objetivos: diagnostico, inventario de riscos, plano de acao, evidencias e PGR.
4. Convite para jornada guiada.
5. Primeiro card operacional: CNPJ.
6. Acao principal: Buscar dados pelo CNPJ.
7. Dashboard minimo com empresa em destaque.
8. Proxima etapa guiada.

## 4. CNPJ como porta de entrada

O CNPJ e a porta de entrada preferencial da Triagem Empresarial NR-1.

A consulta cadastral deve seguir a arquitetura:

Front-end -> API interna do icanHelp -> fonte cadastral CNPJ -> resposta normalizada -> formulario da triagem.

O navegador nao deve chamar diretamente a fonte externa.

Enquanto a API real nao estiver conectada, a interface pode manter stub local ou preenchimento manual assistido, sem prometer consulta real.

## 5. Dashboard minimo apos identificacao da empresa

Depois do CNPJ, o dashboard deve mostrar apenas o essencial:

- razao social;
- nome fantasia, se houver;
- CNPJ;
- CNAE principal;
- porte, se disponivel;
- status da jornada;
- proxima etapa recomendada.

O nome da empresa deve ter destaque visual.

## 6. Dashboard progressivo

O dashboard deve se completar conforme a jornada avanca.

Sequencia oficial:

1. Boas-vindas.
2. CNPJ / identificacao da empresa.
3. Dados cadastrais da empresa.
4. Estabelecimento / unidade operacional.
5. Setores.
6. Atividades / tarefas.
7. Grupos expostos.
8. Historico ocupacional dos ultimos 24 meses.
9. Diagnostico guiado.
10. Riscos.
11. Plano de acao.
12. Evidencias.
13. PGR / relatorio final.

Cada ferramenta deve ser liberada somente quando houver dados minimos para ela fazer sentido.

## 7. Mapa da jornada

O sistema deve ter um botao para exibir o mapa da jornada.

Nomes possiveis:

- Ver caminho da jornada;
- Mapa da implantacao NR-1;
- Fluxograma da jornada;
- Ver etapas do PGR.

O mapa deve mostrar etapa atual, etapas concluidas, proximas etapas, ferramentas que serao liberadas e relacao com o PGR.

## 8. Cliente novo

Cliente novo deve ver: boas-vindas -> explicacao -> convite -> CNPJ -> empresa identificada -> dashboard minimo -> proxima etapa guiada.

Cliente novo nao deve cair direto no dashboard completo.

## 9. Cliente com base parcial

Cliente com base parcial deve ver uma retomada:

Encontramos uma base ja iniciada. Voce quer revisar a Triagem Empresarial NR-1 ou ir para o dashboard?

Acoes:

1. Revisar triagem.
2. Ir para dashboard.

Ao revisar, a jornada deve abrir pela etapa empresa/CNPJ.

## 10. Cliente com base completa

Cliente com base completa pode ir ao dashboard.

Mesmo assim, deve existir botao para revisar a triagem, rever configuracao guiada e ver caminho da jornada.

## 11. Privacidade

Na etapa inicial, o sistema nao deve coletar dados clinicos individuais.

O historico ocupacional de 24 meses deve usar dados agregados e organizacionais, sem nome de trabalhador, prontuario, CID individual ou diagnostico clinico individual.

## 12. Fora de escopo nesta decisao

Esta decisao nao implementa API real de CNPJ, migracao de banco, novas tabelas, RLS, tenant, auth, deploy, regra tributaria automatica ou diagnostico clinico individual.

## 13. Definition of Done

A decisao estara implementada quando:

- primeiro acesso exibir boas-vindas antes do dashboard;
- primeiro card operacional for CNPJ;
- botao Buscar dados pelo CNPJ estiver presente;
- dashboard minimo destacar a empresa;
- dashboard liberar ferramentas progressivamente;
- existir mapa ou fluxograma da jornada;
- cliente novo, parcial e completo tiverem fluxos distintos;
- dashboard completo nao aparecer antes da hora;
- nao houver alteracao de banco sem Data Discovery previo;
- nao houver mudanca de RLS sem validacao explicita.
