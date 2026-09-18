# Documento de Análise — Prato Cheio

*Trabalho 1 · Unidade 1 · Gabriel Albani de Souza · Miguel Augusto Guedes · Guilherme Tamanini · Vinicius Henrique da Silva · Murilo Enzo Watanabe*

## 1. Problema central

Estabelecimentos que produzem alimento excedente descartam parte dele porque não conseguem, dentro da janela em que a comida ainda é segura, avisar uma ONG capaz de retirá-la. Do outro lado, as ONGs não sabem o que está disponível agora. Precisamos que um excedente publicado por um doador seja visto pelas ONGs e assumido por **uma** delas de forma inequívoca, para que o alimento chegue a quem precisa antes de vencer e ninguém desloque equipe à toa.

O pedido original (mapa, push, chat, login Google, painel) já trazia soluções embutidas; o enunciado acima é a reescrita do problema, sem decisão de implementação dentro. O que atacamos não é falta de vontade de doar: é a ausência de um canal barato onde publicar custe poucos toques no fim do expediente e o aceite seja exclusivo, com os horários de publicação e de aceite gravados — para que o tempo de coleta deixe de ser palpite e vire medida. **Fora do recorte:** rotas, gestão interna das ONGs e fiscalização sanitária.

## 2. Incertezas

| # | Incerteza | Por que bloqueia | Como resolver |
|---|---|---|---|
| I-01 | Qual a janela real entre publicar e retirar? | Define se a doação expira sozinha e qual atraso é aceitável | Entrevistar 2 doadores e 2 ONGs; medir casos recentes |
| I-02 | Quem transporta — a ONG busca ou o doador entrega? | Muda o fluxo e quem é o usuário principal | Confirmar se as ONGs têm veículo e equipe |
| I-03 | O que acontece quando a ONG aceita e não retira? | Define se basta sumir da lista ou se volta ao ar, com prazo | Levantar frequência com as ONGs; fechar a regra com o cliente |
| I-04 | Qual a informação mínima que torna uma doação confiável? | Sem ela a ONG não decide o deslocamento e o cadastro nasce errado | Coletar doações reais e checar exigência sanitária |
| I-05 | Qualquer um se cadastra como ONG ou há validação? | Define processo de aprovação, papéis e responsável | Perguntar ao cliente quem faz essa curadoria hoje |

Assumida sem plano: o prazo de 6 h da RN-03 é arbitrário e só será calibrável quando I-01 tiver resposta.

## 3. Stakeholders

| Stakeholder | Interesse | Influência | O que espera |
|---|---|:--:|---|
| **Doadores** (restaurantes, padarias, mercados) | Escoar excedente, evitar desperdício, imagem | Alta | Doar sem burocracia: cadastro rápido, retirada ágil |
| **ONGs / cozinhas comunitárias** | Alimentar quem atendem | Alta | Previsibilidade para planejar as refeições |
| **Voluntários entregadores** | Coletar e entregar com eficiência | Média | App simples na rua: endereço e horário claros |
| **Marta** (coordenadora) | Crescer a rede e comprovar impacto | Alta | Onboarding fácil e métricas de impacto |
| **Vigilância sanitária** | Segurança alimentar dos itens | Alta | Rastreabilidade: o quê, quanto, validade |
| **Poder público municipal** | Combater desperdício e insegurança alimentar | Alta | Dados de impacto e conformidade legal |

## 4. Objetivos de impacto

| # | Objetivo (outcome) | Métrica | Linha de base | Alvo (dezembro) |
|---|---|---|---|---|
| 1 | Reduzir o tempo de coleta | Mediana de horas entre publicação e retirada | Desconhecida — medir desde o 1º dia, fixar no 1º mês | ≥ 30% menor que a base |
| 2 | Aumentar o aproveitamento | % das doações coletadas dentro da validade | Desconhecida — medir desde o 1º dia | ≥ 80% |
| 3 | Crescer a rede ativa | Doadores e ONGs ativos no mês | 0 (rede nova) | ≥ 15 doadores e ≥ 10 ONGs |

Nenhum é entrega de funcionalidade: são efeitos observáveis na operação.

## 5. Regras de negócio

**RN-01 — Rastreabilidade mínima** *(imposta: vigilância sanitária)* · O sistema rejeita publicação sem descrição não vazia, quantidade > 0 com unidade e validade futura. Doação rejeitada não recebe identificador nem aparece na listagem. *Verifica-se* submetendo com cada campo vazio, um por vez, e com validade no passado → 4 rejeições.

**RN-02 — Aceite exclusivo** *(derivada: previsibilidade das ONGs + objetivo 2)* · Uma doação `disponível` é aceita por exatamente uma ONG; no aceite o status vira `aceita`, ela sai da listagem e nova tentativa é rejeitada por conflito. A transição é **atômica**. *Verifica-se* com dois aceites simultâneos: 1 sucesso e 1 rejeição, nunca 2 sucessos.

