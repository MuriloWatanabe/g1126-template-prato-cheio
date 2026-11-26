// Regras de negócio das doações.
// TODO (grupo): implementar conforme as histórias e os critérios de aceite da Unidade 1.
import * as repo from './repositorio.js';

// História zero — "um doador publica uma doação".
// Critério: tipo, quantidade e validade são obrigatórios.
// H1 (CA3): o doador também é obrigatório — sem ele a doação não poderia ser
// acompanhada por ninguém. Não há login: o doador se identifica pelo nome
// (ver "Limitações do produto" no README).
export async function criarDoacao({ tipo, quantidade, validade, doador }) {
  const t = typeof tipo === 'string' ? tipo.trim() : '';
  const q = typeof quantidade === 'string' ? quantidade.trim() : '';
  const v = typeof validade === 'string' ? validade.trim() : '';
  const d = typeof doador === 'string' ? doador.trim() : '';

  if (!d) {
    throw new Error('informe o doador: identifique-se antes de publicar uma doação');
  }
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

// H1 — "o doador acompanha as suas doações": só as dele, em qualquer situação
// (disponível, aceita — e por qual ONG —, cancelada ou coletada).
// Doações antigas, publicadas quando o doador era opcional, não têm doador e
// por isso não aparecem para ninguém (decisão registrada em docs/analise.md).
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

// H2 — "o voluntário confirma a coleta".
// CA1: só doação aceita pode ser coletada; grava o nome do voluntário e o horário
//      do servidor. O horário do toque e o reenvio ficam para as próximas fatias.
// CA2: doação que não está aceita (disponível, cancelada ou já coletada) é
//      recusada com mensagem e não muda.
// O nome do voluntário é obrigatório: sem ele a coleta não diz quem a fez. É o
// único dado pessoal guardado (só o nome digitado; sem telefone nem documento)
// e não é exposto na consulta do doador (ver docs/analise.md, seção 16).
export async function confirmarColeta(id, voluntario) {
  const identificador = validarId(id);
  const nome = typeof voluntario === 'string' ? voluntario.trim() : '';
  if (!nome) throw new Error('informe o voluntário: identifique-se antes de confirmar a coleta');

  const coletada = await repo.coletar(identificador, nome);
  if (coletada) return coletada;

  // Não atualizou: descobre o motivo para dar a mensagem certa.
  const existente = await repo.buscarPorId(identificador);
  if (!existente) throw new Error('doação não encontrada');
  if (existente.status === 'coletada') throw new Error('a coleta desta doação já foi confirmada');
  if (existente.status === 'cancelada') throw new Error('esta doação foi cancelada pelo doador');
  throw new Error('esta doação ainda não foi aceita por uma ONG');
}

// H3 — "a ONG devolve uma doação que aceitou e não vai conseguir buscar".
// CA1: a doação aceita volta para a lista de disponíveis, sem ONG, e o motivo
//      fica registrado (tabela `devolucoes`, que a Marta lê na H4).
// CA2: doação já coletada (ou que não está aceita) é recusada com mensagem.
// A ONG e o motivo são obrigatórios: sem eles a devolução não diz quem desistiu
// nem por quê (decisões em docs/analise.md, seção 17).
export async function devolver(id, ong, motivo) {
  const identificador = validarId(id);
  const nomeOng = typeof ong === 'string' ? ong.trim() : '';
  if (!nomeOng) throw new Error('informe a ONG: identifique-se antes de devolver a doação');
  const motivoInformado = typeof motivo === 'string' ? motivo.trim() : '';
  if (!motivoInformado) throw new Error('informe o motivo da devolução');

  const devolvida = await repo.devolver(identificador, nomeOng, motivoInformado);
  if (devolvida) return devolvida;

  // Não atualizou: descobre o motivo para dar a mensagem certa.
  const existente = await repo.buscarPorId(identificador);
  if (!existente) throw new Error('doação não encontrada');
  if (existente.status === 'coletada') throw new Error('esta doação já foi coletada e não pode ser devolvida');
  if (existente.status === 'cancelada') throw new Error('esta doação foi cancelada pelo doador');
  throw new Error('esta doação não está aceita por nenhuma ONG');
}
