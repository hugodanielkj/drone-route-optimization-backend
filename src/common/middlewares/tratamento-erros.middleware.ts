import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors/app-error';

// Único lugar que decide o formato da resposta de erro (status code, corpo).
// Deve ser o último middleware registrado em app.ts.
export function tratamentoErrosMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    const validationError = new ValidationError('Falha de validação', error.flatten());
    res.status(validationError.statusCode).json({
      erro: validationError.message,
      detalhes: validationError.details,
    });
    return;
  }

  if (error instanceof AppError) {
    const body: { erro: string; detalhes?: unknown } = { erro: error.message };
    if (error instanceof ValidationError && error.details !== undefined) {
      body.detalhes = error.details;
    }
    res.status(error.statusCode).json(body);
    return;
  }

  if (error instanceof SyntaxError && (error as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ erro: 'Corpo da requisição não é um JSON válido' });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(error);
  res.status(500).json({ erro: 'Erro interno do servidor' });
}
