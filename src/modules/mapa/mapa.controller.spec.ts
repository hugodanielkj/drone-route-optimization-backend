import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/prisma';

const app = createApp();

async function cadastrarELogar(nome: string, senha = 'senhaForte123') {
  const cadastro = await request(app).post('/usuarios').send({ nome, senha });
  const login = await request(app).post('/auth/login').send({ nome, senha });
  return { id: cadastro.body.id as string, token: login.body.token as string };
}

const mapaValido = {
  pontoCarregamento: { x: 0, y: 0 },
  pontosIrrigacao: [{ x: 10, y: 10 }],
};

describe('POST /mapas', () => {
  // Caso 1
  it('cadastra um mapa com ponto de carregamento e um ponto de irrigação', async () => {
    const { token, id } = await cadastrarELogar('hugo');

    const resposta = await request(app).post('/mapas').set('Authorization', `Bearer ${token}`).send(mapaValido);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      pontoCarregamento: { x: 0, y: 0 },
      userId: id,
    });
    expect(resposta.body.pontosIrrigacao).toHaveLength(1);
    expect(resposta.body.pontosIrrigacao[0]).toMatchObject({ x: 10, y: 10 });
  });

  // Caso 2
  it('cadastra um mapa com múltiplos pontos de irrigação', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        pontoCarregamento: { x: 0, y: 0 },
        pontosIrrigacao: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 },
        ],
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.pontosIrrigacao).toHaveLength(3);
  });

  // Caso 3
  it('aceita coordenadas negativas e decimais', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        pontoCarregamento: { x: -10.5, y: 3.2 },
        pontosIrrigacao: [{ x: -1.1, y: 8.9 }],
      });

    expect(resposta.status).toBe(201);
  });

  // Caso 4
  it('ignora campos extras não esperados no payload', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...mapaValido, nome: 'Área 1' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.nome).toBeUndefined();
  });

  // Caso 5
  it('associa o mapa criado ao usuário correto, não a outros', async () => {
    const hugo = await cadastrarELogar('hugo');
    await cadastrarELogar('outro');

    const resposta = await request(app).post('/mapas').set('Authorization', `Bearer ${hugo.token}`).send(mapaValido);

    const persistido = await prisma.mapa.findUniqueOrThrow({ where: { id: resposta.body.id } });
    expect(persistido.userId).toBe(hugo.id);
  });

  // Caso 6 (RN16)
  it('cadastra o número máximo permitido de pontos de irrigação', async () => {
    const { token } = await cadastrarELogar('hugo');
    const pontosIrrigacao = Array.from({ length: 1000 }, (_, i) => ({ x: i + 1, y: i + 1 }));

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({ pontoCarregamento: { x: 0, y: 0 }, pontosIrrigacao });

    expect(resposta.status).toBe(201);
    expect(resposta.body.pontosIrrigacao).toHaveLength(1000);
  }, 15000);

  // Caso 7
  it('aceita ponto de irrigação com coordenada muito próxima do ponto de carregamento, mas não igual (RN17)', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        pontoCarregamento: { x: 0, y: 0 },
        pontosIrrigacao: [{ x: 0.0001, y: 0 }],
      });

    expect(resposta.status).toBe(201);
  });

  // Caso 8
  it('rejeita lista de pontos de irrigação vazia', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({ pontoCarregamento: { x: 0, y: 0 }, pontosIrrigacao: [] });

    expect(resposta.status).toBe(400);
    const mapas = await prisma.mapa.findMany();
    expect(mapas).toHaveLength(0);
  });

  // Caso 9
  it('rejeita payload sem ponto de carregamento', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({ pontosIrrigacao: [{ x: 1, y: 1 }] });

    expect(resposta.status).toBe(400);
  });

  // Caso 10
  it('rejeita coordenada com tipo inválido', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({ pontoCarregamento: { x: 'zero', y: 0 }, pontosIrrigacao: [{ x: 1, y: 1 }] });

    expect(resposta.status).toBe(400);
  });

  // Caso 11 (RN16)
  it('rejeita lista de pontos de irrigação com mais de 1000 pontos', async () => {
    const { token } = await cadastrarELogar('hugo');
    const pontosIrrigacao = Array.from({ length: 1001 }, (_, i) => ({ x: i + 1, y: i + 1 }));

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({ pontoCarregamento: { x: 0, y: 0 }, pontosIrrigacao });

    expect(resposta.status).toBe(400);
    const mapas = await prisma.mapa.findMany();
    expect(mapas).toHaveLength(0);
  }, 15000);

  // Caso 12 (RN17)
  it('rejeita ponto de irrigação igual ao ponto de carregamento', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({ pontoCarregamento: { x: 5, y: 5 }, pontosIrrigacao: [{ x: 5, y: 5 }] });

    expect(resposta.status).toBe(400);
    const mapas = await prisma.mapa.findMany();
    expect(mapas).toHaveLength(0);
  });

  // Caso 13 (RN18)
  it('rejeita dois pontos de irrigação com coordenadas iguais entre si', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        pontoCarregamento: { x: 0, y: 0 },
        pontosIrrigacao: [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
        ],
      });

    expect(resposta.status).toBe(400);
    const mapas = await prisma.mapa.findMany();
    expect(mapas).toHaveLength(0);
  });

  // Caso 14
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).post('/mapas').send(mapaValido);

    expect(resposta.status).toBe(401);
    const mapas = await prisma.mapa.findMany();
    expect(mapas).toHaveLength(0);
  });
});

