import { prisma } from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../common/errors/app-error';
import { usuarioService } from '../usuario/usuario.service';
import { droneService } from '../drone/drone.service';
import { mapaService } from '../mapa/mapa.service';
import { missaoService } from './missao.service';

async function criarUsuario(nome: string) {
  return usuarioService.cadastrar({ nome, senha: 'senhaForte123' });
}

async function criarDrone(usuarioId: string, overrides: Partial<{ velocidadeMedia: number; capacidadeBateria: number; consumoPorIrrigacao: number }> = {}) {
  return droneService.cadastrar(usuarioId, {
    nome: 'Drone A',
    consumoPorIrrigacao: 1,
    velocidadeMedia: 1,
    capacidadeBateria: 10_000_000,
    ...overrides,
  });
}

async function criarMapa(usuarioId: string, pontosIrrigacao: { x: number; y: number }[] = [{ x: 10, y: 10 }]) {
  return mapaService.cadastrar(usuarioId, { pontoCarregamento: { x: 0, y: 0 }, pontosIrrigacao });
}

describe('missaoService.calcular', () => {
  it('calcula e persiste uma nova Missão ativa para um par (drone, mapa) sem Missão existente (US-016)', async () => {
    const usuario = await criarUsuario('hugo');
    const drone = await criarDrone(usuario.id);
    const mapa = await criarMapa(usuario.id);

    const { missao, criada } = await missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id });

    expect(criada).toBe(true);
    expect(missao.status).toBe('ATIVA');
    expect(missao.pernas).not.toBeNull();
    expect(missao.consumoEnergeticoTotal).toBeGreaterThan(0);
    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: missao.id } });
    expect(persistida.droneId).toBe(drone.id);
    expect(persistida.mapaId).toBe(mapa.id);
  });

  it('lança NotFoundError quando o drone pertence a outro usuário (RN11)', async () => {
    const hugo = await criarUsuario('hugo');
    const outro = await criarUsuario('outro');
    const drone = await criarDrone(outro.id);
    const mapa = await criarMapa(hugo.id);

    await expect(missaoService.calcular(hugo.id, { droneId: drone.id, mapaId: mapa.id })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('lança NotFoundError quando o mapa pertence a outro usuário (RN11)', async () => {
    const hugo = await criarUsuario('hugo');
    const outro = await criarUsuario('outro');
    const drone = await criarDrone(hugo.id);
    const mapa = await criarMapa(outro.id);

    await expect(missaoService.calcular(hugo.id, { droneId: drone.id, mapaId: mapa.id })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('lança ConflictError quando nenhuma rota viável existe (RN05) e não persiste Missão', async () => {
    const usuario = await criarUsuario('hugo');
    const droneFraco = await criarDrone(usuario.id, { capacidadeBateria: 1 });
    const mapa = await criarMapa(usuario.id, [{ x: 1000, y: 1000 }]);

    await expect(missaoService.calcular(usuario.id, { droneId: droneFraco.id, mapaId: mapa.id })).rejects.toThrow(
      ConflictError,
    );
    const missoes = await prisma.missao.count();
    expect(missoes).toBe(0);
  });

  it('reaproveita a Missão ativa existente sem recalcular e sem alterar dados persistidos (US-017/RN12)', async () => {
    const usuario = await criarUsuario('hugo');
    const drone = await criarDrone(usuario.id);
    const mapa = await criarMapa(usuario.id);
    const primeira = await missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id });

    const segunda = await missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id });

    expect(segunda.criada).toBe(false);
    expect(segunda.missao.id).toBe(primeira.missao.id);
    expect(segunda.missao.pernas).toEqual(primeira.missao.pernas);
    expect(segunda.missao.consumoEnergeticoTotal).toBe(primeira.missao.consumoEnergeticoTotal);
    expect(segunda.missao.updatedAt).toEqual(primeira.missao.updatedAt);
  });

  it('recalcula e reativa uma Missão desativada, preservando a identidade (US-018/RN14)', async () => {
    const usuario = await criarUsuario('hugo');
    const drone = await criarDrone(usuario.id);
    const mapa = await criarMapa(usuario.id, [{ x: 10, y: 10 }]);
    const original = await missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id });

    // RN13 real (não fixture): editar o drone desativa a Missão associada.
    await droneService.editar(usuario.id, drone.id, { velocidadeMedia: 2 });
    const desativada = await prisma.missao.findUniqueOrThrow({ where: { id: original.missao.id } });
    expect(desativada.status).toBe('DESATIVADA');

    const resultado = await missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id });

    expect(resultado.criada).toBe(false);
    expect(resultado.missao.id).toBe(original.missao.id); // mesma identidade
    expect(resultado.missao.status).toBe('ATIVA');
    // velocidadeMedia mudou -> consumo recalculado deve diferir do original
    expect(resultado.missao.consumoEnergeticoTotal).not.toBe(original.missao.consumoEnergeticoTotal);
  });

  it('mantém a Missão desativada, sem atualizar, quando o recálculo cai em RN05 (US-018)', async () => {
    const usuario = await criarUsuario('hugo');
    const drone = await criarDrone(usuario.id);
    const mapa = await criarMapa(usuario.id, [{ x: 10, y: 10 }]);
    const original = await missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id });

    // Desativa via RN13 e torna a rota inviável para o recálculo.
    await droneService.editar(usuario.id, drone.id, { capacidadeBateria: 1 });

    await expect(missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id })).rejects.toThrow(
      ConflictError,
    );

    const persistida = await prisma.missao.findUniqueOrThrow({ where: { id: original.missao.id } });
    expect(persistida.status).toBe('DESATIVADA');
    expect(persistida.pernas).toEqual(original.missao.pernas);
    expect(persistida.consumoEnergeticoTotal).toBe(original.missao.consumoEnergeticoTotal);
  });
});

