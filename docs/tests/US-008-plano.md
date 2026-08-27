# Plano de testes — US-008 — Excluir drone

Escopo: `DELETE /drones/:id` (`drone.service.ts` unitário + rota e2e via
Supertest). Reaproveita a checagem de ownership de `droneService.buscarPorId`
(US-006). RN15 é testada com fixture direta de `Missao` no banco, já que o
pipeline de cálculo só existe na Sprint 05.

## Caso feliz

1. **Exclui um drone próprio sem Missão associada**
   - Entrada: drone do usuário autenticado, sem nenhuma Missão associada.
   - Ação: `DELETE /drones/:id`.
   - Resultado esperado: `204` (ou `200`, a definir na implementação);
     drone removido do banco.

## Casos alternativos

Nenhum caso alternativo além do caso feliz e dos casos abaixo.

## Casos de borda

2. **Excluir um drone deixa os demais drones do usuário intactos**
   - Entrada: usuário com 2 drones; exclui apenas um.
   - Resultado esperado: sucesso; o outro drone permanece no banco.

## Casos de erro / exceção

3. **Drone que não existe**
   - Ação: `DELETE /drones/id-inexistente`.
   - Resultado esperado: `404`.

4. **Drone que pertence a outro usuário**
   - Ação: `DELETE /drones/:id` (id de drone de `outro`) autenticado como
     `hugo`.
   - Resultado esperado: `404`; drone do outro usuário não é excluído.

5. **Requisição sem token de autenticação**
   - Resultado esperado: `401`.

## RN15 — exclusão bloqueada se houver Missão associada (fixture direta no banco)

6. **Drone com Missão ativa associada não pode ser excluído**
   - Entrada: drone com 1 Missão `ATIVA` associada.
   - Ação: `DELETE /drones/:id`.
   - Resultado esperado: `409` (conflito); drone permanece no banco; a
     Missão associada não é alterada.

7. **Drone com Missão desativada associada também não pode ser excluído**
   - Entrada: drone com 1 Missão `DESATIVADA` associada.
   - Ação: `DELETE /drones/:id`.
   - Resultado esperado: `409`; drone permanece no banco (RN15 se aplica a
     Missões ativas **ou** desativadas).

8. **Drone sem Missão associada, mas outro drone do mesmo usuário tem
   Missão associada, pode ser excluído normalmente**
   - Entrada: drone A com 1 Missão associada; drone B sem nenhuma.
   - Ação: `DELETE /drones/:id` (id de B).
   - Resultado esperado: sucesso; B removido; A permanece no banco.
