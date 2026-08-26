import { z } from 'zod';

export const cadastroUsuarioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
});

export type CadastroUsuarioInput = z.infer<typeof cadastroUsuarioSchema>;
