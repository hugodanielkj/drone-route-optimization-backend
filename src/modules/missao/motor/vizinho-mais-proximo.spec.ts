import { ordenarPorVizinhoMaisProximo } from './vizinho-mais-proximo';

describe('ordenarPorVizinhoMaisProximo', () => {
  it('ordena os pontos a partir do carregamento pela heurística gulosa', () => {
    const carregamento = { x: 0, y: 0 };
    const longe = { x: 10, y: 0 };
    const perto = { x: 1, y: 0 };
    const meio = { x: 5, y: 0 };

    const ordenado = ordenarPorVizinhoMaisProximo(carregamento, [longe, meio, perto]);

    expect(ordenado).toEqual([perto, meio, longe]);
  });

  it('resolve empate de distância mantendo a ordem original do array de entrada', () => {
    const carregamento = { x: 0, y: 0 };
    const a = { x: 5, y: 0 };
    const b = { x: -5, y: 0 };

    const ordenado = ordenarPorVizinhoMaisProximo(carregamento, [a, b]);

    expect(ordenado).toEqual([a, b]);
  });

  it('retorna lista vazia quando não há pontos de irrigação', () => {
    expect(ordenarPorVizinhoMaisProximo({ x: 0, y: 0 }, [])).toEqual([]);
  });
});
