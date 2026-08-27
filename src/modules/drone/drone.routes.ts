import { Router } from 'express';
import { autenticacaoMiddleware } from '../../common/middlewares/autenticacao.middleware';
import { buscarPorId, cadastrar, editar, excluir, listar } from './drone.controller';

export const droneRouter = Router();

droneRouter.use(autenticacaoMiddleware);

droneRouter.post('/', cadastrar);
droneRouter.get('/', listar);
droneRouter.get('/:id', buscarPorId);
droneRouter.patch('/:id', editar);
droneRouter.delete('/:id', excluir);
