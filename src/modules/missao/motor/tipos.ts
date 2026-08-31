import type { Coordenada } from '../../../common/util/distancia';

export type { Coordenada };

export interface ParametrosDrone {
  velocidadeMedia: number;
  capacidadeBateria: number;
  consumoPorIrrigacao: number;
}

export interface Perna {
  sequencia: Coordenada[];
  distanciaTotal: number;
  consumoTotal: number;
}

export interface ResultadoCalculoRota {
  pernas: Perna[];
  consumoEnergeticoTotal: number;
}

export interface EntradaCalculoRota {
  pontoCarregamento: Coordenada;
  pontosIrrigacao: Coordenada[];
  drone: ParametrosDrone;
}
