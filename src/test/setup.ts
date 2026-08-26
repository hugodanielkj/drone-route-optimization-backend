import { prisma } from '../config/prisma';

beforeEach(async () => {
  await prisma.missao.deleteMany();
  await prisma.pontoIrrigacao.deleteMany();
  await prisma.mapa.deleteMany();
  await prisma.drone.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
