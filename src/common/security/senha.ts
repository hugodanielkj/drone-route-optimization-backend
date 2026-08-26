import bcrypt from 'bcryptjs';

// Custo adaptativo do bcrypt — ver ADR 0001 (algoritmo de hash de senha).
const SALT_ROUNDS = 10;

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

export function compararSenha(senha: string, senhaHash: string): Promise<boolean> {
  return bcrypt.compare(senha, senhaHash);
}
