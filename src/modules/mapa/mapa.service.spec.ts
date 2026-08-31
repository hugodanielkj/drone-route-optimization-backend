import { prisma } from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../common/errors/app-error';
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

describe('mapaService.alterarPontoCarregamento', () => {
  it('atualiza o ponto de carregamento do mapa', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);

    const atualizado = await mapaService.alterarPontoCarregamento(usuario.id, mapa.id, { x: 5, y: 5 });

    expect(atualizado.pontoCarregamentoX).toBe(5);
    expect(atualizado.pontoCarregamentoY).toBe(5);
  });

  it('lança NotFoundError para mapa de outro usuário', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(outro.id, mapaValido);

    await expect(mapaService.alterarPontoCarregamento(hugo.id, mapa.id, { x: 1, y: 1 })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('lança ConflictError quando a nova coordenada coincide com um ponto de irrigação existente (RN17)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);

    await expect(mapaService.alterarPontoCarregamento(usuario.id, mapa.id, { x: 10, y: 10 })).rejects.toThrow(
      ConflictError,
    );
  });

  it('desativa Missões ativas associadas ao mapa (RN13)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);
    const drone = await prisma.drone.create({
      data: { nome: 'Drone A', consumoPorIrrigacao: 1, velocidadeMedia: 1, capacidadeBateria: 1, userId: usuario.id },
    });
    const missao = await prisma.missao.create({ data: { droneId: drone.id, mapaId: mapa.id, status: 'ATIVA' } });

    await mapaService.alterarPontoCarregamento(usuario.id, mapa.id, { x: 5, y: 5 });

    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });
});

describe('mapaService.adicionarPontoIrrigacao', () => {
  it('adiciona um ponto de irrigação ao mapa', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);

    const atualizado = await mapaService.adicionarPontoIrrigacao(usuario.id, mapa.id, { x: 20, y: 20 });

    expect(atualizado.pontosIrrigacao).toHaveLength(2);
  });

  it('lança NotFoundError para mapa de outro usuário', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(outro.id, mapaValido);

    await expect(mapaService.adicionarPontoIrrigacao(hugo.id, mapa.id, { x: 1, y: 1 })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('lança ConflictError quando o ponto coincide com o ponto de carregamento (RN17)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);

    await expect(mapaService.adicionarPontoIrrigacao(usuario.id, mapa.id, { x: 0, y: 0 })).rejects.toThrow(
      ConflictError,
    );
  });

  it('lança ConflictError quando o ponto coincide com outro ponto de irrigação existente (RN18)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);

    await expect(mapaService.adicionarPontoIrrigacao(usuario.id, mapa.id, { x: 10, y: 10 })).rejects.toThrow(
      ConflictError,
    );
  });

  it('lança ConflictError ao exceder o limite de 1000 pontos de irrigação (RN16)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const pontosIrrigacao = Array.from({ length: 1000 }, (_, i) => ({ x: i + 1, y: i + 1 }));
    const mapa = await mapaService.cadastrar(usuario.id, { pontoCarregamento: { x: 0, y: 0 }, pontosIrrigacao });

    await expect(mapaService.adicionarPontoIrrigacao(usuario.id, mapa.id, { x: 5000, y: 5000 })).rejects.toThrow(
      ConflictError,
    );
  });

  it('desativa Missões ativas associadas ao mapa (RN13)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);
    const drone = await prisma.drone.create({
      data: { nome: 'Drone A', consumoPorIrrigacao: 1, velocidadeMedia: 1, capacidadeBateria: 1, userId: usuario.id },
    });
    const missao = await prisma.missao.create({ data: { droneId: drone.id, mapaId: mapa.id, status: 'ATIVA' } });

    await mapaService.adicionarPontoIrrigacao(usuario.id, mapa.id, { x: 20, y: 20 });

    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });
});

describe('mapaService.removerPontoIrrigacao', () => {
  it('remove um ponto de irrigação quando há mais de um', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, {
      pontoCarregamento: { x: 0, y: 0 },
      pontosIrrigacao: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    });
    const pontoId = mapa.pontosIrrigacao[0]?.id as string;

    await mapaService.removerPontoIrrigacao(usuario.id, mapa.id, pontoId);

    const persistido = await mapaService.buscarPorId(usuario.id, mapa.id);
    expect(persistido.pontosIrrigacao).toHaveLength(1);
  });

  it('lança NotFoundError para mapa de outro usuário', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(outro.id, mapaValido);
    const pontoId = mapa.pontosIrrigacao[0]?.id as string;

    await expect(mapaService.removerPontoIrrigacao(hugo.id, mapa.id, pontoId)).rejects.toThrow(NotFoundError);
  });

  it('lança NotFoundError quando o pontoId não pertence ao mapa', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);

    await expect(mapaService.removerPontoIrrigacao(usuario.id, mapa.id, 'ponto-inexistente')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('lança ConflictError ao tentar remover o último ponto de irrigação (RN01)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);
    const pontoId = mapa.pontosIrrigacao[0]?.id as string;

    await expect(mapaService.removerPontoIrrigacao(usuario.id, mapa.id, pontoId)).rejects.toThrow(ConflictError);
  });

  it('desativa Missões ativas associadas ao mapa (RN13)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, {
      pontoCarregamento: { x: 0, y: 0 },
      pontosIrrigacao: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    });
    const pontoId = mapa.pontosIrrigacao[0]?.id as string;
    const drone = await prisma.drone.create({
      data: { nome: 'Drone A', consumoPorIrrigacao: 1, velocidadeMedia: 1, capacidadeBateria: 1, userId: usuario.id },
    });
    const missao = await prisma.missao.create({ data: { droneId: drone.id, mapaId: mapa.id, status: 'ATIVA' } });

    await mapaService.removerPontoIrrigacao(usuario.id, mapa.id, pontoId);

    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });
});

describe('mapaService.excluir', () => {
  it('remove o mapa quando não há Missão associada', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);

    await mapaService.excluir(usuario.id, mapa.id);

    const persistido = await prisma.mapa.findUnique({ where: { id: mapa.id } });
    expect(persistido).toBeNull();
  });

  it('lança NotFoundError para mapa de outro usuário', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(outro.id, mapaValido);

    await expect(mapaService.excluir(hugo.id, mapa.id)).rejects.toThrow(NotFoundError);
  });

  it('lança ConflictError e não exclui quando há Missão associada (RN15)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const mapa = await mapaService.cadastrar(usuario.id, mapaValido);
    const drone = await prisma.drone.create({
      data: { nome: 'Drone A', consumoPorIrrigacao: 1, velocidadeMedia: 1, capacidadeBateria: 1, userId: usuario.id },
    });
    await prisma.missao.create({ data: { droneId: drone.id, mapaId: mapa.id, status: 'DESATIVADA' } });

    await expect(mapaService.excluir(usuario.id, mapa.id)).rejects.toThrow(ConflictError);
    const persistido = await prisma.mapa.findUnique({ where: { id: mapa.id } });
    expect(persistido).not.toBeNull();
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
