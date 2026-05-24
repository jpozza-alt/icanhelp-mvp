# DECISAO DE PRODUTO NR-1: Dashboard Progressivo e Jornada Guiada

Versao: V1
Status: Regra oficial de produto
Modulo: icanHelp NR-1 / PGR Digital
Data: 2026-05-23

## 1. Decisao central

O dashboard do icanHelp NR-1 nao deve nascer completo.

O primeiro acesso deve iniciar com uma experiencia narrativa, progressiva e guiada: boas-vindas, explicacao do SaaS, objetivo da jornada e transicoes simples por Enter ou botao Continuar.

A primeira acao operacional obrigatoria, depois da introducao narrativa, e identificar a empresa pelo CNPJ.

Depois da identificacao da empresa, o dashboard deve surgir limpo, com destaque para os dados cadastrais e apenas as ferramentas coerentes com a etapa atual.

## 2. Regra de ouro de UX

Primeiro acesso nao e dashboard.
Primeiro acesso tambem nao deve ser apenas um card direto.
Primeiro acesso e narrativa guiada + orientacao + CNPJ.

O usuario nao deve ser lancado diretamente em uma tela cheia de cards, menus, graficos ou ferramentas antes de entender o caminho.

## 3. Fluxo oficial do primeiro acesso

1. Tela limpa com a mensagem: "Bem-vindo ao icanHelp NR-1."
2. Mensagem discreta: "Pressione Enter para continuar", sempre acompanhada de botao "Continuar".
3. Segunda tela com um paragrafo explicando para que serve o SaaS.
4. Enter ou botao Continuar.
5. Terceira tela explicando onde vamos chegar: triagem, diagnostico, inventario de riscos, plano de acao, evidencias e PGR.
6. Enter ou botao Continuar.
7. Quarta tela explicando que antes do diagnostico precisamos conhecer a empresa.
8. Enter ou botao Continuar.
9. Tela simples: "Digite o CNPJ".
10. Ao digitar CNPJ valido, habilitar a acao "Buscar dados da empresa".
11. Apos busca ou preenchimento assistido, exibir dashboard minimo com a empresa em destaque.
12. Perguntar: "Como a empresa deve aparecer no icanHelp?"
13. Oferecer as opcoes: usar razao social, usar nome fantasia ou informar nome de uso interno.
14. O nome escolhido passa a ser o nome de destaque no dashboard.
15. Exibir a mensagem: "Agora precisamos obter mais informacoes da [nome escolhido]."
16. A partir dai, iniciar os cards de perguntas guiadas.
17. O dashboard vai sendo completado progressivamente conforme as etapas forem preenchidas.

## 4. CNPJ como porta de entrada

O CNPJ e a porta de entrada preferencial da Triagem Empresarial NR-1.

A consulta cadastral deve seguir a arquitetura:

Front-end -> API interna do icanHelp -> fonte cadastral CNPJ -> resposta normalizada -> formulario da triagem.

O navegador nao deve chamar diretamente a fonte externa.

Enquanto a API real nao estiver conectada, a interface pode manter stub local ou preenchimento manual assistido, sem prometer consulta real.

Na experiencia narrativa inicial, o botao de busca de CNPJ deve ficar bloqueado ate que o CNPJ informado seja valido.

## 5. Dashboard minimo apos identificacao da empresa

Depois do CNPJ, o dashboard deve mostrar apenas o essencial:

- razao social;
- nome fantasia, se houver;
- CNPJ;
- CNAE principal;
- CNAEs secundarios ou atividades, se disponiveis;
- porte, se disponivel;
- status da jornada;
- proxima etapa recomendada.

O nome da empresa deve ter destaque visual.

Depois que os dados da empresa forem obtidos ou preenchidos, o sistema deve perguntar como a empresa deve aparecer no icanHelp:

1. Usar razao social.
2. Usar nome fantasia.
3. Informar nome de uso interno.

O nome escolhido sera o nome principal exibido no dashboard e nas proximas mensagens da jornada.

## 6. Dashboard progressivo

O dashboard deve se completar conforme a jornada avanca.

Sequencia oficial:

1. Boas-vindas narrativa.
2. Explicacao do SaaS.
3. Explicacao do destino da jornada.
4. Explicacao de que a empresa precisa ser conhecida antes do diagnostico.
5. CNPJ / identificacao da empresa.
6. Dados cadastrais da empresa.
7. Nome de destaque da empresa no icanHelp.
8. Estabelecimento / unidade operacional.
9. Setores.
10. Atividades / tarefas.
11. Grupos expostos.
12. Historico ocupacional dos ultimos 24 meses.
13. Diagnostico guiado.
14. Riscos.
15. Plano de acao.
16. Evidencias.
17. PGR / relatorio final.

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

Cliente novo deve ver: boas-vindas narrativa -> explicacao do SaaS -> explicacao do destino da jornada -> explicacao de que precisamos conhecer a empresa -> CNPJ -> empresa identificada -> escolha do nome de destaque -> dashboard minimo -> proxima etapa guiada.

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

- primeiro acesso exibir experiencia narrativa antes do dashboard;
- existir fluxo Enter/Continuar entre as telas introdutorias;
- o CNPJ aparecer somente depois da introducao narrativa;
- botao Buscar dados da empresa estiver presente e bloqueado ate CNPJ valido;
- dashboard minimo destacar a empresa;
- usuario puder escolher se a empresa aparece por razao social, nome fantasia ou nome interno;
- dashboard liberar ferramentas progressivamente;
- existir mapa ou fluxograma da jornada;
- cliente novo, parcial e completo tiverem fluxos distintos;
- dashboard completo nao aparecer antes da hora;
- nao houver alteracao de banco sem Data Discovery previo;
- nao houver mudanca de RLS sem validacao explicita.
