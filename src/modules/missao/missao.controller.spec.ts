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

async function calcular(token: string, droneId: string, mapaId: string) {
  return request(app).post('/missoes').set('Authorization', `Bearer ${token}`).send({ droneId, mapaId });
}

describe('POST /missoes', () => {
  // Caso 1
  it('calcula e persiste uma nova Missão para um par (drone, mapa) próprios', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);
    const mapa = await criarMapa(token);

    const resposta = await calcular(token, drone.id, mapa.id);

    expect(resposta.status).toBe(201);
    expect(resposta.body.status).toBe('ATIVA');
    expect(resposta.body.pernas).toBeInstanceOf(Array);
    expect(resposta.body.consumoEnergeticoTotal).toBeGreaterThan(0);
  });

  // Caso 2
  it('retorna 404 quando o drone não existe', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await calcular(token, '00000000-0000-0000-0000-000000000000', mapa.id);

    expect(resposta.status).toBe(404);
  });

  // Caso 3
  it('retorna 404 quando o mapa não existe', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);

    const resposta = await calcular(token, drone.id, '00000000-0000-0000-0000-000000000000');

    expect(resposta.status).toBe(404);
  });

  // Caso 4
  it('retorna 404 quando o drone pertence a outro usuário (RN11)', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const droneDoOutro = await criarDrone(outro.token);
    const mapa = await criarMapa(hugo.token);

    const resposta = await calcular(hugo.token, droneDoOutro.id, mapa.id);

    expect(resposta.status).toBe(404);
  });

  // Caso 5
  it('retorna 404 quando o mapa pertence a outro usuário (RN11)', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const drone = await criarDrone(hugo.token);
    const mapaDoOutro = await criarMapa(outro.token);

    const resposta = await calcular(hugo.token, drone.id, mapaDoOutro.id);

    expect(resposta.status).toBe(404);
  });

  // Caso 6
  it('rejeita payload com droneId/mapaId que não são uuid válidos', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await calcular(token, 'nao-e-um-uuid', 'nao-e-um-uuid');

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

    const resposta = await calcular(token, droneFraco.id, mapa.id);

    expect(resposta.status).toBe(409);
    const missoes = await prisma.missao.count();
    expect(missoes).toBe(0);
  });

  // Caso 9 (US-017/RN12)
  it('retorna 200 e reaproveita a Missão ativa existente sem recalcular', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);
    const mapa = await criarMapa(token);
    const primeira = await calcular(token, drone.id, mapa.id);

    const segunda = await calcular(token, drone.id, mapa.id);

    expect(segunda.status).toBe(200);
    expect(segunda.body.id).toBe(primeira.body.id);
    expect(segunda.body.pernas).toEqual(primeira.body.pernas);
    expect(segunda.body.consumoEnergeticoTotal).toBe(primeira.body.consumoEnergeticoTotal);
  });

  // Caso 10 (US-018/RN14)
  it('retorna 200, recalcula e reativa uma Missão desativada após edição do drone (RN13)', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);
    const mapa = await criarMapa(token);
    const original = await calcular(token, drone.id, mapa.id);

    await request(app)
      .patch(`/drones/${drone.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ velocidadeMedia: 2 }); // RN13: desativa a Missão

    const recalculada = await calcular(token, drone.id, mapa.id);

    expect(recalculada.status).toBe(200);
    expect(recalculada.body.id).toBe(original.body.id);
    expect(recalculada.body.status).toBe('ATIVA');
    expect(recalculada.body.consumoEnergeticoTotal).not.toBe(original.body.consumoEnergeticoTotal);
  });

  // Caso 11 (US-018/RN05 durante recálculo)
  it('retorna 409 e mantém a Missão desativada quando o recálculo não tem rota viável', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);
    const mapa = await criarMapa(token);
    const original = await calcular(token, drone.id, mapa.id);

    await request(app)
      .patch(`/drones/${drone.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ capacidadeBateria: 1 }); // RN13 (desativa) + inviabiliza o recálculo

    const resposta = await calcular(token, drone.id, mapa.id);

    expect(resposta.status).toBe(409);
    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: original.body.id } });
    expect(persistida.status).toBe('DESATIVADA');
    expect(persistida.consumoEnergeticoTotal).toBe(original.body.consumoEnergeticoTotal);
  });
});

