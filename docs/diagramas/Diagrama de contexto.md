# Diagrama de contexto — Prato Cheio

*Etapa 1 da atividade "Modelagem do sistema". Ver `Diagrama de contexto.svg` nesta mesma pasta para a versão visual.*

O sistema é uma única caixa: **API (Express) + banco SQLite embutido** (`src/app.js`, `src/doacoes.js`, `src/repositorio.js`). Ao redor dela, os atores e o que trocam com o sistema hoje:

| Ator | Direção | Dado | Rota / evento | Estado |
|---|---|---|---|---|
| Doador | entrada | tipo, quantidade, validade | `POST /api/doacoes` | implementado |
| Doador | saída | doação criada (id, status=`disponivel`) | `201 Created` | implementado |
| ONG | entrada | — (consulta a lista) | `GET /api/doacoes` | implementado |
| ONG | saída | doações com status=`disponivel`, da mais antiga à mais nova | `200 OK` | implementado |
| ONG | entrada | id da doação + nome da ONG | `POST /api/doacoes/:id/aceitar` | implementado |
| ONG | saída | doação aceita (`ong`, `aceita_em`) ou erro "já aceita por outra ONG" | `200` / `400` | implementado |
| CI / Monitoramento | entrada | — (ping) | `GET /api/saude` | técnico |
| CI / Monitoramento | saída | `{ ok: true }` | `200 OK` | técnico |
| Voluntário entregador | entrada | confirmação de coleta | — (RN-03, não codado) | planejado |
| Voluntário entregador | saída | endereço e horário da retirada | — (RN-03, não codado) | planejado |

## Por que Marta, vigilância sanitária e poder público municipal ficam de fora

Os três aparecem na tabela de stakeholders de `docs/analise.md`, mas nenhum troca dado diretamente com o sistema hoje:

- **Marta** (coordenadora) decide regras de negócio (ex.: o prazo de 6h da RN-03), mas não opera a API — não é um ator na fronteira do sistema, é quem define a regra por trás dela.
- **Vigilância sanitária**: a análise coloca fiscalização sanitária explicitamente **fora do recorte** do problema (seção 1).
- **Poder público municipal**: o relatório de cobertura por bairro que o atenderia foi tratado como *spike* de 2h na análise (seção 6), não uma rota existente ou planejada com critério de aceite.

Os três são público do *resultado* do sistema (dados de rastreabilidade, impacto), não atores que enviam ou recebem dados pela fronteira do sistema.

## Por que o Voluntário entregador aparece como planejado

Diferente dos três acima, o voluntário já tem história de usuário e critério de aceite ligados à RN-03 ("confirmar a coleta pelo celular"), então a fronteira do sistema já o prevê — só não está implementado nesta unidade (história zero cobre apenas Doador e ONG).

---
*Baseado em `docs/analise.md` e no código em `src/` — branch `entrega-2409`.*
