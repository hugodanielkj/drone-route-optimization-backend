import { StatusMissao, type Missao, type Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../common/errors/app-error';
import { droneService } from '../drone/drone.service';
import { mapaService } from '../mapa/mapa.service';
import { calcularRota, RotaInviavelError } from './motor';
import type { CalcularMissaoInput } from './missao.schema';

export interface ResultadoCalcular {
  missao: Missao;
  criada: boolean;
}

export const missaoService = {
  async calcular(usuarioId: string, input: CalcularMissaoInput): Promise<ResultadoCalcular> {
    const drone = await droneService.buscarPorId(usuarioId, input.droneId); // RN11
    const mapa = await mapaService.buscarPorId(usuarioId, input.mapaId); // RN11

    const missaoExistente = await prisma.missao.findUnique({
      where: { droneId_mapaId: { droneId: drone.id, mapaId: mapa.id } },
    });

    if (missaoExistente?.status === StatusMissao.ATIVA) {
      // US-017 (RN12): retorna o resultado já persistido, sem recalcular e sem escrever no banco.
      return { missao: missaoExistente, criada: false };
    }

    if (missaoExistente?.status === StatusMissao.DESATIVADA) {
      // US-018 (RN14): recalcula com os dados atuais de drone/mapa. Se RotaInviavelError
      // for lançada, calcularRotaOuRejeitar propaga o erro ANTES de qualquer update —
      // a Missão permanece desativada, sem ser alterada.
      const resultado = calcularRotaOuRejeitar(mapa, drone);
      const atualizada = await prisma.missao.update({
        where: { id: missaoExistente.id },
        data: {
          status: StatusMissao.ATIVA,
          pernas: resultado.pernas as unknown as Prisma.InputJsonValue, // ver ADR-004
          consumoEnergeticoTotal: resultado.consumoEnergeticoTotal,
        },
      });
      return { missao: atualizada, criada: false };
    }

    // Sem Missão existente para o par (US-016).
    const resultado = calcularRotaOuRejeitar(mapa, drone);
    const criada = await prisma.missao.create({
      data: {
        droneId: drone.id,
        mapaId: mapa.id,
        status: StatusMissao.ATIVA,
        pernas: resultado.pernas as unknown as Prisma.InputJsonValue, // ver ADR-004
        consumoEnergeticoTotal: resultado.consumoEnergeticoTotal,
      },
    });
    return { missao: criada, criada: true };
  },

  async listar(usuarioId: string) {
    // Missao não tem userId próprio — ownership é sempre via relação com Drone
    // (RN11 garante, na criação, que drone.userId === mapa.userId).
    return prisma.missao.findMany({ where: { drone: { userId: usuarioId } } });
  },

  async buscarPorId(usuarioId: string, missaoId: string) {
    const missao = await prisma.missao.findFirst({
      where: { id: missaoId, drone: { userId: usuarioId } },
    });
    if (!missao) {
      throw new NotFoundError('Missão não encontrada');
    }
    return missao;
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