describe('GET /mapas', () => {
  // Caso 1
  it('lista todos os mapas do usuário autenticado', async () => {
    const { token } = await cadastrarELogar('hugo');
    await request(app).post('/mapas').set('Authorization', `Bearer ${token}`).send(mapaValido);
    await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${token}`)
      .send({ pontoCarregamento: { x: 1, y: 1 }, pontosIrrigacao: [{ x: 2, y: 2 }] });

    const resposta = await request(app).get('/mapas').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
  });

  // Caso 2
  it('retorna lista vazia quando o usuário não tem mapas', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app).get('/mapas').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  // Caso 3
  it('lista corretamente muitos mapas do mesmo usuário', async () => {
    const { token } = await cadastrarELogar('hugo');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/mapas')
          .set('Authorization', `Bearer ${token}`)
          .send({ pontoCarregamento: { x: i, y: i }, pontosIrrigacao: [{ x: i + 100, y: i + 100 }] }),
      ),
    );

    const resposta = await request(app).get('/mapas').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(5);
  });

  // Caso 4
  it('não lista mapas de outros usuários', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    await request(app).post('/mapas').set('Authorization', `Bearer ${hugo.token}`).send(mapaValido);
    await request(app).post('/mapas').set('Authorization', `Bearer ${outro.token}`).send(mapaValido);

    const resposta = await request(app).get('/mapas').set('Authorization', `Bearer ${hugo.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].userId).toBe(hugo.id);
  });

  // Caso 5
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).get('/mapas');

    expect(resposta.status).toBe(401);
  });
});

