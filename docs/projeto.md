# Documento de Projeto — Prato Cheio

*Trabalho 2 · máximo 4 páginas (fora diagramas) · entrega na Aula 10*

## Decisões de projeto
| # | Decisão | Alternativas | Requisito/risco da Análise que a motiva |
|---|---|---|---|
| 1 | Garantir o aceite exclusivo com um único `UPDATE … WHERE id = ? AND status = 'disponivel'` (compare-and-set): quem altera a linha ganha, quem não encontra linha disponível recebe "já aceita por outra ONG". Detalhe em `analise.md` §11. | (a) `UPDATE` condicional — escolhida: atômico por linha e o mesmo SQL no SQLite e no PostgreSQL; (b) transação com bloqueio explícito (`BEGIN IMMEDIATE` no SQLite, `SELECT … FOR UPDATE` no PostgreSQL) — lê como "leio, checo, gravo", mas o mecanismo muda de banco para banco. | **RN-02** (reserva exclusiva) e o risco de concorrência no aceite, apontado como o maior do sistema; CA-03, CA-04, CA-05. Ver a tabela de trade-offs abaixo. |
| 2 | Expirar a reserva não coletada em 6 h **na leitura** da lista (expiração preguiçosa), com o relógio injetado nas regras; uma varredura mínima só emite as notificações, sem ser dona da mudança de estado. Detalhe em `analise.md` §11. | (a) expiração preguiçosa + varredura só para notificar — escolhida: determinística e testável sem espera real; (b) varredura ativa periódica (`setInterval`) como dona da expiração — notifica na hora, mas abre uma janela entre "expirou" e "a varredura rodou" e compete com a escrita do aceite. | **RN-03** (expiração em 6 h, inventada pelo grupo) e **Objetivo 2** (aproveitamento auditável); CA-12 a CA-16. Ainda sem código: depende da história de coleta. |
| 3 | Fronteira de portabilidade do banco: todo SQL escrito à mão, portável, e contido em `src/repositorio.js` e `src/db.js`; `doacoes.js` e `app.js` não veem SQL. Detalhe em `analise.md` §11; o item "evitar `RETURNING`" do checklist foi substituído pelo [ADR 0001](adr/0001-migracao-sqlite-postgresql.md). | (a) SQL portável à mão — escolhida: nenhuma dependência nova e poucas consultas; (b) query builder (Knex) — a troca de banco vira configuração, mas traz dependência e curva de aprendizado. | **Restrição técnica do caso** (SQLite na U1/U2 → PostgreSQL na U3) e o risco **"dificuldade técnica com a stack"** (`analise.md` §8); RNF-02. |
| 4 | Identificar o doador pelo nome informado na publicação (coluna `doador`, opcional), sem login. As histórias "doador vê as próprias doações" e "doador cancela doação disponível" usam esse nome; o cancelamento só vale para quem publicou e só enquanto a doação está `disponivel`, com a condição dentro do `UPDATE`, como no aceite. | (a) nome livre na publicação, sem login — escolhida: não interpõe identidade entre a ação e o dado medido; (b) cadastro e login do doador — identidade forte, mas abre o cadastro de perfis e atrasa o núcleo transacional. | *Fora da fatia* da Análise (login e cadastro de perfis); RN-02 (o cancelamento não pode competir com o aceite). Custo: quem souber o nome de um doador vê e cancela as doações dele; revisitar quando houver login. |

## Tabela de trade-offs (uma decisão em detalhe)
Decisão 1 — como garantir que só uma ONG aceite a mesma doação.

| Critério | A — `UPDATE` condicional (compare-and-set) | B — transação com bloqueio explícito |
|---|---|---|
| Garantia sob corrida (RN-02, CA-05) | Atômica: testar e alterar o status é uma só instrução | Atômica, desde que todo caminho que altera a doação abra a transação e trave a linha |
| Portabilidade SQLite → PostgreSQL | O mesmo SQL roda nos dois bancos | Muda de banco para banco: `BEGIN IMMEDIATE` no SQLite, `SELECT … FOR UPDATE` no PostgreSQL |
| Alcance do bloqueio | Uma instrução; no PostgreSQL, só a linha | No SQLite trava o banco inteiro durante toda a transação |
| Código e chance de erro | 1 instrução em `repositorio.js`, reaproveitada no cancelamento (decisão 4) | 3 passos (ler, checar, gravar) mais `COMMIT`/`ROLLBACK` em cada caminho |
| Testabilidade | Dois aceites em `Promise.all` → um `200` e um `400` | O mesmo teste, mas o bloqueio só é exercitado com conexões separadas |
| Aceite que toque várias tabelas no futuro | Precisará ser envolvido numa transação | Já está pronta para isso |
| Leitura do código | Menos linear: o resultado vem das linhas afetadas | Lê como "leio, checo, gravo" |

