import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ConflictError } from '../../common/errors/app-error';
import { hashSenha } from '../../common/security/senha';
import type { CadastroUsuarioInput } from './usuario.schema';

export const usuarioService = {
  async cadastrar(input: CadastroUsuarioInput) {
    const senhaHash = await hashSenha(input.senha);

    try {
      return await prisma.user.create({
        data: { nome: input.nome, senhaHash },
        select: { id: true, nome: true, createdAt: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('Nome de usuário já está em uso');
      }
      throw error;
    }
  },
};
