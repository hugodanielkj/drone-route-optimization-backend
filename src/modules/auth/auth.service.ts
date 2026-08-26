import { UnauthorizedError } from '../../common/errors/app-error';
import { compararSenha } from '../../common/security/senha';
import { gerarToken } from '../../common/security/token';
import { prisma } from '../../config/prisma';
import type { LoginInput } from './auth.schema';

// Mensagem idêntica para nome inexistente e senha incorreta — evita
// enumeração de usuários (RF-001.4, critérios de aceite de US-002).
const CREDENCIAIS_INVALIDAS = 'Credenciais inválidas';

export const authService = {
  async login(input: LoginInput): Promise<{ token: string }> {
    const usuario = await prisma.user.findUnique({ where: { nome: input.nome } });
    if (!usuario) {
      throw new UnauthorizedError(CREDENCIAIS_INVALIDAS);
    }

    const senhaValida = await compararSenha(input.senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedError(CREDENCIAIS_INVALIDAS);
    }

    return { token: gerarToken(usuario.id) };
  },
};
