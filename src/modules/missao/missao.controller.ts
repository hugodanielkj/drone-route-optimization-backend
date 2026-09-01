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

// US-019: listagem é um resumo leve — sem `pernas`, que pode ser um array
// grande em mapas de até 1000 pontos (RN16). Só o detalhe (US-020) traz
// `pernas` completo.
function formatarMissaoResumo(missao: Missao) {
  return {
    id: missao.id,
    droneId: missao.droneId,
    mapaId: missao.mapaId,
    status: missao.status,
    consumoEnergeticoTotal: missao.consumoEnergeticoTotal,
    createdAt: missao.createdAt,
    updatedAt: missao.updatedAt,
  };
}

export async function calcular(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = calcularMissaoSchema.parse(req.body);
    const { missao, criada } = await missaoService.calcular(req.usuarioId as string, input);
    // 201 só quando uma Missão é criada de fato (US-016); reaproveitar uma
    // ativa (US-017) ou recalcular/reativar uma desativada (US-018) — 200.
    res.status(criada ? 201 : 200).json(formatarMissao(missao));
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const missoes = await missaoService.listar(req.usuarioId as string);
    res.status(200).json(missoes.map(formatarMissaoResumo));
  } catch (error) {
    next(error);
  }
}

export async function buscarPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const missao = await missaoService.buscarPorId(req.usuarioId as string, req.params.id as string);
    res.status(200).json(formatarMissao(missao));
  } catch (error) {
    next(error);
  }
}
