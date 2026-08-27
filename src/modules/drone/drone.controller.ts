import type { NextFunction, Request, Response } from 'express';
import { cadastroDroneSchema, editarDroneSchema } from './drone.schema';
import { droneService } from './drone.service';

export async function cadastrar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = cadastroDroneSchema.parse(req.body);
    const drone = await droneService.cadastrar(req.usuarioId as string, input);
    res.status(201).json(drone);
  } catch (error) {
    next(error);
  }
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const drones = await droneService.listar(req.usuarioId as string);
    res.status(200).json(drones);
  } catch (error) {
    next(error);
  }
}

export async function buscarPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const drone = await droneService.buscarPorId(req.usuarioId as string, req.params.id as string);
    res.status(200).json(drone);
  } catch (error) {
    next(error);
  }
}

export async function editar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = editarDroneSchema.parse(req.body);
    const drone = await droneService.editar(req.usuarioId as string, req.params.id as string, input);
    res.status(200).json(drone);
  } catch (error) {
    next(error);
  }
}

export async function excluir(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await droneService.excluir(req.usuarioId as string, req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
