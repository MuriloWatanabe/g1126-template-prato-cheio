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


## ★ História zero - Por que ela
Escolhemos esta fatia porque ela força cedo a regra de negócio central do sistema — uma doação aceita por uma ONG deixa de estar disponível para qualquer outra — enquanto grava o instante da publicação e do aceite para criar a linha de base de medição do tempo de coleta.

## O que ficou FORA da fatia e por quê
Login e autenticação de usuários: Foi excluído para não interpor uma camada de identidade entre a ação e o dado medido, protegendo a pureza da linha de base do tempo entre publicação e aceite antes de introduzirmos sessões e permissões.

Upload de fotos da comida: Foi excluído para isolar primeiro o risco arquitetural da concorrência de reservas; anexos pesados num canal 3G de 400 kbps introduziriam latência e falhas de rede que contaminariam a medição do instante real do aceite.

Notificações push: Foi excluído para manter o fluxo observável e determinístico enquanto validamos a regra de exclusividade do aceite, evitando um canal assíncrono externo que mascararia se a doação saiu da lista pela regra ou pela entrega da notificação.

Filtros e busca avançada por categoria, distância ou validade: Foi excluído para não abrir múltiplos caminhos de leitura sobre a lista de disponíveis antes de garantirmos que a transição "disponível → aceita" é atômica, reduzindo o risco de duas ONGs enxergarem a mesma doação como livre.

Painel de histórico e relatórios da coordenadora: Foi excluído para primeiro assegurar que os carimbos de tempo de publicação e aceite estão sendo gravados de forma confiável, já que qualquer relatório construído sobre uma medição ainda não validada propagaria erro em vez de informação.

Cadastro e gestão de perfis de doadores e ONGs: Foi excluído para concentrar o risco no núcleo transacional da reserva concorrente, evitando que a modelagem de entidades secundárias desloque o foco do dado crítico que sustenta toda a medição do projeto.

## Critérios de aceite

Três histórias da tabela acima, com os critérios em Dado / Quando / Então. Cada critério
descreve estado no "Dado", uma única ação no "Quando" e um resultado observável de fora
no "Então" — nada que exija abrir o banco ou ler o código para verificar.

---

### ★ História zero — ONG receptora: ver as disponíveis e aceitar por 1 toque

> Como ONG receptora, quero ver a lista de doações disponíveis e aceitar uma por 1 toque,
> gravando o horário do aceite, para operar de ponta a ponta e medir o tempo entre
> publicação e coleta desde o 1º dia.

**CA-01 — A lista mostra o que está disponível, em ordem de publicação**
- **Dado** que existem três doações publicadas e ainda não aceitas, publicadas às 18h00, 18h10 e 18h20
- **Quando** a ONG abre a lista de doações disponíveis
- **Então** a tela exibe as três, da mais antiga para a mais recente (18h00, 18h10, 18h20), cada uma com descrição, quantidade e validade.

**CA-02 — Aceitar é um toque e a doação sai da lista de quem aceitou**
- **Dado** que existe uma doação publicada e ainda não aceita, visível na lista da ONG A
- **Quando** a ONG A toca uma única vez em "Aceitar" nessa doação
- **Então** a tela confirma o aceite, exibe o horário do aceite (data e hora) e a doação deixa de aparecer na lista de disponíveis da ONG A.

**CA-03 — A doação aceita desaparece da lista das demais ONGs (RN-02)**
- **Dado** que existe uma doação já aceita pela ONG A
- **Quando** a ONG B abre a lista de doações disponíveis
- **Então** essa doação não aparece na lista da ONG B.

**CA-04 — Caminho proibido: segunda ONG tentando aceitar a mesma doação (RN-02)**
- **Dado** que existe uma doação já aceita pela ONG A e que a ONG B ainda tem a tela antiga aberta, com essa doação listada
- **Quando** a ONG B toca em "Aceitar" nessa doação
- **Então** a ONG B recebe a mensagem "esta doação já foi aceita por outra ONG", a doação some da tela da ONG B e o aceite da ONG A permanece inalterado, com o horário original.

