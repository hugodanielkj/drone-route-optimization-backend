# Plano de testes — US-011 — Consultar mapa por id

Escopo: `GET /mapas/:id` (`mapa.service.ts` unitário + rota e2e via
Supertest). Introduz a checagem de posse por id (RN11), reutilizada pelas
histórias de manipulação de pontos e exclusão na Sprint 04.

## Caso feliz

1. **Consulta um mapa próprio pelo id**
   - Entrada: usuário autenticado com um mapa cadastrado (ponto de
     carregamento + pontos de irrigação).
   - Ação: `GET /mapas/:id` com o id do mapa.
   - Resultado esperado: `200`; corpo com `pontoCarregamento` e todos os
     `pontosIrrigacao` do mapa.

## Casos alternativos

Nenhum caso alternativo além do caso feliz e dos casos de erro abaixo.

## Casos de borda

2. **Id com formato válido de UUID mas inexistente**
   - Ação: `GET /mapas/:id` com um UUID sintaticamente válido que não
     corresponde a nenhum mapa.
   - Resultado esperado: `404`.

## Casos de erro / exceção

3. **Id de mapa que não existe**
   - Ação: `GET /mapas/id-qualquer-inexistente`.
   - Resultado esperado: `404`.

4. **Id de mapa pertencente a outro usuário**
   - Entrada: `outro` cadastra um mapa; `hugo` tenta consultá-lo pelo id.
   - Ação: `GET /mapas/:id` autenticado como `hugo`.
   - Resultado esperado: `404` (nunca `403`).

5. **Requisição sem token de autenticação**
   - Ação: `GET /mapas/:id` sem header `Authorization`.
   - Resultado esperado: `401`.
