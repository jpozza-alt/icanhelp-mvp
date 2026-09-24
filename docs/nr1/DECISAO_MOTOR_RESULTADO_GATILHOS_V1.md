# DECISAO DE PRODUTO E ARQUITETURA - MOTOR DE RESULTADO DOS GATILHOS V1

Data: 23/09/2026

## 1. Objetivo

Definir as regras da primeira versao do motor que transforma respostas de aprofundamento de uma investigacao de gatilho em resultado sugerido.

O motor nao cria risco.

O motor produz uma sugestao tecnica intermediaria que permanece sujeita a validacao humana e, quando aplicavel, validacao tecnica.

---

## 2. Principio central

Nao utilizar pontuacao numerica arbitraria.

Os documentos funcionais atuais nao definem pesos ou pontos oficiais para as respostas.

A classificacao deve considerar o significado das perguntas, incluindo:

- exposicao;
- frequencia;
- intensidade;
- falhas de organizacao;
- controles existentes;
- eficacia dos controles;
- ocorrencias;
- evidencias;
- possiveis danos;
- sinais criticos.

Nao classificar risco apenas pela quantidade de respostas SIM ou NAO.

---

## 3. Separacao entre processo e resultado

### Estado do processo

investigation_status deve representar o andamento da investigacao.

Estados utilizados nesta fase:

- in_investigation;
- saved_draft;
- completed;
- converted_to_risk;
- archived.

### Resultado tecnico

suggested_result deve representar a conclusao sugerida.

Valores:

- no_relevant_indication;
- attention_point;
- possible_risk_factor;
- suggested_risk.

### Sinalizadores independentes

- technical_validation_required;
- critical_alert_required.

---

## 4. Investigacao incompleta

Uma investigacao somente pode ser avaliada quando todas as perguntas obrigatorias estiverem respondidas.

Pergunta yes_no aceita:

- yes;
- no;
- unknown.

Pergunta text exige texto nao vazio.

Enquanto houver pergunta obrigatoria sem resposta:

- manter investigation_status como saved_draft ou in_investigation;
- nao gerar suggested_result definitivo;
- nao gerar risco;
- nao gerar plano de acao.

---

## 5. Resposta desconhecida

A resposta:

unknown

significa que a pergunta foi apresentada, mas a informacao necessaria nao esta disponivel.

Quando a informacao desconhecida for relevante para a classificacao:

- technical_validation_required = true;
- suggested_result permanece o resultado tecnico derivado das respostas disponiveis;
- nenhuma conversao automatica em risco deve ocorrer.

---

## 6. Caso critico: assedio ou violencia

O gatilho:

harassment_or_violence

deve sempre receber tratamento especial.

Quando a investigacao for aberta e confirmada no fluxo:

- technical_validation_required = true;
- critical_alert_required = true;
- suggested_result permanece um dos quatro resultados tecnicos oficiais;
- nao concluir automaticamente como resolvido;
- nao criar risco automaticamente;
- exigir encaminhamento/revisao competente.

Se houver risco imediato, ameaca, agressao, violencia ou necessidade de protecao imediata:

- critical_alert_required = true;
- suggested_result permanece o resultado tecnico derivado das dimensoes avaliadas.

---

## 7. Outros sinais criticos

Devem provocar bloqueio de conclusao automatica quando presentes, conforme aplicavel:

- ameaca;
- agressao fisica;
- violencia;
- risco imediato;
- necessidade de protecao imediata;
- assedio ou indicio relevante de assedio;
- cobranca agressiva ou humilhante em contexto sensivel;
- perigo evidente sem controle;
- outro cenario sensivel previsto pela regra oficial.

Nesses casos:

- technical_validation_required = true;

e, quando houver situacao critica:

- critical_alert_required = true.

---

## 8. Interpretacao das respostas

Cada pergunta yes_no deve possuir uma interpretacao explicita.

Uma resposta pode representar:

- indicador desfavoravel quando YES;
- indicador desfavoravel quando NO;
- informacao contextual;
- controle existente;
- evidencia ou historico;
- sinal critico.

Exemplo:

"Ha horas extras frequentes?"

YES = indicador desfavoravel.

"Os prazos costumam ser possiveis de cumprir?"

NO = indicador desfavoravel.

"Existe protocolo para situacoes dificeis?"

NO = falha de controle.

"Nao sei / precisa verificar"

= informacao insuficiente.

Esta interpretacao deve ser definida por pergunta na politica do motor.

---

## 9. Resultado: sem indicio relevante

suggested_result:

no_relevant_indication

Somente quando:

- investigacao estiver completa;
- nao houver indicador desfavoravel relevante;
- nao houver sinal critico;
- nao houver informacao essencial desconhecida;
- respostas indicarem condicoes e controles adequados.

Isto nao significa ausencia permanente de risco.

Significa apenas:

"Sem indicio relevante no momento com base nas informacoes registradas."