describe('missaoService.listar', () => {
  it('retorna apenas as missões pertencentes ao usuário informado, ativas e desativadas', async () => {
    const hugo = await criarUsuario('hugo');
    const outro = await criarUsuario('outro');
    const droneHugo = await criarDrone(hugo.id);
    const mapaHugo = await criarMapa(hugo.id);
    const droneOutro = await criarDrone(outro.id);
    const mapaOutro = await criarMapa(outro.id);
    await missaoService.calcular(hugo.id, { droneId: droneHugo.id, mapaId: mapaHugo.id });
    await missaoService.calcular(outro.id, { droneId: droneOutro.id, mapaId: mapaOutro.id });

    const missoes = await missaoService.listar(hugo.id);

    expect(missoes).toHaveLength(1);
    expect(missoes[0]?.droneId).toBe(droneHugo.id);
  });

  it('retorna lista vazia quando o usuário não tem missões', async () => {
    const usuario = await criarUsuario('hugo');

    expect(await missaoService.listar(usuario.id)).toEqual([]);
  });
});

describe('missaoService.buscarPorId', () => {
  it('retorna a Missão quando pertence ao usuário informado', async () => {
    const usuario = await criarUsuario('hugo');
    const drone = await criarDrone(usuario.id);
    const mapa = await criarMapa(usuario.id);
    const { missao } = await missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id });

    const encontrada = await missaoService.buscarPorId(usuario.id, missao.id);

    expect(encontrada.id).toBe(missao.id);
  });

  it('lança NotFoundError quando a missão não existe', async () => {
    const usuario = await criarUsuario('hugo');

    await expect(missaoService.buscarPorId(usuario.id, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('lança NotFoundError quando a missão pertence a outro usuário', async () => {
    const hugo = await criarUsuario('hugo');
    const outro = await criarUsuario('outro');
    const drone = await criarDrone(outro.id);
    const mapa = await criarMapa(outro.id);
    const { missao } = await missaoService.calcular(outro.id, { droneId: drone.id, mapaId: mapa.id });

    await expect(missaoService.buscarPorId(hugo.id, missao.id)).rejects.toThrow(NotFoundError);
  });
});
