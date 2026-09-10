# Plano de testes — US-019 — Listar missões do usuário autenticado

Escopo: `GET /missoes` (`missao.service.ts` unitário + rota e2e via
Supertest). Resposta é um resumo leve — sem `pernas` — decisão confirmada
com o usuário, já que os critérios de aceite não exigem esse campo na
listagem (só o detalhe, US-020, exige).

## Caso feliz

1. **Lista todas as missões do usuário, ativas e desativadas**
   - Entrada: usuário com 2 missões calculadas, uma delas desativada via
     edição do drone/mapa associado (RN13).
   - Ação: `GET /missoes`.
   - Resultado esperado: `200`; array com as 2 missões, cada uma com
     `droneId`, `mapaId`, `status`, `consumoEnergeticoTotal`, timestamps —
     sem o campo `pernas`; um status `ATIVA` e um `DESATIVADA`.

## Casos alternativos

2. **Retorna lista vazia quando o usuário não tem missões**
   - Resultado esperado: `200`; `[]`.

## Casos de borda

Nenhum caso de borda adicional.

## Casos de erro / exceção

3. **Não lista missões de outros usuários** — isolamento por `userId` via
   relação com Drone (RN11).
4. **Rejeita requisição sem token de autenticação** — `401`.
