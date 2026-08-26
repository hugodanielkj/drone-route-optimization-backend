import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors/app-error';
import { verificarToken } from '../security/token';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuarioId?: string;
    }
  }
}

const ESQUEMA_TOKEN = 'Bearer';

export function autenticacaoMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header) {
    next(new UnauthorizedError());
    return;
  }

  const [esquema, token] = header.split(' ');
  if (esquema !== ESQUEMA_TOKEN || !token) {
    next(new UnauthorizedError());
    return;
  }

  try {
    const payload = verificarToken(token);
    req.usuarioId = payload.sub;
    next();
  } catch {
    next(new UnauthorizedError());
  }
}
