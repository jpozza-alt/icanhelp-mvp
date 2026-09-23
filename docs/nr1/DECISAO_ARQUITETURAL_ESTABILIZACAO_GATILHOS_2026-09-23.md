# DECISAO ARQUITETURAL - ESTABILIZACAO DO FLUXO DE GATILHOS NR-1

Data: 23/09/2026

## 1. Objetivo

Registrar as decisoes arquiteturais tomadas apos a revisao critica do fluxo de Diagnostico Guiado, investigacao de gatilhos, classificacao e geracao de riscos do modulo NR-1.

Estas decisoes devem orientar as proximas implementacoes e evitar a existencia de caminhos paralelos ou contraditorios para classificacao de risco.

---

## 2. Regra central preservada

Gatilho nao e risco.

Gatilho abre investigacao.

Investigacao produz resultado sugerido.

Resultado sensivel exige validacao tecnica.

Somente depois das validacoes aplicaveis pode haver conversao em risco.

Plano de acao nao deve ser criado automaticamente a partir de gatilho ou investigacao incompleta.

---

## 3. Fluxo oficial do produto

O fluxo funcional oficial passa a ser:

GATILHO
→ INVESTIGACAO
→ RESPOSTAS DE APROFUNDAMENTO
→ RESULTADO SUGERIDO
→ VALIDACAO HUMANA
→ VALIDACAO TECNICA, QUANDO OBRIGATORIA
→ CONVERSAO EM RISCO
→ INVENTARIO
→ PLANO DE ACAO

Nenhuma etapa posterior deve contornar uma etapa obrigatoria anterior.

---

## 4. Servidor como fonte canonica

O servidor deve ser a fonte canonica das regras do fluxo.

O navegador nao deve controlar metadados funcionais que possam ser derivados pelo servidor.

### Abertura da investigacao

O cliente deve enviar apenas os dados necessarios para identificar o contexto e o tipo de gatilho.

O servidor deve definir:

- trigger_label;
- regras associadas ao trigger_type;
- estado inicial;
- mensagem oficial;
- eventos de auditoria.

### Respostas da investigacao

O cliente deve enviar apenas:

- identification/contexto;
- question_key;
- answer_value;
- answer_json, quando aplicavel.

O servidor deve derivar da matriz oficial:

- question_label;
- answer_order;
- is_required;
- tipo da pergunta;
- valores de resposta permitidos.

Perguntas que nao pertencam ao gatilho da investigacao devem ser rejeitadas.

---

## 5. Matriz unica de gatilhos

A matriz oficial compartilhada deve ser a unica fonte funcional para:

- tipos de gatilho;
- rotulos;
- perguntas iniciais;
- perguntas de aprofundamento;
- tipo da resposta;
- obrigatoriedade;
- caracteristica critica do gatilho.

Nao manter listas paralelas de gatilhos em rotas ou componentes quando a informacao puder ser obtida da matriz oficial.

Arquivo canonico atual:

src/lib/nr1-trigger-investigation-matrix.ts

---

## 6. Bloqueio de geracao prematura de risco

O sistema nao deve permitir a geracao de risco sugerido quando houver investigacao obrigatoria ainda:

- nao iniciada;
- em investigacao;
- salva como rascunho;
- incompleta;
- pendente de validacao tecnica;
- com alerta critico nao tratado.

A Etapa de geracao de risco deve verificar o estado das investigacoes antes de permitir continuidade.

O fluxo antigo de geracao de risco nao pode contornar esta regra.

---

## 7. Relacao entre gatilho e fator psicossocial

Gatilho e fator de risco nao sao equivalentes.

### Gatilho

Caracteristica, condicao ou sinal que exige aprofundamento.

Exemplos:

- metas e cobranca por prazo;
- atendimento ao publico;
- trabalho remoto;
- conflitos;
- acumulo de tarefas.

### Fator observado ou resultado

Conclusao obtida depois da investigacao.

Exemplos:

- sobrecarga;
- pressao excessiva;
- baixa autonomia;
- falha de suporte;
- contato hostil;
- isolamento;
- falha de comunicacao.

Os atuais fatores psicossociais nao devem funcionar como caminho independente que permita criar risco sem passar pela investigacao aplicavel.

A interface deve deixar clara essa diferenca.

