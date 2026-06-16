# ADR — NR1 Platform Owner separado do Workspace do Tenant

Status: APROVADO
Projeto: icanHelp NR-1
Tipo: Decisão arquitetural
Prioridade: CRÍTICA

## 1. Contexto

O módulo NR-1 do icanHelp é multi-perfil:

- cliente final;
- parceiro SST;
- Pasini / operação consultiva;
- administração interna da plataforma icanHelp.

A rota operacional atual do módulo NR-1 é:

`/dashboard/nr1/workspace`

Essa rota deve representar a jornada NR-1 dentro de uma empresa/tenant ativo, não um painel global da plataforma.

## 2. Problema

O usuário fundador/inventor da plataforma precisa conseguir visualizar e administrar todas as empresas, setores e informações do ecossistema icanHelp NR-1.

Ao mesmo tempo, cada empresa cliente deve visualizar apenas os próprios dados.

Se o papel `admin` de `tenant_memberships` for usado como admin global, existe risco de quebrar o isolamento multi-tenant, permitindo que um administrador de uma empresa enxergue dados de outra.

## 3. Evidência técnica atual

Data Discovery confirmou:

- existem `tenants`;
- existe `tenant_memberships`;
- `tenant_memberships` possui coluna `role`;
- os papéis reais atuais em `tenant_memberships` são `owner` e `admin`;
- existem funções de segurança por tenant, como `icanhelp_nr1_is_tenant_member` e `icanhelp_nr1_is_tenant_admin`;
- não há referência de policy para `platform`;
- não há papel global `platform_owner` implementado;
- as tabelas NR-1 usam `tenant_id` e RLS.

Inspeção do código confirmou:

- há rotas operacionais NR-1 por tenant;
- há uso de `x-icanhelp-tenant`;
- há rotas de tenant ativo/listagem;
- não há painel global explícito de `platform_owner`;
- não há rota dedicada claramente a administração global da plataforma.

## 4. Decisão

A rota:

`/dashboard/nr1/workspace`

fica reservada para:

- empresa cliente;
- operador do tenant;
- parceiro SST atuando dentro de um tenant selecionado;
- Pasini atuando dentro de um tenant/cliente selecionado.

A administração global da plataforma será uma camada separada, futura, por exemplo:

`/dashboard/platform`

ou:

`/dashboard/admin/platform`

Essa camada deverá ser acessível apenas por papel global explícito, como:

`platform_owner`

ou equivalente aprovado.

## 5. Regra de isolamento

`tenant_memberships.role = owner/admin` significa:

- owner/admin daquele tenant específico.

Não significa:

- dono global do icanHelp;
- administrador global da plataforma;
- acesso automático a todos os tenants.

## 6. Modelo futuro recomendado

Criar uma camada global separada, com autorização própria, para:

- listar todos os tenants;
- ver empresas por tenant;
- ver estabelecimentos;
- ver setores;
- ver atividades;
- ver status da jornada NR-1;
- ver plano contratado;
- ver usuários;
- ver pendências críticas;
- ver eventos de auditoria;
- entrar em modo suporte/implantação com motivo registrado.

## 7. Auditoria obrigatória

Todo acesso global a dados de cliente deve gerar trilha com:

- user_id;
- tenant_id acessado;
- motivo do acesso;
- tipo de acesso;
- origem/tela;
- data/hora;
- escopo;
- se houve alteração ou apenas leitura.

## 8. Restrições

Não é permitido:

- desativar RLS;
- usar `service_role` no client;
- reaproveitar `admin` de tenant como admin global;
- fazer painel global dentro do workspace do cliente;
- permitir listagem global sem papel global explícito;
- acessar tenant sem auditoria.

## 9. Consequência prática imediata

A correção visual pendente no workspace deve ser tratada como correção de contexto do tenant ativo, não como criação de painel global.

O workspace continua sendo jornada operacional da empresa ativa.

A visão global do inventor/icanHelp será tratada como outro épico técnico e outra rota.

## 10. Próxima etapa técnica

Antes de implementar a visão global:

1. definir modelo de papel global;
2. validar se haverá tabela própria de platform roles ou extensão segura de estrutura existente;
3. criar plano de RLS;
4. criar plano de auditoria de acesso global;
5. só depois criar migration ou API.
