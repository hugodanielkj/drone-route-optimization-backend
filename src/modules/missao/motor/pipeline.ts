import { dividirEmPernas, verificarViabilidadeMinima } from './divisao-pernas';
import { otimizarDoisOpt } from './dois-opt';
import { moverEntrePernas } from './mover-entre-pernas';
import { calcularPerna } from './perna';
import type { EntradaCalculoRota, ResultadoCalculoRota } from './tipos';
import { ordenarPorVizinhoMaisProximo } from './vizinho-mais-proximo';

// Pipeline determinístico (RN06) de cálculo de rota: vizinho mais próximo →
// 2-opt no trajeto completo → divisão em pernas respeitando a capacidade de
// bateria → move entre pernas → 2-opt por perna → agregação final. Nenhuma
// etapa depende de Express/Prisma — função pura, testável isoladamente.
export function calcularRota(entrada: EntradaCalculoRota): ResultadoCalculoRota {
  const { pontoCarregamento, pontosIrrigacao, drone } = entrada;

  verificarViabilidadeMinima(pontoCarregamento, pontosIrrigacao, drone); // RN05

  const trajetoInicial = ordenarPorVizinhoMaisProximo(pontoCarregamento, pontosIrrigacao);
  const trajetoOtimizado = otimizarDoisOpt(pontoCarregamento, trajetoInicial);

  const pernasIniciais = dividirEmPernas(pontoCarregamento, trajetoOtimizado, drone);
  const pernasRealocadas = moverEntrePernas(pontoCarregamento, pernasIniciais, drone);

  const pernas = pernasRealocadas.map((pontos) => calcularPerna(pontoCarregamento, otimizarDoisOpt(pontoCarregamento, pontos), drone));

  const consumoEnergeticoTotal = pernas.reduce((total, perna) => total + perna.consumoTotal, 0);

  return { pernas, consumoEnergeticoTotal };
}
