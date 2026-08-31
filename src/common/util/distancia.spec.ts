import { distanciaEuclidiana } from './distancia';

describe('distanciaEuclidiana', () => {
  it('calcula a distância euclidiana entre duas coordenadas', () => {
    expect(distanciaEuclidiana({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('retorna 0 para coordenadas iguais', () => {
    expect(distanciaEuclidiana({ x: 7, y: -2 }, { x: 7, y: -2 })).toBe(0);
  });

  it('funciona com coordenadas negativas', () => {
    expect(distanciaEuclidiana({ x: -1, y: -1 }, { x: 2, y: 3 })).toBe(5);
  });
});
