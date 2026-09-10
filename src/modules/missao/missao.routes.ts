import { Router } from 'express';
import { autenticacaoMiddleware } from '../../common/middlewares/autenticacao.middleware';
import { buscarPorId, calcular, listar } from './missao.controller';

export const missaoRouter = Router();

missaoRouter.use(autenticacaoMiddleware);

missaoRouter.post('/', calcular);
missaoRouter.get('/', listar);
missaoRouter.get('/:id', buscarPorId);
