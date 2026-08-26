import { z } from 'zod';

export const loginSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

export type LoginInput = z.infer<typeof loginSchema>;
