# Plano de testes — US-013 — Adicionar ponto de irrigação ao mapa

Escopo: `POST /mapas/:id/pontos-irrigacao` (`mapa.service.ts` unitário + rota
e2e via Supertest). Introduz RN13, e RN16/RN17/RN18 verificadas contra estado
persistido (não mais só o payload, como em US-009).

## Caso feliz

1. **Adiciona um ponto de irrigação a um mapa próprio**
   - Ação: `POST /mapas/:id/pontos-irrigacao` com `{x,y}` válido e distinto
     dos pontos existentes e do ponto de carregamento.
   - Resultado esperado: `201`; corpo com o mapa completo, `pontosIrrigacao`
     agora com um item a mais.

## Casos alternativos

Nenhum caso alternativo além do caso feliz e dos casos de borda/erro abaixo.

## Casos de borda

2. **Adiciona o ponto de número 1000 (limite exato, RN16)**
   - Entrada: mapa com 999 pontos de irrigação já cadastrados.
   - Resultado esperado: `201`.

## Casos de erro / exceção

3. **Rejeita coordenada com tipo inválido**
   - Resultado esperado: `400`.

4. **Retorna 404 para mapa que não existe**
   - Resultado esperado: `404`.

5. **Retorna 404 para mapa de outro usuário e não adiciona o ponto**
   - Resultado esperado: `404`.

6. **Rejeita requisição sem token de autenticação**
   - Resultado esperado: `401`.

7. **Rejeita ponto igual ao ponto de carregamento do mapa (RN17)**
   - Resultado esperado: `409`; nenhum ponto adicionado.

8. **Rejeita ponto igual a outro ponto de irrigação já cadastrado (RN18)**
   - Resultado esperado: `409`; nenhum ponto adicionado.

9. **Rejeita adição além do limite de 1000 pontos (RN16)**
   - Entrada: mapa já com 1000 pontos de irrigação.
   - Resultado esperado: `409`; nenhum ponto adicionado.

10. **Desativa todas as Missões ativas do mapa ao adicionar com sucesso (RN13)**
    - Resultado esperado: `201`; Missões `ATIVA` associadas passam a
      `DESATIVADA`.

11. **Mantém Missão já desativada sem erro ao adicionar ponto (RN13)**
    - Resultado esperado: `201`; Missão continua `DESATIVADA`.
