# Documento de Análise — Prato Cheio

*Trabalho 1 · máximo 4 páginas · entrega na Aula 5*

## Problema central

## Incertezas

## Stakeholders

| Stakeholder | Interesse | Influência | O que espera |
|---|---|---|---|
| **Doadores** (restaurantes, padarias, mercados) | Escoar excedente e evitar desperdício, com possível ganho de imagem | Alta | Doar sem burocracia, com cadastro rápido e retirada ágil |
| **ONGs receptoras / cozinhas comunitárias** | Receber doações para alimentar quem atendem | Alta | Previsibilidade: saber o que virá e conseguir planejar as refeições |
| **Voluntários entregadores** | Coletar e entregar de forma eficiente | Média | App simples para usar na rua, com endereços, horários e rotas claras |
| **Marta** (coordenadora da plataforma) | Crescer a rede e comprovar impacto para captar apoio | Alta | Ferramenta simples, onboarding fácil e métricas de impacto |
| **Vigilância sanitária** | Garantir a segurança alimentar dos itens doados | Alta | Rastreabilidade mínima: o quê, quanto e validade de cada doação |
| **Poder público municipal** (Prefeitura – Assistência Social / Segurança Alimentar) | Combater o desperdício e a insegurança alimentar no município via política pública | Alta | Dados de impacto e conformidade legal para justificar apoio e divulgação |

## Objetivos de impacto

1. **Reduzir o tempo de coleta** (gargalo hipotetizado pela Marta)
   - **Métrica:** mediana de horas entre a publicação da doação e a retirada pelo voluntário.
   - **Linha de base:** hoje desconhecida (não há medição); medir desde o primeiro dia do piloto e fixar a base no 1º mês.
   - **Direção:** reduzir.
   - **Alvo (dezembro):** mediana ≥ 30% menor que a do primeiro mês medido.

2. **Aumentar o aproveitamento das doações** (reduzir o que estraga antes da coleta)
   - **Métrica:** % das doações publicadas que são efetivamente coletadas dentro da validade.
   - **Linha de base:** hoje desconhecida; medir desde o primeiro dia do piloto.
   - **Direção:** aumentar.
   - **Alvo (dezembro):** ≥ 80% das doações publicadas coletadas a tempo.

3. **Crescer a rede ativa** (mais doadores e ONGs, prioridade da Marta)
   - **Métrica:** nº de doadores e de ONGs *ativos no mês* (publicaram ou receberam ao menos 1 doação).
   - **Linha de base:** 0 no início do piloto (rede nova).
   - **Direção:** aumentar.
   - **Alvo (dezembro):** ≥ 15 doadores e ≥ 10 ONGs ativos no mês.

## 3. Regras de negócio

Três regras que o caso usa sem enunciar.

---

### RN-01 — Rastreabilidade mínima da doação

**Origem:** imposta (vigilância sanitária). O caso trata a fiscalização como stakeholder de alta influência que espera saber "o quê, quanto e validade", mas nunca transforma isso em regra do sistema.

**Enunciado:**
> O sistema rejeita a publicação de uma doação cujo cadastro não contenha, simultaneamente, os três campos preenchidos: descrição do item (texto não vazio), quantidade (número > 0 com unidade de medida) e data/hora de validade (timestamp futuro em relação ao instante da publicação). Doação rejeitada não recebe identificador público e não aparece na listagem das ONGs.

**Como se verifica:**
- Teste de aceitação: submeter a publicação com cada um dos três campos vazio, um por vez, e com validade no passado → 4 rejeições, nenhuma doação criada.

---

### RN-02 — Reserva exclusiva da doação

**Origem:** derivada. Sai da expectativa das ONGs por previsibilidade ("saber o que virá e conseguir planejar as refeições") combinada com o objetivo de aproveitamento (≥ 80% coletadas a tempo). Previsibilidade só existe se a doação reservada não puder ser prometida a duas ONGs.

**Enunciado:**
> Uma doação com status `disponível` pode ser reservada por exatamente uma ONG. No ato da reserva o status passa a `reservada`, a doação sai da listagem pública e qualquer nova tentativa de reserva sobre ela é rejeitada com erro de conflito. A transição `disponível → reservada` é atômica.

**Como se verifica:**
- Teste de concorrência: dois pedidos de reserva simultâneos sobre a mesma doação → 1 sucesso, 1 rejeição; nunca 2 sucessos.
- Invariante: nenhuma doação com mais de um registro de reserva ativa.
- Teste de listagem: após reservar, a doação some da consulta pública das demais ONGs.

---

### RN-03 — Expiração da reserva não coletada

**Origem:** ausente no caso; **inventada** pelo grupo.

O caso mede tempo até a coleta e percentual coletado dentro da validade, mas em nenhum momento diz o que acontece quando ninguém coleta. Sem essa regra, uma doação reservada e esquecida trava indefinidamente e some das duas métricas — o objetivo 2 vira inauditável.

