import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../common/errors/app-error';
import type { CadastroMapaInput } from './mapa.schema';

export const mapaService = {
  async cadastrar(usuarioId: string, input: CadastroMapaInput) {
    return prisma.mapa.create({
      data: {
        pontoCarregamentoX: input.pontoCarregamento.x,
        pontoCarregamentoY: input.pontoCarregamento.y,
        userId: usuarioId,
        pontosIrrigacao: {
          create: input.pontosIrrigacao,
        },
      },
      include: { pontosIrrigacao: true },
    });
  },

  async listar(usuarioId: string) {
    return prisma.mapa.findMany({
      where: { userId: usuarioId },
      include: { pontosIrrigacao: true },
    });
  },

  async buscarPorId(usuarioId: string, mapaId: string) {
    const mapa = await prisma.mapa.findUnique({
      where: { id: mapaId },
      include: { pontosIrrigacao: true },
    });
    if (!mapa || mapa.userId !== usuarioId) {
      throw new NotFoundError('Mapa não encontrado');
    }
    return mapa;
  },
};
