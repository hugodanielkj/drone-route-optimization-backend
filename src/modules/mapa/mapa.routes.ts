import { Router } from 'express';
import { autenticacaoMiddleware } from '../../common/middlewares/autenticacao.middleware';
import { buscarPorId, cadastrar, listar } from './mapa.controller';

export const mapaRouter = Router();

mapaRouter.use(autenticacaoMiddleware);

mapaRouter.post('/', cadastrar);
mapaRouter.get('/', listar);
mapaRouter.get('/:id', buscarPorId);
