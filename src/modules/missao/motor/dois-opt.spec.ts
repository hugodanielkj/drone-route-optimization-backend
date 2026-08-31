import { distanciaEuclidiana } from '../../../common/util/distancia';
import { otimizarDoisOpt } from './dois-opt';

function distanciaTotal(pontoCarregamento: { x: number; y: number }, pontos: { x: number; y: number }[]): number {
  const sequencia = [pontoCarregamento, ...pontos, pontoCarregamento];
  let total = 0;
  for (let i = 0; i < sequencia.length - 1; i++) {
    total += distanciaEuclidiana(sequencia[i]!, sequencia[i + 1]!);
  }
  return total;
}

describe('otimizarDoisOpt', () => {
  it('reduz a distância total desfazendo um cruzamento no trajeto', () => {
    const carregamento = { x: 0, y: 0 };
    // Ordem com cruzamento proposital: carregamento -> (0,10) -> (10,0) -> (10,10) -> carregamento
    const comCruzamento = [
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const distanciaAntes = distanciaTotal(carregamento, comCruzamento);

    const otimizado = otimizarDoisOpt(carregamento, comCruzamento);

    const distanciaDepois = distanciaTotal(carregamento, otimizado);
    expect(distanciaDepois).toBeLessThan(distanciaAntes);
    expect(otimizado).toHaveLength(3);
  });

  it('é um no-op ao rerodar sobre um resultado já convergido', () => {
    const carregamento = { x: 0, y: 0 };
    const pontos = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 1 },
    ];

    const primeiraPassada = otimizarDoisOpt(carregamento, pontos);
    const segundaPassada = otimizarDoisOpt(carregamento, primeiraPassada);

    expect(segundaPassada).toEqual(primeiraPassada);
  });

  it('não altera nada com 0 ou 1 ponto intermediário', () => {
    const carregamento = { x: 0, y: 0 };

    expect(otimizarDoisOpt(carregamento, [])).toEqual([]);
    const umPonto = [{ x: 5, y: 5 }];
    expect(otimizarDoisOpt(carregamento, umPonto)).toEqual(umPonto);
  });
});
