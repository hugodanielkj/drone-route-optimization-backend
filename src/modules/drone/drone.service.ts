import { StatusMissao } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../common/errors/app-error';
import type { CadastroDroneInput, EditarDroneInput } from './drone.schema';

export const droneService = {
  async cadastrar(usuarioId: string, input: CadastroDroneInput) {
    return prisma.drone.create({
      data: { ...input, userId: usuarioId },
    });
  },

  async listar(usuarioId: string) {
    return prisma.drone.findMany({ where: { userId: usuarioId } });
  },

  async buscarPorId(usuarioId: string, droneId: string) {
    const drone = await prisma.drone.findUnique({ where: { id: droneId } });
    if (!drone || drone.userId !== usuarioId) {
      throw new NotFoundError('Drone não encontrado');
    }
    return drone;
  },

  async editar(usuarioId: string, droneId: string, input: EditarDroneInput) {
    await droneService.buscarPorId(usuarioId, droneId);

    const data = Object.fromEntries(Object.entries(input).filter(([, valor]) => valor !== undefined));

    const [drone] = await prisma.$transaction([
      prisma.drone.update({ where: { id: droneId }, data }),
      // RN13: editar um Drone desativa toda Missão ativa que o referencie.
      prisma.missao.updateMany({
        where: { droneId, status: StatusMissao.ATIVA },
        data: { status: StatusMissao.DESATIVADA },
      }),
    ]);

    return drone;
  },

  async excluir(usuarioId: string, droneId: string) {
    await droneService.buscarPorId(usuarioId, droneId);

    const missoesAssociadas = await prisma.missao.count({ where: { droneId } });
    if (missoesAssociadas > 0) {
      throw new ConflictError('Drone possui Missões associadas e não pode ser excluído');
    }

    await prisma.drone.delete({ where: { id: droneId } });
  },
};