---

## 10. Resultado: ponto de atencao

suggested_result:

attention_point

Usar quando houver indicacao desfavoravel limitada ou isolada, sem conjunto suficiente para sugerir fator de risco.

Exemplos conceituais:

- uma fragilidade de organizacao;
- controle parcialmente inadequado;
- situacao que merece acompanhamento;
- sinal ainda sem evidencia ou recorrencia suficiente.

Nao criar risco automaticamente.

---

## 11. Resultado: possivel fator de risco

suggested_result:

possible_risk_factor

Usar quando as respostas mostrarem conjunto coerente de condicoes desfavoraveis que justifique aprofundamento ou avaliacao.

Pode considerar combinacoes como:

- exposicao relevante;
- frequencia ou duracao relevante;
- falha de controle;
- queixas, ocorrencias ou impactos;
- contexto consistente com o fator investigado.

Ainda nao equivale a risco confirmado.

---

## 12. Resultado: risco sugerido

suggested_result:

suggested_risk

Somente utilizar quando a investigacao completa demonstrar, de forma coerente:

1. condicao potencialmente nociva relevante;
2. exposicao ou recorrencia relevante;
3. controles ausentes, insuficientes ou ineficazes;
4. suporte contextual, evidencia ou historico suficiente;
5. ausencia de impedimento por dados insuficientes ou contraditorios.

O resultado continua sendo apenas sugestao.

Deve existir confirmacao humana antes de conversao em risco.

Quando a regra exigir validacao tecnica, a conversao permanece bloqueada.

---

## 13. Resultado: pendente de validacao tecnica

sinalizador independente:

technical_validation_required = true

Aplicar quando houver:

- dados insuficientes relevantes;
- resposta unknown em ponto essencial;
- respostas contraditorias;
- ausencia de evidencia minima quando necessaria;
- risco potencial alto;
- cenario psicossocial complexo;
- situacao sensivel;
- necessidade de avaliacao ergonomica ou tecnica especifica;
- outro caso definido pela regra oficial.

technical_validation_required = true.

---

## 14. Resultado: alerta critico

sinalizador independente:

critical_alert_required = true

Aplicar quando houver indicio de:

- ameaca;
- agressao;
- violencia;
- assedio grave;
- risco imediato;
- pessoa ou grupo necessitando protecao imediata;
- perigo evidente sem controle.

Nestes casos:

- technical_validation_required = true;
- critical_alert_required = true;
- bloquear conclusao automatica;
- bloquear conversao automatica em risco;
- apresentar orientacao de encaminhamento/revisao competente.

---

## 15. Evidencia e contexto

Nao considerar um simples checkbox ou resposta isolada como evidencia suficiente.

O motor deve distinguir:

- resposta do usuario;
- evidencia documental ou registro;
- historico de ocorrencias;
- controle existente;
- avaliacao tecnica;
- informacao ainda nao verificada.

A existencia de resposta afirmativa nao transforma automaticamente o item em risco.

---

## 16. Contradicoes

Quando houver respostas logicamente contraditorias relevantes, o sistema nao deve tentar resolver a contradicao por pontuacao.

Deve:

- sinalizar inconsistencia;
- technical_validation_required = true;
- suggested_result permanece o resultado tecnico derivado das respostas disponiveis.

---

## 17. Persistencia do resultado

Depois de uma avaliacao valida, salvar na investigacao, conforme aplicavel:

- investigation_status = completed;
- suggested_result;
- suggested_severity;
- suggested_probability;
- suggested_priority;
- technical_validation_required;
- critical_alert_required;
- campos derivados que possuam base nas respostas.

Nao preencher campo derivado sem base suficiente.

---

## 18. Auditoria

A avaliacao deve registrar, quando aplicavel:

- trigger_investigation_completed;
- trigger_result_suggested;
- technical_validation_required;
- critical_alert_generated.

A trilha deve permitir identificar:

- investigacao;
- usuario;
- tenant;
- estabelecimento;
- resultado anterior;
- resultado novo;
- momento da avaliacao.

---

## 19. Conversao em risco

O motor desta fase nao cria nr1_risks.

Fluxo:

investigacao concluida
→ resultado sugerido
→ revisao humana
→ validacao tecnica quando obrigatoria
→ conversao posterior em risco.

---

## 20. Regra de seguranca da V1

Na duvida, o motor deve preferir:

- manter investigacao aberta;
- marcar ponto de atencao;
- indicar possivel fator de risco;
- ou exigir validacao tecnica;

em vez de confirmar risco automaticamente.

---

## 21. Proxima etapa tecnica

A implementacao deve criar uma politica de interpretacao por pergunta contendo, quando aplicavel:

- adverse_when;
- control_question;
- evidence_question;
- critical_when;
- technical_validation_when;
- contextual_only.

Somente depois dessa politica por pergunta deve ser implementada a funcao de avaliacao do resultado.


