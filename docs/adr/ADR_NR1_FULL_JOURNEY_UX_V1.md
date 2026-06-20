# ADR NR1 — Jornada UX Completa do GRO/PGR

## Status

Aprovado como diretriz de produto e UX.

## Contexto

O módulo NR-1 do icanHelp evoluiu bem na parte de diagnóstico da atividade, especialmente nas etapas:

1. Como o trabalho acontece.
2. Sinais organizacionais observados.
3. Revisar sinais e evidências.

Essas etapas agora estão mais coerentes, com linguagem humana, ajuda contextual e menor risco de induzir diagnóstico clínico.

Entretanto, a análise mostrou que a experiência atual ainda começa tarde demais na jornada. O usuário pode chegar ao mapeamento da rotina antes de perceber claramente que, para GRO/PGR, primeiro é necessário organizar a base da empresa.

## Problema

A jornada não pode começar diretamente pelo diagnóstico da rotina.

Antes de mapear atividade, sinais, riscos ou inventário, o sistema precisa garantir que a empresa tenha passado por uma base mínima:

- empresa;
- estabelecimento/unidade;
- setores;
- atividades.

Sem isso, o usuário pode preencher sinais e rotina sem uma estrutura confiável para gerar inventário, plano de ação e rastreabilidade.

## Decisão

O workspace NR-1 deve passar a ser uma jornada completa em blocos, com portões de avanço.

A sequência oficial passa a ser:

1. Entrada da jornada NR-1.
2. Cadastro da empresa.
3. Cadastro do estabelecimento ou unidade.
4. Cadastro de setores.
5. Cadastro de atividades.
6. Como o trabalho acontece.
7. Sinais, perigos ou fatores observados.
8. Evidências, exposição e grupos expostos.
9. Revisão antes do risco.
10. Risco preliminar.
11. Plano de ação.
12. Inventário/PGR consolidado.

## Regra central de UX

O usuário deve ver pouco por vez.

O sistema deve organizar a complexidade por trás.

A interface não deve apresentar um formulário gigante de GRO/PGR.

Cada bloco deve responder a uma pergunta principal:

> O que o usuário precisa fazer agora?

## Modelo visual recomendado

A tela principal da jornada NR-1 deve ser composta por quatro regiões:

### 1. Topo

Contexto atual:

- nome da empresa;
- unidade atual;
- status da jornada;
- próxima melhor ação.

### 2. Mapa lateral da jornada

Exemplo:

- Empresa;
- Unidade;
- Setores;
- Atividades;
- Rotina;
- Sinais;
- Evidências;
- Riscos;
- Plano;
- PGR.

Cada item deve ter estado visual:

- não iniciado;
- em andamento;
- concluído;
- precisa revisar;
- bloqueado.

### 3. Área central

A área central deve mostrar apenas o bloco ativo.

Exemplos:

- cadastro da empresa;
- cadastro da unidade;
- criação de setor;
- atividade;
- rotina real;
- sinais observados;
- revisão de evidências.

### 4. Resumo lateral ou rodapé

Resumo curto:

- salvo há pouco;
- pendências;
- próximo passo;
- botão continuar;
- botão salvar e sair.

## Camadas de informação

Cada bloco deve separar a informação em três camadas:

### Camada 1 — Essencial agora

Campos mínimos para avançar.

### Camada 2 — Complementar

Informações opcionais ou que podem ser preenchidas depois.

### Camada 3 — Ajuda e evidência

Exemplos, orientações, fundamentos e anexos, sempre recolhidos ou sob demanda.

## Portões de avanço

O usuário só deve avançar quando o bloco anterior tiver base mínima.

### Bloco 0 — Entrada

Não coleta tudo. Apenas explica a jornada.

Objetivo:

- orientar;
- reduzir medo;
- explicar o que será necessário;
- deixar claro que riscos e dados médicos não serão pedidos agora.

### Bloco 1 — Empresa

Coleta identidade da empresa:

- razão social;
- nome fantasia;
- CNPJ;
- porte;
- CNAE principal;
- CNAEs secundários;
- responsável legal;
- contato principal.

### Bloco 2 — Unidade ou estabelecimento

Coleta onde o trabalho acontece:

