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