**CA-05 — Caminho proibido: duas ONGs aceitando ao mesmo tempo (RN-02)**
- **Dado** que existe uma doação publicada e ainda não aceita, visível para a ONG A e para a ONG B
- **Quando** as duas tocam em "Aceitar" no mesmo instante
- **Então** exatamente uma recebe a confirmação de aceite com horário e a outra recebe a mensagem de doação já aceita; em nenhum caso as duas recebem confirmação.

**CA-06 — Lista vazia**
- **Dado** que não existe nenhuma doação publicada e não aceita
- **Quando** a ONG abre a lista de doações disponíveis
- **Então** a tela exibe "nenhuma doação disponível no momento" e nenhum item.

---

### História — Doador: publicar uma doação (RN-01)

> Como doador, quero publicar uma doação informando tipo, quantidade e validade, para não
> jogar no lixo a sobra boa do fim do expediente.

**CA-07 — Publicação completa entra na listagem**
- **Dado** que o doador está com o formulário de publicação preenchido com descrição "pão francês", quantidade 5 kg e validade amanhã às 12h00
- **Quando** ele confirma a publicação
- **Então** a tela exibe o código público da doação e a doação passa a aparecer na lista de disponíveis das ONGs, com essa descrição, quantidade e validade.

**CA-08 — Caminho proibido: campo obrigatório vazio (RN-01)**
- **Dado** que o doador está com o formulário preenchido, exceto pela quantidade, que está vazia
- **Quando** ele confirma a publicação
- **Então** a tela aponta a quantidade como obrigatória, mantém o restante preenchido, não exibe código público e a doação não aparece na lista das ONGs. *(o mesmo vale, um por vez, para descrição vazia e validade vazia)*

**CA-09 — Caminho proibido: validade no passado (RN-01)**
- **Dado** que o doador está com o formulário preenchido e a validade informada é ontem às 20h00
- **Quando** ele confirma a publicação
- **Então** a tela recusa com "a validade precisa ser posterior ao momento da publicação" e a doação não aparece na lista das ONGs.

**CA-10 — Caminho proibido: quantidade zero ou sem unidade (RN-01)**
- **Dado** que o doador está com o formulário preenchido e a quantidade informada é 0, ou está sem unidade de medida selecionada
- **Quando** ele confirma a publicação
- **Então** a tela recusa com "informe uma quantidade maior que zero e a unidade" e a doação não aparece na lista das ONGs.

**CA-11 — Publicação recorrente a partir de item frequente**
- **Dado** que o doador tem "pão francês (kg)" salvo em seus itens frequentes
- **Quando** ele seleciona esse item, confirma a quantidade e confirma a validade pré-preenchida
- **Então** a doação é publicada com os três campos preenchidos e aparece na lista das ONGs, sem que o formulário completo tenha sido exibido.

---

### História — ONG receptora: reserva não confirmada volta para a lista (RN-03)

> Como ONG receptora, quero que minha reserva volte para a lista se eu não confirmar a
> coleta em 6 h, para não travar indefinidamente uma doação que não vou buscar.

**CA-12 — Dentro do prazo a reserva continua valendo**
- **Dado** que existe uma doação reservada pela ONG A há 5 h 59 min, com coleta ainda não confirmada e validade só amanhã
- **Quando** a ONG B abre a lista de doações disponíveis
- **Então** a doação não aparece na lista da ONG B e segue marcada como reservada na tela da ONG A.

**CA-13 — Passado o prazo, a doação volta para a lista**
- **Dado** que existe uma doação reservada pela ONG A há 6 h 01 min, com coleta ainda não confirmada e validade só amanhã
- **Quando** a ONG B abre a lista de doações disponíveis
- **Então** a doação aparece na lista da ONG B como disponível, a tela da ONG A mostra a reserva como expirada e o doador e a ONG A recebem, cada um, um aviso de reserva expirada.

