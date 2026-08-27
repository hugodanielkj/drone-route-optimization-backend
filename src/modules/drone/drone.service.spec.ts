import { prisma } from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../common/errors/app-error';
import { usuarioService } from '../usuario/usuario.service';
import { droneService } from './drone.service';

describe('droneService.cadastrar', () => {
  it('cria um drone associado ao usuário informado', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    const drone = await droneService.cadastrar(usuario.id, {
      nome: 'Drone A',
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 10,
      capacidadeBateria: 50000,
    });

    expect(drone.userId).toBe(usuario.id);
    const persistido = await prisma.drone.findUniqueOrThrow({ where: { id: drone.id } });
    expect(persistido).toMatchObject({ nome: 'Drone A', userId: usuario.id });
  });
});

describe('droneService.listar', () => {
  it('retorna apenas os drones pertencentes ao usuário informado', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    const droneDados = { nome: 'Drone A', consumoPorIrrigacao: 1.5, velocidadeMedia: 10, capacidadeBateria: 50000 };
    await droneService.cadastrar(hugo.id, droneDados);
    await droneService.cadastrar(outro.id, droneDados);

    const drones = await droneService.listar(hugo.id);

    expect(drones).toHaveLength(1);
    expect(drones[0]?.userId).toBe(hugo.id);
  });

  it('retorna lista vazia quando o usuário não tem drones', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    const drones = await droneService.listar(usuario.id);

    expect(drones).toEqual([]);
  });
});

describe('droneService.buscarPorId', () => {
  it('retorna o drone quando pertence ao usuário informado', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const drone = await droneService.cadastrar(usuario.id, {
      nome: 'Drone A',
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 10,
      capacidadeBateria: 50000,
    });

    const encontrado = await droneService.buscarPorId(usuario.id, drone.id);

    expect(encontrado.id).toBe(drone.id);
  });

  it('lança NotFoundError quando o drone não existe', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    await expect(droneService.buscarPorId(usuario.id, 'id-inexistente')).rejects.toThrow(NotFoundError);
  });

  it('lança NotFoundError quando o drone pertence a outro usuário', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    const drone = await droneService.cadastrar(outro.id, {
      nome: 'Drone A',
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 10,
      capacidadeBateria: 50000,
    });

    await expect(droneService.buscarPorId(hugo.id, drone.id)).rejects.toThrow(NotFoundError);
  });
});

describe('droneService.editar', () => {
  it('atualiza apenas os campos informados', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const drone = await droneService.cadastrar(usuario.id, {
      nome: 'Drone A',
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 10,
      capacidadeBateria: 50000,
    });

    const editado = await droneService.editar(usuario.id, drone.id, { nome: 'Drone B' });

    expect(editado.nome).toBe('Drone B');
    expect(editado.velocidadeMedia).toBe(10);
  });

  it('lança NotFoundError ao editar drone de outro usuário', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    const drone = await droneService.cadastrar(outro.id, {
      nome: 'Drone A',
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 10,
      capacidadeBateria: 50000,
    });

    await expect(droneService.editar(hugo.id, drone.id, { nome: 'Roubado' })).rejects.toThrow(NotFoundError);
  });

  it('desativa Missões ativas associadas ao drone editado (RN13)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const drone = await droneService.cadastrar(usuario.id, {
      nome: 'Drone A',
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 10,
      capacidadeBateria: 50000,
    });
    const mapa = await prisma.mapa.create({
      data: { pontoCarregamentoX: 0, pontoCarregamentoY: 0, userId: usuario.id },
    });
    const missao = await prisma.missao.create({
      data: { droneId: drone.id, mapaId: mapa.id, status: 'ATIVA' },
    });

    await droneService.editar(usuario.id, drone.id, { nome: 'Drone B' });

    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
  });
});

describe('droneService.excluir', () => {
  it('remove o drone quando não há Missão associada', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const drone = await droneService.cadastrar(usuario.id, {
      nome: 'Drone A',
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 10,
      capacidadeBateria: 50000,
    });

    await droneService.excluir(usuario.id, drone.id);

    const persistido = await prisma.drone.findUnique({ where: { id: drone.id } });
    expect(persistido).toBeNull();
  });

  it('lança NotFoundError ao excluir drone de outro usuário', async () => {
    const hugo = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const outro = await usuarioService.cadastrar({ nome: 'outro', senha: 'senhaForte123' });
    const drone = await droneService.cadastrar(outro.id, {
      nome: 'Drone A',
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 10,
      capacidadeBateria: 50000,
    });

    await expect(droneService.excluir(hugo.id, drone.id)).rejects.toThrow(NotFoundError);
  });

  it('lança ConflictError e não exclui quando há Missão associada (RN15)', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });
    const drone = await droneService.cadastrar(usuario.id, {
      nome: 'Drone A',
      consumoPorIrrigacao: 1.5,
      velocidadeMedia: 10,
      capacidadeBateria: 50000,
    });
    const mapa = await prisma.mapa.create({
      data: { pontoCarregamentoX: 0, pontoCarregamentoY: 0, userId: usuario.id },
    });
    await prisma.missao.create({ data: { droneId: drone.id, mapaId: mapa.id, status: 'DESATIVADA' } });

    await expect(droneService.excluir(usuario.id, drone.id)).rejects.toThrow(ConflictError);
    const persistido = await prisma.drone.findUnique({ where: { id: drone.id } });
    expect(persistido).not.toBeNull();
  });
});
