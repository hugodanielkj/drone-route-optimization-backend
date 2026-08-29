import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../common/errors/app-error';
import { usuarioService } from '../usuario/usuario.service';
import { mapaService } from './mapa.service';
import { cadastroMapaSchema } from './mapa.schema';

const mapaValido = {
  pontoCarregamento: { x: 0, y: 0 },
  pontosIrrigacao: [{ x: 10, y: 10 }],
};

describe('mapaService.cadastrar', () => {
  it('cria um mapa associado ao usuário informado, com os pontos de irrigação persistidos', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);

    expect(mapa.userId).toBe(usuario.id);
    expect(mapa.pontosIrrigacao).toHaveLength(1);
    const persistido = await prisma.mapa.findUniqueOrThrow({
      where: { id: mapa.id },
      include: { pontosIrrigacao: true },
    });
    expect(persistido.pontosIrrigacao).toHaveLength(1);
  });
});

describe('mapaService.listar', () => {
  it('retorna apenas os mapas pertencentes ao usuário informado', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    await mapaService.cadastrar(hugo.id, mapaValido);
    await mapaService.cadastrar(outro.id, mapaValido);

    const mapas = await mapaService.listar(hugo.id);

    expect(mapas).toHaveLength(1);
    expect(mapas[0]?.userId).toBe(hugo.id);
  });

  it('retorna lista vazia quando o usuário não tem mapas', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    const mapas = await mapaService.listar(usuario.id);

    expect(mapas).toEqual([]);
  });
});

describe('mapaService.buscarPorId', () => {
  it('retorna o mapa quando pertence ao usuário informado', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);

    const encontrado = await mapaService.buscarPorId(usuario.id, mapa.id);

    expect(encontrado.id).toBe(mapa.id);
    expect(encontrado.pontosIrrigacao).toHaveLength(1);
  });

  it('lança NotFoundError quando o mapa não existe', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    await expect(mapaService.buscarPorId(usuario.id, 'id-inexistente')).rejects.toThrow(NotFoundError);
  });

  it('lança NotFoundError quando o mapa pertence a outro usuário', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(outro.id, mapaValido);

    await expect(mapaService.buscarPorId(hugo.id, mapa.id)).rejects.toThrow(NotFoundError);
  });
});

describe('cadastroMapaSchema', () => {
  it('rejeita coordenadas não finitas (NaN/Infinity), inalcançáveis via transporte JSON', () => {
    const resultado = cadastroMapaSchema.safeParse({
      pontoCarregamento: { x: Number.POSITIVE_INFINITY, y: 0 },
      pontosIrrigacao: [{ x: 1, y: 1 }],
    });

    expect(resultado.success).toBe(false);
  });

  it('rejeita mais de 1000 pontos de irrigação (RN16)', () => {
    const pontosIrrigacao = Array.from({ length: 1001 }, (_, i) => ({ x: i, y: i }));

    const resultado = cadastroMapaSchema.safeParse({
      pontoCarregamento: { x: -1, y: -1 },
      pontosIrrigacao,
    });

    expect(resultado.success).toBe(false);
  });

  it('aceita exatamente 1000 pontos de irrigação (RN16)', () => {
    const pontosIrrigacao = Array.from({ length: 1000 }, (_, i) => ({ x: i, y: i }));

    const resultado = cadastroMapaSchema.safeParse({
      pontoCarregamento: { x: -1, y: -1 },
      pontosIrrigacao,
    });

    expect(resultado.success).toBe(true);
  });

  it('rejeita ponto de irrigação igual ao ponto de carregamento (RN17)', () => {
    const resultado = cadastroMapaSchema.safeParse({
      pontoCarregamento: { x: 5, y: 5 },
      pontosIrrigacao: [{ x: 5, y: 5 }],
    });

    expect(resultado.success).toBe(false);
  });

  it('rejeita dois pontos de irrigação com coordenadas iguais entre si (RN18)', () => {
    const resultado = cadastroMapaSchema.safeParse({
      pontoCarregamento: { x: 0, y: 0 },
      pontosIrrigacao: [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ],
    });

    expect(resultado.success).toBe(false);
  });
});
