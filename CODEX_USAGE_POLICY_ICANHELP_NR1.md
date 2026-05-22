# Codex Usage Policy - icanHelp NR1

## Decisao operacional

Codex deve ser usado sempre que puder acelerar o trabalho sem reduzir qualidade ou comprometer seguranca.

Regra central:

Codex acelera. PowerShell controla. ChatGPT valida. Usuario executa uma acao por vez.

## Uso permitido do Codex

Codex pode ser usado para:

- analisar arquivos;
- revisar UX;
- revisar microcopy;
- revisar classes visuais;
- localizar problemas;
- sugerir microciclos;
- gerar diff candidato;
- explicar riscos de uma alteracao;
- propor patches pequenos e localizados.

## Uso proibido do Codex sem etapa propria

Codex nao deve:

- alterar banco;
- alterar RLS;
- alterar auth;
- alterar tenant;
- alterar .env;
- pedir JWT, senha, e-mail ou segredo;
- imprimir segredo;
- executar migration;
- criar tabela;
- fazer commit;
- fazer push;
- fazer deploy;
- alterar dados reais de cliente;
- agir sobre arvore git suja sem autorizacao expressa.

## Fluxo obrigatorio

1. Codex analisa ou rascunha.
2. O resultado do Codex e colado no chat.
3. ChatGPT converte em um unico script PowerShell.
4. O script gera evidencia em _debug.
5. O script retorna STATUS=PASS ou STATUS=FAIL.
6. So depois de validado pode haver commit.
7. So depois do commit pode haver push.
8. Deploy explicito somente se solicitado.

## Regra para arvore suja

Se houver alteracao pendente no Git, nao usar Codex para novas edicoes.

Primeiro deve-se:

1. validar o patch atual;
2. commitar ou reverter;
3. confirmar arvore limpa;
4. somente entao voltar ao Codex.

## Escopo preferencial no modulo NR1

Uso preferencial do Codex:

- app/dashboard/nr1/workspace/page.tsx;
- UX visual;
- microcopy;
- reducao de linguagem tecnica;
- organizacao de fluxo;
- sugestao de microciclos pequenos;
- auditoria de qualidade antes de patch.

## Garantia de qualidade

Nenhuma sugestao do Codex entra direto no projeto.

Toda sugestao precisa passar por:

- leitura critica;
- patch PowerShell controlado;
- validacao;
- diff check;
- commit separado;
- push separado;
- closeout quando aplicavel.

## Decisao resumida

Usar Codex sempre que possivel para ganhar velocidade, mas nunca como executor autonomo de mudancas sensiveis.