import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar, query } from '../src/db.js';

// ---------------------------------------------------------------------------
// H3 — "a ONG devolve uma doação que aceitou e não vai conseguir buscar"
// (critérios da iteração 3). Decisões em docs/analise.md, seção 17.
// ---------------------------------------------------------------------------

const app = criarApp();

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

const daPadaria = {
  tipo: 'Pão francês',
  quantidade: '5 kg',
  validade: '2026-12-31',
  doador: 'Padaria Pão Bom'
};

async function publicar(dados = daPadaria) {
  const { body } = await request(app).post('/api/doacoes').send(dados);
  return body;
}

function aceitar(id, ong) {
  return request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong });
}

async function publicarEAceitar(ong = 'Casa Esperança') {
  const criada = await publicar();
  const { body } = await aceitar(criada.id, ong);
  return body;
}

function devolver(id, { ong = 'Casa Esperança', motivo = 'sem voluntário hoje' } = {}) {
  return request(app).post(`/api/doacoes/${id}/devolver`).send({ ong, motivo });
}

function disponiveis() {
  return request(app).get('/api/doacoes');
}

function coletasPendentes() {
  return request(app).get('/api/coletas/pendentes');
}

async function minhaDoacao() {
  const { body } = await request(app).get('/api/doadores/Padaria Pão Bom/doacoes');
  return body[0];
}

async function devolucoesRegistradas(doacaoId) {
  const { rows } = await query(
    'SELECT ong, motivo, devolvida_em FROM devolucoes WHERE doacao_id = $1 ORDER BY id',
    [doacaoId]
  );
  return rows;
}

