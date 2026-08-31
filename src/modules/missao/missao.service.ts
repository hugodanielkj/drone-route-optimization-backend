import { StatusMissao, type Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ConflictError } from '../../common/errors/app-error';
import { droneService } from '../drone/drone.service';
import { mapaService } from '../mapa/mapa.service';
import { calcularRota, RotaInviavelError } from './motor';
import type { CalcularMissaoInput } from './missao.schema';

export const missaoService = {
  async calcular(usuarioId: string, input: CalcularMissaoInput) {
    const drone = await droneService.buscarPorId(usuarioId, input.droneId); // RN11
    const mapa = await mapaService.buscarPorId(usuarioId, input.mapaId); // RN11

    const missaoExistente = await prisma.missao.findUnique({
      where: { droneId_mapaId: { droneId: drone.id, mapaId: mapa.id } },
    });
    if (missaoExistente) {
      // Reaproveitamento de Missão ativa (RN12) e recálculo/reativação de
      // Missão desativada (RN14) ficam para a Sprint 06 (US-017/US-018).
      throw new ConflictError('Já existe uma Missão para este par (drone, mapa)');
    }

    const resultado = calcularRotaOuRejeitar(mapa, drone);

    return prisma.missao.create({
      data: {
        droneId: drone.id,
        mapaId: mapa.id,
        status: StatusMissao.ATIVA,
        pernas: resultado.pernas as unknown as Prisma.InputJsonValue, // ver ADR-004
        consumoEnergeticoTotal: resultado.consumoEnergeticoTotal,
      },
    });
  },
};

function calcularRotaOuRejeitar(
  mapa: { pontoCarregamentoX: number; pontoCarregamentoY: number; pontosIrrigacao: { x: number; y: number }[] },
  drone: { velocidadeMedia: number; capacidadeBateria: number; consumoPorIrrigacao: number },
) {
  try {
    return calcularRota({
      pontoCarregamento: { x: mapa.pontoCarregamentoX, y: mapa.pontoCarregamentoY },
      pontosIrrigacao: mapa.pontosIrrigacao.map((ponto) => ({ x: ponto.x, y: ponto.y })),
      drone: {
        velocidadeMedia: drone.velocidadeMedia,
        capacidadeBateria: drone.capacidadeBateria,
        consumoPorIrrigacao: drone.consumoPorIrrigacao,
      },
    });
  } catch (erro) {
    if (erro instanceof RotaInviavelError) {
      throw new ConflictError(erro.message); // RN05
    }
    throw erro;
  }
}
