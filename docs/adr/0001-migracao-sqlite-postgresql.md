# ADR 0001 — Migração do banco de SQLite para PostgreSQL (em contêiner)

- **Data:** 2026-10-09
- **Status:** aceito (execução na Unidade 3)

## Contexto

Na U1 e na U2 o Prato Cheio roda em **SQLite embutido** (`node:sqlite`). O caso fixa
**PostgreSQL na Unidade 3**, e o README exige o banco alcançável por `DATABASE_URL`, o
schema migrado e o CI verde. Este ADR registra a decisão de migrar e **como** o PostgreSQL
vai subir.

**Por que migrar.**

- **Restrição do caso.** A troca é compromisso da disciplina, não preferência do grupo.
- **Concorrência real na RN-02.** O aceite exclusivo (CA-04, CA-05) é o maior risco do
  sistema. No SQLite a escrita trava o arquivo inteiro e os testes rodam numa única conexão
  em memória, então a corrida entre duas ONGs nunca é exercitada de verdade. O PostgreSQL
  trava por linha e atende várias conexões simultâneas, que é o cenário de produção.
- **Carimbos de data/hora (RNF-03).** Hoje `datetime('now')` grava `YYYY-MM-DD HH:MM:SS`,
  sem `T` e sem fuso. O PostgreSQL tem `timestamptz`, que guarda o instante em UTC e permite
  calcular a mediana publicação→aceite numa consulta só.
- **Módulo experimental e arquivo local.** `node:sqlite` ainda emite `ExperimentalWarning`, e o
  banco é um arquivo que falha em pasta sincronizada (`disk I/O error`, ver README). Um
  servidor de banco elimina as duas coisas.

**Por que só na Unidade 3.**

- **A U1 precisava de zero dependências.** O walking skeleton tinha de rodar só com Node.
  Exigir um servidor de banco nessa fase somaria um problema de infraestrutura ao risco
  "dificuldade técnica com a stack" justamente quando o grupo ainda montava o ambiente.
- **Refatorar exige rede de segurança.** A migração só pode ser provada com testes que já
  existiam e passavam antes dela. Esses testes nasceram na U1 e na U2 (CA-01 a CA-04 em
  `tests/doacoes.test.js`). Antes deles, não havia o que comparar.
- **Uma mudança por vez.** Migrar junto com as histórias misturaria mudança de regra com
  mudança de infraestrutura no mesmo diff, e um teste vermelho não diria qual das duas quebrou.
- **A fronteira já foi preparada.** O ADR "Fronteira de portabilidade do banco"
  (`docs/analise.md`, seção 11) deixou todo o SQL em `src/db.js` e `src/repositorio.js` e
  marcou a reavaliação para o início da U3.

Restrições que pesam: orçamento zero (projeto acadêmico, ONGs sem verba), cinco integrantes
com máquinas e sistemas operacionais diferentes, e um CI que já tem um bloco
`services: postgres` (imagem `postgres:16-alpine`) comentado à espera da U3.

## Alternativas consideradas

1. **Ficar em SQLite**
   - **Prós:** custo zero de migração. Nada a instalar e testes rápidos em memória.
   - **Contras:** descumpre a restrição do caso e o compromisso do README. A RN-02 continua
     sem ser testada sob concorrência real. Datas sem fuso (contra o RNF-03). Depende de
     módulo experimental. Um único arquivo não atende várias instâncias da aplicação.

2. **PostgreSQL instalado na máquina de cada integrante**
   - **Prós:** sem Docker. Desempenho nativo. É o que muitos tutoriais ensinam.
   - **Contras:** cada sistema operacional instala de um jeito, e as versões divergem entre
     as máquinas e entre as máquinas e o CI, que de todo modo usa contêiner. Criar usuário,
     senha e banco é passo manual e propenso a erro. O banco fica rodando como serviço do
     sistema e acumula estado entre execuções.

