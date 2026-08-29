import request from 'supertest';
import { createApp } from '../../app';

const app = createApp();

describe('tratamentoErrosMiddleware', () => {
  it('retorna 400 (não 500) para JSON malformado no corpo da requisição', async () => {
    const resposta = await request(app)
      .post('/usuarios')
      .set('Content-Type', 'application/json')
      .send('{"nome": "hugo" "senha": "x"}');

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).not.toBe('Erro interno do servidor');
  });
});
