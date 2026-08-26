import type { NextFunction, Request, Response } from 'express';
import { loginSchema } from './auth.schema';
import { authService } from './auth.service';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const resultado = await authService.login(input);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
