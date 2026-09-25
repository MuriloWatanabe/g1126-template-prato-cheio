# Modelo de Dados — Sistema de Doações

```mermaid
erDiagram

    DOADOR ||--o{ DOACAO : "realiza"
    ONG ||--o{ DOACAO : "recebe"
    DOACAO ||--o{ ENTREGA : "possui"
    ENTREGADOR_VOLUNTARIO ||--o{ ENTREGA : "realiza"

    DOADOR {
        int id_doador PK "auto incremento"
        varchar(150) nome "NOT NULL"
        char(1) tipo_pessoa "F = física / J = jurídica"
        varchar(14) documento UK "CPF (11) ou CNPJ (14), só dígitos"
        varchar(150) email UK "NOT NULL"
        varchar(20) telefone
        char(8) cep "só dígitos"
        varchar(150) logradouro
        varchar(10) numero
        varchar(100) complemento "opcional"
        varchar(100) bairro
        varchar(100) cidade
        char(2) uf
        boolean ativo "DEFAULT true"
        timestamp data_cadastro "DEFAULT now()"
    }

    ONG {
        int id_ong PK "auto incremento"
        varchar(150) razao_social "NOT NULL"
        varchar(150) nome_fantasia
        char(14) cnpj UK "só dígitos"
        varchar(150) email UK "NOT NULL"
        varchar(20) telefone
        varchar(150) responsavel "NOT NULL"
        text descricao
        char(8) cep "só dígitos"
        varchar(150) logradouro
        varchar(10) numero
        varchar(100) complemento "opcional"
        varchar(100) bairro
        varchar(100) cidade
        char(2) uf
        boolean ativo "DEFAULT true"
        timestamp data_cadastro "DEFAULT now()"
    }

    DOACAO {
        int id_doacao PK "auto incremento"
        int id_doador FK "NOT NULL"
        int id_ong FK "NOT NULL"
        varchar(20) tipo_item "tipo do alimento, Frios, perecivel, etc"
        varchar(255) descricao_item "NOT NULL"
        date data_doacao "NOT NULL"
        varchar(20) status "pendente / em_entrega / entregue / cancelada"
        text observacoes
        timestamp data_cadastro "DEFAULT now()"
    }

    ENTREGA {
        int id_entrega PK "auto incremento"
        int id_doacao FK "NOT NULL"
        int id_entregador FK "NOT NULL"
        timestamp data_agendada "NOT NULL"
        timestamp data_conclusao "preenchida ao concluir"
        varchar(20) status "agendada / em_andamento / concluida / cancelada"
        text observacoes
        timestamp data_cadastro "DEFAULT now()"
    }

    ENTREGADOR_VOLUNTARIO {
        int id_entregador PK "auto incremento"
        varchar(150) nome "NOT NULL"
        char(11) cpf UK "só dígitos"
        varchar(150) email UK "NOT NULL"
        varchar(20) telefone
        varchar(10) placa "opcional"
        char(8) cep "só dígitos"
        varchar(150) logradouro
        varchar(10) numero
        varchar(100) complemento "opcional"
        varchar(100) bairro
        varchar(100) cidade
        char(2) uf
        boolean ativo "DEFAULT true"
        timestamp data_cadastro "DEFAULT now()"
    }
```

## Principais relacionamentos

| Relacionamento | Cardinalidade | Descrição |
|---|---|---|
| DOADOR → DOAÇÃO | 1:N | Um doador pode realizar várias doações; toda doação tem exatamente um doador. |
| ONG → DOAÇÃO | 1:N | Uma ONG pode receber várias doações; toda doação é destinada a exatamente uma ONG. |
| DOAÇÃO → ENTREGA | 1:N | Uma doação pode ter uma ou mais entregas (ex.: entregas parciais ou reagendamentos); toda entrega pertence a uma doação. |
| ENTREGADOR/VOLUNTÁRIO → ENTREGA | 1:N | Um entregador/voluntário pode realizar várias entregas; toda entrega é feita por um entregador. |

## Domínios dos campos de status e tipo

| Tabela | Campo | Valores permitidos |
|---|---|---|
| DOADOR | tipo_pessoa | `F`, `J` |
| DOACAO | tipo_item | `tipo do alimento`, `Frios`, `perecivel`, `etc` |
| DOACAO | status | `pendente`, `em_entrega`, `entregue`, `cancelada` |
| ENTREGA | status | `agendada`, `em_andamento`, `concluida`, `cancelada` |

Esses campos podem ser implementados como `VARCHAR` com restrição `CHECK` ou como tipo `ENUM`, conforme o banco de dados utilizado.

## Regras de integridade

- `documento` do doador deve ter 11 dígitos quando `tipo_pessoa = 'F'` e 14 dígitos quando `tipo_pessoa = 'J'`.
- `data_conclusao` da entrega só é preenchida quando `status = 'concluida'` e não pode ser anterior a `data_agendada`.
- CPF, CNPJ, CEP e telefone são armazenados como texto (somente dígitos), nunca como número, para preservar zeros à esquerda.
- Registros com doações ou entregas vinculadas não devem ser excluídos fisicamente; use `ativo = false`.

## Correções em relação à versão anterior

- Gerado documento .md utilizando mermaid e suporte do Claude.ai para otimizar a utilização da ferramenta.
- Adicionado novas campos referente a informações adicionais, como tipagem do alimento, TimeStamp e endereço de ONG/Doador.
- Adicionado Tabela Entregador com os campos corrigidos.
- Adicionado os Tipos dos dados vinculados.


## Legenda

- **PK** = Chave Primária
- **FK** = Chave Estrangeira
- **UK** = Chave Única (valor não pode se repetir)
- **1** = Um registro
- **N** = Muitos registros