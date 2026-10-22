import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bancoEmUso, encerrar, BANCO_DE_TESTE } from '../src/db.js';

// ---------------------------------------------------------------------------
// História 4b (mudança de contexto) — os testes não conseguem apagar nem
// alterar dados de um banco que não seja o de teste, seja qual for a máquina
// ou a configuração.
// ---------------------------------------------------------------------------

let pasta;

beforeEach(() => {
  pasta = mkdtempSync(join(tmpdir(), 'prato-cheio-'));
});

afterEach(async () => {
  await encerrar();
  rmSync(pasta, { recursive: true, force: true });
});

// Roda um script num processo Node separado, FORA do Vitest, simulando a
// máquina do piloto com DATABASE_FILE apontando para o banco real.
function rodarForaDosTestes(script, arquivoDoBanco) {
  const env = { ...process.env, DATABASE_FILE: arquivoDoBanco };
  for (const chave of Object.keys(env)) {
    if (chave.startsWith('VITEST')) delete env[chave];
  }
  const urlDb = pathToFileURL(join(process.cwd(), 'src', 'db.js')).href;
  const saida = execFileSync(
    process.execPath,
    ['--no-warnings', '--input-type=module', '-e', script.replace('URL_DB', urlDb)],
    { env, encoding: 'utf8' }
  );
  return JSON.parse(saida.trim().split('\n').pop());
}

describe('proteção do banco real contra a limpeza dos testes', () => {
  // Dado que o banco em uso não é o de teste (o banco real do piloto)
  // Quando a limpeza é chamada
  // Então ela falha e nenhuma doação é apagada
  it('recusa limpar um banco que não é o de teste e preserva as doações', () => {
    const bancoReal = join(pasta, 'piloto.sqlite');

    const resultado = rodarForaDosTestes(`
      const db = await import('URL_DB');
      await db.migrar();
      await db.query("INSERT INTO doacoes (tipo, quantidade, validade) VALUES ('Arroz', '10 kg', '2026-12-31')");
      await db.query("INSERT INTO doacoes (tipo, quantidade, validade) VALUES ('Feijão', '8 kg', '2026-12-31')");
      const antes = (await db.query('SELECT COUNT(*) AS n FROM doacoes')).rows[0].n;
      let erro = null;
      try { await db.limparBanco(); } catch (e) { erro = e.message; }
      const depois = (await db.query('SELECT COUNT(*) AS n FROM doacoes')).rows[0].n;
      await db.encerrar();
      console.log(JSON.stringify({ antes, depois, erro }));
    `, bancoReal);

    expect(resultado.erro).toMatch(/limparBanco recusado/);
    expect(resultado.antes).toBe(2);
    expect(resultado.depois).toBe(2);
  });

  // Dado DATABASE_FILE apontando para o arquivo do banco real
  // Quando os testes abrem a conexão
  // Então usam o banco de teste em memória e o arquivo real nem é tocado
  it('usa sempre o banco de teste, mesmo com DATABASE_FILE apontando para outro', async () => {
    const bancoReal = join(pasta, 'piloto.sqlite');
    const original = process.env.DATABASE_FILE;
    process.env.DATABASE_FILE = bancoReal;
    try {
      await encerrar();
      expect(bancoEmUso()).toBe(BANCO_DE_TESTE);
      expect(existsSync(bancoReal)).toBe(false);
    } finally {
      if (original === undefined) delete process.env.DATABASE_FILE;
      else process.env.DATABASE_FILE = original;
    }
  });
});
