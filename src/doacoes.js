// Regras de negócio das doações.
// TODO (grupo): implementar conforme as histórias e os critérios de aceite da Unidade 1.
import * as repo from './repositorio.js';

// História zero — "um doador publica uma doação".
// Critério: tipo, quantidade e validade são obrigatórios.
export async function criarDoacao({ tipo, quantidade, validade }) {
  const t = typeof tipo === 'string' ? tipo.trim() : '';
  const q = typeof quantidade === 'string' ? quantidade.trim() : '';
  const v = typeof validade === 'string' ? validade.trim() : '';

  if (!t || !q || !v) {
    throw new Error('tipo, quantidade e validade são obrigatórios');
  }

  return await repo.inserir({ tipo: t, quantidade: q, validade: v });
}

// História zero — "uma ONG vê as doações disponíveis".
export async function listarDisponiveis() {
  return await repo.listarDisponiveis();
}

// História zero — "uma ONG aceita uma doação".
// Regra do caso: uma doação aceita não fica disponível para outra ONG.
export async function aceitar(id, ong) {
  throw new Error('não implementado: aceitar');
}
