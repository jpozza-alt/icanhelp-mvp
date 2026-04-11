# KNOWLEDGE ITEMS TABLE CONTRACT

Data de geracao: 2026-04-11 03:05:15

## Objetivo
Definir o contrato tecnico minimo da tabela public.knowledge_items antes da migration.
Este documento existe para evitar retrabalho, vazamento entre tenants e modelagem torta logo no nascimento.

## Tabela alvo
public.knowledge_items

## Papel da tabela
Armazenar itens governados de conhecimento por tenant, com tronco comum multi-dominio.
Uso inicial: organizacional
Uso futuro: governamental

## Estrutura base proposta

### 1. Identidade
- id uuid primary key default gen_random_uuid()

### 2. Escopo de tenant
- tenant_id uuid not null

### 3. Classificacao funcional
- domain text not null
- category text not null

### 4. Conteudo
- title text not null
- summary text null
- body text not null

### 5. Fundamento
- foundation_type text null
- foundation_reference text null

### 6. Governanca
- status text not null default 'draft'
- version integer not null default 1

### 7. Auditoria
- created_at timestamptz not null default now()
- created_by uuid null
- updated_at timestamptz not null default now()
- updated_by uuid null
- deleted_at timestamptz null
- deleted_by uuid null

## Regras de modelagem

### tenant_id
Obrigatorio em toda linha.
Nenhum item existe fora de tenant.

### domain
Valores iniciais esperados:
- organizational
- governmental

Nao criar dependencia excessiva agora.
Pode ser texto com check constraint.

### category
Mantida simples no inicio.
Texto livre controlado por aplicacao ou por convencao.
Nao criar tabela de catalogo agora.

### title
Obrigatorio.
Nome curto do item.

### summary
Resumo curto opcional para listagens.

### body
Conteudo principal governado do item.

### foundation_type
Sugestoes de valores:
- legal
- methodological
- policy
- technical
- procedural

### foundation_reference
Campo para citar lei, norma, metodologia, politica interna, manual, artigo ou referencia equivalente.

### status
Valores iniciais:
- draft
- approved
- archived

### version
Comeca em 1.
Aumenta em revisoes futuras.
Neste primeiro ciclo, manter versionamento simples.

### soft delete
Obrigatorio via:
- deleted_at
- deleted_by

Nao fazer delete fisico como caminho padrao no inicio.

## Constraints sugeridas

### Primary key
- pk_knowledge_items_id

### Foreign key tenant
- tenant_id -> public.tenants(id)

### Check domain
- domain in ('organizational','governmental')

### Check status
- status in ('draft','approved','archived')

### Check version
- version >= 1

## Indices minimos sugeridos
- index por tenant_id
- index por (tenant_id, domain)
- index por (tenant_id, status)
- index por (tenant_id, category)

## Regras de auditoria
- created_at default now()
- updated_at default now()
- updated_at deve ser atualizado em update
- created_by e updated_by devem existir no desenho, mesmo que parte do preenchimento venha da camada server
- deleted_at e deleted_by devem registrar arquivamento logico

## Regras de seguranca
1. RLS obrigatorio
2. Usuario so pode ver item do tenant ao qual pertence
3. Usuario so pode inserir item no tenant ao qual pertence
4. Usuario so pode alterar item do tenant ao qual pertence
5. Fluxo de permissao deve respeitar tenant_memberships
6. Nao usar bypass de tenant
7. Nao usar service_role no client

## Politica funcional inicial sugerida
Leitura:
- qualquer membro do tenant

Criacao:
- owner
- admin
- member, se o desenho final mantiver abertura operacional

Edicao:
- owner
- admin
- opcionalmente autor depois

Exclusao logica:
- owner
- admin

## Decisoes de simplicidade deste ciclo
Para nao travar o modulo logo no inicio, ficam fora da primeira migration:
- tabela separada de categorias
- historico completo de versoes em tabela filha
- anexos
- tags
- busca full text
- workflow complexo de aprovacao
- relacoes entre knowledge items

## Forma de uso inicial
Este modulo sera usado primeiro pela frente organizacional.
Portanto o schema nao pode exigir fundamento exclusivamente legal.
Ele precisa aceitar tambem fundamento metodologico, tecnico e procedimental.

## Forma de convergencia futura
No futuro, o mesmo schema deve suportar a frente governamental sem quebra estrutural.
Por isso:
- domain existe desde o inicio
- foundation_type nao e preso a legal
- category permanece flexivel
- body e foundation_reference permanecem genericos

## Pronto para proximo passo?
A tabela estara pronta para virar migration quando estas respostas forem verdadeiras:
- [x] tenant_id definido
- [x] campos base definidos
- [x] status definido
- [x] dominio definido
- [x] fundamento generico definido
- [x] soft delete definido
- [x] auditoria definida
- [x] constraints minimas definidas
- [x] indices minimos definidos
- [x] direcao de RLS definida
- [ ] SQL da migration escrito
- [ ] policies escritas
- [ ] rota escrita
- [ ] smoke test escrito