3. **PostgreSQL em contêiner (Docker Compose local + `services` no GitHub Actions)**
   *(escolhida)*
   - **Prós:** a mesma imagem (`postgres:16-alpine`) roda em todas as máquinas e no CI, com
     usuário, senha e banco declarados num arquivo versionado. Sobe com
     `docker compose up -d` e zera com `docker compose down -v`. O bloco de CI já está
     escrito. Custo zero e funciona sem internet depois de baixar a imagem.
   - **Contras:** todo integrante precisa do Docker. No Windows isso significa Docker Desktop
     + WSL2, que é pesado e às vezes exige virtualização ligada na BIOS. A suíte fica mais
     lenta do que com SQLite em memória.

4. **Serviço gerenciado gratuito (Neon, Supabase, Render)**
   - **Prós:** nada a instalar. O mesmo banco fica acessível para a demo de qualquer lugar.
   - **Contras:** depende de internet e de um plano gratuito que pode mudar, suspender por
     inatividade (início lento) ou expirar. Um banco compartilhado entre integrantes e CI faz
     o `limparBanco()` de um apagar os dados do outro no meio dos testes. A credencial vira
     segredo a guardar no GitHub. A latência de rede deixa a suíte mais lenta e instável.

## Decisão

**Migrar para PostgreSQL 16 em contêiner (Alternativa 3).** Localmente o banco sobe por um
`docker-compose.yml` versionado. No CI, pelo bloco `services: postgres` que já existe em
`.github/workflows/ci.yml`. A aplicação usa o driver `pg` (node-postgres) e lê a conexão de
`DATABASE_URL`.

A mudança fica contida em `src/db.js` e `src/repositorio.js`:

- `db.js` passa a usar um pool do `pg` e mantém a interface `query(sql, valores)` devolvendo
  `{ rows }`. Ele converte os marcadores `?` em `$1, $2…`, então o `repositorio.js` continua
  escrevendo `?`. O schema troca `INTEGER PRIMARY KEY AUTOINCREMENT` por
  `SERIAL PRIMARY KEY`, e `criada_em` e `aceita_em` passam a `timestamptz`.
- `repositorio.js` troca `datetime('now')`, que só existe no SQLite, por `now()`.
  **`RETURNING` fica:** o checklist do ADR de portabilidade mandava evitá-lo, mas o
  PostgreSQL e o SQLite ≥ 3.35 (o Node atual traz o 3.51) aceitam a mesma sintaxe. Esta
  decisão substitui aquele item do checklist e resolve a pendência apontada no RNF-02.
- O query builder (Knex), previsto como plano B no ADR de portabilidade, **não** entra: com
  quatro consultas, as diferenças de dialeto se resolvem em poucas linhas.

**Por que não as outras.** *Ficar em SQLite* descumpre a restrição do caso e deixa o maior
risco do sistema, a RN-02, sem teste sob concorrência real. *Instalar na máquina* resolve o
banco, mas cria cinco ambientes diferentes do CI, e a migração precisa justamente de "o
mesmo teste no mesmo banco" em todo lugar. *Serviço gerenciado* traz internet, plano gratuito
e segredo como dependências, e o banco compartilhado quebra o isolamento dos testes. Ele
continua sendo opção **só para a demo** (ver Riscos), não para desenvolvimento nem CI.

## Consequências

- **Positivas:**
  - Dev e CI rodam a mesma versão do banco, declarada em arquivo. "Na minha máquina funciona"
    deixa de depender do sistema operacional.
  - A RN-02 passa a ser testada com conexões concorrentes reais (CA-05).
  - As datas passam a ser `timestamptz` em UTC, o que atende o RNF-03 e permite a mediana do
    objetivo 1 numa consulta só.
  - Some o `ExperimentalWarning` e o problema do arquivo em pasta sincronizada.
