# Prato Cheio — [nome do grupo]

Projeto da disciplina **Análise, Projeto e Desenvolvimento Ágil**.
Conecta doadores de alimentos excedentes a ONGs, antes que a comida se perca.

> Este repositório é a base do produto que evolui nas três unidades:
> walking skeleton (U1) → incremento guiado pelo projeto (U2) → produto refatorado (U3).

## Trabalho em sala — análise do pedido

Grupo: Gabriel Albani de Souza · Miguel Augusto Guedes · Guilherme Tamanini · Vinicius Henrique da Silva · Murilo Enzo Watanabe 

### 1. Reescrita do pedido do cliente

**Pedido como chegou (mal formulado):**

> "Queremos um aplicativo com mapa mostrando os restaurantes que estão com comida
> sobrando, notificação push para as ONGs mais próximas, um chat entre a ONG e o
> doador e login com Google. Também precisa de um painel com gráficos de quantos
> quilos foram salvos."

**Separando o que é problema do que já é solução:**

| Trecho do pedido | Problema real por trás | Solução embutida (decisão prematura) |
| --- | --- | --- |
| "mapa mostrando os restaurantes" | A ONG precisa descobrir que existe um excedente disponível e se consegue chegar até ele | Mapa/geolocalização |
| "notificação push" | O alimento tem janela curta: o aviso precisa chegar a tempo | Push nativo |
| "chat entre ONG e doador" | Faltam informações para combinar a retirada (horário, quantidade, condições) | Chat em tempo real |
| "login com Google" | É preciso saber quem publicou e quem aceitou, e confiar nisso | Provedor de identidade específico |
| "painel com gráficos" | Alguém precisa comprovar o impacto da operação | Dashboard com gráficos |

**Pedido reescrito (problema, sem solução dentro):**

> Estabelecimentos que produzem alimento excedente hoje descartam parte dele porque
> não conseguem, dentro da janela em que a comida ainda é segura, avisar uma ONG
> capaz de retirá-la. Do outro lado, as ONGs não sabem o que está disponível agora.
> Precisamos que um excedente publicado por um doador seja visto por ONGs aptas e
> assumido por **uma** delas de forma inequívoca, para que o alimento chegue a quem
> precisa antes de perder a validade e ninguém desloque equipe à toa.

Nada acima diz *como* isso é feito — mapa, push e chat voltam à mesa depois, como
alternativas avaliadas, não como requisito.

### 2. Cinco incertezas a resolver antes de projetar

| # | Incerteza | Por que bloqueia o projeto | Como resolver |
| --- | --- | --- | --- |
| 1 | Qual é a janela de tempo real entre publicar e retirar (minutos, horas, um dia)? | Define se a doação precisa expirar sozinha, se o aviso precisa ser ativo e qual atraso é aceitável | Entrevistar dois doadores e duas ONGs; medir casos reais recentes |
| 2 | Quem faz o transporte — a ONG busca ou o doador entrega? | Muda completamente o fluxo e quem é o usuário principal do sistema | Confirmar com as ONGs se elas têm veículo e equipe disponíveis |
| 3 | O que acontece quando a ONG aceita e não retira? | Determina se basta remover a doação da lista ou se é preciso devolvê-la ao ar, com prazo e histórico | Levantar a frequência desse cenário com as ONGs; definir regra com o cliente |
| 4 | Qual é a informação mínima que torna uma doação confiável (tipo, quantidade, validade, refrigeração, endereço)? | Sem isso a ONG não decide se vale o deslocamento, e o cadastro pode nascer errado | Coletar exemplos reais de doações já feitas e checar exigências sanitárias |
| 5 | Qualquer um pode se cadastrar como ONG, ou existe validação? | Define se há um processo de aprovação, papéis distintos e responsável por ele | Perguntar ao cliente quem responde por essa curadoria hoje |

### 3. Três restrições e o que cada uma elimina

**Prazo — walking skeleton ponta a ponta ao fim da Unidade 1.**
Só cabe a história zero: doador publica → ONG vê → ONG aceita e a doação sai da
lista. Isso elimina mapa, chat, notificação e painel do escopo atual: qualquer um
deles consome o tempo que o caminho completo exige para existir funcionando. As
soluções possíveis ficam restritas às que atravessam o sistema inteiro em poucos
passos, mesmo que feias.

**Técnica — Node 22 com SQLite embutido, testes por um comando e CI verde.**
Não há serviço externo, fila nem infraestrutura paga na Unidade 1, então push
nativo, geolocalização e chat em tempo real estão fora por dependerem de terceiros.
A troca para PostgreSQL na Unidade 3 obriga o acesso a dados a ficar contido em
`src/db.js` (`query()` devolvendo `{ rows }`): as regras de negócio não podem ter
SQL espalhado, o que descarta soluções que acoplem consulta e regra.