**CA-14 — Caminho proibido: expirar depois da validade não devolve o item (RN-03)**
- **Dado** que existe uma doação reservada pela ONG A há 6 h 01 min, com coleta não confirmada, e cuja validade já passou
- **Quando** a ONG B abre a lista de doações disponíveis
- **Então** a doação não aparece na lista da ONG B e é exibida como perdida na tela do doador.

**CA-15 — Coleta confirmada a tempo não expira**
- **Dado** que existe uma doação reservada pela ONG A com a coleta confirmada 4 h após a reserva
- **Quando** se passam mais de 6 h desde a reserva
- **Então** a doação continua marcada como coletada, não volta para a lista das ONGs e nenhum aviso de expiração é enviado.

**CA-16 — Caminho proibido: confirmar coleta depois da expiração**
- **Dado** que existe uma doação cuja reserva pela ONG A já expirou e que voltou para a lista de disponíveis
- **Quando** a ONG A toca em "confirmar coleta"
- **Então** a tela recusa com "esta reserva expirou e a doação voltou para a lista" e a doação continua disponível para as demais ONGs.

## Riscos

### Escala:

- Baixa: Pouco provável/Pouco prejuízo no andamento do projeto

- Média: Pode acontecer/Pode dificultar o andamento do projeto

- Alta: Provável/Pode comprometer significatvimante o andamento do projeto

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Atraso ou ausência de integrantes nas atividades do projeto | Média | Média | Até 30/08 Vinicius Henrique da Silva irá distribuir as tarefas de cada etapa para evitar dependência exclusiva em certos integrantes do grupo |
| Dificuldade técnica com as stacks do projeto | Média | Alta | Até 30/08 Murilo Enzo Watanabe irá validar as configurações do projeto e documentar os passos necessários para auxiliar no desenvolvimento |

## Hipótese e experimento

Decisão de análise

Problema — Para a iteração 1 andar, faltava fechar qual seria a primeira fatia vertical (a história zero). O produto tem uma regra central de alto risco — RN-02, reserva exclusiva: doação aceita por uma ONG some para todas as outras — e, ao mesmo tempo, uma linha de base de medição a proteger (obj. 1, tempo entre publicação e aceite, medido desde o 1º dia). Não dava para começar por tudo; o corte da fatia definia o que ficava dentro e o que ficava fora da entrega, e sem esse corte a iteração não andava.

Alternativas

A — fatiar por valor / independência (INVEST). Começar pela história do doador publicando uma doação, a única candidata verdadeiramente Independente (roda sozinha, sem depender de outra história existir). Ganha: fatia limpa em INVEST, demonstrável e descartável isolada; já entrega algo de pé (dá para publicar). Perde: adia o maior risco do sistema — a concorrência de reservas (RN-02) só apareceria depois, quando corrigir custa caro.
B — fatiar por risco. Começar pela história da ONG que vê a lista e aceita por 1 toque, atravessando interface → regra (RN-02) → dados, mesmo sabendo que ela falha em Independente (precisa de doações já publicadas para rodar). Ganha: força cedo a regra central e o maior risco arquitetural (aceite atômico e exclusivo) e grava desde já os carimbos de publicação/aceite que sustentam o obj. 1. Perde: viola a independência do INVEST — a fatia não roda sem um mínimo de publicar/listar antes; a primeira entrega não é um vertical único e limpo.

