import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/prisma';

const app = createApp();

async function cadastrarELogar(nome: string, senha = 'senhaForte123') {
  const cadastro = await request(app).post('/usuarios').send({ nome, senha });
  const login = await request(app).post('/auth/login').send({ nome, senha });
  return { id: cadastro.body.id as string, token: login.body.token as string };
}

async function criarDrone(token: string, overrides: Record<string, number> = {}) {
  const resposta = await request(app)
    .post('/drones')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nome: 'Drone A',
      consumoPorIrrigacao: 1,
      velocidadeMedia: 1,
      capacidadeBateria: 10_000_000,
      ...overrides,
    });
  return resposta.body as { id: string };
}

async function criarMapa(token: string, pontosIrrigacao: { x: number; y: number }[] = [{ x: 10, y: 10 }]) {
  const resposta = await request(app)
    .post('/mapas')
    .set('Authorization', `Bearer ${token}`)
    .send({ pontoCarregamento: { x: 0, y: 0 }, pontosIrrigacao });
  return resposta.body as { id: string };
}

describe('POST /missoes', () => {
  // Caso 1
  it('calcula e persiste uma nova Missão para um par (drone, mapa) próprios', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .post('/missoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ droneId: drone.id, mapaId: mapa.id });

    expect(resposta.status).toBe(201);
    expect(resposta.body.status).toBe('ATIVA');
    expect(resposta.body.pernas).toBeInstanceOf(Array);
    expect(resposta.body.consumoEnergeticoTotal).toBeGreaterThan(0);
  });

  // Caso 2
  it('retorna 404 quando o drone não existe', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .post('/missoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ droneId: '00000000-0000-0000-0000-000000000000', mapaId: mapa.id });

    expect(resposta.status).toBe(404);
  });

  // Caso 3
  it('retorna 404 quando o mapa não existe', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);

    const resposta = await request(app)
      .post('/missoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ droneId: drone.id, mapaId: '00000000-0000-0000-0000-000000000000' });

    expect(resposta.status).toBe(404);
  });

  // Caso 4
  it('retorna 404 quando o drone pertence a outro usuário (RN11)', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const droneDoOutro = await criarDrone(outro.token);
    const mapa = await criarMapa(hugo.token);

    const resposta = await request(app)
      .post('/missoes')
      .set('Authorization', `Bearer ${hugo.token}`)
      .send({ droneId: droneDoOutro.id, mapaId: mapa.id });

    expect(resposta.status).toBe(404);
  });

  // Caso 5
  it('retorna 404 quando o mapa pertence a outro usuário (RN11)', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const drone = await criarDrone(hugo.token);
    const mapaDoOutro = await criarMapa(outro.token);

    const resposta = await request(app)
      .post('/missoes')
      .set('Authorization', `Bearer ${hugo.token}`)
      .send({ droneId: drone.id, mapaId: mapaDoOutro.id });

    expect(resposta.status).toBe(404);
  });

  // Caso 6
  it('rejeita payload com droneId/mapaId que não são uuid válidos', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/missoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ droneId: 'nao-e-um-uuid', mapaId: 'nao-e-um-uuid' });

    expect(resposta.status).toBe(400);
  });

  // Caso 7
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).post('/missoes').send({ droneId: 'x', mapaId: 'y' });

    expect(resposta.status).toBe(401);
  });

  // Caso 8 (RN05)
  it('retorna 409 e não persiste Missão quando nenhuma rota viável existe', async () => {
    const { token } = await cadastrarELogar('hugo');
    const droneFraco = await criarDrone(token, { capacidadeBateria: 1 });
    const mapa = await criarMapa(token, [{ x: 1000, y: 1000 }]);

    const resposta = await request(app)
      .post('/missoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ droneId: droneFraco.id, mapaId: mapa.id });

    expect(resposta.status).toBe(409);
    const missoes = await prisma.missao.count();
    expect(missoes).toBe(0);
  });

  // Caso 9
  it('retorna 409 quando já existe Missão persistida para o par', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);
    const mapa = await criarMapa(token);
    await request(app)
      .post('/missoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ droneId: drone.id, mapaId: mapa.id });

    const resposta = await request(app)
      .post('/missoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ droneId: drone.id, mapaId: mapa.id });

    expect(resposta.status).toBe(409);
  });
});
