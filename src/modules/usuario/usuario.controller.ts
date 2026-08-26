import type { NextFunction, Request, Response } from 'express';
import { cadastroUsuarioSchema } from './usuario.schema';
import { usuarioService } from './usuario.service';

export async function cadastrar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = cadastroUsuarioSchema.parse(req.body);
    const usuario = await usuarioService.cadastrar(input);
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
}
