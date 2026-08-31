import { distanciaEuclidiana } from '../../../common/util/distancia';
import { consumoTrecho } from './consumo-trecho';
import { calcularPerna } from './perna';

const carregamento = { x: 0, y: 0 };
const drone = { velocidadeMedia: 5, capacidadeBateria: 1_000_000, consumoPorIrrigacao: 2 };

describe('calcularPerna', () => {
  it('monta a sequência fechada e calcula o consumo de uma perna de um único ponto', () => {
    const p = { x: 3, y: 4 };

    const perna = calcularPerna(carregamento, [p], drone);

    expect(perna.sequencia).toEqual([carregamento, p, carregamento]);

    const distanciaIda = distanciaEuclidiana(carregamento, p);
    const consumoIda = consumoTrecho({
      distancia: distanciaIda,
      entregasPendentesNoTrecho: 1,
      consumoPorIrrigacao: drone.consumoPorIrrigacao,
      velocidadeMedia: drone.velocidadeMedia,
      destinoEhPontoDeIrrigacao: true,
    });
    const consumoVolta = consumoTrecho({
      distancia: distanciaIda,
      entregasPendentesNoTrecho: 0,
      consumoPorIrrigacao: drone.consumoPorIrrigacao,
      velocidadeMedia: drone.velocidadeMedia,
      destinoEhPontoDeIrrigacao: false,
    });
    expect(perna.consumoTotal).toBeCloseTo(consumoIda + consumoVolta, 10);
    expect(perna.distanciaTotal).toBeCloseTo(distanciaIda * 2, 10);
  });

  it('decresce o payload a cada ponto de irrigação já visitado numa perna com múltiplos pontos', () => {
    const p1 = { x: 1, y: 0 };
    const p2 = { x: 2, y: 0 };

    const perna = calcularPerna(carregamento, [p1, p2], drone);

    // trecho 1 (carregamento -> p1): 2 entregas pendentes
    const t1 = consumoTrecho({
      distancia: 1,
      entregasPendentesNoTrecho: 2,
      consumoPorIrrigacao: drone.consumoPorIrrigacao,
      velocidadeMedia: drone.velocidadeMedia,
      destinoEhPontoDeIrrigacao: true,
    });
    // trecho 2 (p1 -> p2): 1 entrega pendente
    const t2 = consumoTrecho({
      distancia: 1,
      entregasPendentesNoTrecho: 1,
      consumoPorIrrigacao: drone.consumoPorIrrigacao,
      velocidadeMedia: drone.velocidadeMedia,
      destinoEhPontoDeIrrigacao: true,
    });
    // trecho 3 (p2 -> carregamento): 0 entregas pendentes
    const t3 = consumoTrecho({
      distancia: 2,
      entregasPendentesNoTrecho: 0,
      consumoPorIrrigacao: drone.consumoPorIrrigacao,
      velocidadeMedia: drone.velocidadeMedia,
      destinoEhPontoDeIrrigacao: false,
    });

    expect(perna.consumoTotal).toBeCloseTo(t1 + t2 + t3, 10);
    expect(perna.distanciaTotal).toBeCloseTo(1 + 1 + 2, 10);
  });
});