**Escolhida: A.** Pesaram a garantia sob corrida e a portabilidade: são o maior risco do sistema e a
migração da U3. O custo aceito é reescrever o aceite como transação se ele um dia tocar mais de
uma tabela.

## Diagramas
- [Contexto](diagramas/contexto.md): retrato do código no commit `64a4dde`; Marta, vigilância sanitária e voluntário aparecem com setas tracejadas, porque ainda não têm rota.
- [Dados](diagramas/dados.md): proposta. Já inclui o `doador`, o status `cancelada` e o `cancelada_em` das histórias da etapa 6.

Divergências entre o diagrama de dados e o `src/db.js`:

| # | Diagrama de dados | `src/db.js` hoje | Por que ainda não mudou |
|---|---|---|---|
| 1 | ONG e doador são tabelas (`ONGS`, `DOADORES`), ligadas à doação por FK | `ong` e `doador` são colunas `TEXT` com o nome digitado | Decisão 4: sem cadastro nem login nesta unidade. Custo: "Padaria X" e "padaria x" viram dois doadores |
| 2 | Voluntário e coleta: tabela `VOLUNTARIOS`, `id_voluntario`, `coletada_em` e os status `coletada` e `perdida` | Não existem | A história de coleta (RN-03, decisão 2) ainda não foi feita |
| 3 | Tipos e restrições: `quantidade` numérica > 0 com `unidade`, `validade` como data, `status` com `CHECK` e horários em UTC | `quantidade` e `validade` são `TEXT` livre ("10 kg"), `status` sem `CHECK`, horários por `datetime('now')`, sem fuso | Ficam para a migração do [ADR 0001](adr/0001-migracao-sqlite-postgresql.md) (`timestamptz`) e para o RNF-03 |

## ADRs
Ver `docs/adr/`.

- [ADR 0001 — Migração do banco de SQLite para PostgreSQL (em contêiner)](adr/0001-migracao-sqlite-postgresql.md): aceito, 2026-10-09; revisado em 2026-10-22 após a mudança de contexto (a decisão continua)
- [ADR 0002 — Os testes só limpam e alteram o banco de teste](adr/0002-testes-so-no-banco-de-teste.md): aceito, 2026-10-22

## Requisitos não-funcionais

