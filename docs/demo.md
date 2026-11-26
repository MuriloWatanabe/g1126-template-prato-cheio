# Roteiro da demo — Prato Cheio

*Trabalho 3 · 3 minutos · outra pessoa precisa conseguir reproduzir só lendo isto*

## Antes de começar

Requisitos: **Node.js 22.13+**, **Git** e um **PostgreSQL 16** no ar (os mesmos do [README](../README.md#como-rodar)).

```bash
git clone https://github.com/MuriloWatanabe/g1126-template-prato-cheio.git
cd g1126-template-prato-cheio
npm install            # instala express e pg

docker compose up -d   # sobe o PostgreSQL 16 (bancos pratocheio e pratocheio_teste)
npm run db:migrar      # deve imprimir: schema criado
npm start              # deve imprimir: banco pronto / Prato Cheio rodando em http://localhost:3000
```

**O que precisa estar no ar:** o PostgreSQL, alcançável pela variável de ambiente
**`DATABASE_URL`**. Sem a variável, a aplicação usa o padrão do `docker-compose.yml`:
`postgres://pratocheio:pratocheio@localhost:5432/pratocheio`.

**Sem Docker** (PostgreSQL instalado na máquina ou um banco gratuito no Neon/Supabase):
defina `DATABASE_URL` antes de `npm run db:migrar` e `npm start`:

```bash
# Git Bash / Linux / macOS
export DATABASE_URL="postgres://USUARIO:SENHA@HOST:5432/pratocheio"
# PowerShell
$env:DATABASE_URL = "postgres://USUARIO:SENHA@HOST:5432/pratocheio"
```

**Comece com o banco vazio**, para a lista bater com o roteiro: `docker compose down -v`
e depois `docker compose up -d` (ou, no banco externo, `DELETE FROM doacoes;`).

Abra **duas abas** do navegador em `http://localhost:3000`: a **aba A** é a ONG A e a
**aba B** é a ONG B (pode ser a mesma aba repetida, a tela não tem login).

## Roteiro (3 minutos)

| Tempo | O que mostrar | O que se prova |
|---|---|---|
| 0:00–0:20 | **O problema:** estabelecimentos jogam fora comida boa porque não conseguem avisar a tempo uma ONG que a retire, e as ONGs não sabem o que está disponível agora. | por que o produto existe |
| 0:20–1:50 | **A história funcionando:** a Padaria Central publica pão francês → a ONG filtra por "pão", vê a validade e aceita com um toque → a doação sai da lista e o doador vê "aceita por Minha ONG" → o voluntário confirma a coleta (passos 1 a 6). Tudo gravado no PostgreSQL: o passo 9 reinicia o servidor e os dados continuam lá. | o produto executa ponta a ponta |
| 1:50–2:30 | **Erro tratado (RN-02, CA-04):** a ONG B, com a tela antiga ainda aberta, tenta aceitar a doação que a ONG A acabou de pegar e recebe "esta doação já foi aceita por outra ONG". O aceite da ONG A não muda (passos 7 e 8). | o limite foi pensado: duas ONGs nunca pegam a mesma doação |
| 2:30–3:00 | **O que falta:** expiração da reserva em 6 h (RN-03, CA-09 a CA-11); horário do toque e reenvio da coleta sem rede (CA-18, CA-19); login das ONGs (o nome "Minha ONG" é fixo). | vocês sabem onde estão |

## Passo a passo reproduzível

| # | Ação exata | Resultado esperado |
|:--:|---|---|
| 1 | Na **aba A**, em "Quem é você?", digite `Padaria Central` e clique em **Entrar**. Em "Publicar doação", digite **Tipo:** `pão francês` · **Quantidade:** `5 kg` · **Validade:** a data de amanhã. Clique em **Publicar**. | Em "Doações disponíveis" aparece `pão francês — 5 kg (até AAAA-MM-DD)` com o botão **Aceitar**. Em "Minhas doações" aparece `pão francês — 5 kg: disponível` com o botão **Cancelar**. |
| 2 | Ainda na aba A, publique uma segunda doação: **Tipo:** `sopa` · **Quantidade:** `10 porções` · **Validade:** a data de amanhã. Clique em **Publicar**. | "Doações disponíveis" mostra as duas, da mais antiga para a mais recente: primeiro pão francês, depois sopa (CA-01). |
| 3 | **Antes de aceitar:** abra a **aba B** (ou recarregue com F5 se já estiver aberta) e deixe-a parada. | A aba B também mostra as duas doações. Não mexa mais nela até o passo 7. |
| 4 | Volte à **aba A**. Em "Filtrar por tipo", digite `pão`. | A lista mostra só `pão francês — 5 kg`. Apague o filtro e as duas voltam. |
| 5 | Na aba A, clique em **Aceitar** na linha do **pão francês**. | Aparece a faixa verde `Doação aceita em AAAA-MM-DDTHH:MM:SS…Z.` (horário do aceite em UTC, CA-02). O pão francês **sai** de "Doações disponíveis" (só a sopa fica). Em "Minhas doações" ele aparece como `aceita por Minha ONG em …`, sem o botão Cancelar. Em "Coletas pendentes" aparece `pão francês — 5 kg, aceita por Minha ONG` com o botão **Confirmar coleta**. |
| 6 | Na aba A, em "Coletas pendentes", clique em **Confirmar coleta**. | Aparece a faixa verde `Coleta confirmada em …`. "Coletas pendentes" mostra `Nenhuma coleta pendente.` e "Minhas doações" mostra o pão como `coletada em …` (CA-17). |
| 7 | **Caso de erro.** Vá para a **aba B** (a tela antiga, sem recarregar) e clique em **Aceitar** no **pão francês**. | Aparece a faixa vermelha **`esta doação já foi aceita por outra ONG`** (RN-02, CA-04). A lista da aba B se atualiza e o pão francês some dela. |
| 8 | Volte à **aba A** e recarregue (F5). Não precisa entrar de novo: o navegador guardou o doador ("Você está como Padaria Central"). | Em "Minhas doações" o pão francês continua com o **mesmo** horário de aceite do passo 5: a tentativa da ONG B não alterou nada. |
| 9 | **Persistência no PostgreSQL.** No terminal do servidor, pare com `Ctrl+C`, rode `npm start` de novo e recarregue a aba A. | A sopa continua em "Doações disponíveis" e o histórico da Padaria Central continua igual: os dados estão no banco, não na memória. |
| 10 | (Opcional, para a banca) No terminal, rode `npm test`. | Todos os testes passam, rodando no banco `pratocheio_teste`, que nunca é o banco da demo (ADR 0002). |

## Testado por

Outro integrante executou este roteiro sem ajuda: **[nome — quem NÃO escreveu o roteiro]**, em **19/11/2026**.

**O que precisou ser corrigido depois da execução:** [preencher: o que travou e o que mudou — ou "nada precisou mudar"]

> Ao escrever o roteiro, antes do teste, a revisão dos comandos encontrou dois erros de
> código que impediam a demo sobre PostgreSQL: o `npm run db:migrar` falhava porque o
> `src/db.js` ainda usava o `PRAGMA table_info` do SQLite, e o "Confirmar coleta" falharia
> porque o `src/repositorio.js` usava `datetime('now')` e o marcador `?`. Os dois foram
> corrigidos para a sintaxe do PostgreSQL (`ADD COLUMN IF NOT EXISTS`, `now()`, `$1`).