- **Negativas / quem paga:**
  - **Docker vira pré-requisito para rodar e testar o projeto.** Quem paga são os
    integrantes que ainda não têm Docker, em especial quem usa Windows (Docker Desktop +
    WSL2: alguns GB de download e cerca de 1 h de configuração na primeira vez). O responsável
    pelo risco "dificuldade técnica com a stack", Murilo Enzo Watanabe, documenta o passo a
    passo no README e ajuda na instalação.
  - **Feedback mais lento.** O CI ganha a espera do contêiner ficar saudável
    (`pg_isready`), e cada execução de `npm test` local depende de o contêiner estar no ar.
    Quem paga é todo integrante, a cada PR.
  - **Testes não podem mais rodar arquivos em paralelo** contra o mesmo banco, porque o
    `limparBanco()` de um arquivo apagaria os dados de outro. É preciso
    `fileParallelism: false` no `vitest.config.js` (ou um schema por arquivo) quando surgir o
    segundo arquivo de teste.
  - Entra uma dependência de produção nova (`pg`).
- **Riscos e o que fazer se der errado:**
  - *Um integrante não consegue rodar Docker* (máquina sem virtualização): ele aponta
    `DATABASE_URL` para um PostgreSQL instalado (Alternativa 2) ou para o CI. O código não
    muda, só a variável.
  - *A demo acontece numa máquina sem Docker:* sobe-se a aplicação contra um banco gerenciado
    gratuito (Alternativa 4) só para a apresentação, trocando `DATABASE_URL`.
  - *Uma consulta não roda igual nos dois bancos:* ela é corrigida em `repositorio.js`, e a
    regra de negócio não muda. Se o atrito for grande, reabre-se a opção Knex do ADR de
    portabilidade.

## Rastreabilidade

- **RNF-02** (`docs/projeto.md`): trocar o banco via `DATABASE_URL` sem alterar regras nem
  rotas, com a mesma suíte verde.
- **Risco "Dificuldade técnica com a stack do projeto"** (Análise, seção 8; prob. Média,
  impacto Alto): o contêiner padroniza o ambiente, em vez de cada um instalar o banco do seu jeito.
- **RN-02 / CA-04 / CA-05** (Análise, seções 5 e 7): o aceite exclusivo passa a ser provado
  sob concorrência real.
- **RNF-03:** carimbos em `timestamptz` UTC.
- **Restrição técnica do caso** (README, "Três restrições"): SQLite na U1/U2, PostgreSQL na U3.
- Executa a reavaliação prevista no ADR "Fronteira de portabilidade do banco"
  (Análise, seção 11).

## Critério de validação

O comportamento observável **não muda**: os mesmos testes, as mesmas rotas e as mesmas
regras. A migração é aceita só se todos os itens abaixo forem verdadeiros no PR que a faz.

| # | O que precisa continuar igual | Como se verifica |
|---|---|---|
| 1 | **Pré-condição:** antes do PR da migração, um teste do CA-05 (dois `POST /aceitar` em `Promise.all` → exatamente um `200` e um `400`) já está em `tests/` e verde no SQLite | `npm test` no `main` antes da migração |
| 2 | A suíte inteira passa nos dois bancos, com o **mesmo número de testes** (hoje 8, mais o do CA-05) | Antes, no SQLite: `git checkout <commit-antes> && npm test`. Depois, no PostgreSQL: `docker compose up -d && DATABASE_URL=postgres://pratocheio:pratocheio@localhost:5432/pratocheio npm test`. Compara-se a linha `Tests  N passed` das duas execuções |
| 3 | Os testes não foram alterados para passar | `git diff --stat <commit-antes>..HEAD -- tests/` sem saída |
| 4 | Regras de negócio e rotas intactas | `git diff --stat <commit-antes>..HEAD -- src/doacoes.js src/app.js` sem saída |
| 5 | SQL continua contido na camada de dados | `grep -rnE '\b(SELECT\|INSERT\|UPDATE\|DELETE)\b' src/ \| grep -v -e '^src/repositorio.js' -e '^src/db.js'` sem saída (vira passo do CI) |
| 6 | O CI roda contra PostgreSQL e a aplicação sobe | Bloco `services: postgres` e `DATABASE_URL` descomentados em `ci.yml`. Os passos `npm test` e `curl --fail http://localhost:3000/api/saude` ficam verdes no PR |
| 7 | O schema é criado do zero e a migração é idempotente | `docker compose down -v && docker compose up -d && npm run db:migrar && npm run db:migrar`: as duas execuções terminam com `schema criado` e sem erro |
