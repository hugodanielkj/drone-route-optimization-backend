# Plano de testes — US-020 — Consultar detalhe de uma missão

Escopo: `GET /missoes/:id` (`missao.service.ts` unitário + rota e2e via
Supertest). Mesmo padrão de busca por id + ownership já usado em Drone/Mapa,
adaptado para o fato de `Missao` não ter `userId` próprio (checagem via
relação com `Drone`).

## Caso feliz

1. **Consulta o detalhe de uma missão própria, com pernas completo**
   - Entrada: missão calculada pertencente ao usuário autenticado.
   - Ação: `GET /missoes/:id`.
   - Resultado esperado: `200`; corpo com `pernas` completo (sequência de
     coordenadas e consumo de cada perna), `consumoEnergeticoTotal` e
     `status`.

## Casos alternativos

Nenhum caso alternativo além do caso feliz.

## Casos de borda

Nenhum caso de borda adicional.

## Casos de erro / exceção

2. **Retorna 404 para uma missão que não existe.**
3. **Retorna 404 para uma missão que pertence a outro usuário** — nunca
   revela existência do recurso a quem não é dono (mesmo padrão de
   Drone/Mapa).
4. **Rejeita requisição sem token de autenticação** — `401`.
