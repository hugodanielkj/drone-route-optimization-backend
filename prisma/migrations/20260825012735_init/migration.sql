-- CreateEnum
CREATE TYPE "StatusMissao" AS ENUM ('ATIVA', 'DESATIVADA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drones" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "consumoPorIrrigacao" DOUBLE PRECISION NOT NULL,
    "velocidadeMedia" DOUBLE PRECISION NOT NULL,
    "capacidadeBateria" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapas" (
    "id" TEXT NOT NULL,
    "pontoCarregamentoX" DOUBLE PRECISION NOT NULL,
    "pontoCarregamentoY" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pontos_irrigacao" (
    "id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "mapaId" TEXT NOT NULL,

    CONSTRAINT "pontos_irrigacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missoes" (
    "id" TEXT NOT NULL,
    "droneId" TEXT NOT NULL,
    "mapaId" TEXT NOT NULL,
    "status" "StatusMissao" NOT NULL DEFAULT 'ATIVA',
    "pernas" JSONB,
    "consumoEnergeticoTotal" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nome_key" ON "users"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "missoes_droneId_mapaId_key" ON "missoes"("droneId", "mapaId");

-- AddForeignKey
ALTER TABLE "drones" ADD CONSTRAINT "drones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapas" ADD CONSTRAINT "mapas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontos_irrigacao" ADD CONSTRAINT "pontos_irrigacao_mapaId_fkey" FOREIGN KEY ("mapaId") REFERENCES "mapas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_droneId_fkey" FOREIGN KEY ("droneId") REFERENCES "drones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_mapaId_fkey" FOREIGN KEY ("mapaId") REFERENCES "mapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

