# Plano de testes — US-010 — Listar mapas do usuário autenticado

Escopo: `GET /mapas` (`mapa.service.ts` unitário + rota e2e via Supertest).
Mesmo padrão já validado em US-005 (Drone).

## Caso feliz

1. **Lista todos os mapas do usuário autenticado**
   - Entrada: usuário com 2 mapas cadastrados.
   - Ação: `GET /mapas`.
   - Resultado esperado: `200`; array com os 2 mapas, cada um no formato
     agrupado (`pontoCarregamento: {x,y}`, `pontosIrrigacao: [...]`).

## Casos alternativos

Nenhum caso alternativo além do caso feliz e dos casos de borda/erro abaixo.

## Casos de borda

2. **Retorna lista vazia quando o usuário não tem mapas**
   - Resultado esperado: `200`; corpo `[]`.

3. **Lista corretamente muitos mapas do mesmo usuário**
   - Entrada: 5 mapas cadastrados pelo mesmo usuário.
   - Resultado esperado: `200`; array com 5 itens.

## Casos de erro / exceção

4. **Não lista mapas de outros usuários**
   - Entrada: dois usuários, cada um com mapas próprios.
   - Ação: `GET /mapas` autenticado como um deles.
   - Resultado esperado: `200`; array contém apenas os mapas do usuário
     autenticado.

5. **Rejeita requisição sem token de autenticação**
   - Resultado esperado: `401`.