describe('H3 — a ONG devolve uma doação aceita', () => {
  // CA1 — Dado que a "Casa Esperança" aceitou uma doação
  //       Quando ela a devolve com o motivo "sem voluntário hoje"
  //       Então a doação volta para a lista de disponíveis, sem ONG, e o motivo fica registrado
  it('CA1: a doação devolvida volta para a lista de disponíveis, sem ONG, e o motivo fica registrado', async () => {
    const aceita = await publicarEAceitar('Casa Esperança');

    const res = await devolver(aceita.id, { ong: 'Casa Esperança', motivo: 'sem voluntário hoje' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: aceita.id, status: 'disponivel', ong: null, aceita_em: null });

    const lista = await disponiveis();
    expect(lista.body.map((d) => d.id)).toEqual([aceita.id]);
    expect(lista.body[0]).toMatchObject({ status: 'disponivel', ong: null, aceita_em: null });
    expect(JSON.stringify(lista.body)).not.toContain('Casa Esperança');
    expect((await coletasPendentes()).body).toEqual([]);

    const [registro] = await devolucoesRegistradas(aceita.id);
    expect(registro).toMatchObject({ ong: 'Casa Esperança', motivo: 'sem voluntário hoje' });
    expect(registro.devolvida_em).toBeTruthy();
  });

  // CA2 — Dado que a doação já foi coletada
  //       Quando a ONG tenta devolvê-la
  //       Então a devolução é recusada com mensagem
  it('CA2: recusa devolver uma doação já coletada, com mensagem, e ela continua coletada', async () => {
    const aceita = await publicarEAceitar('Casa Esperança');
    await request(app).post(`/api/doacoes/${aceita.id}/coletar`).send({ voluntario: 'Rui' });

    const res = await devolver(aceita.id);

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('esta doação já foi coletada e não pode ser devolvida');
    expect(await minhaDoacao()).toMatchObject({ status: 'coletada', ong: 'Casa Esperança' });
    expect(await devolucoesRegistradas(aceita.id)).toEqual([]);
  });

  // Decisão do grupo: o motivo é obrigatório — sem ele a Marta (H4) não sabe
  // por que a doação voltou. Sem motivo, nada muda.
  it.each([
    ['ausente', undefined],
    ['vazio', ''],
    ['só espaços', '   ']
  ])('recusa a devolução com motivo %s e a doação continua aceita', async (_caso, motivo) => {
    const aceita = await publicarEAceitar();

    const res = await request(app)
      .post(`/api/doacoes/${aceita.id}/devolver`)
      .send({ ong: 'Casa Esperança', motivo });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('informe o motivo da devolução');
    expect((await coletasPendentes()).body.map((d) => d.id)).toEqual([aceita.id]);
    expect(await devolucoesRegistradas(aceita.id)).toEqual([]);
  });

  // A ONG também é obrigatória: a devolução registra quem desistiu da doação.
  it('recusa a devolução sem o nome da ONG e a doação continua aceita', async () => {
    const aceita = await publicarEAceitar();

    const res = await devolver(aceita.id, { ong: '  ' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/informe a ONG/);
    expect((await coletasPendentes()).body.map((d) => d.id)).toEqual([aceita.id]);
  });

  // Decisão do grupo: a ONG que devolveu pode aceitar a mesma doação de novo
  // (o voluntário pode aparecer depois). A doação volta inteira, sem marca.
  it('a ONG que devolveu pode aceitar a mesma doação de novo', async () => {
    const aceita = await publicarEAceitar('Casa Esperança');
    await devolver(aceita.id);

    const res = await aceitar(aceita.id, 'Casa Esperança');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'aceita', ong: 'Casa Esperança' });
  });

  // Dado uma doação devolvida duas vezes (por ONGs diferentes)
  // Quando se consultam as devoluções registradas
  // Então as duas estão lá, na ordem — a doação não guarda nenhuma, o histórico guarda todas
  it('cada devolução fica registrada, sem apagar as anteriores', async () => {
    const aceita = await publicarEAceitar('Casa Esperança');
    await devolver(aceita.id, { ong: 'Casa Esperança', motivo: 'sem voluntário hoje' });
    await aceitar(aceita.id, 'Lar Bom Pastor');
    await devolver(aceita.id, { ong: 'Lar Bom Pastor', motivo: 'carro quebrado' });

    const registros = await devolucoesRegistradas(aceita.id);

    expect(registros.map(({ ong, motivo }) => ({ ong, motivo }))).toEqual([
      { ong: 'Casa Esperança', motivo: 'sem voluntário hoje' },
      { ong: 'Lar Bom Pastor', motivo: 'carro quebrado' }
    ]);
  });
});

describe('limites e erros da devolução', () => {
  it('recusa devolver uma doação que nenhuma ONG aceitou', async () => {
    const disponivel = await publicar();

    const res = await devolver(disponivel.id);

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('esta doação não está aceita por nenhuma ONG');
    expect(await devolucoesRegistradas(disponivel.id)).toEqual([]);
  });

  it('recusa devolver uma doação cancelada pelo doador', async () => {
    const criada = await publicar();
    await request(app).post(`/api/doacoes/${criada.id}/cancelar`).send({ doador: 'Padaria Pão Bom' });

    const res = await devolver(criada.id);

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('esta doação foi cancelada pelo doador');
  });

  it('recusa devolver uma doação que não existe', async () => {
    const res = await devolver(999);

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('doação não encontrada');
  });

  it('recusa devolver com identificador inválido', async () => {
    const res = await devolver('abc');

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('identificador de doação inválido');
  });

  // E se repetir ao mesmo tempo?
  // Dado uma doação aceita
  // Quando a ONG toca em "Devolver" duas vezes no mesmo instante
  // Então só uma devolução acontece e só um motivo fica registrado
  it('duas devoluções simultâneas da mesma doação registram só uma', async () => {
    const aceita = await publicarEAceitar();

    const respostas = await Promise.all([devolver(aceita.id), devolver(aceita.id)]);

    expect(respostas.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(await devolucoesRegistradas(aceita.id)).toHaveLength(1);
  });
});
