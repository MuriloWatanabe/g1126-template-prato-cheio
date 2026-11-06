import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/db.js';

// ---------------------------------------------------------------------------
// História — o voluntário confirma a coleta pelo celular.
// Testes da Parte B: critérios da fatia 1 (CA-17) e da regra que ela
// implementa (só doação aceita pode ser coletada), mais casos limite e de erro.
// Os testes que vieram no PR da fatia estão em tests/doacoes.test.js.
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
  doador: 'Padaria Central'
};

async function publicar(dados = daPadaria) {
  const { body } = await request(app).post('/api/doacoes').send(dados);
  return body;
}

async function aceitar(id, ong = 'ONG A') {
  const { body } = await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong });
  return body;
}

async function publicarEAceitar(dados = daPadaria, ong = 'ONG A') {
  const criada = await publicar(dados);
  return await aceitar(criada.id, ong);
}

function confirmarColeta(id) {
  return request(app).post(`/api/doacoes/${id}/coletar`);
}

function coletasPendentes() {
  return request(app).get('/api/coletas/pendentes');
}

describe('critérios da coleta (CA-17)', () => {
  // Dado duas doações aceitas aguardando coleta
  // Quando o voluntário confirma a coleta da primeira
  // Então só ela sai das coletas pendentes; a outra continua lá
  it('confirmar a coleta tira das pendentes só a doação coletada', async () => {
    const pao = await publicarEAceitar();
    const sopa = await publicarEAceitar(
      { tipo: 'Sopa', quantidade: '3 kg', validade: '2026-12-01', doador: 'Padaria Central' },
      'ONG B'
    );

    await confirmarColeta(pao.id);

    const res = await coletasPendentes();
    expect(res.status).toBe(200);
    expect(res.body.map((d) => d.id)).toEqual([sopa.id]);
    expect(res.body[0]).toMatchObject({ tipo: 'Sopa', ong: 'ONG B', status: 'aceita' });
  });

  // Dado uma doação aceita pela ONG A
  // Quando o voluntário confirma a coleta
  // Então a resposta mantém a ONG e o horário do aceite originais
  it('a coleta mantém a ONG que aceitou e o horário do aceite', async () => {
    const aceita = await publicarEAceitar();

    const res = await confirmarColeta(aceita.id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: aceita.id,
      tipo: 'Pão francês',
      status: 'coletada',
      ong: 'ONG A',
      aceita_em: aceita.aceita_em
    });
  });

  // Dado uma doação disponível, uma cancelada, uma aceita e uma já coletada
  // Quando o voluntário abre as coletas pendentes
  // Então vê só a aceita — é a única que ainda espera o voluntário
  it('só doação aceita entra nas coletas pendentes: disponível, cancelada e coletada ficam fora', async () => {
    await publicar({ ...daPadaria, tipo: 'Arroz' });

    const cancelada = await publicar({ ...daPadaria, tipo: 'Feijão' });
    await request(app)
      .post(`/api/doacoes/${cancelada.id}/cancelar`)
      .send({ doador: 'Padaria Central' });

    const aceita = await publicarEAceitar({ ...daPadaria, tipo: 'Sopa' });

    const coletada = await publicarEAceitar({ ...daPadaria, tipo: 'Leite' });
    await confirmarColeta(coletada.id);

    const res = await coletasPendentes();
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: aceita.id, tipo: 'Sopa', status: 'aceita' });
  });

  // Dado uma doação aceita e depois coletada
  // Quando uma ONG abre a lista de disponíveis
  // Então a doação coletada não está lá — coletar não devolve a doação à lista
  it('a doação coletada não volta para a lista de disponíveis', async () => {
    const aceita = await publicarEAceitar();
    await confirmarColeta(aceita.id);

    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('limites e erros da coleta', () => {
  // E se vier vazio?
  // Dado que nenhuma doação foi aceita (só há uma disponível)
  // Quando o voluntário abre as coletas pendentes
  // Então recebe lista vazia, sem erro
  it('coletas pendentes vêm vazias quando nenhuma doação foi aceita', async () => {
    await publicar();

    const res = await coletasPendentes();
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // E se faltar algo / vier errado?
  // Dado uma doação aceita aguardando coleta
  // Quando o celular manda a confirmação com um identificador que não é número inteiro positivo
  // Então cada tentativa é recusada com a mensagem de identificador inválido e a coleta segue pendente
  it('recusa confirmar a coleta com identificador inválido', async () => {
    const aceita = await publicarEAceitar();

    for (const invalido of ['abc', '0', '-1', '1.5']) {
      const res = await confirmarColeta(invalido);
      expect(res.status, `id ${invalido}`).toBe(400);
      expect(res.body.erro, `id ${invalido}`).toBe('identificador de doação inválido');
    }

    const pendentes = await coletasPendentes();
    expect(pendentes.body.map((d) => d.id)).toEqual([aceita.id]);
  });

  // E se repetir ao mesmo tempo?
  // Dado uma doação aceita
  // Quando dois celulares confirmam a coleta no mesmo instante
  // Então exatamente uma confirmação é aceita e a outra recebe "já foi confirmada"
  it('duas confirmações simultâneas da mesma coleta registram só uma', async () => {
    const aceita = await publicarEAceitar();

    const respostas = await Promise.all([
      confirmarColeta(aceita.id),
      confirmarColeta(aceita.id)
    ]);

    const sucessos = respostas.filter((r) => r.status === 200);
    const recusas = respostas.filter((r) => r.status === 400);
    expect(sucessos).toHaveLength(1);
    expect(sucessos[0].body.status).toBe('coletada');
    expect(recusas).toHaveLength(1);
    expect(recusas[0].body.erro).toMatch(/já foi confirmada/);
  });

  // Dado uma doação já coletada pela ONG A
  // Quando a ONG B, com a tela antiga aberta, tenta aceitá-la
  // Então recebe erro e o doador continua vendo a doação coletada pela ONG A
  it('recusa que outra ONG aceite uma doação já coletada', async () => {
    const aceita = await publicarEAceitar();
    await confirmarColeta(aceita.id);

    const res = await request(app)
      .post(`/api/doacoes/${aceita.id}/aceitar`)
      .send({ ong: 'ONG B' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/já foi aceita/);

    const minhas = await request(app).get('/api/doadores/Padaria Central/doacoes');
    expect(minhas.body[0]).toMatchObject({ status: 'coletada', ong: 'ONG A' });
  });
});
