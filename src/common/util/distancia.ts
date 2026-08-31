export interface Coordenada {
  x: number;
  y: number;
}

export function distanciaEuclidiana(a: Coordenada, b: Coordenada): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
