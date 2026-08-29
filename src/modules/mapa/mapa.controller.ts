import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { cadastroMapaSchema } from './mapa.schema';
import { mapaService } from './mapa.service';

type MapaComPontos = Prisma.MapaGetPayload<{ include: { pontosIrrigacao: true } }>;

// ADR-003: resposta agrupa coordenadas como {x,y}, espelhando o formato de
// entrada do payload de criação, em vez dos campos achatados do Prisma.
function formatarMapa(mapa: MapaComPontos) {
  return {
    id: mapa.id,
    pontoCarregamento: { x: mapa.pontoCarregamentoX, y: mapa.pontoCarregamentoY },
    pontosIrrigacao: mapa.pontosIrrigacao.map((ponto) => ({ id: ponto.id, x: ponto.x, y: ponto.y })),
    userId: mapa.userId,
    createdAt: mapa.createdAt,
    updatedAt: mapa.updatedAt,
  };
}

export async function cadastrar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = cadastroMapaSchema.parse(req.body);
    const mapa = await mapaService.cadastrar(req.usuarioId as string, input);
    res.status(201).json(formatarMapa(mapa));
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mapas = await mapaService.listar(req.usuarioId as string);
    res.status(200).json(mapas.map(formatarMapa));
  } catch (error) {
    next(error);
  }
}

export async function buscarPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mapa = await mapaService.buscarPorId(req.usuarioId as string, req.params.id as string);
    res.status(200).json(formatarMapa(mapa));
  } catch (error) {
    next(error);
  }
}
