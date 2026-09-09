// Camada de dados do Prato Cheio — acesso ao banco.
// TODO (grupo): implementar as quatro funções abaixo usando query().
// A conexão e o schema já estão prontos em src/db.js.
//
// Marcador de parâmetro é `?` (SQL parametrizado evita injeção):
//   const { rows } = await query('SELECT * FROM doacoes WHERE id = ?', [id]);
import { query } from './db.js';

export async function inserir({ tipo, quantidade, validade }) {
  const sql = `
    INSERT INTO doacoes (tipo, quantidade, validade)
    VALUES (?, ?, ?)
    RETURNING *
  `;
  const { rows } = await query(sql, [tipo, quantidade, validade]);
  return rows[0];
}

export async function listarDisponiveis() {
  const sql = `
    SELECT *
    FROM doacoes
    WHERE status = 'disponivel'
    ORDER BY criada_em DESC, id DESC
  `;
  const { rows } = await query(sql);
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
