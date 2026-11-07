// Camada de dados do Prato Cheio — todo o SQL do sistema fica aqui (RNF-02).
// A conexão e o schema estão em src/db.js.
//
// Marcadores de parâmetro do PostgreSQL: `$1`, `$2`… (SQL parametrizado evita injeção):
//   const { rows } = await query('SELECT * FROM doacoes WHERE id = $1', [id]);
import { query } from './db.js';

export async function inserir({ tipo, quantidade, validade, doador = null }) {
  const sql = `
    INSERT INTO doacoes (tipo, quantidade, validade, doador)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const { rows } = await query(sql, [tipo, quantidade, validade, doador]);
  return rows[0];
}

export async function listarDisponiveis({ tipo } = {}) {
  // Filtro opcional por tipo: trecho do nome, sem diferenciar maiúsculas (ILIKE).
  const filtros = ["status = 'disponivel'"];
  const valores = [];
  if (tipo) {
    valores.push(`%${tipo}%`);
    filtros.push(`tipo ILIKE $${valores.length}`);
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
    WHERE doador = $1
    ORDER BY criada_em ASC, id ASC
  `;
  const { rows } = await query(sql, [doador]);
  return rows;
}

export async function buscarPorId(id) {
  const sql = 'SELECT * FROM doacoes WHERE id = $1';
  const { rows } = await query(sql, [id]);
  return rows[0];
}

/**
 * Marca a doação como aceita pela ONG e devolve a linha atualizada.
 *
 * RN-02 (reserva exclusiva): a condição `status = 'disponivel'` está DENTRO do
 * UPDATE, não em um SELECT anterior. Um único comando testa e altera o estado,
 * então duas ONGs aceitando ao mesmo tempo não conseguem as duas — no
 * PostgreSQL a segunda espera a trava da linha, reavalia o WHERE, não encontra
 * linha disponível e recebe `undefined`.
 * Ler antes e escrever depois abriria a janela entre as duas operações.
 */
export async function aceitar(id, ong) {
  const sql = `
    UPDATE doacoes
       SET status    = 'aceita',
           ong       = $1,
           aceita_em = now()
     WHERE id = $2 AND status = 'disponivel'
    RETURNING *
  `;
  const { rows } = await query(sql, [ong, id]);
  return rows[0];
}

/**
 * Marca a doação como cancelada pelo próprio doador e devolve a linha atualizada.
 *
 * Mesmo padrão do aceite: as condições (é do doador e ainda está disponível)
 * ficam DENTRO do UPDATE. Se uma ONG aceitar no mesmo instante, só um dos dois
 * comandos encontra a linha disponível — nunca há doação aceita e cancelada.
 */
export async function cancelar(id, doador) {
  const sql = `
    UPDATE doacoes
       SET status       = 'cancelada',
           cancelada_em = now()
     WHERE id = $1 AND doador = $2 AND status = 'disponivel'
    RETURNING *
  `;
  const { rows } = await query(sql, [id, doador]);
  return rows[0];
}

/** Doações aceitas que aguardam a coleta, da aceita há mais tempo para a mais recente. */
export async function listarColetasPendentes() {
  const sql = `
    SELECT *
    FROM doacoes
    WHERE status = 'aceita'
    ORDER BY aceita_em ASC, id ASC
  `;
  const { rows } = await query(sql);
  return rows;
}

/**
 * Marca a doação como coletada e devolve a linha atualizada.
 *
 * Mesmo padrão do aceite: a condição `status = 'aceita'` fica DENTRO do UPDATE,
 * então confirmações simultâneas não registram a coleta duas vezes.
 */
export async function coletar(id) {
  const sql = `
    UPDATE doacoes
       SET status      = 'coletada',
           coletada_em = datetime('now')
     WHERE id = ? AND status = 'aceita'
    RETURNING *
  `;
  const { rows } = await query(sql, [id]);
  return rows[0];
}
