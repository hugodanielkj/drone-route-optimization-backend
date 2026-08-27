import express from 'express';
import { usuarioRouter } from './modules/usuario/usuario.routes';
import { authRouter } from './modules/auth/auth.routes';
import { droneRouter } from './modules/drone/drone.routes';
import { tratamentoErrosMiddleware } from './common/middlewares/tratamento-erros.middleware';

export function createApp() {
  const app = express();

  app.use(express.json()); // Permite leitura e parsing de json

  app.use('/usuarios', usuarioRouter);  // Definido um arquivo de rotas apenas para operacoes com Usuario
  app.use('/auth', authRouter);
  app.use('/drones', droneRouter);

  // Último middleware registrado: único lugar que decide o formato de erro.
  app.use(tratamentoErrosMiddleware);

  return app;
}
