// Conexão com o banco. Já vem pronto — não precisa mexer agora.
//
// UNIDADE 1: SQLite, embutido no Node (módulo `node:sqlite`) — nada para instalar.
// UNIDADE 3: este arquivo será refatorado para PostgreSQL. A interface abaixo
//            (`query` devolvendo `{ rows }`) foi desenhada para que a troca fique
//            contida aqui, sem espalhar mudança pelo resto do código.
// `node:sqlite` é módulo embutido do Node 22+. Carregado via createRequire porque
// algumas ferramentas (como o Vite/Vitest) ainda não o reconhecem como embutido.
import { createRequire } from 'node:module';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

// Banco exclusivo dos testes: SQLite em memória, que nasce vazio e some ao fim
// do processo. Nenhum dado real vive nele.
export const BANCO_DE_TESTE = ':memory:';

// Mudança de contexto (etapa 4, história 4b): os testes rodaram na máquina do
// piloto com DATABASE_FILE apontando para o banco real e a limpeza apagou as
// doações. Por isso, sob o Vitest, o banco é SEMPRE o de teste — nenhuma
// configuração externa (variável de ambiente, .env, vitest.config) o troca.
function escolherArquivo() {
  if (process.env.VITEST) return BANCO_DE_TESTE;
  return process.env.DATABASE_FILE || 'dados.sqlite';
}

let db;
let arquivoEmUso;

export function conexao() {
  if (!db) {
    arquivoEmUso = escolherArquivo();
    db = new DatabaseSync(arquivoEmUso);
  }
  return db;
}

/** Arquivo do banco aberto pela conexão atual (':memory:' nos testes). */
export function bancoEmUso() {
  conexao();
  return arquivoEmUso;
}

/**
 * Executa uma consulta e devolve { rows }.
 * Use `?` como marcador de parâmetro (evita injeção de SQL):
 *   query('SELECT * FROM doacoes WHERE id = ?', [id])
 */
export async function query(sql, valores = []) {
  const stmt = conexao().prepare(sql);
  const ehLeitura = /^\s*(select|with)/i.test(sql) || /returning/i.test(sql);
  if (ehLeitura) return { rows: stmt.all(...valores) };
  const info = stmt.run(...valores);
  return { rows: [], alteradas: info.changes };
}

/** Cria o schema, se ainda não existir. Rodado por `npm run db:migrar` e ao subir o servidor. */
export async function migrar() {
  conexao().exec(`
    CREATE TABLE IF NOT EXISTS doacoes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo        TEXT NOT NULL,
      quantidade  TEXT NOT NULL,
      validade    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'disponivel',
      ong         TEXT,
      doador      TEXT,
      criada_em   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Colunas acrescentadas depois da primeira versão do schema, de forma
  // idempotente para não quebrar bancos criados antes delas existirem:
  // - aceita_em: a história zero grava o horário do aceite (CA-02);
  // - doador: o doador vê a situação das próprias doações;
  // - cancelada_em: o doador cancela uma doação ainda disponível.
  const colunas = conexao().prepare('PRAGMA table_info(doacoes)').all();
  for (const nova of ['aceita_em', 'doador', 'cancelada_em']) {
    if (!colunas.some((c) => c.name === nova)) {
      conexao().exec(`ALTER TABLE doacoes ADD COLUMN ${nova} TEXT`);
    }
  }
}

/**
 * Apaga todos os dados. Usado pelos testes.
 * Segunda trava da história 4b: confere o banco em uso e recusa apagar
 * qualquer um que não seja o de teste, mesmo se chamada fora do Vitest.
 */
export async function limparBanco() {
  const arquivo = bancoEmUso();
  if (arquivo !== BANCO_DE_TESTE) {
    throw new Error(
      `limparBanco recusado: o banco em uso (${arquivo}) não é o banco de teste`
    );
  }
  conexao().exec('DELETE FROM doacoes');
}

export async function encerrar() {
  if (db) { db.close(); db = undefined; arquivoEmUso = undefined; }
}
