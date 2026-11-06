// Conexão com o banco: PostgreSQL pelo driver `pg` (ADR 0001).
//
// A interface (`query` devolvendo `{ rows }`) é a mesma da época do SQLite,
// então a troca de banco ficou contida aqui e em src/repositorio.js.
import pg from 'pg';

// Banco exclusivo dos testes, criado pelo docker-compose.yml e pelo CI.
// Nenhum dado real vive nele.
export const BANCO_DE_TESTE = 'pratocheio_teste';

const SERVIDOR_LOCAL = 'postgres://pratocheio:pratocheio@localhost:5432';

// Mudança de contexto (etapa 4, história 4b): os testes rodaram na máquina do
// piloto apontando para o banco real e a limpeza apagou as doações. Por isso,
// sob o Vitest, o banco é SEMPRE o de teste — nenhuma configuração externa
// (DATABASE_URL, .env, vitest.config) o troca.
function escolherUrl() {
  if (process.env.VITEST) return `${SERVIDOR_LOCAL}/${BANCO_DE_TESTE}`;
  return process.env.DATABASE_URL || `${SERVIDOR_LOCAL}/pratocheio`;
}

let pool;

function conexao() {
  pool ??= new pg.Pool({ connectionString: escolherUrl() });
  return pool;
}

/**
 * Executa uma consulta e devolve { rows }.
 * Use `$1`, `$2`… como marcadores de parâmetro (evita injeção de SQL):
 *   query('SELECT * FROM doacoes WHERE id = $1', [id])
 */
export async function query(sql, valores = []) {
  const { rows } = await conexao().query(sql, valores);
  return { rows };
}

/** Nome do banco aberto pela conexão atual ('pratocheio_teste' nos testes). */
export async function bancoEmUso() {
  const { rows } = await query('SELECT current_database() AS nome');
  return rows[0].nome;
}

/**
 * Cria o schema, se ainda não existir. Rodado por `npm run db:migrar` e ao subir o servidor.
 * Os horários são `timestamptz`: o instante fica gravado em UTC (RNF-03).
 */
export async function migrar() {
  await query(`
    CREATE TABLE IF NOT EXISTS doacoes (
      id            SERIAL PRIMARY KEY,
      tipo          TEXT NOT NULL,
      quantidade    TEXT NOT NULL,
      validade      TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'disponivel',
      ong           TEXT,
      doador        TEXT,
      criada_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
      aceita_em     TIMESTAMPTZ,
      cancelada_em  TIMESTAMPTZ
    )
  `);
}

/**
 * Apaga todos os dados. Usado pelos testes.
 * Segunda trava da história 4b: confere o banco em uso e recusa apagar
 * qualquer um que não seja o de teste, mesmo se chamada fora do Vitest.
 */
export async function limparBanco() {
  const banco = await bancoEmUso();
  if (banco !== BANCO_DE_TESTE) {
    throw new Error(
      `limparBanco recusado: o banco em uso (${banco}) não é o banco de teste`
    );
  }
  await query('DELETE FROM doacoes');
}

export async function encerrar() {
  if (pool) {
    const aberto = pool;
    pool = undefined;
    await aberto.end();
  }
}
