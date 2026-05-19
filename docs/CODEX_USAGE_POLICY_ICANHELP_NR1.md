# CODEX\_USAGE\_POLICY\_ICANHELP\_NR1

Status: APROVADO
Projeto: icanHelp NR-1
Tipo: Politica operacional de uso do Codex
Prioridade: Critica
Versao: 1.0

## 1\. Objetivo

Definir regras seguras para uso do Codex no projeto icanHelp NR-1.

O Codex sera usado como executor tecnico controlado para leitura, analise, revisao, refatoracao e implementacao de tarefas pequenas no repositorio.

O Codex nao substitui validacao humana, arquitetura, politica de seguranca, scripts PowerShell de verificacao, nem decisao sobre banco, RLS, tenant ou producao.

## 2\. Regra-mae

O Codex so pode atuar dentro de tarefa pequena, explicita e revisavel.

Toda tarefa deve respeitar:

* uma acao por vez;
* sem segredos;
* sem JWT;
* sem senha;
* sem service\_role;
* sem alteracao de banco sem autorizacao expressa;
* sem deploy automatico;
* sem commit automatico;
* sem push automatico;
* sem alteracao de RLS sem Data Discovery e revisao;
* sem uso de service\_role no client;
* sem alteracao de .env sem instrucao expressa.

Regra central: Codex acelera codigo. Codex nao decide seguranca, banco, RLS, deploy ou producao sozinho.

## 3\. Ferramentas por tipo de etapa

### 3.1 ChatGPT

Usar ChatGPT para arquitetura, decisao de produto, definicao de proximo passo, criacao de scripts PowerShell, avaliacao de logs, validacao de risco, planejamento de banco, interpretacao NR-1 e definicao de prompts para Codex.

### 3.2 Codex Web ou Cloud

Usar Codex Web ou Cloud para ler o repositorio, localizar arquivos, explicar estrutura do codigo, corrigir erro pequeno, sugerir diff revisavel, revisar PR, criar componente isolado, criar teste e fazer analise readonly.

Este sera o modo padrao inicial para tarefas de codigo, por ser mais controlado e isolado.

Nao usar Codex Web ou Cloud para migration, RLS, .env, JWT, service\_role, deploy, push, producao ou alteracao critica de autenticacao.

### 3.3 Codex Desktop

Usar Codex Desktop para acompanhar tarefas, revisar diffs, organizar threads e trabalhar com tarefas de codigo controladas.

No inicio, Codex Desktop deve ser usado principalmente para acompanhar e revisar, nao para tarefas criticas.

Nao usar Codex Desktop para banco, migration, RLS, .env, deploy ou segredos.

### 3.4 Codex CLI ou Local

Usar Codex CLI ou local somente em fase posterior, quando o fluxo ja estiver validado.

Nao usar agora para banco, RLS, env, producao, deploy, autenticacao critica, tenant\_memberships ou qualquer tarefa ampla.

### 3.5 PowerShell

Usar PowerShell para validacao deterministica, scripts de diagnostico, checagens PASS ou FAIL, criacao de evidencias em \_debug, leitura de logs e verificacao local.

PowerShell e a camada oficial de comprovacao do projeto.

## 4\. O que o Codex pode fazer

O Codex pode ler o repositorio, localizar arquivos, explicar estrutura do codigo, corrigir TypeScript, corrigir lint, ajustar imports, propor refatoracoes pequenas, criar componentes isolados, escrever testes, revisar PR, gerar relatorio tecnico, sugerir diff revisavel e apontar riscos tecnicos aparentes.

## 5\. O que o Codex nao pode fazer sem autorizacao expressa

O Codex nao pode executar migration, alterar RLS, desativar RLS, criar tabela nova, alterar tenant\_id, mexer em tenant\_memberships, alterar autenticacao critica, alterar .env, solicitar JWT, senha, token ou service\_role, inserir service\_role no client, fazer deploy, fazer commit, fazer push, apagar arquivos, modificar producao ou declarar tarefa concluida sem validacao PASS ou FAIL.

## 6\. Seguranca multi-tenant

Todo codigo sugerido pelo Codex deve preservar tenant\_id, RLS, RBAC, tenant\_memberships, isolamento entre clientes, trilha de auditoria e evidencia tecnica.

Qualquer sugestao que ignore tenant\_id, RLS ou RBAC deve ser rejeitada.

## 7\. Banco de dados

Antes de qualquer alteracao de banco: executar Data Discovery, confirmar schema real, gerar plano, revisar impacto e somente depois criar script ou migration.

O Codex nao deve inventar tabela, coluna ou policy.

## 8\. Producao e Vercel

O Codex nao pode fazer deploy automatico.

Qualquer acao envolvendo Vercel, dominio, env ou producao exige plano separado, script PowerShell especifico, confirmacao humana, validacao PASS ou FAIL e evidencia em \_debug.

## 9\. Padrao de prompt para o Codex

Todo prompt para Codex deve conter objetivo, escopo permitido, arquivos-alvo quando conhecidos, proibicoes, formato de saida, exigencia de diff revisavel e instrucao para nao executar banco, commit, push ou deploy.

## 10\. Formato obrigatorio de resposta do Codex

O Codex deve responder com STATUS, arquivos analisados, arquivos alterados se houver, resumo do diff, riscos, comandos de validacao sugeridos, proximos passos e confirmacao de que nao houve banco, env, commit, push ou deploy.

## 11\. Validacao

Nenhuma entrega do Codex sera considerada concluida ate passar por validacao PowerShell.

Toda validacao deve gerar PASS ou FAIL, caminho do relatorio, evidencia em \_debug e resumo final.

## 12\. Quando nao usar Codex

Nao usar Codex quando a etapa envolver banco real, RLS, service\_role, JWT, .env, Vercel producao, deploy, migrations, tenant\_memberships, autenticacao critica, decisao de arquitetura, decisao juridica ou interpretacao normativa final.

Nesses casos, usar ChatGPT para arquitetura, PowerShell para execucao, \_debug para evidencia e usuario para aprovacao.

## 13\. Fluxo oficial de trabalho

1. ChatGPT define a tarefa.
2. Usuario aprova a acao unica.
3. Codex executa apenas se for tarefa segura de codigo.
4. Usuario traz o resultado ou diff.
5. ChatGPT revisa.
6. PowerShell valida.
7. Resultado precisa terminar em PASS ou FAIL.

## 14\. Regra final

Codex acelera execucao. ChatGPT arquiteta e valida estrategia. PowerShell comprova. Usuario aprova.

Nenhum agente substitui a seguranca multi-tenant, a rastreabilidade e a validacao deterministica do projeto icanHelp NR-1.

