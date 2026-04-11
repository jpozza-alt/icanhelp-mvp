# KNOWLEDGE ITEMS API CONTRACT

Data de geracao: 2026-04-11 03:37:49

## Objetivo
Definir o contrato HTTP minimo do modulo knowledge-items antes da implementacao das rotas.

## Principios
- tenant-scoped
- autenticacao obrigatoria
- sem bypass de tenant
- alinhado ao tenant ativo do sistema
- uso inicial: organizacional
- uso futuro: governamental

## Rotas iniciais

### 1. GET /api/knowledge-items
Objetivo:
- listar itens do tenant atual

Query params suportados:
- domain
- status
- category
- q
- limit
- offset

Comportamento:
- retorna apenas itens do tenant ativo
- oculta itens com deleted_at preenchido
- ordenacao inicial por updated_at desc

Exemplo de resposta:
{
  "items": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "domain": "organizational",
      "category": "sst",
      "title": "Titulo",
      "summary": "Resumo",
      "status": "draft",
      "version": 1,
      "updated_at": "2026-04-11T00:00:00Z"
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0
}

### 2. GET /api/knowledge-items/{id}
Objetivo:
- obter detalhe de um item especifico do tenant atual

Comportamento:
- retorna 404 se o item nao existir
- retorna 404 se existir em outro tenant
- oculta itens com deleted_at preenchido

Exemplo de resposta:
{
  "item": {
    "id": "uuid",
    "tenant_id": "uuid",
    "domain": "organizational",
    "category": "sst",
    "title": "Titulo",
    "summary": "Resumo",
    "body": "Conteudo principal",
    "foundation_type": "methodological",
    "foundation_reference": "Referencia",
    "status": "draft",
    "version": 1,
    "created_at": "2026-04-11T00:00:00Z",
    "created_by": "uuid",
    "updated_at": "2026-04-11T00:00:00Z",
    "updated_by": "uuid"
  }
}

### 3. POST /api/knowledge-items
Objetivo:
- criar item novo no tenant atual

Permissao inicial:
- owner
- admin
- member

Body minimo:
{
  "domain": "organizational",
  "category": "sst",
  "title": "Titulo",
  "summary": "Resumo opcional",
  "body": "Conteudo principal",
  "foundation_type": "methodological",
  "foundation_reference": "Referencia opcional",
  "status": "draft"
}

Regras:
- tenant_id vem do contexto do tenant ativo, nunca do client
- version nasce em 1
- created_by e updated_by devem refletir auth.uid
- se status nao vier, usar draft

Exemplo de resposta:
{
  "item": {
    "id": "uuid",
    "tenant_id": "uuid",
    "domain": "organizational",
    "category": "sst",
    "title": "Titulo",
    "summary": "Resumo opcional",
    "body": "Conteudo principal",
    "foundation_type": "methodological",
    "foundation_reference": "Referencia opcional",
    "status": "draft",
    "version": 1
  }
}

### 4. PATCH /api/knowledge-items/{id}
Objetivo:
- atualizar item existente do tenant atual

Permissao inicial:
- owner
- admin

Body permitido:
- domain
- category
- title
- summary
- body
- foundation_type
- foundation_reference
- status

Regras:
- tenant_id nunca pode ser alterado
- id nunca pode ser alterado
- deleted_at e deleted_by nao entram por PATCH comum
- updated_by deve refletir auth.uid
- version sobe +1 a cada alteracao bem sucedida

Exemplo de resposta:
{
  "item": {
    "id": "uuid",
    "version": 2,
    "status": "approved"
  }
}

### 5. DELETE /api/knowledge-items/{id}
Objetivo:
- soft delete de item do tenant atual

Permissao inicial:
- owner
- admin

Comportamento:
- nao apaga fisicamente
- preenche deleted_at
- preenche deleted_by
- retorna sucesso idempotente

Exemplo de resposta:
{
  "ok": true
}

## Regras de erro

### 401
- sem autenticacao

### 403
- sem permissao de role para a operacao

### 404
- item inexistente
- item de outro tenant
- item ja excluido logicamente

### 400
- body invalido
- domain invalido
- status invalido
- category vazia
- title vazio
- body vazio

## Regras de validacao

domain permitido:
- organizational
- governmental

status permitido:
- draft
- approved
- archived

title:
- obrigatorio
- sem string vazia

category:
- obrigatorio
- sem string vazia

body:
- obrigatorio
- sem string vazia

foundation_type:
- opcional
- livre neste primeiro ciclo, mas sugerido:
  - legal
  - methodological
  - policy
  - technical
  - procedural

## Regras de seguranca da API
- nunca aceitar tenant_id do client
- sempre resolver tenant por contexto canonico do projeto
- sempre operar dentro do tenant ativo
- nunca devolver item de outro tenant
- nunca permitir alterar tenant_id
- nunca usar service_role no client

## Criterios de pronto da camada HTTP
- [x] contrato de listagem
- [x] contrato de detalhe
- [x] contrato de criacao
- [x] contrato de edicao
- [x] contrato de soft delete
- [x] regras de erro definidas
- [x] regras de validacao definidas
- [ ] rota implementada
- [ ] smoke test implementado
- [ ] prova de isolamento cross-tenant da rota
