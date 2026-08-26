import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/prisma';

const app = createApp();

describe('POST /usuarios', () => {
  // Caso 1
  it('cadastra um usuário com nome e senha válidos', async () => {
    const resposta = await request(app)
      .post('/usuarios')
      .send({ nome: 'hugo', senha: 'senhaForte123' });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ nome: 'hugo' });
    expect(resposta.body.id).toEqual(expect.any(String));
    expect(resposta.body.senha).toBeUndefined();
    expect(resposta.body.senhaHash).toBeUndefined();
  });

  // Caso 2
  it('trata nomes com capitalização diferente como usuários distintos', async () => {
    const primeiro = await request(app).post('/usuarios').send({ nome: 'hugo', senha: 'senhaForte123' });
    const segundo = await request(app).post('/usuarios').send({ nome: 'Hugo', senha: 'senhaForte123' });

    expect(primeiro.status).toBe(201);
    expect(segundo.status).toBe(201);
  });

  // Caso 3
  it('aceita nome com 1 caractere e senha com exatamente 8 caracteres', async () => {
    const resposta = await request(app).post('/usuarios').send({ nome: 'a', senha: '12345678' });

    expect(resposta.status).toBe(201);
  });

  // Caso 4
  it('rejeita senha com menos de 8 caracteres', async () => {
    const resposta = await request(app)
      .post('/usuarios')
      .send({ nome: 'usuario1', senha: '1234567' });

    expect(resposta.status).toBe(400);
    const usuarios = await prisma.user.findMany({ where: { nome: 'usuario1' } });
    expect(usuarios).toHaveLength(0);
  });

  // Caso 5
  it('rejeita nome vazio', async () => {
    const resposta = await request(app).post('/usuarios').send({ nome: '', senha: 'senhaForte123' });

    expect(resposta.status).toBe(400);
  });

  // Caso 7
  it('rejeita cadastro com nome já existente retornando 409', async () => {
    await request(app).post('/usuarios').send({ nome: 'hugo', senha: 'senhaForte123' });
    const resposta = await request(app)
      .post('/usuarios')
      .send({ nome: 'hugo', senha: 'outraSenha123' });

    expect(resposta.status).toBe(409);
  });

  // Caso 8
  it('rejeita payload sem nome', async () => {
    const resposta = await request(app).post('/usuarios').send({ senha: 'senhaForte123' });

    expect(resposta.status).toBe(400);
  });

  // Caso 9
  it('rejeita payload sem senha', async () => {
    const resposta = await request(app).post('/usuarios').send({ nome: 'hugo' });

    expect(resposta.status).toBe(400);
  });

  // Caso 10
  it('rejeita tipos inválidos para nome e senha', async () => {
    const resposta = await request(app).post('/usuarios').send({ nome: 123, senha: 456 });

    expect(resposta.status).toBe(400);
  });

  // Caso 11
  it('ignora campos extras não esperados no payload', async () => {
    const resposta = await request(app)
      .post('/usuarios')
      .send({ nome: 'hugo', senha: 'senhaForte123', admin: true });

    expect(resposta.status).toBe(201);
    expect(resposta.body.admin).toBeUndefined();
  });
});
