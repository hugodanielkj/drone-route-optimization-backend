import { moverEntrePernas } from './mover-entre-pernas';
import { calcularPerna } from './perna';

const carregamento = { x: 0, y: 0 };
const drone = { velocidadeMedia: 1, capacidadeBateria: 10_000_000, consumoPorIrrigacao: 1 };

function consumoCombinado(pernas: { x: number; y: number }[][]): number {
  return pernas.reduce((total, perna) => total + calcularPerna(carregamento, perna, drone).consumoTotal, 0);
}

describe('moverEntrePernas', () => {
  it('realoca um ponto para a perna de destino que reduz o consumo combinado', () => {
    // Dois pontos próximos entre si, mas longe do carregamento: manter cada um
    // em sua própria perna paga duas viagens redondas caras; juntá-los numa
    // única perna paga só uma, com um desvio pequeno entre os dois pontos.
    const pontoA = { x: 100, y: 0 };
    const pontoB = { x: 100, y: 1 };
    const pernasIniciais = [[pontoA], [pontoB]];
    const consumoAntes = consumoCombinado(pernasIniciais);

    const resultado = moverEntrePernas(carregamento, pernasIniciais, drone);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toHaveLength(2);
    expect(resultado.flat()).toEqual(expect.arrayContaining([pontoA, pontoB]));
    expect(consumoCombinado(resultado)).toBeLessThan(consumoAntes);
  });

  it('é um no-op quando nenhuma realocação melhora o consumo combinado', () => {
    // Pontos em direções opostas e distantes: qualquer realocação implicaria
    // um desvio enorme, sempre pior que manter pernas separadas.
    const pernasIniciais = [[{ x: -100, y: 0 }], [{ x: 100, y: 0 }]];

    const resultado = moverEntrePernas(carregamento, pernasIniciais, drone);

    expect(resultado).toEqual(pernasIniciais);
  });

  it('descarta uma troca que reduziria o consumo combinado mas tornaria a perna de destino inviável (RN04)', () => {
    const pontoA = { x: 100, y: 0 };
    const pontoB = { x: 100, y: 1 };
    const pernasIniciais = [[pontoA], [pontoB]];

    const consumoA = calcularPerna(carregamento, [pontoA], drone).consumoTotal;
    const consumoB = calcularPerna(carregamento, [pontoB], drone).consumoTotal;
    const consumoMergeAB = calcularPerna(carregamento, [pontoA, pontoB], drone).consumoTotal;
    const consumoMergeBA = calcularPerna(carregamento, [pontoB, pontoA], drone).consumoTotal;

    // Capacidade comporta cada perna isolada, mas não a perna resultante da
    // troca (em nenhuma das duas ordens possíveis) — a troca reduziria o
    // consumo combinado, mas deve ser descartada por violar RN04.
    const capacidadeBateria = (Math.max(consumoA, consumoB) + Math.min(consumoMergeAB, consumoMergeBA)) / 2;
    expect(capacidadeBateria).toBeGreaterThan(Math.max(consumoA, consumoB));
    expect(capacidadeBateria).toBeLessThan(Math.min(consumoMergeAB, consumoMergeBA));

    const resultado = moverEntrePernas(carregamento, pernasIniciais, { ...drone, capacidadeBateria });

    expect(resultado).toEqual(pernasIniciais);
  });

  it('nunca deixa uma perna vazia no resultado final', () => {
    const pontoA = { x: 100, y: 0 };
    const pontoB = { x: 100, y: 1 };

    const resultado = moverEntrePernas(carregamento, [[pontoA], [pontoB]], drone);

    expect(resultado.every((perna) => perna.length > 0)).toBe(true);
  });

  it('não altera nada com menos de duas pernas', () => {
    const pernaUnica = [[{ x: 1, y: 1 }]];

    expect(moverEntrePernas(carregamento, pernaUnica, drone)).toEqual(pernaUnica);
  });
});