**RN-03 — Expiração da reserva** *(inventada pelo grupo; decisão da Marta)* · Doação aceita sem coleta confirmada em 6 h corridas volta a `disponível`, marca a reserva como `expirada` e notifica doador e ONG; não conta como coletada a tempo (objetivo 2). Se a validade já passou, o status final é `perdida`. *Verifica-se* com relógio controlado: 5h59 segue aceita, 6h01 volta à lista. As 6 h são valor arbitrário por falta de dado (I-01), a recalibrar no 1º mês perto do percentil 75 observado.

## 6. Histórias de usuário (INVEST)

| Papel | Quero | Para | INVEST → ação |
|---|---|---|---|
| **ONG ★** | ver as disponíveis e aceitar por 1 toque, gravando o horário | operar ponta a ponta e medir o tempo até a coleta (obj. 1) | **História zero.** Falha em *Independente* e foi mantida assim: exercita a RN-02, o maior risco do sistema. Escolhida por risco, não por valor |
| Doador | publicar informando tipo, quantidade e validade | não jogar fora a sobra do fim do expediente (obj. 2) | **Negociável** — a versão da IA já trazia lista suspensa, datepicker e botão verde. Widgets foram para o critério de aceite |
| Voluntário | confirmar a coleta pelo celular, com sinal oscilando | não perder a corrida nem gravar horário errado (obj. 1) | **Testável** — "app rápido e fácil" virou medida: em 3G a ~400 kbps, responde em até 2 s e grava o horário do evento, não o da sincronização |
| ONG | filtrar as disponíveis por tipo e ver a validade | escolher a doação certa em vez de aceitar a primeira | **Fatia 2**, demonstrável e descartável sozinha. A IA sugeriu "filtro no backend, depois a tela" — fatia horizontal; refatiamos por valor visível |
| ONG | que minha reserva volte à lista se eu não confirmar em 6 h | não travar doação que não vou buscar (RN-03) | **Fatia 3.** Demonstrável com relógio controlado |
| Poder público | relatório de cobertura por bairro | justificar apoio e verba com dado real (obj. 3) | **Estimável** — pressupunha bairro estruturado, que ninguém sabe se existe. Virou **spike de 2 h**; a Marta ratifica |

Descartada: *"Como time, quero criar a tabela de doações"* — **é tarefa, não história**: "o time" não está no mapa de stakeholders e ninguém fora dele percebe quando termina.

**★ Por que esta é a história zero:** força cedo a regra central (aceita → sai da lista para todos) e grava os carimbos de publicação e aceite que criam a linha de base do objetivo 1. Atravessa interface → regra → dados e **executa**.

**Fora da fatia:** login (interpõe identidade entre a ação e o dado medido), fotos (anexo pesado em 3G contamina a medição), push (canal assíncrono mascara se a doação saiu pela regra ou pela notificação), filtros (abrem caminhos de leitura antes de a transição ser atômica), relatórios (medição ainda não validada propaga erro) e cadastro de perfis (desloca o foco do núcleo transacional).

## 7. Critérios de aceite

**★ História zero — ver as disponíveis e aceitar por 1 toque**

- **CA-01** — **Dado** três doações publicadas às 18h00, 18h10 e 18h20 e não aceitas; **Quando** a ONG abre a lista; **Então** as três aparecem da mais antiga para a mais recente, com descrição, quantidade e validade.
- **CA-02** — **Dado** uma doação disponível na lista da ONG A; **Quando** a ONG A toca uma vez em "Aceitar"; **Então** a tela confirma, exibe data e hora do aceite e a doação sai da lista de disponíveis.
- **CA-03 (RN-02)** — **Dado** uma doação já aceita pela ONG A; **Quando** a ONG B abre a lista; **Então** ela não aparece para a ONG B.
- **CA-04 (RN-02)** — **Dado** uma doação já aceita pela ONG A e a ONG B com a tela antiga aberta; **Quando** a ONG B toca em "Aceitar"; **Então** recebe "esta doação já foi aceita por outra ONG" e o aceite da ONG A permanece com o horário original.
- **CA-05 (RN-02)** — **Dado** uma doação disponível para A e B; **Quando** as duas tocam em "Aceitar" no mesmo instante; **Então** exatamente uma recebe confirmação — nunca as duas.

**História — Doador publica uma doação (RN-01)**

- **CA-06** — **Dado** o formulário com "pão francês", 5 kg e validade amanhã 12h00; **Quando** confirma; **Então** a tela exibe o código público e a doação aparece para as ONGs.
- **CA-07** — **Dado** o formulário com a quantidade vazia; **Quando** confirma; **Então** a tela aponta o campo como obrigatório, mantém o resto preenchido e nada entra na lista *(idem para descrição e validade)*.
- **CA-08** — **Dado** validade de ontem 20h00, ou quantidade 0/sem unidade; **Quando** confirma; **Então** recusa indicando o campo inválido e a doação não aparece para as ONGs.

**História — Reserva não confirmada volta para a lista (RN-03)**

