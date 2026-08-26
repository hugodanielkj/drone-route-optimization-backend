import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

// ver ADR-002 (mecanismo de emissão/validação de token)
export interface TokenPayload {
  sub: string;
}

export function gerarToken(userId: string): string {
  const payload: TokenPayload = { sub: userId };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}