**Quem decide:** **Marta**, coordenadora da plataforma — é quem responde pela operação e pelas metas de tempo de coleta e aproveitamento. A vigilância sanitária tem poder de veto sobre o prazo apenas para itens perecíveis (pode exigir janela menor), mas não define o número.

**Enunciado (regra inventada):**
> Uma doação com status `reservada` cuja coleta não for confirmada em até 6 horas corridas contadas a partir do timestamp da reserva volta automaticamente ao status `disponível`, tem a reserva marcada como `expirada` e gera notificação ao doador e à ONG reservante. Doação com reserva expirada não conta como "coletada dentro da validade" na métrica do objetivo 2. Se, no momento da expiração, a validade do item já tiver passado, o status final é `perdida` em vez de `disponível`.

**Como se verifica:**
- Teste com relógio controlado: reservar, avançar 5h59 → segue `reservada`; avançar para 6h01 → `disponível`, reserva `expirada`, 2 notificações emitidas.
- Caso de borda: reserva expirando após a validade → status `perdida`, não volta para a listagem.
- Métrica: doações com reserva expirada aparecem no denominador e não no numerador do indicador de aproveitamento.

**Honestidade sobre a invenção:** as 6 horas são um valor arbitrário, escolhido pelo grupo por falta de dado. Não é levantamento. O número deve ser recalibrado ao fim do 1º mês de piloto, quando a mediana real de tempo de coleta (objetivo 1) existir — a proposta é fixá-lo próximo ao percentil 75 observado.

---

### Teste de verificabilidade

Dois desenvolvedores diferentes leem os enunciados e implementam a mesma coisa?

| Regra | Ambiguidade residual | Passa? |
|---|---|---|
| RN-01 | "quantidade > 0" — a unidade é lista fechada ou texto livre? Definido: lista fechada (kg, un, L) | Sim |
| RN-02 | Atomicidade explicitada; conflito tem resultado único definido | Sim |
| RN-03 | Prazo, contagem (corridas, não úteis), marco inicial (reserva), efeito na métrica e caso de borda estão todos explícitos | Sim |

---

## 4. Conflitos de prioridade

### Conflito: atrito no cadastro × rastreabilidade da doação

**As duas falas**

> **Doador (restaurante):** "Se eu tiver que preencher um formulário longo a cada sobra do fim do expediente, eu paro de publicar e jogo a comida fora."

> **Vigilância sanitária:** "Se eu não souber o que é, quanto é e até quando vale cada item, eu não tenho como responder por esse alimento em caso de incidente."

**Eixo do trade-off**

Número de campos obrigatórios no formulário de publicação da doação. Cada campo a mais aumenta a rastreabilidade e, na mesma medida, aumenta o atrito e a taxa de abandono na publicação.

**O que cada lado perde**

- **Doador:** tempo por publicação, justamente no horário de fechamento, que é o pior momento possível. O efeito real não é irritação — é a doação de última hora que simplesmente não acontece. Menos publicações derrubam o objetivo 3 (rede ativa) e o volume total escoado.
- **Vigilância sanitária:** rastreabilidade. Sem os campos, um incidente alimentar não tem como ser reconstruído — não se sabe o que circulou, em que quantidade nem se estava no prazo. Perde junto o poder público municipal, que condiciona seu apoio à conformidade legal.

**Critério que decide**

Segurança alimentar é restrição legal, não preferência de stakeholder — não entra na negociação de escopo. Dentro dessa restrição, vale o critério de mínimo necessário: **um campo só é obrigatório se, sem ele, a doação for irreconstituível em caso de incidente sanitário.** Isso sustenta exatamente três campos (o quê, quanto, validade — RN-01). Todo campo pedido por conveniência de terceiros — foto, categoria, observações, tipo de embalagem — é opcional.

**Saída usada: anular o eixo**

Em vez de escolher entre "poucos campos" e "muitos campos", o grupo atacou o custo por publicação. Os três obrigatórios permanecem, mas o doador cadastra seus itens recorrentes uma única vez ("meus itens frequentes"); a publicação diária passa a ser selecionar o item salvo, confirmar quantidade e confirmar validade — com validade pré-preenchida pela regra do item. A rastreabilidade fica intacta e o tempo de publicação recorrente cai para poucos toques.

**Residual assumido:** o eixo não desaparece na *primeira* publicação de cada doador, que continua custando o formulário completo. Se o piloto mostrar abandono concentrado no primeiro cadastro, este conflito volta à mesa como decisão — e, pelo critério acima, será decidido a favor da vigilância, com o atrito atacado por onboarding assistido, não por remoção de campo.


## Histórias de usuário
| # | História (Como… quero… para…) | INVEST: o que falha |
|---|---|---|

## Critérios de aceite
**História X** — Dado … Quando … Então …

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|

## Hipótese e experimento

## Decisão de análise
- **Problema:**
- **Alternativas:**
- **Decisão e justificativa:**
- **Riscos e limitações:**

## Uso de IA
O que geramos com IA, o que verificamos e o que alteramos.