**Negócio — alimento perecível, doação fisicamente única e sem verba.**
Como o mesmo lote não pode ser retirado por duas ONGs, "aceitar" precisa ser
exclusivo e imediato: soluções em que a doação continua visível após o aceite estão
descartadas. A responsabilidade sanitária exige registrar validade e condição de
armazenamento, e a ausência de orçamento (ONGs e projeto acadêmico) elimina
qualquer alternativa com custo mensal de infraestrutura.


## Como rodar

Requisito: **Node.js 22.13 ou superior**. Mais nada — o banco da Unidade 1 é SQLite, embutido no próprio Node.

> Esta é a **stack preferencial** da disciplina. Se o seu grupo optar por outra, registre o ADR de justificativa e garanta os mesmos compromissos: repositório público com CI verde, rota de saúde, testes por um comando, os três comandos documentados aqui no README e banco relacional migrado para PostgreSQL na Unidade 3.

```bash
npm install       # só na primeira vez
npm run db:migrar # cria o schema (arquivo dados.sqlite)
npm start         # sobe em http://localhost:3000
npm test          # roda os testes
npm run dev       # sobe recarregando a cada alteração
```

Os testes usam SQLite **em memória**, então não sujam o banco de desenvolvimento.

> Ao rodar `npm test` o Node imprime `ExperimentalWarning: SQLite is an experimental feature`.
> É esperado — o módulo embutido `node:sqlite` ainda é marcado como experimental. Não é erro e não reprova o CI.

> **Atenção:** não deixe o repositório dentro de uma pasta sincronizada (OneDrive, Google Drive, Dropbox) nem em disco de rede. O SQLite precisa de trava de arquivo e nesses lugares falha com `disk I/O error`. Clone em uma pasta local comum, por exemplo `~/dev/`.

## O banco: SQLite agora, PostgreSQL depois

| Unidade | Banco | O que precisa instalar |
|---|---|---|
| 1 — Análise | **SQLite** (`node:sqlite`, embutido) | nada além do Node |
| 2 — Projeto | SQLite | nada |
| 3 — Construção | **PostgreSQL** (após refatorar) | um PostgreSQL acessível — o caminho é escolha do grupo |

A troca não é acidente de percurso: na Unidade 2 vocês registram a decisão em um **ADR** (alternativas, consequências, riscos) e na Unidade 3 executam a **refatoração** — com os testes existentes provando que o comportamento se manteve.

O `src/db.js` foi desenhado para isso: ele expõe `query()` devolvendo `{ rows }`, então a troca do banco fica contida nele e não vaza para as regras de negócio.

**Como o PostgreSQL vai subir é decisão do grupo**, comparada no mesmo ADR: instalar o PostgreSQL na máquina, subir um contêiner, ou usar um serviço gerenciado gratuito (Neon, Supabase, Render). A disciplina não impõe o caminho — exige o banco alcançável por `DATABASE_URL`, o schema migrado e o CI verde. Cada opção tem custo e risco diferentes, e reconhecê-los é parte da decisão.

## Estrutura

```
src/server.js        entrypoint (npm start)
src/db.js            conexão e schema do banco (pronto)
src/app.js           rotas da API
src/doacoes.js       regras de negócio      <- implementar (U1)
src/repositorio.js   acesso ao banco (SQL)  <- implementar (U1)
public/index.html    interface (funciona no celular)
tests/               testes automatizados
docs/analise.md      documento de análise   (Trabalho 1)
docs/projeto.md      documento de projeto   (Trabalho 2)
docs/adr/            decisões arquiteturais (Trabalho 2)
docs/validacao.md    validação e testes     (Trabalho 3)
docs/refatoracoes.md refatorações feitas    (Trabalho 3)
docs/demo.md         roteiro da demo        (Trabalho 3)
docs/retrospectivas/ retrospectiva de cada iteração
.github/workflows/   pipeline de CI
```

## Como trabalhar (fluxo de Pull Request)

A partir da Unidade 2, **nada entra direto na `main`**:

```bash
git checkout -b historia/ong-aceita-doacao
# ... implementa, escreve o teste, roda npm test ...
git commit -m "ONG aceita uma doação e ela sai da lista"
git push -u origin historia/ong-aceita-doacao
```

Abra o Pull Request no GitHub, preencha o template, espere o **CI ficar verde** e
peça a revisão de **outro integrante**. Só então faça o merge.

## O que já está pronto e o que falta

Pronto: estrutura do projeto, interface básica, rota de saúde, **conexão com o banco e o schema** (`src/db.js`), CI configurado e um teste passando (prova que a aplicação sobe).

Falta (Trabalho 1 — walking skeleton): implementar `src/doacoes.js` (regras) e
`src/repositorio.js` (SQL) para que a história zero funcione ponta a ponta —
**um doador publica uma doação → uma ONG vê a doação → a ONG a aceita e ela sai da lista.**
Os critérios de aceite estão em `tests/doacoes.test.js` como `it.todo`: troque cada um
por um teste de verdade conforme implementa.

## Uso de IA

A IA pode participar da produção, mas o grupo é responsável por verificar, testar,
corrigir e **defender** o resultado. Registre em cada Pull Request o que foi gerado
com IA e o que vocês alteraram.
