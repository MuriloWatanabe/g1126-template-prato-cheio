# ADR 0002 — Os testes só limpam e alteram o banco de teste

- **Data:** 2026-10-22
- **Status:** aceito

## Contexto

O piloto já tinha doações reais cadastradas. Uma pessoa da equipe da Marta rodou `npm test` na
máquina do piloto com a configuração apontando para o banco real. Antes de cada teste,
`limparBanco()` roda `DELETE FROM doacoes`, e todas as doações reais foram apagadas. A Marta
pediu que isso não possa acontecer de novo.

Antes desta decisão (`src/db.js` e `vitest.config.js` na `main`, commit `733e4c7`):

- **De onde vinha o banco dos testes:** de uma configuração. `vitest.config.js` definia
  `env: { DATABASE_FILE: ':memory:' }`, e `db.js` lia a mesma variável que a aplicação usa
  (`process.env.DATABASE_FILE || 'dados.sqlite'`).
- **O que podia trocá-lo:** mudar essa linha da configuração, ou apagá-la, bastava para os
  testes abrirem o arquivo real. Nada no código separava "rodando testes" de "rodando o sistema".
- **O que `limparBanco()` apagava:** a tabela `doacoes` inteira, sem conferir qual banco estava
  aberto.

Restrições: o banco continua SQLite nesta unidade, o PostgreSQL só entra na Unidade 3
([ADR 0001](0001-migracao-sqlite-postgresql.md)), e a proteção não pode depender de alguém lembrar
de uma regra na hora de rodar os testes.

## Alternativas consideradas

1. **Só instrução operacional** ("não rodar testes na máquina do piloto", no README)
   - **Prós:** nenhuma mudança de código.
   - **Contras:** foi exatamente isso que falhou. Depende de cada pessoa ler e lembrar, e a
     equipe da Marta não é do grupo.
2. **Banco de teste fixo:** sob o Vitest, `db.js` usa sempre SQLite em memória (`:memory:`) e
   ignora `DATABASE_FILE`.
   - **Prós:** nenhuma configuração externa troca o banco dos testes. O banco nasce vazio e
     some no fim do processo.
   - **Contras:** depende de saber que o código roda sob o Vitest (`process.env.VITEST`). Se
     `limparBanco()` for chamada por outro caminho (um script, outro executor de testes), nada a
     impede.
3. **Limpeza que confere o banco:** `limparBanco()` verifica qual banco está aberto e lança erro
   se não for o de teste.
   - **Prós:** protege no último ponto antes do `DELETE`, venha a chamada de onde vier.
   - **Contras:** sozinha não impede os testes de **gravar** no banco real (os `POST` dos testes
     inserem e aceitam doações nele) antes da limpeza ser recusada.
4. **Combinar 2 e 3** *(escolhida)*

## Decisão

**Combinar as alternativas 2 e 3**, implementadas em `src/db.js`:

- `escolherArquivo()` devolve `BANCO_DE_TESTE` (`:memory:`) sempre que `process.env.VITEST` está
  definido, e só fora dos testes lê `DATABASE_FILE`. `vitest.config.js` não configura banco.
- `limparBanco()` chama `bancoEmUso()` e lança `limparBanco recusado: o banco em uso (…) não é o
  banco de teste` se o banco aberto não for `:memory:`.

A primeira trava impede os testes de abrir o banco real, então eles não alteram nem apagam nada
nele. A segunda impede a limpeza de apagar um banco real se for chamada fora dos testes.
**Por que não as outras:** a 1 é o que já falhou. A 2 sozinha deixa a limpeza perigosa fora do
Vitest. A 3 sozinha deixa os testes gravarem doações falsas no banco real.

## Consequências

- **Positivas:**
  - Rodar `npm test` em qualquer máquina, com qualquer `DATABASE_FILE`, não toca o banco real.
  - Os testes ficam isolados: cada execução começa com o banco vazio, sem arquivo esquecido.
- **Negativas / o que abrimos mão:**
  - **Ninguém consegue rodar a suíte contra um arquivo real para depurar.** Quem paga é o
    integrante que precisar reproduzir um defeito com dados do piloto: ele copia os dados para um
    script próprio fora do Vitest, sem `limparBanco()`.
  - **A proteção é por banco e precisa ser refeita na U3.** Com o PostgreSQL não existe
    `:memory:`. Quem paga é o grupo, na migração: banco de teste próprio e `limparBanco()`
    conferindo o nome do banco (ver a revisão do ADR 0001).
- **Riscos e o que fazer se der errado:**
  - *Um teste novo apaga dados sem passar por `limparBanco()`* (um `DELETE` direto no teste): a
    primeira trava ainda protege, porque o banco é o de memória; na revisão de PR, toda limpeza
    passa por `limparBanco()`.
  - *Alguém define `VITEST` fora dos testes:* o sistema passa a usar um banco em memória e nada é
    gravado, o que aparece logo na primeira doação publicada e não apaga dados.

## Rastreabilidade

- **Mudança de contexto (etapa 4):** os testes apagaram as doações reais do piloto.
- **RNF-04** e **CV-08** (`docs/projeto.md`): os testes recusam limpar ou alterar um banco que
  não é o de teste.
- **RN-01** (`docs/analise.md` §5): as doações apagadas eram o registro de rastreabilidade que a
  vigilância sanitária pode pedir.
- Complementa o [ADR 0001](0001-migracao-sqlite-postgresql.md): a mesma proteção tem de valer
  depois da migração.

## Critério de validação

| # | O que precisa ser verdade | Como se verifica |
|---|---|---|
| 1 | Dado um banco em uso que não é o de teste, quando a limpeza é chamada, então ela falha e nenhuma doação é apagada | `tests/protecao-banco.test.js`, teste "recusa limpar um banco que não é o de teste…": roda `limparBanco()` num processo fora do Vitest com `DATABASE_FILE` apontando para um arquivo com 2 doações; espera o erro e 2 doações antes e depois |
| 2 | Com `DATABASE_FILE` apontando para outro banco, os testes usam o de teste e não tocam o arquivo | Mesmo arquivo, teste "usa sempre o banco de teste…": `bancoEmUso()` é `:memory:` e o arquivo nem é criado |
| 3 | A suíte inteira continua verde | `npm test` no CI (`build-e-testes`) |
