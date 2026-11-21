# Refatorações — Prato Cheio

*Trabalho 3 · uma seção por refatoração · o que importa é o motivo e a evidência*

## Refatoração 1 — Migração de SQLite para PostgreSQL

- **Motivo:** o [ADR 0001](adr/0001-migracao-sqlite-postgresql.md) decidiu migrar para PostgreSQL 16 em contêiner por quatro razões:
  - o caso fixa PostgreSQL na Unidade 3;
  - o aceite exclusivo (RN-02) é o maior risco do sistema e, no SQLite, a corrida entre duas ONGs nunca é exercitada de verdade;
  - `timestamptz` guarda o instante em UTC (RNF-03);
  - `node:sqlite` ainda é experimental e o banco em arquivo falha em pasta sincronizada.
- **O que mudou:**
  - `src/db.js`: usa `pg.Pool` e mantém o contrato `query()` → `{ rows }`. Sob o Vitest, conecta sempre em `pratocheio_teste` ([ADR 0002](adr/0002-testes-so-no-banco-de-teste.md)), e `limparBanco()` confere `current_database()`.
  - `src/repositorio.js`: marcadores `$1, $2…` e dialeto do PostgreSQL (`now()`, `ILIKE`).
  - `.github/workflows/ci.yml`: `services: postgres` e `DATABASE_URL` ativos, mais um passo que cria o banco de teste.
  - `docker-compose.yml` e `docker/criar-banco-de-teste.sql` (novos): sobem o PostgreSQL 16 local com os dois bancos.
  - `package.json` e `package-lock.json`: dependência `pg`.
  - `vitest.config.js`: `fileParallelism: false`, porque os arquivos de teste agora dividem o mesmo banco.
  - `.env.example` e `README.md`: instruções para rodar com PostgreSQL.
  - `tests/protecao-banco.test.js`: reescrito para PostgreSQL. É a única exceção a "testes não mudam", prevista na revisão do ADR 0001 porque o arquivo testa o próprio mecanismo do banco. Continua com os mesmos 2 cenários.
- **O que NÃO mudou:** as regras de negócio, as rotas e os demais testes. `git diff --stat origin/main origin/entrega-0511 -- src/doacoes.js src/app.js src/server.js public/ tests/doacoes.test.js tests/coleta.test.js` não tem saída (conferido em `18c57d0`). O formato das datas é a exceção: o que a API devolve passa de `2026-11-07 00:18:40` para `2026-11-07T00:18:40.840Z`, e a tela mostra esse valor como vem (consequência do RNF-03; nenhum teste depende do formato).
- **Evidência de que o comportamento se manteve:**
  - testes antes da mudança: **37 passando** (`main` em `b2d297e`, SQLite, Node 22, `npm test`)
  - testes depois da mudança: **pendente — ainda não há versão verde com os 37 testes**
  - link da execução do CI verde: **pendente — o CI do head do PR está vermelho**: [run 38](https://github.com/MuriloWatanabe/g1126-template-prato-cheio/actions/runs/42255600648)

  **Situação em 2026-11-06.** O merge da `main` trouxe a coleta (PR #6), escrita para SQLite, para dentro da migração. Sobraram `prepare`/`PRAGMA` em `migrar()` e `datetime('now')`/`?` em `coletar()`, os dois bloqueios apontados na revisão do PR #7. Medições sobre PostgreSQL 16.15 local:

  | Código | Testes | Observação |
  |---|---|---|
  | `e1071a1` (antes do merge da `main`) | 21 passando | CI verde no [run 36](https://github.com/MuriloWatanabe/g1126-template-prato-cheio/actions/runs/42254354008), mas sem os testes da coleta e os novos da `main`; não serve de evidência final |
  | `18c57d0` (head atual do PR) | 0 de 37 passando | `TypeError: conexao(...).prepare is not a function` em `migrar()` |
  | `18c57d0` + correções pedidas na revisão (cópia local, fora da branch) | 37 passando | Só indica que a meta é alcançável; a evidência final é o CI |

  Quando as correções entrarem no PR, esta seção recebe o número final e o link do CI verde, e esta tabela sai.

## Refatoração 2 — (nome)

- **Cheiro de código atacado:** (duplicação, função longa, nome que engana, regra na rota…)
- **Qual dor concreta isso resolvia:**
- **O que mudou:**
- **Evidência (testes verdes antes e depois):**

---

**Limitações e o que ficou de fora:** (o que vocês viram e decidiram não refatorar, e por quê)

- Refatoração 1: o item 1 do critério de validação do ADR 0001 pede um teste do CA-05 (dois `POST /aceitar` em `Promise.all`) antes da migração, e ele não existe em `tests/`. O único teste de simultaneidade é o da coleta (`tests/coleta.test.js`). Por isso o aceite exclusivo sob concorrência real, um dos motivos da migração, ainda não está provado por teste.
