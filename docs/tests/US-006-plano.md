# Plano de testes — US-006 — Consultar drone por id

Escopo: `GET /drones/:id` (`drone.service.ts` unitário + rota e2e via
Supertest). Introduz a checagem de posse por id (RN11), reutilizada por
US-007 (editar) e US-008 (excluir).

## Caso feliz

1. **Consulta um drone próprio pelo id**
   - Entrada: usuário autenticado com um drone cadastrado.
   - Ação: `GET /drones/:id` com o id do drone.
   - Resultado esperado: `200`; corpo com os atributos completos do drone.

## Casos alternativos

Nenhum caso alternativo além do caso feliz e dos casos de erro abaixo — a
consulta não tem variação de entrada relevante além do id.

## Casos de borda

2. **Id com formato válido de UUID mas inexistente**
   - Entrada: um UUID sintaticamente válido que não corresponde a nenhum
     drone.
   - Ação: `GET /drones/:id`.
   - Resultado esperado: `404`.

## Casos de erro / exceção

3. **Id de drone que não existe**
   - Ação: `GET /drones/id-qualquer-inexistente`.
   - Resultado esperado: `404`.

4. **Id de drone pertencente a outro usuário**
   - Entrada: `outro` cadastra um drone; `hugo` tenta consultá-lo pelo id.
   - Ação: `GET /drones/:id` autenticado como `hugo`.
   - Resultado esperado: `404` (não revela que o recurso existe para outro
     dono — nunca `403`).

5. **Requisição sem token de autenticação**
   - Ação: `GET /drones/:id` sem header `Authorization`.
   - Resultado esperado: `401`.
