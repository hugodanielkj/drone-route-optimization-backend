import { RotaInviavelError } from './erros';
import { calcularPerna } from './perna';
import type { Coordenada, ParametrosDrone } from './tipos';

// RN05, como escrita em regras-de-negocio.md, só exige checar se o ponto de
// irrigação MAIS PRÓXIMO do carregamento é alcançável dentro da capacidade de
// bateria. Mas o consumo de uma perna de um único ponto cresce
// monotonicamente com a distância até ele (o fator P×payload+alpha é o
// mesmo para qualquer ponto isolado, já que há sempre "1 entrega pendente"
// nesse caso — só a distância muda) — logo, passar no ponto mais próximo NÃO
// garante que um ponto mais distante caiba sozinho numa perna, o que
// violaria RN04 mais adiante em dividirEmPernas. Por isso validamos TODOS os
// pontos aqui, não só o mais próximo (decisão confirmada com o usuário). O
// laço é O(n) e roda uma única vez, no início do pipeline — custo irrelevante
// dado o limite de 1000 pontos por mapa (RN16).
export function verificarViabilidadeMinima(
  pontoCarregamento: Coordenada,
  pontosIrrigacao: Coordenada[],
  drone: ParametrosDrone,
): void {
  for (const ponto of pontosIrrigacao) {
    const perna = calcularPerna(pontoCarregamento, [ponto], drone);
    if (perna.consumoTotal > drone.capacidadeBateria) {
      throw new RotaInviavelError(
        'Nenhuma rota viável: ao menos um ponto de irrigação não é alcançável, isoladamente, dentro da capacidade de bateria do drone (RN05)',
      );
    }
  }
}

// Caminhada gulosa pelo trajeto já otimizado: acumula pontos na perna atual
// enquanto o consumo energético (RN04) não ultrapassa a capacidade de
// bateria; ao primeiro ponto que faria a perna atual exceder o limite,
// fecha essa perna e abre uma nova só com esse ponto. verificarViabilidadeMinima
// já garante que todo ponto isolado cabe sozinho numa perna, então a nova
// perna aberta nunca começa inviável.
export function dividirEmPernas(
  pontoCarregamento: Coordenada,
  trajetoOtimizado: Coordenada[],
  drone: ParametrosDrone,
): Coordenada[][] {
  const pernas: Coordenada[][] = [];
  let pernaAtual: Coordenada[] = [];

  for (const ponto of trajetoOtimizado) {
    const candidata = [...pernaAtual, ponto];
    const consumoCandidata = calcularPerna(pontoCarregamento, candidata, drone).consumoTotal;

    if (consumoCandidata <= drone.capacidadeBateria) {
      pernaAtual = candidata;
      continue;
    }

    if (pernaAtual.length > 0) {
      pernas.push(pernaAtual);
    }
    pernaAtual = [ponto];
  }

  if (pernaAtual.length > 0) {
    pernas.push(pernaAtual);
  }

  return pernas;
}
