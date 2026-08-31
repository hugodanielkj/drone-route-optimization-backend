# Plano de testes — US-015 — Excluir mapa

Escopo: `DELETE /mapas/:id` (`mapa.service.ts` unitário + rota e2e via
Supertest). Réplica do padrão de US-008 (Drone): RN15 contra a tabela
`Missao` real, sem filtro de status.

## Caso feliz

1. **Exclui um mapa próprio sem Missão associada**
   - Resultado esperado: `204`; mapa e seus pontos de irrigação removidos
     (cascade).

## Casos alternativos

2. **Exclui apenas o mapa alvo, mantendo os demais do usuário**
   - Resultado esperado: `204`; outro mapa do mesmo usuário permanece intacto.

## Casos de borda

Nenhum caso de borda além dos cobertos abaixo.

## Casos de erro / exceção

3. **Retorna 404 para mapa que não existe**
   - Resultado esperado: `404`.

4. **Retorna 404 para mapa de outro usuário e não o exclui**
   - Resultado esperado: `404`.

5. **Rejeita requisição sem token de autenticação**
   - Resultado esperado: `401`.

6. **Bloqueia exclusão de mapa com Missão ativa associada (RN15)**
   - Resultado esperado: `409`; mapa não excluído.

7. **Bloqueia exclusão de mapa com Missão desativada associada (RN15)**
   - Resultado esperado: `409`; mapa não excluído.

8. **Permite excluir mapa sem Missão mesmo quando outro mapa do usuário tem Missão associada (RN15)**
   - Resultado esperado: `204`.
