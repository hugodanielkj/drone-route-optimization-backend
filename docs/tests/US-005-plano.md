# Plano de testes — US-005 — Listar drones do usuário autenticado

Escopo: `GET /drones` (`drone.service.ts` unitário + rota e2e via Supertest).

## Caso feliz

1. **Lista todos os drones do usuário autenticado**
   - Entrada: usuário com 2 drones cadastrados.
   - Ação: `GET /drones` com `Authorization: Bearer <token>`.
   - Resultado esperado: `200`; array com os 2 drones cadastrados.

## Casos alternativos

2. **Usuário sem nenhum drone cadastrado recebe lista vazia**
   - Entrada: usuário autenticado sem drones.
   - Ação: `GET /drones`.
   - Resultado esperado: `200`; array vazio (`[]`).

3. **Drones de outros usuários não aparecem na listagem**
   - Entrada: `hugo` com 1 drone cadastrado; `outro` com 2 drones
     cadastrados.
   - Ação: `GET /drones` autenticado como `hugo`.
   - Resultado esperado: `200`; apenas o drone de `hugo` aparece na lista.

## Casos de borda

4. **Listagem com muitos drones do mesmo usuário**
   - Entrada: usuário com 5 drones cadastrados.
   - Resultado esperado: `200`; array com os 5, sem duplicação nem omissão.

## Casos de erro / exceção

5. **Requisição sem token de autenticação**
   - Ação: `GET /drones` sem header `Authorization`.
   - Resultado esperado: `401`.
