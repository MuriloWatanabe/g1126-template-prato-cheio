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

Registro do Trabalho 3 — geração de histórias candidatas por IA (nível "IA como colaboradora") e a correção do grupo, história por história (ver tabela em [Histórias de usuário](#histórias-de-usuário)).

**#2** — a IA gerou a história do doador já com lista suspensa, campo numérico, calendário e botão "Publicar" verde: decidiu sozinha o widget de cada campo em vez de deixar a história negociável. O grupo moveu esses detalhes para o critério de aceite e manteve na história só tipo/quantidade/validade (RN-01). Regra inventada: nenhuma regra de negócio nova — mas a versão da IA também não citava as restrições do caso "precisa funcionar no navegador do celular" e "orçamento próximo de zero"; se o time tivesse aceitado sem revisar, o critério de aceite nasceria sem elas.

**#3** — a IA gerou "Como time, quero criar a tabela de doações no banco, para armazenar os dados" como se fosse história de usuário. "O time" não é stakeholder do mapa da Aula 2 — é tarefa técnica disfarçada. O grupo retirou a linha da tabela de valor e registrou como tarefa de implementação. Regra inventada: a IA criou um stakeholder implícito ("o time") que não existe entre os seis papéis do mapa; a decisão de manter isso fora da tabela é do grupo, não da IA.

**#4** — a primeira versão da IA para o voluntário dizia "Como voluntário, quero um app rápido e fácil de usar, para trabalhar melhor": dois adjetivos (qualidade sem número) e um "para" fraco. O grupo reescreveu usando a restrição real do caso — conexão instável do voluntário na rua — como estímulo/ambiente/resposta/medida (3G a 400 kbps, resposta em até 2 s). Foi o erro mais caro da IA nesta rodada: a restrição de rede do caso tinha simplesmente desaparecido da versão gerada.

**#5** — a IA gerou "Como poder público municipal, quero um relatório de impacto por bairro, para justificar apoio e divulgação" assumindo, sem dizer, que o cadastro de doador e de ONG já guarda um campo de bairro estruturado. Essa regra não existe no caso — é invenção da IA. O grupo não descartou a história (o interesse do poder público está no mapa de stakeholders), mas trocou a ação de "escrever" por "investigar": um spike de 2h para checar se dá para extrair bairro do endereço já cadastrado. Quem ratifica se vale a pena estruturar esse campo é a Marta, não o grupo nem a IA.

**#7** — ao sugerir como fatiar a gigante, a IA propôs cortar "primeiro o filtro no backend, depois a tela do filtro" — fatiamento horizontal por camada técnica, do tipo que a Aula 3 marca como falso fatiamento (nada executa sozinho até as duas partes existirem). O grupo refatiou pelo método hambúrguer (camada × mínimo/bom), garantindo que cada fatia fosse demonstrável e descartável isoladamente.


## Histórias de usuário

| Papel | Quero | Para | INVEST → ação (a 4ª coluna) |
|---|---|---|---|
| ONG receptora | reservar uma doação disponível e que ela saia da listagem das outras ONGs | que uma refeição não se perca porque duas ONGs mandaram voluntário atrás do mesmo item | **Independente** — não roda sem publicar/listar já existirem. Mantida assim de propósito: exercita a regra central RN-02 (aceita → sai da lista), que é o maior risco do sistema. |
| Doador (restaurante/padaria/mercado) | publicar uma doação informando tipo, quantidade e validade | não jogar no lixo a sobra boa do fim do expediente (obj. 2 — aproveitamento) | **Negociável** — a candidata da IA já vinha com lista suspensa, campo numérico, datepicker e botão azul (decidiu o widget de cada campo). Ação: os widgets foram para o critério de aceite; a história ficou só com os 3 campos da RN-01. |
| ~~Time~~ (não é stakeholder) | ~~criar a tabela de doações no banco~~ | ~~armazenar os dados~~ | **Não é história — é tarefa.** "Time" não está no mapa de stakeholders e ninguém fora do time percebe quando termina. Ação: retirada da tabela de valor e registrada como tarefa técnica de implementação. |
| Voluntário entregador | confirmar a coleta pelo celular, na rua, mesmo com o sinal oscilando | não perder a corrida nem gravar o horário errado quando a conexão cai (obj. 1) | **Testável** — a candidata dizia "app rápido e fácil de usar" (adjetivo, não verificável). Ação: reescrita como estímulo/ambiente/resposta/medida — "em 3G a ~400 kbps, a confirmação responde em até 2 s e grava o horário do evento, não o da sincronização". |
| Poder público municipal | um relatório de cobertura das doações por bairro | justificar o apoio público e a verba com dado real de onde a comida chega (obj. 3) | **Estimável** — a candidata assumia, sem dizer, que o endereço já guarda o bairro estruturado; ninguém sabia se existe. Ação: trocamos "escrever o relatório" por um **spike de 2 h** para checar se dá para extrair o bairro do endereço cadastrado. Quem ratifica se vale estruturar o campo é a Marta. |
| ONG receptora ★ | ver a lista de disponíveis e aceitar uma doação por 1 toque, gravando o horário do aceite | operar de ponta a ponta e passar a medir o tempo entre publicação e coleta (obj. 1) desde o 1º dia | **Fatia 1 / história zero.** Linha dos mínimos do hambúrguer (lista em ordem de publicação · 1 toque · sai da lista · grava aceite). Atravessa interface→regra(RN-02)→dados e executa. Falha em Independente e é mantida: escolhida por **risco**, não por valor. |
| ONG receptora | filtrar as disponíveis por tipo e ver a validade de cada uma | escolher a doação certa para quem atendo, em vez de aceitar a primeira e descobrir que não serve | **Fatia 2.** Camada "encontrar/decidir" no nível bom. Demonstrável e descartável sozinha (a lista filtra na tela). A IA sugeriu "primeiro o filtro no backend, depois a tela" — fatia horizontal; refatiamos por valor visível. |
| ONG receptora | que minha reserva volte para a lista se eu não confirmar a coleta em 6 h | não travar indefinidamente uma doação que reservei e não vou buscar — libera para outra ONG (RN-03) | **Fatia 3.** Exercita a RN-03 (a regra que o grupo inventou). Demonstrável com relógio controlado (reservar → avançar o tempo → volta à lista). Descartável isolada. |

**★ História zero — por quê e o que fica fora**

Escolhida por risco, não por valor: é a fatia que atravessa interface → regra → dados e executa (esqueleto ambulante), exercita a regra de maior risco (RN-02: aceita → sai da lista) e produz a linha de base que falta — grava o horário da publicação e do aceite, alimentando o objetivo 1.

Fica **FORA**, e o motivo é sempre risco ou medição, nunca "é difícil":
- **Autenticação de doador e ONG** — não retira o risco do fluxo aceita→sai nem produz medição; é infra que entra depois sem mudar o esqueleto.
- **Filtro por proximidade, notificação, foto** — são os níveis "bom/luxo" do hambúrguer (fatias 2 e 3); nenhum exercita regra nova nem move um número.
- **Expiração automática da reserva (RN-03)** — é a fatia 3; entra no escopo total, não no esqueleto.
- **Recusar publicação com campo faltando (RN-01)** — o caminho feliz já basta para provar a RN-02 e a medição; a validação é a próxima fatia e não retira esse risco.