| ID | Requisito | Como afeta o design |
|---|---|---|
| RNF-01 | **Quando** o voluntário confirma a coleta pelo celular, em 3G a ~400 kbps e com o sinal caindo, **o sistema** responde em até 2 s e grava o horário do toque na tela, não o da chegada da requisição, **medido por** 20 confirmações com a rede limitada a 400 kbps (throttling do DevTools): 95% das respostas em ≤ 2 s; e, com a rede cortada por 30 s e depois restabelecida, o horário gravado difere do toque em ≤ 1 s. *Nasce da restrição do caso: celular e conexão instável.* | **Isso muda** o registro da coleta: o cliente envia o horário do toque (`ocorrida_em`) e o servidor o valida contra uma tolerância, em vez de gravar `datetime('now')`. A confirmação passa a ser idempotente, para que o reenvio após a queda não duplique o registro. **A um custo de:** o grupo escreve e testa a regra contra relógio de aparelho errado e a chave de idempotência; o voluntário fica sem foto da coleta, porque o anexo estoura os 2 s. Ainda não há endpoint de coleta, então este requisito ainda não tem código. |
| RNF-02 | **Quando** o banco for trocado de SQLite para PostgreSQL na Unidade 3 (via `DATABASE_URL`), **o sistema** passa a mesma suíte de testes sem mudar regras de negócio nem rotas, **medido por** `npm test` com o mesmo número de testes verdes antes e depois, `git diff --stat` vazio em `src/doacoes.js`, `src/app.js` e `tests/` (exceto `tests/protecao-banco.test.js`, que testa o próprio mecanismo do banco e é reescrito com os mesmos cenários — revisão do ADR 0001), e 0 ocorrências de `SELECT`/`INSERT`/`UPDATE`/`DELETE` fora de `src/repositorio.js` e `src/db.js` (`grep`). *Nasce da restrição técnica do caso (SQLite → PostgreSQL) e do risco "dificuldade técnica com a stack".* | **Isso muda** a decisão 3 (fronteira de portabilidade) e o [ADR 0001](adr/0001-migracao-sqlite-postgresql.md): SQL portável escrito à mão e contido em `repositorio.js`, sem query builder. **A um custo de:** o grupo, que depende de disciplina na revisão de PR em vez de ferramenta, e que na U3 precisa rodar a suíte inteira contra o PostgreSQL; `RETURNING` e `datetime('now')` já usados hoje terão de ser revistos. |
| RNF-03 | **Quando** uma doação é publicada ou aceita, **o sistema** grava o horário do evento em UTC no formato ISO-8601, e a mediana de tempo entre publicação e aceite sai de uma única consulta, **medido por** 100% das doações aceitas com `criada_em` e `aceita_em` não nulos e `criada_em ≤ aceita_em`, 0 carimbos sem designador de fuso, e a mediana retornada por uma consulta SQL sobre os dados de teste. *Nasce do objetivo 1 (mediana de tempo de coleta) e da rastreabilidade exigida pela vigilância sanitária.* | **Isso muda** o formato das datas (ISO-8601 texto, que vira `timestamptz` no PostgreSQL) e o relógio, que passa a ser injetado nas regras de `doacoes.js`. **A um custo de:** o grupo, que muda a assinatura das funções e os testes, e que corrige o schema, porque hoje `datetime('now')` grava `YYYY-MM-DD HH:MM:SS` sem fuso. |
| RNF-04 | **Quando** a suíte de testes roda em qualquer máquina, inclusive a do piloto com `DATABASE_FILE` apontando para o banco real, **o sistema** recusa limpar ou alterar qualquer banco que não seja o de teste, e nenhuma doação real é apagada, **medido por** um teste automatizado: dado um banco em uso que não é o de teste, `limparBanco()` lança erro e a contagem de doações é a mesma antes e depois da chamada. *Nasce da mudança de contexto (etapa 4): os testes apagaram as doações reais do piloto.* | **Isso muda** `src/db.js` e `vitest.config.js` (história 4b): o banco dos testes não pode ser trocado por configuração externa, e a limpeza confere qual banco está em uso antes de apagar. **A um custo de:** o grupo, que perde a opção de rodar a suíte contra um arquivo real para depurar e terá de reimplementar a mesma proteção no PostgreSQL na U3. |

## Critérios de validação do projeto

Cada critério é respondido com sim ou não olhando só o repositório.

| # | Critério (sim/não) | Fonte |
|---|---|---|
| CV-01 | O ADR da migração SQLite → PostgreSQL existe e tem status e data no cabeçalho? | `docs/adr/0001-migracao-sqlite-postgresql.md` |
| CV-02 | **(migração)** O ADR da migração lista o que precisa continuar igual e o comando que mostra isso (`npm test` nos dois bancos, com o mesmo número de testes)? | `docs/adr/0001-migracao-sqlite-postgresql.md`, seção *Critério de validação* |
| CV-03 | **(migração)** O comando `grep -rnE '\b(SELECT\|INSERT\|UPDATE\|DELETE)\b' src/ \| grep -v -e '^src/repositorio.js' -e '^src/db.js'` não devolve nenhuma linha? | `src/` |
| CV-04 | Cada linha de *Decisões de projeto* cita um requisito, regra ou risco que existe em `docs/analise.md`? | `docs/projeto.md` § Decisões de projeto; `docs/analise.md` |
| CV-05 | A `main` exige PR com 1 aprovação e o check `build-e-testes` verde, com print da configuração? | `docs/evidencias/protecao-main.md` |
| CV-06 | O último commit da `main` tem o workflow de CI verde? | `.github/workflows/ci.yml` e aba *Actions* |
| CV-07 | Existe teste em que o aceite de uma doação já aceita por outra ONG é recusado (RN-02)? | `tests/doacoes.test.js` |
| CV-08 | **(mudança de contexto, RNF-04)** Existe teste em que `limparBanco()` falha com um banco que não é o de teste e nenhuma doação é apagada? | `tests/` e `src/db.js` |
| CV-09 | Os quatro não-funcionais estão no formato *Quando… o sistema… medido por…* e cada um traz a decisão afetada e quem paga? | `docs/projeto.md` § Requisitos não-funcionais |

## Uso de IA
