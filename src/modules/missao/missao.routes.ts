import { Router } from 'express';
import { autenticacaoMiddleware } from '../../common/middlewares/autenticacao.middleware';
import { calcular } from './missao.controller';

export const missaoRouter = Router();

missaoRouter.use(autenticacaoMiddleware);

missaoRouter.post('/', calcular);
