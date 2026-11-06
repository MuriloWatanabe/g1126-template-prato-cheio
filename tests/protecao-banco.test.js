import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { bancoEmUso, encerrar, migrar, BANCO_DE_TESTE } from '../src/db.js';

// ---------------------------------------------------------------------------
// História 4b (mudança de contexto) — os testes não conseguem apagar nem
// alterar dados de um banco que não seja o de teste, seja qual for a máquina
// ou a configuração. Mesmos cenários da versão SQLite (revisão do ADR 0001).
// ---------------------------------------------------------------------------

const SERVIDOR = 'postgres://pratocheio:pratocheio@localhost:5432';

// Faz o papel do banco real do piloto: criado e apagado a cada teste.
const BANCO_DO_PILOTO = 'pratocheio_piloto_protecao';
const URL_DO_PILOTO = `${SERVIDOR}/${BANCO_DO_PILOTO}`;

// Conexão avulsa, fora de src/db.js, para preparar e inspecionar os bancos.
async function consultar(banco, sql) {
  const cliente = new pg.Client({ connectionString: `${SERVIDOR}/${banco}` });
  await cliente.connect();
  try {
    return (await cliente.query(sql)).rows;
  } finally {
    await cliente.end();
  }
}

beforeEach(async () => {
  await consultar(BANCO_DE_TESTE, `DROP DATABASE IF EXISTS ${BANCO_DO_PILOTO} WITH (FORCE)`);
  await consultar(BANCO_DE_TESTE, `CREATE DATABASE ${BANCO_DO_PILOTO}`);
});

afterEach(async () => {
  await encerrar();
  await consultar(BANCO_DE_TESTE, `DROP DATABASE IF EXISTS ${BANCO_DO_PILOTO} WITH (FORCE)`);
});

// Roda um script num processo Node separado, FORA do Vitest, simulando a
// máquina do piloto com DATABASE_URL apontando para o banco real.
function rodarForaDosTestes(script, urlDoBanco) {
  const env = { ...process.env, DATABASE_URL: urlDoBanco };
  for (const chave of Object.keys(env)) {
    if (chave.startsWith('VITEST')) delete env[chave];
  }
  const urlDb = pathToFileURL(join(process.cwd(), 'src', 'db.js')).href;
  const saida = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', script.replace('URL_DB', urlDb)],
    { env, encoding: 'utf8' }
  );
  return JSON.parse(saida.trim().split('\n').pop());
}

describe('proteção do banco real contra a limpeza dos testes', () => {
  // Dado que o banco em uso não é o de teste (o banco real do piloto)
  // Quando a limpeza é chamada
  // Então ela falha e nenhuma doação é apagada
  it('recusa limpar um banco que não é o de teste e preserva as doações', () => {
    const resultado = rodarForaDosTestes(`
      const db = await import('URL_DB');
      const contar = async () => (await db.query('SELECT COUNT(*)::int AS n FROM doacoes')).rows[0].n;
      await db.migrar();
      await db.query("INSERT INTO doacoes (tipo, quantidade, validade) VALUES ('Arroz', '10 kg', '2026-12-31')");
      await db.query("INSERT INTO doacoes (tipo, quantidade, validade) VALUES ('Feijão', '8 kg', '2026-12-31')");
      const antes = await contar();
      let erro = null;
      try { await db.limparBanco(); } catch (e) { erro = e.message; }
      const depois = await contar();
      await db.encerrar();
      console.log(JSON.stringify({ antes, depois, erro }));
    `, URL_DO_PILOTO);

    expect(resultado.erro).toMatch(/limparBanco recusado/);
    expect(resultado.antes).toBe(2);
    expect(resultado.depois).toBe(2);
  });

  // Dado DATABASE_URL apontando para o banco real
  // Quando os testes abrem a conexão
  // Então usam o banco de teste e o banco real nem é tocado
  it('usa sempre o banco de teste, mesmo com DATABASE_URL apontando para outro', async () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = URL_DO_PILOTO;
    try {
      await encerrar();
      await migrar();
      expect(await bancoEmUso()).toBe(BANCO_DE_TESTE);

      const [tabela] = await consultar(BANCO_DO_PILOTO, "SELECT to_regclass('doacoes') AS nome");
      expect(tabela.nome).toBeNull();
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});
