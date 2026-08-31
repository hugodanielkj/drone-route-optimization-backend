import { RotaInviavelError } from './erros';
import { calcularRota } from './pipeline';

const carregamento = { x: 0, y: 0 };
const drone = { velocidadeMedia: 1, capacidadeBateria: 10_000_000, consumoPorIrrigacao: 1 };

describe('calcularRota', () => {
  it('RN06 — é determinístico: a mesma entrada produz sempre o mesmo resultado', () => {
    const entrada = {
      pontoCarregamento: carregamento,
      pontosIrrigacao: [
        { x: 3, y: 1 },
        { x: 1, y: 4 },
        { x: 5, y: 2 },
        { x: 2, y: 2 },
      ],
      drone,
    };

    const primeiro = calcularRota(entrada);
    const segundo = calcularRota(entrada);

    expect(segundo).toEqual(primeiro);
  });

  it('RN03/RN04 — toda perna inicia/termina no carregamento e nenhuma excede a capacidade de bateria', () => {
    const droneComCapacidadeLimitada = { ...drone, capacidadeBateria: 200_000 };
    const resultado = calcularRota({
      pontoCarregamento: carregamento,
      pontosIrrigacao: [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
        { x: 5, y: 0 },
      ],
      drone: droneComCapacidadeLimitada,
    });

    expect(resultado.pernas.length).toBeGreaterThan(0);
    for (const perna of resultado.pernas) {
      expect(perna.sequencia[0]).toEqual(carregamento);
      expect(perna.sequencia[perna.sequencia.length - 1]).toEqual(carregamento);
      expect(perna.consumoTotal).toBeLessThanOrEqual(droneComCapacidadeLimitada.capacidadeBateria);
    }
  });

  it('RN05 — lança RotaInviavelError quando um ponto não é alcançável, e nenhuma perna é retornada', () => {
    const droneFraco = { ...drone, capacidadeBateria: 1 };

    expect(() =>
      calcularRota({
        pontoCarregamento: carregamento,
        pontosIrrigacao: [{ x: 100, y: 100 }],
        drone: droneFraco,
      }),
    ).toThrow(RotaInviavelError);
  });

  it('produz exatamente uma perna com um único ponto quando o mapa tem só um ponto de irrigação', () => {
    const resultado = calcularRota({
      pontoCarregamento: carregamento,
      pontosIrrigacao: [{ x: 10, y: 10 }],
      drone,
    });

    expect(resultado.pernas).toHaveLength(1);
    expect(resultado.pernas[0]?.sequencia).toEqual([carregamento, { x: 10, y: 10 }, carregamento]);
  });

  it('mantém todos os pontos numa única perna quando a capacidade de bateria é suficientemente grande', () => {
    const resultado = calcularRota({
      pontoCarregamento: carregamento,
      pontosIrrigacao: [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
      drone,
    });

    expect(resultado.pernas).toHaveLength(1);
    expect(resultado.consumoEnergeticoTotal).toBe(resultado.pernas[0]?.consumoTotal);
  });
});
