import { ALPHA_WATTS, P_WATTS_POR_KG, TEMPO_NO_PONTO_SEGUNDOS, consumoTrecho } from './consumo-trecho';

describe('consumoTrecho', () => {
  it('soma tempoNoPonto quando o destino é um ponto de irrigação', () => {
    const resultado = consumoTrecho({
      distancia: 10,
      entregasPendentesNoTrecho: 2,
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 5,
      destinoEhPontoDeIrrigacao: true,
    });

    const payload = 2 * 1.5;
    const esperado = (P_WATTS_POR_KG * payload + ALPHA_WATTS) * (10 / 5 + TEMPO_NO_PONTO_SEGUNDOS);
    expect(resultado).toBeCloseTo(esperado, 10);
  });

  it('não soma tempoNoPonto quando o destino é o ponto de carregamento', () => {
    const resultado = consumoTrecho({
      distancia: 10,
      entregasPendentesNoTrecho: 0,
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 5,
      destinoEhPontoDeIrrigacao: false,
    });

    const esperado = ALPHA_WATTS * (10 / 5);
    expect(resultado).toBeCloseTo(esperado, 10);
  });

  it('reduz ao termo alpha quando não há entregas pendentes', () => {
    const resultado = consumoTrecho({
      distancia: 20,
      entregasPendentesNoTrecho: 0,
      consumoPorIrrigacao: 3,
      velocidadeMedia: 4,
      destinoEhPontoDeIrrigacao: true,
    });

    const esperado = ALPHA_WATTS * (20 / 4 + TEMPO_NO_PONTO_SEGUNDOS);
    expect(resultado).toBeCloseTo(esperado, 10);
  });
});
