import { StatusMissao } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../common/errors/app-error';
import type { AdicionarPontoIrrigacaoInput, AlterarPontoCarregamentoInput, CadastroMapaInput } from './mapa.schema';

export const mapaService = {
  async cadastrar(usuarioId: string, input: CadastroMapaInput) {
    return prisma.mapa.create({
      data: {
        pontoCarregamentoX: input.pontoCarregamento.x,
        pontoCarregamentoY: input.pontoCarregamento.y,
        userId: usuarioId,
        pontosIrrigacao: {
          create: input.pontosIrrigacao,
        },
      },
      include: { pontosIrrigacao: true },
    });
  },

  async listar(usuarioId: string) {
    return prisma.mapa.findMany({
      where: { userId: usuarioId },
      include: { pontosIrrigacao: true },
    });
  },

  async buscarPorId(usuarioId: string, mapaId: string) {
    const mapa = await prisma.mapa.findUnique({
      where: { id: mapaId },
      include: { pontosIrrigacao: true },
    });
    if (!mapa || mapa.userId !== usuarioId) {
      throw new NotFoundError('Mapa não encontrado');
    }
    return mapa;
  },

  async alterarPontoCarregamento(usuarioId: string, mapaId: string, input: AlterarPontoCarregamentoInput) {
    const mapa = await mapaService.buscarPorId(usuarioId, mapaId);

    const colideComIrrigacao = mapa.pontosIrrigacao.some((ponto) => ponto.x === input.x && ponto.y === input.y);
    if (colideComIrrigacao) {
      throw new ConflictError('O novo ponto de carregamento coincide com um ponto de irrigação existente'); // RN17
    }

    const [mapaAtualizado] = await prisma.$transaction([
      prisma.mapa.update({
        where: { id: mapaId },
        data: { pontoCarregamentoX: input.x, pontoCarregamentoY: input.y },
        include: { pontosIrrigacao: true },
      }),
      // RN13: alterar o ponto de carregamento desativa toda Missão ativa que referencie o mapa.
      prisma.missao.updateMany({
        where: { mapaId, status: StatusMissao.ATIVA },
        data: { status: StatusMissao.DESATIVADA },
      }),
    ]);

    return mapaAtualizado;
  },

  async adicionarPontoIrrigacao(usuarioId: string, mapaId: string, input: AdicionarPontoIrrigacaoInput) {
    const mapa = await mapaService.buscarPorId(usuarioId, mapaId);

    const igualAoCarregamento = input.x === mapa.pontoCarregamentoX && input.y === mapa.pontoCarregamentoY;
    if (igualAoCarregamento) {
      throw new ConflictError('O ponto de irrigação coincide com o ponto de carregamento do mapa'); // RN17
    }

    const jaExiste = mapa.pontosIrrigacao.some((ponto) => ponto.x === input.x && ponto.y === input.y);
    if (jaExiste) {
      throw new ConflictError('Já existe um ponto de irrigação com essa coordenada neste mapa'); // RN18
    }

    if (mapa.pontosIrrigacao.length >= 1000) {
      throw new ConflictError('O mapa não pode ter mais de 1000 pontos de irrigação'); // RN16
    }

    await prisma.$transaction([
      prisma.pontoIrrigacao.create({ data: { ...input, mapaId } }),
      // RN13: adicionar um ponto de irrigação desativa toda Missão ativa que referencie o mapa.
      prisma.missao.updateMany({
        where: { mapaId, status: StatusMissao.ATIVA },
        data: { status: StatusMissao.DESATIVADA },
      }),
    ]);

    return mapaService.buscarPorId(usuarioId, mapaId);
  },

  async removerPontoIrrigacao(usuarioId: string, mapaId: string, pontoId: string) {
    const mapa = await mapaService.buscarPorId(usuarioId, mapaId);

    const ponto = mapa.pontosIrrigacao.find((p) => p.id === pontoId);
    if (!ponto) {
      throw new NotFoundError('Ponto de irrigação não encontrado');
    }

    if (mapa.pontosIrrigacao.length === 1) {
      throw new ConflictError('O mapa deve conter ao menos um ponto de irrigação'); // RN01
    }

    await prisma.$transaction([
      prisma.pontoIrrigacao.delete({ where: { id: pontoId } }),
      // RN13: remover um ponto de irrigação desativa toda Missão ativa que referencie o mapa.
      prisma.missao.updateMany({
        where: { mapaId, status: StatusMissao.ATIVA },
        data: { status: StatusMissao.DESATIVADA },
      }),
    ]);
  },

  async excluir(usuarioId: string, mapaId: string) {
    await mapaService.buscarPorId(usuarioId, mapaId);

    const missoesAssociadas = await prisma.missao.count({ where: { mapaId } }); // RN15, sem filtro de status
    if (missoesAssociadas > 0) {
      throw new ConflictError('Mapa possui Missões associadas e não pode ser excluído');
    }

    await prisma.mapa.delete({ where: { id: mapaId } }); // onDelete: Cascade remove pontosIrrigacao
  },
};