- **CA-09** — **Dado** doação aceita pela ONG A há 5h59, sem coleta confirmada; **Quando** a ONG B abre a lista; **Então** não aparece e segue reservada para a ONG A.
- **CA-10** — **Dado** o mesmo cenário com 6h01; **Quando** a ONG B abre a lista; **Então** aparece como disponível, a ONG A vê a reserva expirada e doador e ONG A recebem aviso.
- **CA-11** — **Dado** reserva de 6h01 cuja validade já passou; **Quando** a ONG B abre a lista; **Então** não aparece e é exibida como perdida para o doador.

## 8. Riscos

Escala — **Baixa:** pouco provável / pouco prejuízo · **Média:** pode acontecer / pode atrapalhar · **Alta:** provável / compromete o andamento.

| Risco | Prob. | Impacto | Mitigação |
|---|:--:|:--:|---|
| Atraso ou ausência de integrantes nas atividades | Média | Média | Até 30/08, Vinicius Henrique da Silva distribui as tarefas de cada etapa, evitando dependência exclusiva de um integrante |
| Dificuldade técnica com a stack do projeto | Média | Alta | Até 30/08, Murilo Enzo Watanabe valida a configuração e documenta os passos necessários no README |

## 9. Hipótese e experimento

**Acreditamos que** o que transforma a sobra do fim do expediente em lixo é o **atrito de cadastro** — o esforço de publicar no pior horário do dia —, não a falta de vontade de doar.

**Saberemos que erramos se**, ao pedir a 5 doadores reais que publiquem ao vivo uma sobra do dia no horário de fechamento, **no máximo 2 dos 5** citarem espontaneamente o esforço do formulário como motivo de não fazer isso todo dia.

**Como medimos:** conversa de ~20 min com cada doador, no fechamento. Entregamos o formulário dos três campos da RN-01, cronometramos o preenchimento de uma doação real e perguntamos "faria isso todo fim de expediente?" e "o que te faria parar?". Registramos, por doador: (a) completou ou desistiu, (b) tempo em segundos, (c) citou o atrito espontaneamente — o contador que decide é o (c). Cinco doadores × 20 min, sem software, custo zero, em duas semanas. É hipótese e não crença porque existe resultado que nos faz mudar de ideia: se 3 ou mais preencherem sem reclamar, "itens frequentes" deixa de ser prioridade.

## 10. Decisão de análise — quantos campos obrigatórios na publicação

**Contexto.** O doador para de publicar se o cadastro for longo ("jogo a comida fora"); a vigilância exige saber o quê, quanto e até quando vale cada item. Cada campo a mais aumenta a rastreabilidade e, na mesma medida, o atrito e o abandono — derrubando os objetivos 2 e 3.

**Alternativas.** (a) **Poucos campos** — menos atrito, sacrificando rastreabilidade e o apoio público condicionado à conformidade. (b) **Muitos campos** — protege a fiscalização e assume o abandono. (c) **Anular o eixo** — manter os três da RN-01 e atacar o *custo por publicação*: o doador cadastra "meus itens frequentes" uma vez e a publicação diária vira selecionar o item, confirmar quantidade e confirmar validade pré-preenchida.

**Decisão: (c).** Segurança alimentar é restrição legal, não preferência negociável — (a) está fora. Entre (b) e (c) vale o mínimo necessário: *um campo só é obrigatório se, sem ele, a doação for irreconstituível em incidente sanitário*, o que sustenta exatamente três campos; foto, categoria e observações ficam opcionais.

**Riscos assumidos.** O eixo não some na **primeira** publicação, que ainda paga o formulário completo — se o piloto mostrar abandono ali, a decisão volta à mesa e será resolvida a favor da vigilância, atacando o atrito por onboarding assistido, não por remoção de campo. A decisão também pressupõe que o atrito é a barreira real, o que só se sustenta se a hipótese da seção 9 for confirmada.

## 11. Uso de IA

Nível *colaboradora*: a IA gerou candidatas, o grupo corrigiu e responde pelo resultado.

- **Widgets no lugar de história** — a história do doador veio com lista suspensa, datepicker e botão verde, decidindo a interface. Movemos para o critério de aceite; a versão gerada também havia perdido as restrições do caso (celular, orçamento zero).
- **Tarefa disfarçada de história** — "Como time, quero criar a tabela de doações": a IA inventou um stakeholder que não existe no mapa. Virou tarefa técnica.
- **Adjetivo no lugar de medida** — "app rápido e fácil" para o voluntário; a restrição de rede do caso havia sumido. Reescrita com 3G a ~400 kbps e resposta em até 2 s. Foi o erro mais caro da rodada.
- **Regra inventada silenciosamente** — o relatório por bairro pressupunha campo de bairro estruturado, ausente no caso. Virou spike, com a Marta ratificando.
- **Falso fatiamento** — a IA propôs "filtro no backend e depois a tela"; nada executa sozinho. Refatiamos pelo método hambúrguer.
- **Código do skeleton** — o aceite exclusivo foi escrito com apoio de IA e revisado pelo grupo; garantir a exclusividade em um único `UPDATE ... WHERE status = 'disponivel'`, em vez de ler e depois escrever, é decisão que o grupo defende. Cada PR registra o que foi gerado e o que alteramos.