- nome da unidade;
- tipo de unidade;
- endereço;
- cidade/UF;
- quantidade aproximada de pessoas;
- funcionamento geral;
- trabalho externo, remoto, híbrido ou terceiros.

### Bloco 3 — Setores

Organiza a estrutura interna:

- setores;
- responsáveis;
- quantidade aproximada de pessoas;
- interação com público, terceiros ou outras áreas.

### Bloco 4 — Atividades

Define o que será analisado:

- nome da atividade;
- setor vinculado;
- quem executa;
- onde executa;
- frequência;
- ferramentas, sistemas, máquinas, público, terceiros.

### Bloco 5 — Como o trabalho acontece

Começa o diagnóstico da atividade.

Não deve aparecer antes da empresa, unidade, setor e atividade estarem minimamente definidos.

### Bloco 6 — Sinais observados

Identifica sinais, perigos ou fatores da organização do trabalho.

Não é diagnóstico clínico.

Não coleta CID, prontuário, nomes ou sintomas individuais.

### Bloco 7 — Evidências e exposição

Revisa:

- grupo exposto;
- quantidade aproximada;
- frequência;
- duração;
- evidências;
- registros;
- relatos agregados;
- documentos.

### Bloco 8 — Revisão antes do risco

Antes de risco preliminar, o sistema deve perguntar:

- há evidência suficiente?
- falta informação?
- precisa voltar?
- há assédio, violência ou risco grave que exige escalonamento?
- o registro é ocupacional e não clínico?

### Bloco 9 — Risco preliminar

O sistema pode sugerir risco, mas não deve consolidar automaticamente como inventário definitivo.

### Bloco 10 — Plano de ação

Cada medida deve estar vinculada a risco, evidência ou achado.

Campos mínimos:

- medida;
- responsável;
- prazo;
- forma de acompanhamento;
- evidência esperada.

### Bloco 11 — Inventário/PGR

Só aparece ao final da jornada, quando houver base suficiente.

O inventário não deve ser primeira tela nem ação precoce.

## Comparação com o estado atual

O estado atual está bom como módulo de diagnóstico, mas ainda não representa a jornada completa.

### Atual

- workspace;
- próxima melhor ação;
- abrir mapeamento;
- rotina real;
- sinais observados;
- revisão.

### Necessário

- jornada completa;
- cadastro-base antes do diagnóstico;
- mapa lateral com blocos;
- bloqueio progressivo;
- inventário apenas após evidência e risco preliminar.

## Decisão prática

O diagnóstico atual deve ser preservado, mas reposicionado dentro de uma jornada maior.

O botão "Abrir mapeamento" não deve ser a primeira ação para empresa nova.

Para empresa nova, a primeira ação deve ser:

> Começar cadastro da empresa.

Para empresa com base mínima pronta, a próxima ação pode ser:

> Mapear rotina da atividade.

## Critério de sucesso

A jornada estará correta quando uma empresa leiga entender:

1. Primeiro organizo a empresa.
2. Depois organizo unidade, setores e atividades.
3. Depois descrevo como o trabalho acontece.
4. Depois identifico sinais.
5. Depois reviso evidências.
6. Só depois o sistema sugere riscos e consolida o PGR.

## Restrições técnicas

Esta decisão não autoriza alteração de banco, RLS, Auth, APIs, tenant_id ou variáveis de ambiente.

Qualquer alteração de schema deve ser precedida por Data Discovery.

Qualquer implementação deve preservar isolamento multi-tenant, RLS e rastreabilidade.

## Próximas ações recomendadas

1. Revisar o Bloco 0 — Entrada da jornada.
2. Revisar o Bloco 1 — Cadastro da empresa.
3. Revisar o Bloco 2 — Unidade ou estabelecimento.
4. Revisar o Bloco 3 — Setores.
5. Revisar o Bloco 4 — Atividades.
6. Só depois reposicionar o diagnóstico atual dentro da jornada completa.

## Decisão final

A UX oficial do módulo NR-1 passa a ser uma jornada guiada em blocos, com portões de avanço, ajuda contextual e inventário apenas no final.

O sistema deve parecer simples para o usuário e robusto por trás.