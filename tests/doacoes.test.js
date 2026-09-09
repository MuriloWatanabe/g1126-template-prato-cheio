import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/db.js';

const app = criarApp();

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

// Este teste já passa e não depende do banco:
// prova que a aplicação sobe e que o CI está funcionando.
describe('a aplicação sobe', () => {
  it('responde na verificação de saúde', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Critérios de aceite da história zero (docs/analise.md) virados teste.
// ---------------------------------------------------------------------------

const doacaoValida = {
  tipo: 'Pão francês',
  quantidade: '5 kg',
  validade: '2026-12-31'
};

async function publicar(dados = doacaoValida) {
  return await request(app).post('/api/doacoes').send(dados);
}

describe('publicar e listar doações', () => {
  // CA-01 — Dado que um doador publicou uma doação
  //         Quando uma ONG consulta as doações disponíveis
  //         Então a doação aparece na lista
  it('mostra a doação publicada na lista de disponíveis', async () => {
    const criada = await publicar();
    expect(criada.status).toBe(201);

    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('Pão francês');
    expect(res.body[0].status).toBe('disponivel');
  });

  // CA-08 (RN-01) — Dado um formulário com campo obrigatório vazio
  //                 Quando o doador confirma a publicação
  //                 Então a publicação é recusada e nada entra na lista
  it('recusa doação sem os campos obrigatórios', async () => {
    const res = await publicar({ tipo: 'Sopa', quantidade: '', validade: '2026-12-31' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/obrigatórios/);

    const lista = await request(app).get('/api/doacoes');
    expect(lista.body).toHaveLength(0);
  });
});

describe('aceitar uma doação', () => {
  // CA-02 — Dado uma doação disponível
  //         Quando a ONG A aceita
  //         Então o aceite é confirmado com o horário registrado
  it('marca a doação como aceita pela ONG', async () => {
    const { body: criada } = await publicar();

    const res = await request(app)
      .post(`/api/doacoes/${criada.id}/aceitar`)
      .send({ ong: 'ONG A' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('aceita');
    expect(res.body.ong).toBe('ONG A');
    expect(res.body.aceita_em).toBeTruthy();
  });

  // CA-03 (RN-02) — Dado uma doação já aceita pela ONG A
  //                 Quando a ONG B consulta as disponíveis
  //                 Então a doação não aparece
  it('remove a doação da lista de disponíveis depois de aceita', async () => {
    const { body: criada } = await publicar();
    await request(app).post(`/api/doacoes/${criada.id}/aceitar`).send({ ong: 'ONG A' });

    const lista = await request(app).get('/api/doacoes');
    expect(lista.body).toHaveLength(0);
  });

  // CA-04 (RN-02) — Dado uma doação já aceita pela ONG A
  //                 Quando a ONG B tenta aceitar a mesma doação
  //                 Então recebe erro e o aceite da ONG A permanece intacto
  it('recusa aceitar uma doação que já foi aceita por outra ONG', async () => {
    const { body: criada } = await publicar();
    const primeiro = await request(app)
      .post(`/api/doacoes/${criada.id}/aceitar`)
      .send({ ong: 'ONG A' });

    const segundo = await request(app)
      .post(`/api/doacoes/${criada.id}/aceitar`)
      .send({ ong: 'ONG B' });

    expect(segundo.status).toBe(400);
    expect(segundo.body.erro).toMatch(/já foi aceita/);
    expect(primeiro.body.ong).toBe('ONG A');

    const lista = await request(app).get('/api/doacoes');
    expect(lista.body).toHaveLength(0);
  });

  // Caminho proibido — doação inexistente
  it('recusa aceitar uma doação que não existe', async () => {
    const res = await request(app).post('/api/doacoes/999/aceitar').send({ ong: 'ONG A' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não encontrada/);
  });
});
