// Constantes fixas do sistema (.claude/rules/regras-de-negocio.md) — iguais
// para todos os drones; só velocidadeMedia e consumoPorIrrigacao variam por drone.
export const P_WATTS_POR_KG = 238.64;
export const ALPHA_WATTS = 4396.1;
export const TEMPO_NO_PONTO_SEGUNDOS = 8.3;

export interface ParametrosConsumoTrecho {
  distancia: number;
  entregasPendentesNoTrecho: number;
  consumoPorIrrigacao: number;
  velocidadeMedia: number;
  destinoEhPontoDeIrrigacao: boolean;
}

// consumo_trecho = (P × payload + alpha) × (distância / velocidade_média + tempo_no_ponto)
// tempo_no_ponto só é somado quando o destino do trecho é um ponto de irrigação
// (chegar ao ponto de carregamento recarrega a bateria, não a consome parada).
export function consumoTrecho(params: ParametrosConsumoTrecho): number {
  const payload = params.entregasPendentesNoTrecho * params.consumoPorIrrigacao;
  const tempoNoPonto = params.destinoEhPontoDeIrrigacao ? TEMPO_NO_PONTO_SEGUNDOS : 0;

  return (P_WATTS_POR_KG * payload + ALPHA_WATTS) * (params.distancia / params.velocidadeMedia + tempoNoPonto);
}
