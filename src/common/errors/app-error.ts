export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;

  constructor(message = 'Não autenticado') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
}
