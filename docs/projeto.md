# Documento de Projeto — Prato Cheio

*Trabalho 2 · máximo 4 páginas (fora diagramas) · entrega na Aula 10*

## Decisões de projeto
| # | Decisão | Alternativas | Requisito/risco da Análise que a motiva |
|---|---|---|---|

## Tabela de trade-offs (uma decisão em detalhe)
| Critério | Alternativa A | Alternativa B |
|---|---|---|

## Diagramas
(contexto + dados ou componentes — em `docs/` ou como imagem)

## ADRs
Ver `docs/adr/`.

- [ADR 0001 — Migração do banco de SQLite para PostgreSQL (em contêiner)](adr/0001-migracao-sqlite-postgresql.md): aceito, 2026-10-09

## Requisitos não-funcionais

| ID | Requisito | Como afeta o design |
|---|---|---|
| RNF-01 | **Quando** o voluntário confirma a coleta pelo celular, em 3G a ~400 kbps e com o sinal caindo, **o sistema** responde em até 2 s e grava o horário do toque na tela, não o da chegada da requisição, **medido por** 20 confirmações com a rede limitada a 400 kbps (throttling do DevTools): 95% das respostas em ≤ 2 s; e, com a rede cortada por 30 s e depois restabelecida, o horário gravado difere do toque em ≤ 1 s. *Nasce da restrição do caso: celular e conexão instável.* | **Isso muda** o registro da coleta: o cliente envia o horário do toque (`ocorrida_em`) e o servidor o valida contra uma tolerância, em vez de gravar `datetime('now')`. A confirmação passa a ser idempotente, para que o reenvio após a queda não duplique o registro. **A um custo de:** o grupo escreve e testa a regra contra relógio de aparelho errado e a chave de idempotência; o voluntário fica sem foto da coleta, porque o anexo estoura os 2 s. Ainda não há endpoint de coleta, então este requisito ainda não tem código. |
| RNF-02 | **Quando** o banco for trocado de SQLite para PostgreSQL na Unidade 3 (via `DATABASE_URL`), **o sistema** passa a mesma suíte de testes sem mudar regras de negócio nem rotas, **medido por** `npm test` com o mesmo número de testes verdes antes e depois, `git diff --stat` vazio em `src/doacoes.js`, `src/app.js` e `tests/`, e 0 ocorrências de `SELECT`/`INSERT`/`UPDATE`/`DELETE` fora de `src/repositorio.js` e `src/db.js` (`grep`). *Nasce da restrição técnica do caso (SQLite → PostgreSQL) e do risco "dificuldade técnica com a stack".* | **Isso muda** a decisão 3 (fronteira de portabilidade) e o [ADR 0001](adr/0001-migracao-sqlite-postgresql.md): SQL portável escrito à mão e contido em `repositorio.js`, sem query builder. **A um custo de:** o grupo, que depende de disciplina na revisão de PR em vez de ferramenta, e que na U3 precisa rodar a suíte inteira contra o PostgreSQL; `RETURNING` e `datetime('now')` já usados hoje terão de ser revistos. |
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
