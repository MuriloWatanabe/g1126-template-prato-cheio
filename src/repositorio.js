// Camada de dados do Prato Cheio — acesso ao banco.
// TODO (grupo): implementar as quatro funções abaixo usando query().
// A conexão e o schema já estão prontos em src/db.js.
//
// Marcador de parâmetro é `?` (SQL parametrizado evita injeção):
//   const { rows } = await query('SELECT * FROM doacoes WHERE id = ?', [id]);
import { query } from './db.js';

export async function inserir({ tipo, quantidade, validade, doador = null }) {
  const sql = `
    INSERT INTO doacoes (tipo, quantidade, validade, doador)
    VALUES (?, ?, ?, ?)
    RETURNING *
  `;
  const { rows } = await query(sql, [tipo, quantidade, validade, doador]);
  return rows[0];
}

export async function listarDisponiveis({ tipo } = {}) {
  // Filtro opcional por tipo: trecho do nome, sem diferenciar maiúsculas.
  // LOWER e LIKE existem igual no SQLite e no PostgreSQL (RNF-02).
  const filtros = ["status = 'disponivel'"];
  const valores = [];
  if (tipo) {
    filtros.push('LOWER(tipo) LIKE ?');
    valores.push(`%${tipo.toLowerCase()}%`);
  }
  const sql = `
    SELECT *
    FROM doacoes
    WHERE ${filtros.join(' AND ')}
    ORDER BY criada_em ASC, id ASC
  `;
  const { rows } = await query(sql, valores);
  return rows;
}

/** Todas as doações de um doador, em qualquer status, da mais antiga para a mais recente. */
export async function listarDoDoador(doador) {
  const sql = `
    SELECT *
    FROM doacoes
    WHERE doador = ?
    ORDER BY criada_em ASC, id ASC
  `;
  const { rows } = await query(sql, [doador]);
  return rows;
}

export async function buscarPorId(id) {
  const sql = 'SELECT * FROM doacoes WHERE id = ?';
  const { rows } = await query(sql, [id]);
  return rows[0];
}

/**
 * Marca a doação como aceita pela ONG e devolve a linha atualizada.
 *
 * RN-02 (reserva exclusiva): a condição `status = 'disponivel'` está DENTRO do
 * UPDATE, não em um SELECT anterior. Um único comando testa e altera o estado,
 * então duas ONGs aceitando ao mesmo tempo não conseguem as duas — a segunda
 * não encontra linha para atualizar e recebe `undefined`.
 * Ler antes e escrever depois abriria a janela entre as duas operações.
 */
export async function aceitar(id, ong) {
  const sql = `
    UPDATE doacoes
       SET status    = 'aceita',
           ong       = ?,
           aceita_em = datetime('now')
     WHERE id = ? AND status = 'disponivel'
    RETURNING *
  `;
  const { rows } = await query(sql, [ong, id]);
  return rows[0];
}
