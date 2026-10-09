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
# Requisitos funcionais — Prato Cheio

| ID | Requisito | Como afeta o design |
|---|---|---|
| RNF-01 | **Quando** o voluntário confirma a coleta pelo celular em rede 3G a ~400 kbps, **o sistema** responde em até 2 s e grava o horário do evento (o toque na tela), não o horário em que a requisição chegou ou sincronizou. **Medido por:** 20 confirmações com a rede limitada a 400 kbps (throttling do navegador ou `tc netem`), com 95% das respostas em ≤ 2 s e payload de requisição mais resposta ≤ 10 KB (meta proposta, para caber no orçamento de 2 s a ~50 KB/s). Com a rede cortada por 30 s e restabelecida, o horário gravado difere do toque em ≤ 1 s.<br><br>*Nasce de:* restrição do caso (rede oscilante em campo, história do voluntário) e do objetivo 1 (a mediana de tempo de coleta só vale se o horário for o do evento). | **Decisão ainda sem ADR (a registrar):** o cliente envia o horário do toque (`ocorrida_em`) e o servidor o valida contra um limite de tolerância, em vez de gravar `datetime('now')` no servidor.<br><br>**Custo:** passa-se a confiar no relógio do aparelho, o que exige regra contra relógio adiantado ou atrasado (rejeitar ou truncar fora da tolerância). Reenvio após queda exige idempotência da confirmação, ou o mesmo toque vira dois registros. Fotos ficam fora do escopo porque o anexo pesado estoura os 2 s. Hoje não existe endpoint de confirmação de coleta, então esse requisito ainda não tem código. |
| RNF-02 | **Quando** o grupo trocar o banco de SQLite para PostgreSQL na Unidade 3 (via `DATABASE_URL`), **o sistema** passa a mesma suíte de testes sem alteração nas regras de negócio e nas rotas. **Medido por:** 100% dos testes de `tests/` verdes antes e depois da troca, 0 linhas alteradas em `src/doacoes.js` e `src/app.js` no diff da migração, e 0 ocorrências de `SELECT`, `INSERT`, `UPDATE` ou `DELETE` fora de `src/repositorio.js` e `src/db.js` (verificável por `grep` no CI).<br><br>*Nasce de:* restrição técnica do caso (Node 22 com SQLite embutido na U1 e U2, PostgreSQL na U3) e do risco "dificuldade técnica com a stack". | **ADR "Fronteira de portabilidade do banco":** SQL portável escrito à mão e contido em `repositorio.js`, sem query builder.<br><br>**Custo:** a portabilidade depende de disciplina do grupo (checklist e revisão de PR), não de ferramenta, e a migração exige rodar a suíte inteira contra o PostgreSQL. O ADR manda evitar `RETURNING`, mas `repositorio.js` usa `RETURNING` e `datetime('now')`, então é preciso decidir qual dos dois muda. Se o atrito de dialeto for maior que o previsto, o ADR prevê reabrir a favor do Knex na U3, o que traria dependência nova. |
| RNF-03 | **Quando** uma doação é publicada ou aceita, **o sistema** grava o carimbo de data e hora do evento em UTC, em formato ISO-8601, e a mediana de tempo entre publicação e aceite sai de uma única consulta. **Medido por:** 100% das doações aceitas com `criada_em` e `aceita_em` não nulos e `criada_em ≤ aceita_em`, 0 carimbos sem designador de fuso, e a mediana de horas entre publicação e aceite retornada por uma consulta SQL sobre os dados de teste.<br><br>*Nasce de:* objetivo 1 (reduzir a mediana de tempo de coleta, com linha de base desconhecida, medida desde o 1º dia) e da rastreabilidade pedida pela vigilância sanitária. | **Decisão de análise (seção 10) e ADR de portabilidade:** datas em ISO-8601 texto, que mapeia para `timestamptz` no PostgreSQL, com o relógio injetado como `now()` nas regras, o que também serve ao RF-03.<br><br>**Custo:** o relógio injetado muda a assinatura das funções de `doacoes.js` e os testes precisam passá-lo. Hoje `db.js` usa `datetime('now')`, que grava `YYYY-MM-DD HH:MM:SS` sem `T` nem fuso, divergindo do ISO-8601 do ADR, e a correção toca schema e consultas. Quando o RNF-01 for implementado, haverá duas fontes de horário (servidor e cliente), e é preciso definir qual é a oficial para a métrica. |

## Critérios de validação do projeto

## Uso de IA
