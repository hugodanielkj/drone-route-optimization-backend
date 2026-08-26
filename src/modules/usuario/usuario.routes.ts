import { Router } from 'express';
import { cadastrar } from './usuario.controller';

export const usuarioRouter = Router();

usuarioRouter.post('/', cadastrar);
