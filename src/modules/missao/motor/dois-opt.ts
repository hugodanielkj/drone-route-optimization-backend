import { distanciaEuclidiana } from '../../../common/util/distancia';
import type { Coordenada } from './tipos';

// 2-opt sobre um ciclo fechado: o ponto de carregamento fica fixo nas duas
// pontas da sequência ([carregamento, ...pontosIntermediarios, carregamento]);
// só os pontos intermediários são reversíveis. A mesma função serve tanto
// para o trajeto completo (RF-004.7) quanto para cada perna individualmente
// (RF-004.10).
//
// Critério de convergência: first-improvement — aplica a primeira reversão
// que reduz a distância total e reinicia a varredura a partir do início,
// repetindo até uma passada completa não encontrar mais nenhuma melhoria.
export function otimizarDoisOpt(pontoCarregamento: Coordenada, pontosIntermediarios: Coordenada[]): Coordenada[] {
  if (pontosIntermediarios.length < 2) {
    return [...pontosIntermediarios];
  }

  let sequencia = [pontoCarregamento, ...pontosIntermediarios, pontoCarregamento];
  let melhorou = true;

  while (melhorou) {
    melhorou = false;

    for (let i = 1; i < sequencia.length - 2 && !melhorou; i++) {
      for (let k = i + 1; k < sequencia.length - 1 && !melhorou; k++) {
        const distanciaAtual =
          distanciaEuclidiana(sequencia[i - 1]!, sequencia[i]!) + distanciaEuclidiana(sequencia[k]!, sequencia[k + 1]!);
        const distanciaTrocada =
          distanciaEuclidiana(sequencia[i - 1]!, sequencia[k]!) + distanciaEuclidiana(sequencia[i]!, sequencia[k + 1]!);

        if (distanciaTrocada < distanciaAtual) {
          sequencia = [...sequencia.slice(0, i), ...sequencia.slice(i, k + 1).reverse(), ...sequencia.slice(k + 1)];
          melhorou = true;
        }
      }
    }
  }

  return sequencia.slice(1, -1);
}
