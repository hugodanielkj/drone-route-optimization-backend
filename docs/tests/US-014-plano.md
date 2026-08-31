# Plano de testes — US-014 — Remover ponto de irrigação do mapa

Escopo: `DELETE /mapas/:id/pontos-irrigacao/:pontoId` (`mapa.service.ts`
unitário + rota e2e via Supertest). Introduz RN01 (não remover o último
ponto) em contexto de remoção, e reaplica RN13.

## Caso feliz

1. **Remove um ponto de irrigação de um mapa com mais de um ponto**
   - Entrada: mapa com 2 pontos de irrigação.
   - Ação: `DELETE /mapas/:id/pontos-irrigacao/:pontoId`.
   - Resultado esperado: `204`; mapa passa a ter 1 ponto de irrigação.

## Casos alternativos

Nenhum caso alternativo além do caso feliz e dos casos de erro abaixo.

## Casos de borda

Nenhum caso de borda além do coberto no caso de erro 6 (RN01).

## Casos de erro / exceção

2. **Retorna 404 para mapa que não existe**
   - Resultado esperado: `404`.

3. **Retorna 404 para mapa de outro usuário**
   - Resultado esperado: `404`; ponto não removido.

4. **Retorna 404 para `pontoId` que não existe no mapa**
   - Entrada: `pontoId` válido de outro mapa, ou inexistente.
   - Resultado esperado: `404`.

5. **Rejeita requisição sem token de autenticação**
   - Resultado esperado: `401`.

6. **Rejeita remoção do último ponto de irrigação (RN01)**
   - Entrada: mapa com exatamente 1 ponto de irrigação.
   - Resultado esperado: `409`; ponto não removido.

7. **Desativa todas as Missões ativas do mapa ao remover com sucesso (RN13)**
   - Resultado esperado: `204`; Missões `ATIVA` associadas passam a
     `DESATIVADA`.

8. **Mantém Missão já desativada sem erro ao remover ponto (RN13)**
   - Resultado esperado: `204`; Missão continua `DESATIVADA`.