Decisão e justificativa — Escolhemos a Alternativa B — fatiar por risco. O que decide é um risco desta mesma entrega: a RN-02 é a regra mais perigosa do sistema (único ponto de concorrência real; um erro nela põe duas ONGs indo buscar o mesmo lote — justamente o desperdício que o produto existe para evitar, obj. 2). Descobrir esse risco tarde, com a arquitetura já montada em volta, custaria muito mais do que aceitar uma fatia menos "limpa" agora. Soma-se o obj. 1: sem o aceite gravando horário desde o 1º dia, não há linha de base de tempo de coleta — e ela não é reconstituível depois. Por isso mantivemos a história zero mesmo falhando em Independente: aqui, risco pesa mais que pureza de fatiamento.

Riscos e limitações — O custo é concreto. (1) A história zero não é Independente: para rodar ponta a ponta foi preciso admitir na fatia um mínimo de publicar+listar (senão não há o que aceitar), então a primeira entrega não é o vertical enxuto que o INVEST idealiza — é um núcleo transacional com o andaime mínimo em volta. (2) Ao concentrar o esforço no risco de concorrência, empurramos para depois o valor que o cliente enxerga rápido (filtro por tipo/validade, notificações, relatório da coordenadora): há o risco de a primeira demo parecer "pouca coisa visível" para quem espera funcionalidade, quando ela resolve o problema mais difícil. Assumimos esse desconforto de demo em troca de reduzir cedo o risco técnico caro.

## Uso de IA

Registro do Trabalho 3 — geração de histórias candidatas por IA (nível "IA como colaboradora") e a correção do grupo, história por história (ver tabela em [Histórias de usuário](#histórias-de-usuário)).

**#2** — a IA gerou a história do doador já com lista suspensa, campo numérico, calendário e botão "Publicar" verde: decidiu sozinha o widget de cada campo em vez de deixar a história negociável. O grupo moveu esses detalhes para o critério de aceite e manteve na história só tipo/quantidade/validade (RN-01). Regra inventada: nenhuma regra de negócio nova — mas a versão da IA também não citava as restrições do caso "precisa funcionar no navegador do celular" e "orçamento próximo de zero"; se o time tivesse aceitado sem revisar, o critério de aceite nasceria sem elas.

**#3** — a IA gerou "Como time, quero criar a tabela de doações no banco, para armazenar os dados" como se fosse história de usuário. "O time" não é stakeholder do mapa da Aula 2 — é tarefa técnica disfarçada. O grupo retirou a linha da tabela de valor e registrou como tarefa de implementação. Regra inventada: a IA criou um stakeholder implícito ("o time") que não existe entre os seis papéis do mapa; a decisão de manter isso fora da tabela é do grupo, não da IA.

**#4** — a primeira versão da IA para o voluntário dizia "Como voluntário, quero um app rápido e fácil de usar, para trabalhar melhor": dois adjetivos (qualidade sem número) e um "para" fraco. O grupo reescreveu usando a restrição real do caso — conexão instável do voluntário na rua — como estímulo/ambiente/resposta/medida (3G a 400 kbps, resposta em até 2 s). Foi o erro mais caro da IA nesta rodada: a restrição de rede do caso tinha simplesmente desaparecido da versão gerada.

**#5** — a IA gerou "Como poder público municipal, quero um relatório de impacto por bairro, para justificar apoio e divulgação" assumindo, sem dizer, que o cadastro de doador e de ONG já guarda um campo de bairro estruturado. Essa regra não existe no caso — é invenção da IA. O grupo não descartou a história (o interesse do poder público está no mapa de stakeholders), mas trocou a ação de "escrever" por "investigar": um spike de 2h para checar se dá para extrair bairro do endereço já cadastrado. Quem ratifica se vale a pena estruturar esse campo é a Marta, não o grupo nem a IA.

**#7** — ao sugerir como fatiar a gigante, a IA propôs cortar "primeiro o filtro no backend, depois a tela do filtro" — fatiamento horizontal por camada técnica, do tipo que a Aula 3 marca como falso fatiamento (nada executa sozinho até as duas partes existirem). O grupo refatiou pelo método hambúrguer (camada × mínimo/bom), garantindo que cada fatia fosse demonstrável e descartável isoladamente.

