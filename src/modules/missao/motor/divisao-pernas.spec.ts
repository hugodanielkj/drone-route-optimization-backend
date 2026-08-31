import { RotaInviavelError } from './erros';
import { dividirEmPernas, verificarViabilidadeMinima } from './divisao-pernas';
import { calcularPerna } from './perna';

const carregamento = { x: 0, y: 0 };
const drone = { velocidadeMedia: 1, capacidadeBateria: 0, consumoPorIrrigacao: 1 };

const p1 = { x: 1, y: 0 }; // mais próximo do carregamento
const p2 = { x: 2, y: 0 };
const p3 = { x: 3, y: 0 }; // mais distante

const consumo1 = calcularPerna(carregamento, [p1], drone).consumoTotal;
const consumo3 = calcularPerna(carregamento, [p3], drone).consumoTotal;
const consumo12 = calcularPerna(carregamento, [p1, p2], drone).consumoTotal;
const consumo123 = calcularPerna(carregamento, [p1, p2, p3], drone).consumoTotal;

describe('verificarViabilidadeMinima', () => {
  it('não lança erro quando todos os pontos são individualmente alcançáveis', () => {
    expect(() =>
      verificarViabilidadeMinima(carregamento, [p1, p2, p3], { ...drone, capacidadeBateria: consumo123 }),
    ).not.toThrow();
  });

  it('lança RotaInviavelError quando o ponto mais próximo excede a capacidade de bateria (RN05)', () => {
    expect(() =>
      verificarViabilidadeMinima(carregamento, [p1], { ...drone, capacidadeBateria: consumo1 - 1 }),
    ).toThrow(RotaInviavelError);
  });

  it('lança RotaInviavelError quando um ponto NÃO-mais-próximo é individualmente inviável, mesmo com o mais próximo viável (RN05 estendida)', () => {
    // consumo1 (mais próximo) cabe exatamente; consumo3 (mais distante) excede — cresce com a distância.
    expect(consumo3).toBeGreaterThan(consumo1);
    expect(() =>
      verificarViabilidadeMinima(carregamento, [p1, p3], { ...drone, capacidadeBateria: consumo1 }),
    ).toThrow(RotaInviavelError);
  });
});

describe('dividirEmPernas', () => {
  it('mantém todos os pontos numa única perna quando a capacidade comporta o trajeto inteiro', () => {
    const pernas = dividirEmPernas(carregamento, [p1, p2, p3], { ...drone, capacidadeBateria: consumo123 });

    expect(pernas).toEqual([[p1, p2, p3]]);
  });

  it('divide em múltiplas pernas quando a capacidade não comporta todos os pontos de uma vez', () => {
    const droneComCapacidade = { ...drone, capacidadeBateria: consumo12 };

    const pernas = dividirEmPernas(carregamento, [p1, p2, p3], droneComCapacidade);

    expect(pernas).toEqual([[p1, p2], [p3]]);
    for (const perna of pernas) {
      expect(calcularPerna(carregamento, perna, droneComCapacidade).consumoTotal).toBeLessThanOrEqual(
        droneComCapacidade.capacidadeBateria,
      );
    }
  });

  it('aceita uma perna cujo consumoTotal bate exatamente no limite da capacidade (<=, não <)', () => {
    const droneNoLimite = { ...drone, capacidadeBateria: consumo12 };

    const pernas = dividirEmPernas(carregamento, [p1, p2], droneNoLimite);

    expect(pernas).toEqual([[p1, p2]]);
  });
});
