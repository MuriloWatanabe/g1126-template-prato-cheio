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
  return doacoes.map(({ id, tipo, quantidade, validade, status, ong, criada_em, aceita_em, cancelada_em, coletada_em }) => ({
    id, tipo, quantidade, validade, status, ong, criada_em, aceita_em, cancelada_em, coletada_em
  }));
}

function validarId(id) {
  const identificador = Number(id);
  if (!Number.isInteger(identificador) || identificador <= 0) {
    throw new Error('identificador de doação inválido');
  }
  return identificador;
}

// História zero — "uma ONG aceita uma doação".
// RN-02: uma doação aceita não fica disponível para outra ONG.
export async function aceitar(id, ong) {
  const identificador = validarId(id);

  const nomeOng = typeof ong === 'string' && ong.trim() ? ong.trim() : 'ONG';

  const aceita = await repo.aceitar(identificador, nomeOng);
  if (aceita) return aceita;

  // Não atualizou: ou a doação não existe, ou já estava aceita (RN-02).
  const existente = await repo.buscarPorId(identificador);
  if (!existente) throw new Error('doação não encontrada');
  if (existente.status === 'cancelada') throw new Error('esta doação foi cancelada pelo doador');
  throw new Error('esta doação já foi aceita por outra ONG');
}

// História — "o doador cancela uma doação ainda disponível".
// Só quem publicou cancela, e só enquanto nenhuma ONG aceitou: depois do
// aceite a ONG já pode estar a caminho (RN-02 garante a reserva para ela).
export async function cancelar(id, doador) {
  const identificador = validarId(id);
  const d = typeof doador === 'string' ? doador.trim() : '';
  if (!d) throw new Error('informe o doador');

  const cancelada = await repo.cancelar(identificador, d);
  if (cancelada) return cancelada;

  // Não atualizou: descobre o motivo para dar a mensagem certa.
  const existente = await repo.buscarPorId(identificador);
  if (!existente) throw new Error('doação não encontrada');
  if (existente.doador !== d) throw new Error('só quem publicou a doação pode cancelá-la');
  if (existente.status === 'cancelada') throw new Error('esta doação já foi cancelada');
  throw new Error('esta doação já foi aceita por uma ONG e não pode ser cancelada');
}

// História — "o voluntário confirma a coleta pelo celular".
export async function listarColetasPendentes() {
  return await repo.listarColetasPendentes();
}

// Fatia 1 (CA-17): só doação aceita pode ser coletada, e o horário gravado é o
// do servidor. O horário do toque e o reenvio ficam para as próximas fatias.
export async function confirmarColeta(id) {
  const identificador = validarId(id);

  const coletada = await repo.coletar(identificador);
  if (coletada) return coletada;

  // Não atualizou: descobre o motivo para dar a mensagem certa.
  const existente = await repo.buscarPorId(identificador);
  if (!existente) throw new Error('doação não encontrada');
  if (existente.status === 'coletada') throw new Error('a coleta desta doação já foi confirmada');
  if (existente.status === 'cancelada') throw new Error('esta doação foi cancelada pelo doador');
  throw new Error('esta doação ainda não foi aceita por uma ONG');
}
