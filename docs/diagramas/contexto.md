**Pergunta:** quem troca dados com o Prato Cheio, e quais dados?
**Decisão que sustenta:** decisão 4 (doador identificado pelo nome, sem login: não há seta de cadastro nem de autenticação) e a fronteira do sistema na API.
**Situação:** retrato do código no commit `64a4dde` (entra na `main` pelo merge do PR #5). As setas tracejadas são proposta: ainda não têm rota.

# Diagrama de contexto — Prato Cheio

```mermaid
flowchart LR
    S["Prato Cheio<br/>API Express + SQLite"]
    D["Doador"]
    O["ONG"]
    V["Voluntário entregador"]
    M["Marta (coordenação)"]
    VS["Vigilância sanitária"]
    CI["CI (GitHub Actions)"]

    D -->|"publica: tipo, quantidade, validade, nome (POST /api/doacoes)"| S
    D -->|"cancela doação disponível (POST /api/doacoes/:id/cancelar)"| S
    S -->|"situação das próprias doações e ONG que aceitou (GET /api/doadores/:doador/doacoes)"| D
    S -->|"doações disponíveis, filtro por tipo, com validade (GET /api/doacoes)"| O
    O -->|"aceita doação com o nome da ONG (POST /api/doacoes/:id/aceitar)"| S
    V -.->|"confirma a coleta (RN-03, planejado)"| S
    S -.->|"endereço e horário da retirada (planejado)"| V
    S -.->|"doações aceitas no mês (planejado)"| M
    S -.->|"rastreabilidade por doação: tipo, quantidade, validade, ONG e horários (planejado)"| VS
    CI -->|"verificação de saúde (GET /api/saude)"| S
```

7 elementos. Linha cheia: rota que existe no commit acima. Linha tracejada: proposta.

## Por que Marta e a vigilância sanitária aparecem

Na versão anterior (`Diagrama de contexto.svg`, Aula 7) as duas ficavam de fora, porque nenhuma
operava a API. Elas entram agora como destino de dados que o sistema precisa entregar:

- **Vigilância sanitária:** a RN-01 existe por causa dela. Os três campos obrigatórios da
  publicação, junto com a ONG que aceitou e os horários, são o registro que ela pode pedir num
  incidente sanitário. Ainda não há rota: hoje esse registro está só no banco.
- **Marta:** acompanha o resultado do piloto (doações aceitas no mês). Também sem rota ainda.

O SVG e o PDF desta pasta são a versão da Aula 7 e ficam como histórico. Neles faltam Marta,
vigilância sanitária, o cancelamento e a consulta do doador.
