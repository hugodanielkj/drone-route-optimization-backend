import { z } from 'zod';

export const cadastroDroneSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  consumoPorIrrigacao: z.number().positive('Consumo por irrigação deve ser positivo'),
  velocidadeMedia: z.number().positive('Velocidade média deve ser positiva'),
  capacidadeBateria: z.number().positive('Capacidade de bateria deve ser positiva'),
});

export type CadastroDroneInput = z.infer<typeof cadastroDroneSchema>;

export const editarDroneSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório').optional(),
    consumoPorIrrigacao: z.number().positive('Consumo por irrigação deve ser positivo').optional(),
    velocidadeMedia: z.number().positive('Velocidade média deve ser positiva').optional(),
    capacidadeBateria: z.number().positive('Capacidade de bateria deve ser positiva').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Ao menos um atributo deve ser informado para edição',
  });

export type EditarDroneInput = z.infer<typeof editarDroneSchema>;
