import { distanciaEuclidiana } from '../../../common/util/distancia';
import type { Coordenada } from './tipos';

// Heurística gulosa: a cada passo, escolhe o ponto restante mais próximo da
// posição atual do drone. Em caso de empate de distância, mantém o primeiro
// candidato na ordem original do array de entrada — nunca depende de ordem
// de iteração de Set/objeto — garantindo determinismo (RN06).
export function ordenarPorVizinhoMaisProximo(pontoCarregamento: Coordenada, pontosIrrigacao: Coordenada[]): Coordenada[] {
  const restantes = [...pontosIrrigacao];
  const ordenado: Coordenada[] = [];
  let atual = pontoCarregamento;

  while (restantes.length > 0) {
    let indiceMaisProximo = 0;
    let menorDistancia = distanciaEuclidiana(atual, restantes[0]!);

    for (let i = 1; i < restantes.length; i++) {
      const distancia = distanciaEuclidiana(atual, restantes[i]!);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        indiceMaisProximo = i;
      }
    }

    const [proximo] = restantes.splice(indiceMaisProximo, 1);
    ordenado.push(proximo!);
    atual = proximo!;
  }

  return ordenado;
}
