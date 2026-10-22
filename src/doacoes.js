// Regras de negócio das doações.
// TODO (grupo): implementar conforme as histórias e os critérios de aceite da Unidade 1.
import * as repo from './repositorio.js';

// História zero — "um doador publica uma doação".
// Critério: tipo, quantidade e validade são obrigatórios.
// O nome do doador é opcional (não há login, ver "Fora da fatia" na Análise);
// quando informado, permite ao doador acompanhar as próprias doações.
export async function criarDoacao({ tipo, quantidade, validade, doador }) {
  const t = typeof tipo === 'string' ? tipo.trim() : '';
  const q = typeof quantidade === 'string' ? quantidade.trim() : '';
  const v = typeof validade === 'string' ? validade.trim() : '';
  const d = typeof doador === 'string' && doador.trim() ? doador.trim() : null;

  if (!t || !q || !v) {
    throw new Error('tipo, quantidade e validade são obrigatórios');
  }

  return await repo.inserir({ tipo: t, quantidade: q, validade: v, doador: d });
}

// História zero — "uma ONG vê as doações disponíveis".
// Fatia 2 — "a ONG filtra as disponíveis por tipo e vê a validade".
// Sem tipo (ou tipo em branco), devolve todas as disponíveis.
export async function listarDisponiveis({ tipo } = {}) {
  const t = typeof tipo === 'string' ? tipo.trim() : '';
  return await repo.listarDisponiveis({ tipo: t || undefined });
}

// História — "o doador vê a situação das próprias doações"
// (disponível ou aceita, e por qual ONG).
export async function listarDoDoador(doador) {
  const d = typeof doador === 'string' ? doador.trim() : '';
  if (!d) throw new Error('informe o doador');

  const doacoes = await repo.listarDoDoador(d);
  return doacoes.map(({ id, tipo, quantidade, validade, status, ong, criada_em, aceita_em }) => ({
    id, tipo, quantidade, validade, status, ong, criada_em, aceita_em
  }));
}

// História zero — "uma ONG aceita uma doação".
// RN-02: uma doação aceita não fica disponível para outra ONG.
export async function aceitar(id, ong) {
  const identificador = Number(id);
  if (!Number.isInteger(identificador) || identificador <= 0) {
    throw new Error('identificador de doação inválido');
  }

  const nomeOng = typeof ong === 'string' && ong.trim() ? ong.trim() : 'ONG';

  const aceita = await repo.aceitar(identificador, nomeOng);
  if (aceita) return aceita;

  // Não atualizou: ou a doação não existe, ou já estava aceita (RN-02).
  const existente = await repo.buscarPorId(identificador);
  if (!existente) throw new Error('doação não encontrada');
  throw new Error('esta doação já foi aceita por outra ONG');
}
