import { distanciaEuclidiana } from '../../../common/util/distancia';
import { consumoTrecho } from './consumo-trecho';
import type { Coordenada, Perna, ParametrosDrone } from './tipos';

// Monta a sequência fechada [carregamento, ...pontos, carregamento] (RN03) e
// soma consumoTrecho trecho a trecho. O payload de cada trecho é o número de
// entregas ainda não realizadas naquele ponto do percurso — decresce em uma
// unidade a cada ponto de irrigação já visitado, chegando a 0 no trecho de
// volta ao carregamento.
export function calcularPerna(pontoCarregamento: Coordenada, pontos: Coordenada[], drone: ParametrosDrone): Perna {
  const sequencia = [pontoCarregamento, ...pontos, pontoCarregamento];

  let distanciaTotal = 0;
  let consumoTotal = 0;
  let entregasPendentes = pontos.length;

  for (let i = 0; i < sequencia.length - 1; i++) {
    const origem = sequencia[i]!;
    const destino = sequencia[i + 1]!;
    const destinoEhPontoDeIrrigacao = i + 1 < sequencia.length - 1;
    const distancia = distanciaEuclidiana(origem, destino);

    consumoTotal += consumoTrecho({
      distancia,
      entregasPendentesNoTrecho: entregasPendentes,
      consumoPorIrrigacao: drone.consumoPorIrrigacao,
      velocidadeMedia: drone.velocidadeMedia,
      destinoEhPontoDeIrrigacao,
    });
    distanciaTotal += distancia;

    if (destinoEhPontoDeIrrigacao) {
      entregasPendentes -= 1;
    }
  }

  return { sequencia, distanciaTotal, consumoTotal };
}
