# Plano de testes — US-017 — Reaproveitar missão ativa existente

Escopo: `POST /missoes` quando já existe Missão **ativa** para o par (drone,
mapa) (`missao.service.ts` unitário + rota e2e via Supertest). Reaproveita a
checagem de existência já implementada em US-016, sem tocar no pipeline.

## Caso feliz

1. **Reaproveita a Missão ativa existente sem recalcular**
   - Entrada: par (drone, mapa) com Missão persistida em status `ATIVA`.
   - Ação: `POST /missoes` novamente para o mesmo par.
   - Resultado esperado: `200`; corpo idêntico ao da primeira chamada (mesmo
     `id`, `pernas`, `consumoEnergeticoTotal`).

## Casos alternativos

Nenhum caso alternativo além do caso feliz e dos casos de erro já cobertos
por US-016 (RN11, payload inválido, sem token).

## Casos de borda

2. **Nenhum dado da Missão é alterado ao reaproveitar** — `updatedAt` antes e
   depois da segunda chamada permanece idêntico (nenhuma escrita no banco).

## Casos de erro / exceção

Nenhum caso de erro novo nesta história — RN11, RN05 e validação de payload
já cobertos por US-016; o comportamento de par com Missão **desativada** é
US-018, fora de escopo aqui.
