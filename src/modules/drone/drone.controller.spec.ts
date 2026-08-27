import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/prisma';

const app = createApp();

async function cadastrarELogar(nome: string, senha = 'senhaForte123') {
  const cadastro = await request(app).post('/usuarios').send({ nome, senha });
  const login = await request(app).post('/auth/login').send({ nome, senha });
  return { id: cadastro.body.id as string, token: login.body.token as string };
}

const droneValido = {
  nome: 'Drone A',
  consumoPorIrrigacao: 1.5,
  velocidadeMedia: 10,
  capacidadeBateria: 50000,
};

describe('POST /drones', () => {
  // Caso 1
  it('cadastra um drone com atributos válidos', async () => {
    const { token, id } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send(droneValido);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ nome: 'Drone A', userId: id });
    expect(resposta.body.id).toEqual(expect.any(String));
  });

  // Caso 2
  it('aceita valores decimais nos atributos numéricos', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Drone B', consumoPorIrrigacao: 0.5, velocidadeMedia: 12.75, capacidadeBateria: 999.99 });

    expect(resposta.status).toBe(201);
  });

  // Caso 3
  it('associa o drone criado ao usuário correto, não a outros', async () => {
    const hugo = await cadastrarELogar('hugo');
    await cadastrarELogar('outro');

    const resposta = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${hugo.token}`)
      .send(droneValido);

    const persistido = await prisma.drone.findUniqueOrThrow({ where: { id: resposta.body.id } });
    expect(persistido.userId).toBe(hugo.id);
  });

  // Caso 4
  it('ignora campos extras não esperados no payload', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...droneValido, fabricante: 'Acme' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.fabricante).toBeUndefined();
  });

  // Caso 5
  it('aceita valor numérico positivo muito próximo de zero', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...droneValido, consumoPorIrrigacao: 0.0001 });

    expect(resposta.status).toBe(201);
  });

  // Caso 6
  it('permite múltiplos drones do mesmo usuário com ids distintos', async () => {
    const { token, id } = await cadastrarELogar('hugo');

    const primeiro = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    const segundo = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    expect(primeiro.body.id).not.toBe(segundo.body.id);
    expect(primeiro.body.userId).toBe(id);
    expect(segundo.body.userId).toBe(id);
  });

  // Casos 7-12
  it.each([
    ['consumoPorIrrigacao', 0],
    ['consumoPorIrrigacao', -1],
    ['velocidadeMedia', 0],
    ['velocidadeMedia', -1],
    ['capacidadeBateria', 0],
    ['capacidadeBateria', -1],
  ])('rejeita %s igual a %d', async (campo, valor) => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...droneValido, [campo]: valor });

    expect(resposta.status).toBe(400);
    const drones = await prisma.drone.findMany();
    expect(drones).toHaveLength(0);
  });

  // Caso 13
  it('rejeita nome vazio', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...droneValido, nome: '' });

    expect(resposta.status).toBe(400);
  });

  // Caso 14
  it('rejeita payload sem nome', async () => {
    const { token } = await cadastrarELogar('hugo');
    const { nome: _nome, ...semNome } = droneValido;

    const resposta = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(semNome);

    expect(resposta.status).toBe(400);
  });

  // Caso 15
  it('rejeita payload sem um atributo numérico obrigatório', async () => {
    const { token } = await cadastrarELogar('hugo');
    const { capacidadeBateria: _capacidadeBateria, ...semCapacidade } = droneValido;

    const resposta = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send(semCapacidade);

    expect(resposta.status).toBe(400);
  });

  // Caso 16
  it('rejeita tipo inválido em campo numérico', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...droneValido, consumoPorIrrigacao: 'dez' });

    expect(resposta.status).toBe(400);
  });

  // Caso 17
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).post('/drones').send(droneValido);

    expect(resposta.status).toBe(401);
    const drones = await prisma.drone.findMany();
    expect(drones).toHaveLength(0);
  });
});

describe('GET /drones', () => {
  // Caso 1
  it('lista todos os drones do usuário autenticado', async () => {
    const { token } = await cadastrarELogar('hugo');
    await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...droneValido, nome: 'Drone C' });

    const resposta = await request(app).get('/drones').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
  });

  // Caso 2
  it('retorna lista vazia quando o usuário não tem drones', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app).get('/drones').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  // Caso 3
  it('não lista drones de outros usuários', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    await request(app).post('/drones').set('Authorization', `Bearer ${hugo.token}`).send(droneValido);
    await request(app).post('/drones').set('Authorization', `Bearer ${outro.token}`).send(droneValido);
    await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${outro.token}`)
      .send({ ...droneValido, nome: 'Drone C' });

    const resposta = await request(app).get('/drones').set('Authorization', `Bearer ${hugo.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].userId).toBe(hugo.id);
  });

  // Caso 4
  it('lista corretamente muitos drones do mesmo usuário', async () => {
    const { token } = await cadastrarELogar('hugo');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/drones')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...droneValido, nome: `Drone ${i}` }),
      ),
    );

    const resposta = await request(app).get('/drones').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(5);
  });

  // Caso 5
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).get('/drones');

    expect(resposta.status).toBe(401);
  });
});

describe('GET /drones/:id', () => {
  // Caso 1
  it('consulta um drone próprio pelo id', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    const resposta = await request(app)
      .get(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject(droneValido);
  });

  // Caso 2
  it('retorna 404 para um id com formato válido mas inexistente', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .get('/drones/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 3
  it('retorna 404 para um id que não existe', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .get('/drones/id-qualquer-inexistente')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 4
  it('retorna 404 para drone de outro usuário', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const droneDoOutro = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${outro.token}`)
      .send(droneValido);

    const resposta = await request(app)
      .get(`/drones/${droneDoOutro.body.id}`)
      .set('Authorization', `Bearer ${hugo.token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 5
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).get('/drones/qualquer-id');

    expect(resposta.status).toBe(401);
  });
});

describe('PATCH /drones/:id', () => {
  // Caso 1
  it('edita um único atributo, mantendo os demais inalterados', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    const resposta = await request(app)
      .patch(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Novo nome' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      nome: 'Novo nome',
      consumoPorIrrigacao: droneValido.consumoPorIrrigacao,
      velocidadeMedia: droneValido.velocidadeMedia,
      capacidadeBateria: droneValido.capacidadeBateria,
    });
  });

  // Caso 2
  it('edita todos os 4 atributos de uma vez', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    const novosValores = { nome: 'Drone Z', consumoPorIrrigacao: 2, velocidadeMedia: 20, capacidadeBateria: 80000 };

    const resposta = await request(app)
      .patch(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(novosValores);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject(novosValores);
  });

  // Caso 3
  it('edita apenas um atributo numérico', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    const resposta = await request(app)
      .patch(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ capacidadeBateria: 80000 });

    expect(resposta.status).toBe(200);
    expect(resposta.body.capacidadeBateria).toBe(80000);
    expect(resposta.body.nome).toBe(droneValido.nome);
  });

  // Caso 4
  it('rejeita payload vazio', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    const resposta = await request(app)
      .patch(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(resposta.status).toBe(400);
  });

  // Caso 5
  it('ignora campos extras no payload', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    const resposta = await request(app)
      .patch(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Novo nome', fabricante: 'Acme' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.fabricante).toBeUndefined();
  });

  // Caso 6
  it.each([
    ['consumoPorIrrigacao', 0],
    ['consumoPorIrrigacao', -1],
    ['velocidadeMedia', 0],
    ['velocidadeMedia', -1],
    ['capacidadeBateria', 0],
    ['capacidadeBateria', -1],
  ])('rejeita %s igual a %d', async (campo, valor) => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    const resposta = await request(app)
      .patch(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ [campo]: valor });

    expect(resposta.status).toBe(400);
    const persistido = await prisma.drone.findUniqueOrThrow({ where: { id: criado.body.id } });
    expect(persistido).toMatchObject(droneValido);
  });

  // Caso 7
  it('rejeita nome vazio', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    const resposta = await request(app)
      .patch(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: '' });

    expect(resposta.status).toBe(400);
  });

  // Caso 8
  it('rejeita tipo inválido em campo numérico', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    const resposta = await request(app)
      .patch(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ velocidadeMedia: 'rápido' });

    expect(resposta.status).toBe(400);
  });

  // Caso 9
  it('retorna 404 para drone que não existe', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .patch('/drones/id-inexistente')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Novo nome' });

    expect(resposta.status).toBe(404);
  });

  // Caso 10
  it('retorna 404 para drone de outro usuário e não altera o registro', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const droneDoOutro = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${outro.token}`)
      .send(droneValido);

    const resposta = await request(app)
      .patch(`/drones/${droneDoOutro.body.id}`)
      .set('Authorization', `Bearer ${hugo.token}`)
      .send({ nome: 'Roubado' });

    expect(resposta.status).toBe(404);
    const persistido = await prisma.drone.findUniqueOrThrow({ where: { id: droneDoOutro.body.id } });
    expect(persistido.nome).toBe(droneValido.nome);
  });

  // Caso 11
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).patch('/drones/qualquer-id').send({ nome: 'Novo nome' });

    expect(resposta.status).toBe(401);
  });

  // Caso 12 (RN13)
  it('desativa todas as Missões ativas do drone ao editar com sucesso', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    const droneId = criado.body.id as string;

    const mapaA = await prisma.mapa.create({ data: { pontoCarregamentoX: 0, pontoCarregamentoY: 0, userId: usuarioId } });
    const mapaB = await prisma.mapa.create({ data: { pontoCarregamentoX: 1, pontoCarregamentoY: 1, userId: usuarioId } });
    const missaoA = await prisma.missao.create({ data: { droneId, mapaId: mapaA.id, status: 'ATIVA' } });
    const missaoB = await prisma.missao.create({ data: { droneId, mapaId: mapaB.id, status: 'ATIVA' } });

    const resposta = await request(app)
      .patch(`/drones/${droneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Nome editado' });

    expect(resposta.status).toBe(200);
    const missoes = await prisma.missao.findMany({ where: { id: { in: [missaoA.id, missaoB.id] } } });
    expect(missoes.every((m) => m.status === 'DESATIVADA')).toBe(true);
  });

  // Caso 13 (RN13)
  it('mantém Missão já desativada sem erro ao editar o drone', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    const droneId = criado.body.id as string;
    const mapa = await prisma.mapa.create({ data: { pontoCarregamentoX: 0, pontoCarregamentoY: 0, userId: usuarioId } });
    const missao = await prisma.missao.create({ data: { droneId, mapaId: mapa.id, status: 'DESATIVADA' } });

    const resposta = await request(app)
      .patch(`/drones/${droneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Nome editado' });

    expect(resposta.status).toBe(200);
    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });

  // Caso 14 (RN13)
  it('não afeta Missões de outros drones', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const droneA = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    const droneB = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...droneValido, nome: 'Drone B' });
    const mapaA = await prisma.mapa.create({ data: { pontoCarregamentoX: 0, pontoCarregamentoY: 0, userId: usuarioId } });
    const mapaB = await prisma.mapa.create({ data: { pontoCarregamentoX: 1, pontoCarregamentoY: 1, userId: usuarioId } });
    await prisma.missao.create({ data: { droneId: droneA.body.id, mapaId: mapaA.id, status: 'ATIVA' } });
    const missaoB = await prisma.missao.create({ data: { droneId: droneB.body.id, mapaId: mapaB.id, status: 'ATIVA' } });

    await request(app)
      .patch(`/drones/${droneA.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Nome editado' });

    const persistidaB = await prisma.missao.findUniqueOrThrow({ where: { id: missaoB.id } });
    expect(persistidaB.status).toBe('ATIVA');
  });
});

describe('DELETE /drones/:id', () => {
  // Caso 1
  it('exclui um drone próprio sem Missão associada', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);

    const resposta = await request(app)
      .delete(`/drones/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(204);
    const persistido = await prisma.drone.findUnique({ where: { id: criado.body.id } });
    expect(persistido).toBeNull();
  });

  // Caso 2
  it('exclui apenas o drone alvo, mantendo os demais do usuário', async () => {
    const { token } = await cadastrarELogar('hugo');
    const droneA = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    const droneB = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...droneValido, nome: 'Drone B' });

    const resposta = await request(app)
      .delete(`/drones/${droneA.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(204);
    const persistidoB = await prisma.drone.findUnique({ where: { id: droneB.body.id } });
    expect(persistidoB).not.toBeNull();
  });

  // Caso 3
  it('retorna 404 para drone que não existe', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .delete('/drones/id-inexistente')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 4
  it('retorna 404 para drone de outro usuário e não o exclui', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const droneDoOutro = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${outro.token}`)
      .send(droneValido);

    const resposta = await request(app)
      .delete(`/drones/${droneDoOutro.body.id}`)
      .set('Authorization', `Bearer ${hugo.token}`);

    expect(resposta.status).toBe(404);
    const persistido = await prisma.drone.findUnique({ where: { id: droneDoOutro.body.id } });
    expect(persistido).not.toBeNull();
  });

  // Caso 5
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).delete('/drones/qualquer-id');

    expect(resposta.status).toBe(401);
  });

  // Caso 6 (RN15)
  it('bloqueia exclusão de drone com Missão ativa associada', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    const droneId = criado.body.id as string;
    const mapa = await prisma.mapa.create({ data: { pontoCarregamentoX: 0, pontoCarregamentoY: 0, userId: usuarioId } });
    await prisma.missao.create({ data: { droneId, mapaId: mapa.id, status: 'ATIVA' } });

    const resposta = await request(app).delete(`/drones/${droneId}`).set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(409);
    const persistido = await prisma.drone.findUnique({ where: { id: droneId } });
    expect(persistido).not.toBeNull();
  });

  // Caso 7 (RN15)
  it('bloqueia exclusão de drone com Missão desativada associada', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    const droneId = criado.body.id as string;
    const mapa = await prisma.mapa.create({ data: { pontoCarregamentoX: 0, pontoCarregamentoY: 0, userId: usuarioId } });
    await prisma.missao.create({ data: { droneId, mapaId: mapa.id, status: 'DESATIVADA' } });

    const resposta = await request(app).delete(`/drones/${droneId}`).set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(409);
    const persistido = await prisma.drone.findUnique({ where: { id: droneId } });
    expect(persistido).not.toBeNull();
  });

  // Caso 8 (RN15)
  it('permite excluir drone sem Missão mesmo quando outro drone do usuário tem Missão associada', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const droneA = await request(app).post('/drones').set('Authorization', `Bearer ${token}`).send(droneValido);
    const droneB = await request(app)
      .post('/drones')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...droneValido, nome: 'Drone B' });
    const mapa = await prisma.mapa.create({ data: { pontoCarregamentoX: 0, pontoCarregamentoY: 0, userId: usuarioId } });
    await prisma.missao.create({ data: { droneId: droneA.body.id, mapaId: mapa.id, status: 'ATIVA' } });

    const resposta = await request(app)
      .delete(`/drones/${droneB.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(204);
    const persistidoA = await prisma.drone.findUnique({ where: { id: droneA.body.id } });
    expect(persistidoA).not.toBeNull();
  });
});
