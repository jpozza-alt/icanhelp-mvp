# ADR NR1 — Workspace em fluxo de módulo único

## Status

Aprovado para orientar o próximo redesenho de UX.

## Contexto

Durante validação manual do workspace NR-1, a tela cumpriu tecnicamente a jornada mínima:

- empresa cadastrada;
- estabelecimento cadastrado;
- setor cadastrado;
- atividade cadastrada;
- diagnóstico liberado.

Entretanto, a experiência ficou confusa para usuário leigo porque o workspace passou a exibir muitos blocos concorrentes no mesmo corpo da página.

A inspeção técnica `readonly_inspect_nr1_workspace_base_screen_clutter` confirmou alto acúmulo de elementos no arquivo `app/dashboard/nr1/workspace/page.tsx`, incluindo CTAs, mensagens, listas, recursos de plano, blocos de diagnóstico, cadastros e componentes de orientação coexistindo no mesmo fluxo.

## Problema

A tela atual mistura funções diferentes:

1. orientação da próxima ação;
2. status do PGR;
3. macrovisão da jornada;
4. checklist;
5. recursos do plano;
6. contexto ativo;
7. cadastros operacionais;
8. listas de registros;
9. diagnóstico;
10. etapas futuras de risco e plano.

Esses blocos podem ser úteis isoladamente, mas juntos competem pela atenção e reduzem a clareza da jornada.

## Decisão

O workspace NR-1 deve operar por **módulo único em foco**.

A tela principal deve responder apenas:

1. onde estou;
2. o que preciso fazer agora;
3. o que será liberado depois.

A cada momento deve existir:

- uma ação principal;
- uma etapa aberta;
- etapas futuras colapsadas ou bloqueadas;
- informações administrativas em área secundária.

## Regra de UX

Quando a base estiver pronta, o corpo principal do workspace deve mostrar somente:

1. contexto ativo compacto;
2. módulo atual;
3. etapa atual aberta;
4. próxima etapa colapsada/bloqueada;
5. feedback visível após salvar.

Tudo que não ajuda a concluir a etapa atual deve sair do corpo principal.

## Diretrizes consolidadas dos apontamentos

### PGR em construção

O card "PGR em construção / Ver resumo do PGR" não deve ficar destacado no topo do workspace.

Direção:

- mover para lateral;
- ou rodapé/final da jornada;
- ou área de PGR;
- não manter como card principal no início.

### Macroblocos da jornada

O bloco "A jornada em linguagem humana" não deve permanecer como seção grande e estática no meio do workspace.

Direção:

- transformar em trilha compacta;
- ou cabeçalho resumido;
- ou lateral;
- não ocupar o corpo operacional principal.

### Checklist inteligente

O checklist é importante, mas deve orientar o módulo atual.

Direção:

- destacar como guia funcional do módulo atual;
- evitar card solto no meio da rolagem;
- mostrar pendências reais vinculadas à etapa atual.

### Recursos do plano

O bloco "Recursos do plano" não deve aparecer no meio do fluxo operacional.

Direção:

- mover para área administrativa;
- ou lateral secundária;
- ou final da jornada;
- não interromper o fluxo GRO/PGR.

### Próxima melhor ação

A tela não deve repetir a mesma orientação em blocos diferentes.

Direção:

- manter uma única orientação principal;
- remover duplicidade entre "Próxima melhor ação" e chamadas equivalentes.

### Diagnóstico guiado da rotina real

O bloco precisa explicar melhor sua função.

Direção:

- deixar claro que serve para mapear a rotina real da atividade;
- explicar que os riscos vêm depois;
- evitar aparência de painel solto.

### Etapa 01 — Contexto do trabalho

A etapa é oportuna e deve permanecer como primeira etapa aberta do mapeamento.

Direção:

- manter visível;
- avaliar depois a qualidade das perguntas;
- preservar foco em trabalho real, não sintomas individuais.

### Etapa 02 — Fatores psicossociais

O conteúdo é oportuno, mas não deve aparecer aberto imediatamente.

Direção:

- aparecer depois da Etapa 01;
- ficar colapsado ou bloqueado até salvar contexto;
- preservar foco ocupacional.

### Etapa 03 — Inventário de riscos

Não deve aparecer aberta antes da conclusão da leitura.

Direção:

- ficar bloqueada/colapsada;
- liberar "Gerar risco preliminar" apenas depois de contexto e fatores salvos.

### Listas de empresas, setores e atividades

As listas inferiores não devem compor o workspace principal.

Direção:

- remover do fluxo principal;
- ou mover para área administrativa/gerencial;
- evitar exibição de registros antigos/testes no caminho do usuário final.

## Modelo alvo

### Topo compacto

- empresa ativa;
- unidade ativa;
- setor atual;
- atividade atual;
- progresso simples;
- status discreto.

### Corpo principal

Somente o módulo atual.

Exemplo para mapeamento:

1. Etapa 01 aberta: Contexto do trabalho;
2. Etapa 02 colapsada: Fatores do trabalho;
3. Etapa 03 bloqueada: Inventário de riscos.

### Lateral ou rodapé

- PGR em construção;
- trilha completa;
- recursos do plano;
- listas/cadastros;
- ações administrativas.

## Não objetivos

Esta decisão não altera:

- banco de dados;
- RLS;
- autenticação;
- tenant;
- APIs;
- regras legais da NR-1;
- lógica de isolamento multi-tenant.

## Próximo patch recomendado

Aplicar uma simplificação visual do workspace quando `isWorkspaceMode === true`:

1. ocultar/remover do corpo principal:
   - PGR em construção no topo;
   - macroblocos grandes;
   - recursos do plano;
   - CTAs duplicados;
   - listas inferiores;
   - Etapa 03 aberta antes da hora.

2. manter no corpo principal:
   - contexto ativo compacto;
   - módulo atual;
   - Etapa 01 aberta;
   - Etapa 02 colapsada;
   - Etapa 03 bloqueada.

3. tornar mensagens de sucesso visíveis:
   - feedback fixo ou próximo ao módulo atual;
   - sem depender da posição da rolagem.