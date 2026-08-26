import request from 'supertest';
import { createApp } from '../../app';

const app = createApp();

async function cadastrarUsuario(nome: string, senha: string) {
  await request(app).post('/usuarios').send({ nome, senha });
}

describe('POST /auth/login', () => {
  // Caso 1
  it('autentica com credenciais corretas e retorna um token', async () => {
    await cadastrarUsuario('hugo', 'senhaForte123');

    const resposta = await request(app)
      .post('/auth/login')
      .send({ nome: 'hugo', senha: 'senhaForte123' });

    expect(resposta.status).toBe(200);
    expect(typeof resposta.body.token).toBe('string');
    expect(resposta.body.token.length).toBeGreaterThan(0);
  });

  // Caso 3
  it('rejeita login com nome em capitalização diferente da cadastrada', async () => {
    await cadastrarUsuario('hugo', 'senhaForte123');

    const resposta = await request(app)
      .post('/auth/login')
      .send({ nome: 'Hugo', senha: 'senhaForte123' });

    expect(resposta.status).toBe(401);
  });

  // Caso 4
  it('permite múltiplos logins sucessivos do mesmo usuário', async () => {
    await cadastrarUsuario('hugo', 'senhaForte123');

    const primeiro = await request(app).post('/auth/login').send({ nome: 'hugo', senha: 'senhaForte123' });
    const segundo = await request(app).post('/auth/login').send({ nome: 'hugo', senha: 'senhaForte123' });

    expect(primeiro.status).toBe(200);
    expect(segundo.status).toBe(200);
    expect(primeiro.body.token).not.toBe(''); // tokens podem ou não coincidir; ambos válidos
  });

  // Caso 5
  it('rejeita nome não cadastrado com mensagem genérica', async () => {
    const resposta = await request(app)
      .post('/auth/login')
      .send({ nome: 'inexistente', senha: 'qualquerSenha123' });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toBeDefined();
  });

  // Caso 6
  it('rejeita senha incorreta com a mesma mensagem genérica do nome inexistente', async () => {
    await cadastrarUsuario('hugo', 'senhaForte123');

    const respostaNomeInexistente = await request(app)
      .post('/auth/login')
      .send({ nome: 'outro-inexistente', senha: 'qualquerSenha123' });
    const respostaSenhaErrada = await request(app)
      .post('/auth/login')
      .send({ nome: 'hugo', senha: 'senhaErrada123' });

    expect(respostaSenhaErrada.status).toBe(401);
    expect(respostaSenhaErrada.body.erro).toBe(respostaNomeInexistente.body.erro);
  });

  // Caso 7
  it('rejeita payload sem nome', async () => {
    const resposta = await request(app).post('/auth/login').send({ senha: 'senhaForte123' });

    expect(resposta.status).toBe(400);
  });

  // Caso 8
  it('rejeita payload sem senha', async () => {
    const resposta = await request(app).post('/auth/login').send({ nome: 'hugo' });

    expect(resposta.status).toBe(400);
  });

  // Caso 9
  it('rejeita tipos inválidos', async () => {
    const resposta = await request(app).post('/auth/login').send({ nome: 123, senha: true });

    expect(resposta.status).toBe(400);
  });
});
