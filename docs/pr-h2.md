# PR — H2: o voluntário confirma a coleta

## O que este PR faz
O voluntário confirma a coleta de uma doação aceita: ela passa a `coletada`, com o nome do voluntário e o horário do servidor; o doador a vê como coletada na consulta da H1.

## História / decisão relacionada
Iteração 2 — H2 (CA1 a CA3). Decisões (coleta repetida, nome obrigatório, dado pessoal) em `docs/analise.md`, seção 16. Sobre a H1: o doador já é obrigatório e a consulta por doador é a que mostra "coletada" (CA3).

## Como verificar
1. `npm test` — bloco "H2 — o voluntário confirma a coleta" em `tests/coleta.test.js`.
2. Demo, passos 5 e 6 de `docs/demo.md`: a doação vai de `aceita` para `coletada` na tela do celular, com o nome do voluntário.

## Inversão de regra
**Regra invertida de propósito:** o CA2 ("só doação aceita pode ser coletada"). Em `src/repositorio.js`, o `UPDATE` de `coletar` passou de `WHERE id = $1 AND status = 'aceita'` para `... AND status IN ('aceita', 'disponivel')`, deixando confirmar a coleta de uma doação disponível.

**Resultado da suíte (51 testes): 2 vermelhos, 49 verdes.**
- `tests/coleta.test.js` › "CA2: recusa a coleta de uma doação disponível e a doação não muda" — esperava 400 e recebeu 200.
- `tests/doacoes.test.js` › "recusa confirmar a coleta de uma doação que nenhuma ONG aceitou" — esperava 400 e recebeu 200.

Os testes que ficaram vermelhos contêm a regra (recusa de doação disponível) e se desfizeram. Nenhum teste precisou ser reforçado: a inversão foi pega pela suíte.

**Inversão desfeita:** a linha voltou a `status = 'aceita'` e a suíte voltou a 51 verdes. A inversão não está no código entregue.

## Checklist
- [x] Os testes passam localmente (`npm test`)
- [ ] O CI está verde
- [x] Há teste cobrindo o critério de aceite da história
- [ ] Revisado por outro integrante do grupo

## Uso de IA
Código, testes e a inversão de regra foram gerados com IA (Claude) a partir do enunciado da H2; o grupo deve revisar as decisões da seção 16 de `docs/analise.md` (sobretudo a de dado pessoal) e rodar a demo no celular antes do merge.
