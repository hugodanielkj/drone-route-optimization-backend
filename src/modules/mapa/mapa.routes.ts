import { Router } from 'express';
import { autenticacaoMiddleware } from '../../common/middlewares/autenticacao.middleware';
import {
  adicionarPontoIrrigacao,
  alterarPontoCarregamento,
  buscarPorId,
  cadastrar,
  excluir,
  listar,
  removerPontoIrrigacao,
} from './mapa.controller';

export const mapaRouter = Router();

mapaRouter.use(autenticacaoMiddleware);

mapaRouter.post('/', cadastrar);
mapaRouter.get('/', listar);
mapaRouter.get('/:id', buscarPorId);
mapaRouter.patch('/:id/ponto-carregamento', alterarPontoCarregamento);
mapaRouter.post('/:id/pontos-irrigacao', adicionarPontoIrrigacao);
mapaRouter.delete('/:id/pontos-irrigacao/:pontoId', removerPontoIrrigacao);
mapaRouter.delete('/:id', excluir);