describe('GET /missoes', () => {
  // Caso 1
  it('lista as missões do usuário autenticado, ativas e desativadas', async () => {
    const { token } = await cadastrarELogar('hugo');
    const droneA = await criarDrone(token);
    const mapaA = await criarMapa(token);
    const droneB = await criarDrone(token);
    const mapaB = await criarMapa(token, [{ x: 20, y: 20 }]);
    await calcular(token, droneA.id, mapaA.id);
    await calcular(token, droneB.id, mapaB.id);
    await request(app).patch(`/drones/${droneB.id}`).set('Authorization', `Bearer ${token}`).send({ velocidadeMedia: 3 });

    const resposta = await request(app).get('/missoes').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
    expect(resposta.body[0].pernas).toBeUndefined(); // resumo leve, sem pernas
    const statusEncontrados = resposta.body.map((m: { status: string }) => m.status).sort();
    expect(statusEncontrados).toEqual(['ATIVA', 'DESATIVADA']);
  });

  // Caso 2
  it('retorna lista vazia quando o usuário não tem missões', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app).get('/missoes').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  // Caso 3
  it('não lista missões de outros usuários', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const droneOutro = await criarDrone(outro.token);
    const mapaOutro = await criarMapa(outro.token);
    await calcular(outro.token, droneOutro.id, mapaOutro.id);

    const resposta = await request(app).get('/missoes').set('Authorization', `Bearer ${hugo.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  // Caso 4
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).get('/missoes');

    expect(resposta.status).toBe(401);
  });
});

describe('GET /missoes/:id', () => {
  // Caso 1
  it('consulta o detalhe de uma missão própria, com pernas completo', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);
    const mapa = await criarMapa(token);
    const criada = await calcular(token, drone.id, mapa.id);

    const resposta = await request(app).get(`/missoes/${criada.body.id}`).set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.pernas).toEqual(criada.body.pernas);
    expect(resposta.body.consumoEnergeticoTotal).toBe(criada.body.consumoEnergeticoTotal);
    expect(resposta.body.status).toBe('ATIVA');
  });

  // Caso 2
  it('retorna 404 para uma missão que não existe', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .get('/missoes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 3
  it('retorna 404 para uma missão de outro usuário', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const droneOutro = await criarDrone(outro.token);
    const mapaOutro = await criarMapa(outro.token);
    const missaoOutro = await calcular(outro.token, droneOutro.id, mapaOutro.id);

    const resposta = await request(app)
      .get(`/missoes/${missaoOutro.body.id}`)
      .set('Authorization', `Bearer ${hugo.token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 4
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).get('/missoes/qualquer-id');

    expect(resposta.status).toBe(401);
  });
});

describe('Ciclo de vida completo de uma Missão nascida do pipeline real (RN13/RN15)', () => {
  it('calcula, desativa ao editar o drone, e bloqueia a exclusão do drone', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);
    const mapa = await criarMapa(token);

    const criada = await calcular(token, drone.id, mapa.id);
    expect(criada.status).toBe(201);

    await request(app)
      .patch(`/drones/${drone.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Drone renomeado' });

    const desativada = await prisma.missao.findUniqueOrThrow({ where: { id: criada.body.id } });
    expect(desativada.status).toBe('DESATIVADA');

    const exclusao = await request(app).delete(`/drones/${drone.id}`).set('Authorization', `Bearer ${token}`);
    expect(exclusao.status).toBe(409);
  });

  it('calcula, desativa ao editar o mapa, e bloqueia a exclusão do mapa', async () => {
    const { token } = await cadastrarELogar('hugo');
    const drone = await criarDrone(token);
    const mapa = await criarMapa(token);

    const criada = await calcular(token, drone.id, mapa.id);
    expect(criada.status).toBe(201);

    await request(app)
      .post(`/mapas/${mapa.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 30, y: 30 });

    const desativada = await prisma.missao.findUniqueOrThrow({ where: { id: criada.body.id } });
    expect(desativada.status).toBe('DESATIVADA');

    const exclusao = await request(app).delete(`/mapas/${mapa.id}`).set('Authorization', `Bearer ${token}`);
    expect(exclusao.status).toBe(409);
  });
});
