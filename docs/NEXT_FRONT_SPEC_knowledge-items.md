# NEXT FRONT SPEC - knowledge-items

Data de abertura: 2026-04-11 03:04:17

## Decisao oficial desta frente
O modulo knowledge-items nasce como tronco comum de conhecimento governado do ICANHELP.
Ele nao nasce amarrado apenas ao governo.
Ele deve servir a duas frentes de negocio:

1. uso inicial: organizacional
2. uso futuro: governamental

## Objetivo do modulo
Criar a base tenant-scoped de conhecimento governado, com seguranca, versao, status, autoria e trilha, para suportar diferentes dominios do produto sem retrabalho estrutural.

## Leitura arquitetural
O knowledge-items deve funcionar como tronco comum.
As especializacoes de negocio devem nascer por cima dele, e nao dentro dele de forma rigida.

Tronco comum:
- tenant_id
- RLS
- RBAC via tenant_memberships
- status
- versionamento
- autoria
- trilha
- dominio
- categoria
- conteudo governado
- fundamento

Galho 1:
- organizacional
- psicologia organizacional
- SST
- clima
- pessoas e cultura
- protocolos internos
- acoes recomendadas
- checklists
- medidas preventivas

Galho 2:
- governo
- tecnico-juridico
- atendimento guiado
- respostas padronizadas
- interpretacao normativa
- fundamento legal
- encaminhamento administrativo

## Requisitos nao negociaveis
1. Toda tabela core deve ter tenant_id
2. RLS obrigatorio
3. Nenhuma rota pode bypassar tenant
4. service_role nunca no client
5. Toda alteracao relevante deve deixar trilha
6. Toda validacao deve gerar evidencia em _debug
7. PowerShell-first
8. Toda saida segura do produto deve permitir fundamento + versao + trilha
9. O modulo nao pode nascer amarrado a um unico dominio
10. O uso inicial organizacional nao pode impedir uso futuro governamental

## Hipotese de valor
Esse modulo prepara o cerebro governado do produto.
Sem ele, o sistema fica seguro, mas ainda sem a base de conhecimento controlada que abastece os fluxos inteligentes.

## Nome tecnico do modulo
knowledge-items

## Definicao funcional
Knowledge item = item governado de conhecimento pertencente a um tenant, com dominio, categoria, conteudo, fundamento, status, versao e trilha de alteracao.

## Uso inicial previsto
organizacional

Exemplos:
- orientacao de lideranca
- acao recomendada de SST
- checklist de revisao
- encaminhamento GRO
- medida preventiva
- protocolo interno
- resposta padrao de psicologia organizacional
- fundamento metodologico Pasini

## Uso futuro previsto
governamental

Exemplos:
- resposta padronizada de atendimento
- fundamento legal
- interpretacao normativa
- fluxo administrativo
- encaminhamento tecnico
- roteiro de triagem
- resposta institucional por assunto

## Campos base sugeridos
- id
- tenant_id
- domain
- category
- title
- summary
- body
- foundation_type
- foundation_reference
- status
- version
- created_at
- created_by
- updated_at
- updated_by
- deleted_at
- deleted_by

## Campos importantes de flexibilidade
domain:
- organizational
- governmental

category:
- livre por tenant ou controlada por catalogo futuro

foundation_type:
- legal
- methodological
- policy
- technical
- procedural

## Status minimo sugerido
- draft
- approved
- archived

## Contrato funcional minimo
Quem pode criar:
- owner
- admin
- member, se aprovado no desenho final

Quem pode listar:
- membros do tenant conforme RLS

Quem pode ver detalhe:
- membros do tenant conforme RLS

Quem pode editar:
- owner
- admin
- regra futura opcional para autor

Quem pode excluir:
- preferencialmente soft delete
- owner/admin
- evitar delete fisico no inicio

## Contrato tecnico minimo
Tabela alvo:
- public.knowledge_items

Obrigatorio:
- tenant_id
- indices por tenant_id
- RLS habilitado
- policies alinhadas ao padrao canonico do projeto
- soft delete
- auditoria basica
- smoke PowerShell
- evidencia em _debug

## Checklist arquitetural
- [x] modulo definido
- [x] tronco comum definido
- [x] uso inicial organizacional definido
- [x] uso futuro governamental definido
- [ ] tabela definida
- [ ] migration definida
- [ ] policies RLS definidas
- [ ] rota GET definida
- [ ] rota POST definida
- [ ] rota PATCH definida
- [ ] rota DELETE definida
- [ ] smoke PowerShell definido
- [ ] criterio PASS/FAIL definido

## Fora de escopo nesta abertura
- codar migration agora
- codar API agora
- reabrir troubleshooting antigo
- reativar scripts quarentenados
- especializar excessivamente o schema para um unico dominio

## Decisao de continuidade
Toda proxima implementacao deste modulo deve preservar o tronco comum e priorizar primeiro o uso organizacional, sem bloquear a convergencia futura para o governamental.
