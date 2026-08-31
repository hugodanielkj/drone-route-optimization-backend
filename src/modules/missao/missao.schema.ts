import { z } from 'zod';

export const calcularMissaoSchema = z.object({
  droneId: z.string().uuid('droneId deve ser um uuid válido'),
  mapaId: z.string().uuid('mapaId deve ser um uuid válido'),
});

export type CalcularMissaoInput = z.infer<typeof calcularMissaoSchema>;
