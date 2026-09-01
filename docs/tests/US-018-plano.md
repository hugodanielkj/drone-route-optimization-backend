# Plano de testes — US-018 — Recalcular e reativar missão desativada

Escopo: `POST /missoes` quando já existe Missão **desativada** para o par
(drone, mapa) (`missao.service.ts` unitário + rota e2e via Supertest).
Reexecuta o mesmo pipeline de US-016 e reaproveita o padrão de verificação de
status introduzido em US-017.

## Caso feliz

1. **Recalcula e reativa uma Missão desativada, preservando a identidade**
   - Entrada: par (drone, mapa) com Missão persistida em status
     `DESATIVADA` (via edição real do drone ou mapa — RN13), dados de
     drone/mapa alterados desde o cálculo original.
   - Ação: `POST /missoes` para o mesmo par.
   - Resultado esperado: `200`; mesma identidade (`id` preservado); `status`
     volta a `ATIVA`; `pernas`/`consumoEnergeticoTotal` refletem os dados
     atuais (diferentes do cálculo original).

## Casos alternativos

Nenhum caso alternativo além do caso feliz.

## Casos de borda

Nenhum caso de borda além dos já cobertos por US-016 (ponto único, todos os
pontos numa perna, etc. — o motor de cálculo não muda entre primeiro cálculo
e recálculo).

## Casos de erro / exceção

2. **RN05 durante o recálculo: Missão permanece desativada, sem ser
   atualizada**
   - Entrada: par (drone, mapa) com Missão desativada; drone/mapa alterados
     de forma que nem o ponto de irrigação mais próximo seja alcançável.
   - Ação: `POST /missoes` para o mesmo par.
   - Resultado esperado: `409`; a Missão persistida continua com status
     `DESATIVADA`, `pernas` e `consumoEnergeticoTotal` inalterados
     (idênticos ao valor anterior à tentativa de recálculo).
