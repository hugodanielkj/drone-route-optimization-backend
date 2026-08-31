# Plano de testes — US-012 — Alterar ponto de carregamento do mapa

Escopo: `PATCH /mapas/:id/ponto-carregamento` (`mapa.service.ts` unitário +
rota e2e via Supertest). Reaproveita `mapaService.buscarPorId` (ownership) e
introduz RN13 (desativação de Missões) e RN17 (coincidência com ponto de
irrigação existente) no contexto de update.

## Caso feliz

1. **Altera o ponto de carregamento de um mapa próprio**
   - Entrada: mapa existente, nova coordenada válida e distinta dos pontos de
     irrigação.
   - Ação: `PATCH /mapas/:id/ponto-carregamento` com `{x,y}`.
   - Resultado esperado: `200`; corpo com `pontoCarregamento` atualizado;
     `pontosIrrigacao` inalterados.

## Casos alternativos

Nenhum caso alternativo além do caso feliz e dos casos de erro abaixo.

## Casos de borda

2. **Altera para uma coordenada igual à anterior (sem mudança real)**
   - Resultado esperado: `200` — não há regra que proíba "alterar" para o
     mesmo valor.

## Casos de erro / exceção

3. **Rejeita coordenada com tipo inválido**
   - Resultado esperado: `400`.

4. **Rejeita payload sem `x` ou `y`**
   - Resultado esperado: `400`.

5. **Retorna 404 para mapa que não existe**
   - Resultado esperado: `404`.

6. **Retorna 404 para mapa de outro usuário e não altera o registro**
   - Resultado esperado: `404`; ponto de carregamento original preservado.

7. **Rejeita requisição sem token de autenticação**
   - Resultado esperado: `401`.

8. **Rejeita nova coordenada igual a um ponto de irrigação existente (RN17)**
   - Entrada: novo `pontoCarregamento` igual a um dos `pontosIrrigacao` do
     mapa.
   - Resultado esperado: `409`; mapa não alterado.

9. **Desativa todas as Missões ativas do mapa ao alterar com sucesso (RN13)**
   - Entrada: mapa com 2 Missões `ATIVA` associadas (fixture via
     `prisma.missao.create`).
   - Resultado esperado: `200`; ambas as Missões passam a `DESATIVADA`.

10. **Mantém Missão já desativada sem erro ao alterar o ponto de carregamento (RN13)**
    - Resultado esperado: `200`; Missão continua `DESATIVADA` (idempotente).

11. **Não afeta Missões de outros mapas (RN13)**
    - Entrada: dois mapas do mesmo usuário, cada um com uma Missão `ATIVA`.
    - Ação: altera o ponto de carregamento de um deles.
    - Resultado esperado: Missão do outro mapa continua `ATIVA`.
