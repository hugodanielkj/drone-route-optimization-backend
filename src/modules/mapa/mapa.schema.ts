import { z } from 'zod';

const coordenadaSchema = z.object({
  x: z.number().finite('Coordenada x deve ser um número finito'),
  y: z.number().finite('Coordenada y deve ser um número finito'),
});

type Coordenada = z.infer<typeof coordenadaSchema>;

function chaveCoordenada(coordenada: Coordenada): string {
  return `${coordenada.x},${coordenada.y}`;
}

export const cadastroMapaSchema = z
  .object({
    pontoCarregamento: coordenadaSchema,
    pontosIrrigacao: z
      .array(coordenadaSchema)
      .min(1, 'A lista de pontos de irrigação deve conter ao menos um ponto') // RN01
      .max(1000, 'A lista de pontos de irrigação não pode conter mais de 1000 pontos'), // RN16
  })
  .superRefine((data, ctx) => {
    const chaveCarregamento = chaveCoordenada(data.pontoCarregamento);
    const temPontoIgualAoCarregamento = data.pontosIrrigacao.some(
      (ponto) => chaveCoordenada(ponto) === chaveCarregamento,
    );
    if (temPontoIgualAoCarregamento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pontosIrrigacao'],
        message: 'Um ponto de irrigação não pode ter a mesma coordenada do ponto de carregamento', // RN17
      });
    }

    const chaves = data.pontosIrrigacao.map(chaveCoordenada);
    if (new Set(chaves).size !== chaves.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pontosIrrigacao'],
        message: 'Existem dois pontos de irrigação com a mesma coordenada', // RN18
      });
    }
  });

export type CadastroMapaInput = z.infer<typeof cadastroMapaSchema>;