---

## 8. Estado do processo separado do resultado tecnico

Nao misturar estado de fluxo com resultado da investigacao.

### Estado do processo

Valores conceituais:

- not_started;
- in_investigation;
- saved_draft;
- completed;
- reviewed;
- converted_to_risk;
- archived.

### Resultado tecnico

Valores conceituais:

- no_relevant_indication;
- attention_point;
- possible_risk_factor;
- suggested_risk.

### Sinalizadores independentes

Manter separadamente:

- technical_validation_required;
- critical_alert_required.

A implementacao futura deve convergir para essa separacao, aproveitando o campo suggested_result ja previsto na modelagem.

---

## 9. Validacao tecnica obrigatoria

A conclusao automatica deve ser bloqueada quando houver situacoes como:

- assedio;
- violencia;
- ameaca;
- agressao;
- risco imediato;
- dados insuficientes;
- respostas contraditorias;
- ausencia de evidencia minima;
- risco alto ou complexo;
- outros cenarios definidos pela regra oficial.

Casos sensiveis devem permanecer pendentes ate revisao competente.

---

## 10. Arquitetura da interface

O arquivo:

app/dashboard/nr1/workspace/page.tsx

nao deve continuar recebendo toda a logica do modulo.

A investigacao de gatilhos deve ser progressivamente extraida para unidades proprias.

Estrutura desejada:

- TriggerInvestigationPanel.tsx
  - apresentacao da investigacao;

- useTriggerInvestigations.ts
  - estado e orquestracao da interface;

- nr1-trigger-investigation-client.ts
  - comunicacao com as APIs;

- nr1-trigger-investigation-matrix.ts
  - regras canonicas e perguntas;

- modulo futuro de classificacao
  - processamento de respostas e resultado sugerido.

A extracao deve ser incremental e sem reescrita desnecessaria da jornada existente.

---

## 11. Auditoria

Devem continuar sendo registrados eventos relevantes, incluindo:

- trigger_marked_yes;
- official_message_shown;
- trigger_investigation_started;
- trigger_question_answered;
- trigger_investigation_saved;
- trigger_investigation_completed;
- trigger_result_suggested;
- technical_validation_required;
- critical_alert_generated;
- investigation_converted_to_risk.

A persistencia do dado principal e da auditoria deve, futuramente, buscar atomicidade transacional quando tecnicamente viavel.

---

## 12. Multi-tenant e seguranca

Permanecem obrigatorias:

- tenant_id em entidades do modulo;
- RLS;
- validacao de estabelecimento;
- cliente autenticado;
- ausencia de service_role nas rotas normais;
- integridade referencial multi-tenant;
- auditoria por usuario;
- proibicao de confiar em metadados funcionais enviados pelo navegador.

---

## 13. Ordem de implementacao aprovada

### Fase 1 - Estabilizacao

1. simplificar contratos das APIs;
2. tornar servidor fonte canonica;
3. bloquear geracao de risco com investigacao incompleta;
4. eliminar caminhos paralelos entre gatilhos e fatores;
5. extrair logica de investigacao do workspace principal.

### Fase 2 - Motor de resultado

Implementar:

respostas
→ campos derivados
→ resultado sugerido
→ alerta/validacao tecnica
→ confirmacao humana
→ risco.

### Fase 3 - Integracao posterior

Somente depois:

- conversao para inventario;
- vinculacao ao plano de acao;
- evidencias;
- relatorios;
- indicadores.

---

## 14. Decisao de continuidade

A base atual deve ser aproveitada.

Nao refazer:

- tabelas ja modeladas;
- APIs de investigacao;
- API de respostas;
- trilha de auditoria;
- matriz de perguntas;
- interface inicial de investigacao.

A prioridade passa a ser integrar e estabilizar essas partes antes de adicionar novas funcionalidades.

---

## 15. Regra de controle de escopo

Enquanto a Fase 1 nao estiver concluida:

- nao implementar classificacao automatica completa;
- nao criar nova conversao automatica em risco;
- nao criar plano de acao automatico;
- nao adicionar novo caminho paralelo de diagnostico;
- nao aumentar a logica do workspace quando puder ser extraida.

Esta decisao prevalece como orientacao arquitetural para o bloco de investigacao de gatilhos NR-1.
