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
  it('calcula e persiste uma nova Missão ativa para um par (drone, mapa) sem Missão existente', async () => {
    const usuario = await criarUsuario('hugo');
    const drone = await criarDrone(usuario.id);
    const mapa = await criarMapa(usuario.id);

    const missao = await missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id });

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

  it('lança ConflictError quando já existe Missão persistida para o par (fora de escopo desta sprint)', async () => {
    const usuario = await criarUsuario('hugo');
    const drone = await criarDrone(usuario.id);
    const mapa = await criarMapa(usuario.id);
    await missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id });

    await expect(missaoService.calcular(usuario.id, { droneId: drone.id, mapaId: mapa.id })).rejects.toThrow(
      ConflictError,
    );
  });
});