describe('GET /mapas/:id', () => {
  // Caso 1
  it('consulta um mapa próprio pelo id', async () => {
    const { token } = await cadastrarELogar('hugo');
    const criado = await request(app).post('/mapas').set('Authorization', `Bearer ${token}`).send(mapaValido);

    const resposta = await request(app).get(`/mapas/${criado.body.id}`).set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ pontoCarregamento: { x: 0, y: 0 } });
    expect(resposta.body.pontosIrrigacao).toHaveLength(1);
  });

  // Caso 2
  it('retorna 404 para um id com formato válido mas inexistente', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .get('/mapas/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 3
  it('retorna 404 para um id que não existe', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app).get('/mapas/id-qualquer-inexistente').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 4
  it('retorna 404 para mapa de outro usuário', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const mapaDoOutro = await request(app)
      .post('/mapas')
      .set('Authorization', `Bearer ${outro.token}`)
      .send(mapaValido);

    const resposta = await request(app)
      .get(`/mapas/${mapaDoOutro.body.id}`)
      .set('Authorization', `Bearer ${hugo.token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 5
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).get('/mapas/qualquer-id');

    expect(resposta.status).toBe(401);
  });
});

async function criarMapa(token: string, payload: typeof mapaValido = mapaValido) {
  const resposta = await request(app).post('/mapas').set('Authorization', `Bearer ${token}`).send(payload);
  return resposta.body as { id: string; pontosIrrigacao: { id: string; x: number; y: number }[] };
}

async function criarMissaoParaMapa(usuarioId: string, mapaId: string, status: 'ATIVA' | 'DESATIVADA' = 'ATIVA') {
  const drone = await prisma.drone.create({
    data: { nome: 'Drone A', consumoPorIrrigacao: 1, velocidadeMedia: 1, capacidadeBateria: 1, userId: usuarioId },
  });
  return prisma.missao.create({ data: { droneId: drone.id, mapaId, status } });
}

describe('PATCH /mapas/:id/ponto-carregamento', () => {
  // Caso 1
  it('altera o ponto de carregamento de um mapa próprio', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .patch(`/mapas/${mapa.id}/ponto-carregamento`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 50, y: 50 });

    expect(resposta.status).toBe(200);
    expect(resposta.body.pontoCarregamento).toEqual({ x: 50, y: 50 });
    expect(resposta.body.pontosIrrigacao).toHaveLength(1);
  });

  // Caso 2
  it('aceita alterar para a mesma coordenada já existente', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .patch(`/mapas/${mapa.id}/ponto-carregamento`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 0, y: 0 });

    expect(resposta.status).toBe(200);
  });

  // Caso 3
  it('rejeita coordenada com tipo inválido', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .patch(`/mapas/${mapa.id}/ponto-carregamento`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 'zero', y: 0 });

    expect(resposta.status).toBe(400);
  });

  // Caso 4
  it('rejeita payload sem x ou y', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .patch(`/mapas/${mapa.id}/ponto-carregamento`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 1 });

    expect(resposta.status).toBe(400);
  });

  // Caso 5
  it('retorna 404 para mapa que não existe', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .patch('/mapas/id-inexistente/ponto-carregamento')
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 1, y: 1 });

    expect(resposta.status).toBe(404);
  });

  // Caso 6
  it('retorna 404 para mapa de outro usuário e não altera o registro', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const mapaDoOutro = await criarMapa(outro.token);

    const resposta = await request(app)
      .patch(`/mapas/${mapaDoOutro.id}/ponto-carregamento`)
      .set('Authorization', `Bearer ${hugo.token}`)
      .send({ x: 99, y: 99 });

    expect(resposta.status).toBe(404);
    const persistido = await prisma.mapa.findUniqueOrThrow({ where: { id: mapaDoOutro.id } });
    expect(persistido.pontoCarregamentoX).toBe(0);
  });

  // Caso 7
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).patch('/mapas/qualquer-id/ponto-carregamento').send({ x: 1, y: 1 });

    expect(resposta.status).toBe(401);
  });

  // Caso 8 (RN17)
  it('rejeita nova coordenada igual a um ponto de irrigação existente', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .patch(`/mapas/${mapa.id}/ponto-carregamento`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 10, y: 10 });

    expect(resposta.status).toBe(409);
  });

  // Caso 9 (RN13)
  it('desativa todas as Missões ativas do mapa ao alterar com sucesso', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);
    const missaoA = await criarMissaoParaMapa(usuarioId, mapa.id, 'ATIVA');
    const missaoB = await criarMissaoParaMapa(usuarioId, mapa.id, 'ATIVA');

    const resposta = await request(app)
      .patch(`/mapas/${mapa.id}/ponto-carregamento`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 50, y: 50 });

    expect(resposta.status).toBe(200);
    const missoes = await prisma.missao.findMany({ where: { id: { in: [missaoA.id, missaoB.id] } } });
    expect(missoes.every((m) => m.status === 'DESATIVADA')).toBe(true);
  });

  // Caso 10 (RN13)
  it('mantém Missão já desativada sem erro ao alterar o ponto de carregamento', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);
    const missao = await criarMissaoParaMapa(usuarioId, mapa.id, 'DESATIVADA');

    const resposta = await request(app)
      .patch(`/mapas/${mapa.id}/ponto-carregamento`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 50, y: 50 });

    expect(resposta.status).toBe(200);
    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });

  // Caso 11 (RN13)
  it('não afeta Missões de outros mapas', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapaA = await criarMapa(token);
    const mapaB = await criarMapa(token, { pontoCarregamento: { x: 1, y: 1 }, pontosIrrigacao: [{ x: 2, y: 2 }] });
    await criarMissaoParaMapa(usuarioId, mapaA.id, 'ATIVA');
    const missaoB = await criarMissaoParaMapa(usuarioId, mapaB.id, 'ATIVA');

    await request(app)
      .patch(`/mapas/${mapaA.id}/ponto-carregamento`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 50, y: 50 });

    const persistidaB = await prisma.missao.findUniqueOrThrow({ where: { id: missaoB.id } });
    expect(persistidaB.status).toBe('ATIVA');
  });
});

describe('POST /mapas/:id/pontos-irrigacao', () => {
  // Caso 1
  it('adiciona um ponto de irrigação a um mapa próprio', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .post(`/mapas/${mapa.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 20, y: 20 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.pontosIrrigacao).toHaveLength(2);
  });

  // Caso 2 (RN16)
  it('adiciona o ponto de número 1000 (limite exato)', async () => {
    const { token } = await cadastrarELogar('hugo');
    const pontosIrrigacao = Array.from({ length: 999 }, (_, i) => ({ x: i + 1, y: i + 1 }));
    const mapa = await criarMapa(token, { pontoCarregamento: { x: 0, y: 0 }, pontosIrrigacao });

    const resposta = await request(app)
      .post(`/mapas/${mapa.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 5000, y: 5000 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.pontosIrrigacao).toHaveLength(1000);
  }, 15000);

  // Caso 3
  it('rejeita coordenada com tipo inválido', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .post(`/mapas/${mapa.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 'zero', y: 0 });

    expect(resposta.status).toBe(400);
  });

  // Caso 4
  it('retorna 404 para mapa que não existe', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .post('/mapas/id-inexistente/pontos-irrigacao')
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 1, y: 1 });

    expect(resposta.status).toBe(404);
  });

  // Caso 5
  it('retorna 404 para mapa de outro usuário e não adiciona o ponto', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const mapaDoOutro = await criarMapa(outro.token);

    const resposta = await request(app)
      .post(`/mapas/${mapaDoOutro.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${hugo.token}`)
      .send({ x: 30, y: 30 });

    expect(resposta.status).toBe(404);
    const persistido = await prisma.mapa.findUniqueOrThrow({
      where: { id: mapaDoOutro.id },
      include: { pontosIrrigacao: true },
    });
    expect(persistido.pontosIrrigacao).toHaveLength(1);
  });

  // Caso 6
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).post('/mapas/qualquer-id/pontos-irrigacao').send({ x: 1, y: 1 });

    expect(resposta.status).toBe(401);
  });

  // Caso 7 (RN17)
  it('rejeita ponto igual ao ponto de carregamento do mapa', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .post(`/mapas/${mapa.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 0, y: 0 });

    expect(resposta.status).toBe(409);
  });

  // Caso 8 (RN18)
  it('rejeita ponto igual a outro ponto de irrigação já cadastrado', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .post(`/mapas/${mapa.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 10, y: 10 });

    expect(resposta.status).toBe(409);
  });

  // Caso 9 (RN16)
  it('rejeita adição além do limite de 1000 pontos', async () => {
    const { token } = await cadastrarELogar('hugo');
    const pontosIrrigacao = Array.from({ length: 1000 }, (_, i) => ({ x: i + 1, y: i + 1 }));
    const mapa = await criarMapa(token, { pontoCarregamento: { x: 0, y: 0 }, pontosIrrigacao });

    const resposta = await request(app)
      .post(`/mapas/${mapa.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 5000, y: 5000 });

    expect(resposta.status).toBe(409);
  }, 15000);

  // Caso 10 (RN13)
  it('desativa todas as Missões ativas do mapa ao adicionar com sucesso', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);
    const missao = await criarMissaoParaMapa(usuarioId, mapa.id, 'ATIVA');

    const resposta = await request(app)
      .post(`/mapas/${mapa.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 20, y: 20 });

    expect(resposta.status).toBe(201);
    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });

  // Caso 11 (RN13)
  it('mantém Missão já desativada sem erro ao adicionar ponto', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);
    const missao = await criarMissaoParaMapa(usuarioId, mapa.id, 'DESATIVADA');

    const resposta = await request(app)
      .post(`/mapas/${mapa.id}/pontos-irrigacao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 20, y: 20 });

    expect(resposta.status).toBe(201);
    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });
});

describe('DELETE /mapas/:id/pontos-irrigacao/:pontoId', () => {
  // Caso 1
  it('remove um ponto de irrigação de um mapa com mais de um ponto', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token, {
      pontoCarregamento: { x: 0, y: 0 },
      pontosIrrigacao: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    });
    const pontoId = mapa.pontosIrrigacao[0]?.id as string;

    const resposta = await request(app)
      .delete(`/mapas/${mapa.id}/pontos-irrigacao/${pontoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(204);
    const persistido = await prisma.mapa.findUniqueOrThrow({
      where: { id: mapa.id },
      include: { pontosIrrigacao: true },
    });
    expect(persistido.pontosIrrigacao).toHaveLength(1);
  });

  // Caso 2
  it('retorna 404 para mapa que não existe', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app)
      .delete('/mapas/id-inexistente/pontos-irrigacao/ponto-qualquer')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 3
  it('retorna 404 para mapa de outro usuário', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const mapaDoOutro = await criarMapa(outro.token);
    const pontoId = mapaDoOutro.pontosIrrigacao[0]?.id as string;

    const resposta = await request(app)
      .delete(`/mapas/${mapaDoOutro.id}/pontos-irrigacao/${pontoId}`)
      .set('Authorization', `Bearer ${hugo.token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 4
  it('retorna 404 para pontoId que não existe no mapa', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app)
      .delete(`/mapas/${mapa.id}/pontos-irrigacao/ponto-inexistente`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 5
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).delete('/mapas/qualquer-id/pontos-irrigacao/qualquer-ponto');

    expect(resposta.status).toBe(401);
  });

  // Caso 6 (RN01)
  it('rejeita remoção do último ponto de irrigação', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);
    const pontoId = mapa.pontosIrrigacao[0]?.id as string;

    const resposta = await request(app)
      .delete(`/mapas/${mapa.id}/pontos-irrigacao/${pontoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(409);
    const persistido = await prisma.mapa.findUniqueOrThrow({
      where: { id: mapa.id },
      include: { pontosIrrigacao: true },
    });
    expect(persistido.pontosIrrigacao).toHaveLength(1);
  });

  // Caso 7 (RN13)
  it('desativa todas as Missões ativas do mapa ao remover com sucesso', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token, {
      pontoCarregamento: { x: 0, y: 0 },
      pontosIrrigacao: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    });
    const pontoId = mapa.pontosIrrigacao[0]?.id as string;
    const missao = await criarMissaoParaMapa(usuarioId, mapa.id, 'ATIVA');

    const resposta = await request(app)
      .delete(`/mapas/${mapa.id}/pontos-irrigacao/${pontoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(204);
    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });

  // Caso 8 (RN13)
  it('mantém Missão já desativada sem erro ao remover ponto', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token, {
      pontoCarregamento: { x: 0, y: 0 },
      pontosIrrigacao: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    });
    const pontoId = mapa.pontosIrrigacao[0]?.id as string;
    const missao = await criarMissaoParaMapa(usuarioId, mapa.id, 'DESATIVADA');

    const resposta = await request(app)
      .delete(`/mapas/${mapa.id}/pontos-irrigacao/${pontoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(204);
    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });
});

