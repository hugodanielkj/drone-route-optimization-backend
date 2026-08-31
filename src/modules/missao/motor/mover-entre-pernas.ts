import { calcularPerna } from './perna';
import type { Coordenada, ParametrosDrone } from './tipos';

interface Movimento {
  origem: number;
  indice: number;
  destino: number;
  posicao: number;
}

// Realoca pontos de irrigação entre pernas quando isso reduz o consumo
// energético combinado das duas pernas envolvidas — não a distância bruta.
// A cada passada, avalia TODAS as combinações (ponto, perna de origem, perna
// de destino, posição de inserção na perna de destino) e aplica só a
// combinação de maior redução de consumo combinado (steepest descent),
// repetindo até uma passada completa não encontrar mais nenhuma melhoria.
//
// Uma troca só é confirmada quando as duas condições valem: (1) as duas
// pernas resultantes continuam dentro da capacidade de bateria do drone
// (RN04) e (2) o consumo combinado das duas pernas efetivamente diminui.
// RN04 é um invariante do sistema — nenhuma troca pode violá-la, mesmo que
// reduzisse o consumo combinado; candidatas que violariam RN04 em qualquer
// uma das duas pernas resultantes são descartadas da busca.
//
// Uma perna pode ficar sem nenhum ponto de irrigação depois de esvaziada por
// sucessivas trocas — essas pernas vazias são descartadas antes de retornar,
// já que uma perna sem pontos não tem significado operacional (RN03).
export function moverEntrePernas(
  pontoCarregamento: Coordenada,
  pernasIniciais: Coordenada[][],
  drone: ParametrosDrone,
): Coordenada[][] {
  const pernas = pernasIniciais.map((perna) => [...perna]);
  if (pernas.length < 2) {
    return pernas;
  }

  let melhorou = true;

  while (melhorou) {
    melhorou = false;
    let melhorGanho = 0;
    let melhorMovimento: Movimento | null = null;

    for (let origem = 0; origem < pernas.length; origem++) {
      const pernaOrigem = pernas[origem]!;
      if (pernaOrigem.length === 0) continue;

      const consumoOrigemAntes = calcularPerna(pontoCarregamento, pernaOrigem, drone).consumoTotal;

      for (let indice = 0; indice < pernaOrigem.length; indice++) {
        const ponto = pernaOrigem[indice]!;
        const origemSemPonto = [...pernaOrigem.slice(0, indice), ...pernaOrigem.slice(indice + 1)];
        const consumoOrigemDepois = calcularPerna(pontoCarregamento, origemSemPonto, drone).consumoTotal;

        for (let destino = 0; destino < pernas.length; destino++) {
          if (destino === origem) continue;
          const pernaDestino = pernas[destino]!;
          const consumoDestinoAntes = calcularPerna(pontoCarregamento, pernaDestino, drone).consumoTotal;

          for (let posicao = 0; posicao <= pernaDestino.length; posicao++) {
            const destinoComPonto = [...pernaDestino.slice(0, posicao), ponto, ...pernaDestino.slice(posicao)];
            const consumoDestinoDepois = calcularPerna(pontoCarregamento, destinoComPonto, drone).consumoTotal;

            const pernasResultantesViaveis =
              consumoOrigemDepois <= drone.capacidadeBateria && consumoDestinoDepois <= drone.capacidadeBateria;
            if (!pernasResultantesViaveis) continue; // RN04: troca descartada, nunca aplicada

            const ganho = consumoOrigemAntes + consumoDestinoAntes - (consumoOrigemDepois + consumoDestinoDepois);

            if (ganho > melhorGanho) {
              melhorGanho = ganho;
              melhorMovimento = { origem, indice, destino, posicao };
            }
          }
        }
      }
    }

    if (melhorMovimento) {
      const { origem, indice, destino, posicao } = melhorMovimento;
      const ponto = pernas[origem]![indice]!;
      pernas[origem] = [...pernas[origem]!.slice(0, indice), ...pernas[origem]!.slice(indice + 1)];
      pernas[destino] = [...pernas[destino]!.slice(0, posicao), ponto, ...pernas[destino]!.slice(posicao)];
      melhorou = true;
    }
  }

  return pernas.filter((perna) => perna.length > 0);
}
