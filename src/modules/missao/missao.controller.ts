import type { NextFunction, Request, Response } from 'express';
import type { Missao } from '@prisma/client';
import { calcularMissaoSchema } from './missao.schema';
import { missaoService } from './missao.service';

function formatarMissao(missao: Missao) {
  return {
    id: missao.id,
    droneId: missao.droneId,
    mapaId: missao.mapaId,
    status: missao.status,
    pernas: missao.pernas,
    consumoEnergeticoTotal: missao.consumoEnergeticoTotal,
    createdAt: missao.createdAt,
    updatedAt: missao.updatedAt,
  };
}

export async function calcular(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = calcularMissaoSchema.parse(req.body);
    const missao = await missaoService.calcular(req.usuarioId as string, input);
    res.status(201).json(formatarMissao(missao));
  } catch (error) {
    next(error);
  }
}
