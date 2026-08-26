import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors/app-error';
import { env } from '../../config/env';
import { gerarToken } from '../security/token';
import { authRouter } from '../../modules/auth/auth.routes';
import { usuarioRouter } from '../../modules/usuario/usuario.routes';
import { tratamentoErrosMiddleware } from './tratamento-erros.middleware';
import { autenticacaoMiddleware } from './autenticacao.middleware';

function criarAppDeTeste() {
  const app = express();
  app.use(express.json());
  app.use('/usuarios', usuarioRouter);
  app.use('/auth', authRouter);

  // Rota de teste dedicada — nenhuma rota de Drone/Mapa/Missão existe ainda
  // nesta sprint (ver docs/tests/US-003-plano.md).
  app.get('/_teste/protegida', autenticacaoMiddleware, (req: Request, res: Response) => {
    res.status(200).json({ usuarioId: req.usuarioId });
  });

  app.use(tratamentoErrosMiddleware);
  return app;
}

const app = criarAppDeTeste();

async function cadastrarELogar(nome: string, senha = 'senhaForte123') {
  await request(app).post('/usuarios').send({ nome, senha });
  const resposta = await request(app).post('/auth/login').send({ nome, senha });
  return resposta.body.token as string;
}

describe('autenticacaoMiddleware — integração via rota protegida', () => {
  // Caso 1 (fecha também o caso 2 do plano de US-002)
  it('autentica requisição com token válido e expõe req.usuarioId', async () => {
    const token = await cadastrarELogar('hugo');

    const resposta = await request(app).get('/_teste/protegida').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.usuarioId).toEqual(expect.any(String));
  });

  // Caso 2
  it('identifica corretamente usuários diferentes por seus próprios tokens', async () => {
    const tokenHugo = await cadastrarELogar('hugo');
    const tokenOutro = await cadastrarELogar('outro');

    const respostaHugo = await request(app)
      .get('/_teste/protegida')
      .set('Authorization', `Bearer ${tokenHugo}`);
    const respostaOutro = await request(app)
      .get('/_teste/protegida')
      .set('Authorization', `Bearer ${tokenOutro}`);

    expect(respostaHugo.body.usuarioId).not.toBe(respostaOutro.body.usuarioId);
  });

  // Caso 3
  it('rejeita token expirado', async () => {
    const usuarioResp = await request(app).post('/usuarios').send({ nome: 'hugo', senha: 'senhaForte123' });
    const tokenExpirado = jwt.sign({ sub: usuarioResp.body.id }, env.jwtSecret, { expiresIn: '1ms' });

    await new Promise((resolve) => setTimeout(resolve, 20));

    const resposta = await request(app)
      .get('/_teste/protegida')
      .set('Authorization', `Bearer ${tokenExpirado}`);

    expect(resposta.status).toBe(401);
  });

  // Caso 4
  it('rejeita header Authorization presente mas vazio', async () => {
    const resposta = await request(app).get('/_teste/protegida').set('Authorization', '');

    expect(resposta.status).toBe(401);
  });

  // Caso 5
  it('rejeita requisição sem header Authorization', async () => {
    const resposta = await request(app).get('/_teste/protegida');

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toBeDefined();
  });

  // Caso 6
  it('rejeita token malformado (não-JWT)', async () => {
    const resposta = await request(app)
      .get('/_teste/protegida')
      .set('Authorization', 'Bearer isso-nao-e-um-jwt');

    expect(resposta.status).toBe(401);
  });

  // Caso 7
  it('rejeita token assinado com segredo diferente', async () => {
    const tokenOutroSegredo = jwt.sign({ sub: 'qualquer-id' }, 'segredo-errado', { expiresIn: '1h' });

    const resposta = await request(app)
      .get('/_teste/protegida')
      .set('Authorization', `Bearer ${tokenOutroSegredo}`);

    expect(resposta.status).toBe(401);
  });

  // Caso 8
  it('rejeita header sem o prefixo Bearer', async () => {
    const token = gerarToken('qualquer-id');

    const resposta = await request(app).get('/_teste/protegida').set('Authorization', token);

    expect(resposta.status).toBe(401);
  });

  // Caso 9
  it('rejeita esquema de autenticação diferente (Basic)', async () => {
    const resposta = await request(app)
      .get('/_teste/protegida')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(resposta.status).toBe(401);
  });
});

describe('autenticacaoMiddleware — unitário', () => {
  function mockReqRes(headerValue?: string) {
    const req = {
      header: jest.fn().mockReturnValue(headerValue),
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next: next as jest.Mock };
  }

  // Caso 10
  it('chama next(erro) sem responder diretamente quando não há token', () => {
    const { req, res, next } = mockReqRes(undefined);

    autenticacaoMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });

  // Caso 11
  it('chama next() sem argumentos e define req.usuarioId quando o token é válido', () => {
    const token = gerarToken('usuario-123');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);

    autenticacaoMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeUndefined();
    expect(req.usuarioId).toBe('usuario-123');
  });
});