describe('DELETE /mapas/:id', () => {
  // Caso 1
  it('exclui um mapa próprio sem Missão associada', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);

    const resposta = await request(app).delete(`/mapas/${mapa.id}`).set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(204);
    const persistido = await prisma.mapa.findUnique({ where: { id: mapa.id } });
    expect(persistido).toBeNull();
  });

  // Caso 2
  it('exclui apenas o mapa alvo, mantendo os demais do usuário', async () => {
    const { token } = await cadastrarELogar('hugo');
    const mapaA = await criarMapa(token);
    const mapaB = await criarMapa(token, { pontoCarregamento: { x: 1, y: 1 }, pontosIrrigacao: [{ x: 2, y: 2 }] });

    const resposta = await request(app).delete(`/mapas/${mapaA.id}`).set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(204);
    const persistidoB = await prisma.mapa.findUnique({ where: { id: mapaB.id } });
    expect(persistidoB).not.toBeNull();
  });

  // Caso 3
  it('retorna 404 para mapa que não existe', async () => {
    const { token } = await cadastrarELogar('hugo');

    const resposta = await request(app).delete('/mapas/id-inexistente').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  // Caso 4
  it('retorna 404 para mapa de outro usuário e não o exclui', async () => {
    const hugo = await cadastrarELogar('hugo');
    const outro = await cadastrarELogar('outro');
    const mapaDoOutro = await criarMapa(outro.token);

    const resposta = await request(app)
      .delete(`/mapas/${mapaDoOutro.id}`)
      .set('Authorization', `Bearer ${hugo.token}`);

    expect(resposta.status).toBe(404);
    const persistido = await prisma.mapa.findUnique({ where: { id: mapaDoOutro.id } });
    expect(persistido).not.toBeNull();
  });

  // Caso 5
  it('rejeita requisição sem token de autenticação', async () => {
    const resposta = await request(app).delete('/mapas/qualquer-id');

    expect(resposta.status).toBe(401);
  });

  // Caso 6 (RN15)
  it('bloqueia exclusão de mapa com Missão ativa associada', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);
    await criarMissaoParaMapa(usuarioId, mapa.id, 'ATIVA');

    const resposta = await request(app).delete(`/mapas/${mapa.id}`).set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(409);
    const persistido = await prisma.mapa.findUnique({ where: { id: mapa.id } });
    expect(persistido).not.toBeNull();
  });

  // Caso 7 (RN15)
  it('bloqueia exclusão de mapa com Missão desativada associada', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapa = await criarMapa(token);
    await criarMissaoParaMapa(usuarioId, mapa.id, 'DESATIVADA');

    const resposta = await request(app).delete(`/mapas/${mapa.id}`).set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(409);
    const persistido = await prisma.mapa.findUnique({ where: { id: mapa.id } });
    expect(persistido).not.toBeNull();
  });

  // Caso 8 (RN15)
  it('permite excluir mapa sem Missão mesmo quando outro mapa do usuário tem Missão associada', async () => {
    const { token, id: usuarioId } = await cadastrarELogar('hugo');
    const mapaA = await criarMapa(token);
    const mapaB = await criarMapa(token, { pontoCarregamento: { x: 1, y: 1 }, pontosIrrigacao: [{ x: 2, y: 2 }] });
    await criarMissaoParaMapa(usuarioId, mapaA.id, 'ATIVA');

    const resposta = await request(app).delete(`/mapas/${mapaB.id}`).set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(204);
    const persistidoA = await prisma.mapa.findUnique({ where: { id: mapaA.id } });
    expect(persistidoA).not.toBeNull();
  });
});
