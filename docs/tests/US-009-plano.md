# Plano de testes — US-009 — Cadastrar mapa

Escopo: `POST /mapas` (`mapa.service.ts` unitário + rota e2e via Supertest).
Introduz o schema `cadastroMapaSchema` (RN01, RN16, RN17, RN18) e a criação
atômica de Mapa + PontosIrrigacao via nested write do Prisma.

## Caso feliz

1. **Cadastra um mapa com ponto de carregamento e um ponto de irrigação**
   - Entrada: usuário autenticado, `pontoCarregamento: {x,y}`,
     `pontosIrrigacao: [{x,y}]`.
   - Ação: `POST /mapas`.
   - Resultado esperado: `201`; corpo com `pontoCarregamento` agrupado, array
     `pontosIrrigacao` com o ponto informado, `userId` do usuário autenticado.

## Casos alternativos

2. **Cadastra um mapa com múltiplos pontos de irrigação**
   - Entrada: `pontosIrrigacao` com 3 pontos distintos entre si e distintos do
     ponto de carregamento.
   - Resultado esperado: `201`; array `pontosIrrigacao` com os 3 pontos.

3. **Aceita coordenadas negativas e decimais**
   - Entrada: `pontoCarregamento: {x: -10.5, y: 3.2}`, ponto de irrigação com
     valores negativos/decimais distintos.
   - Resultado esperado: `201`.

4. **Ignora campos extras no payload**
   - Entrada: payload válido mais uma chave `nome: 'Área 1'` não esperada.
   - Resultado esperado: `201`; campo extra não aparece na resposta.

5. **Associa o mapa criado ao usuário correto, não a outros**
   - Ação: dois usuários distintos cadastram mapas.
   - Resultado esperado: cada mapa persistido com o `userId` de quem o criou.

6. **Cadastra o número máximo permitido de pontos de irrigação (RN16)**
   - Entrada: exatamente 1000 pontos de irrigação distintos entre si e do
     ponto de carregamento.
   - Resultado esperado: `201`.

## Casos de borda

7. **Ponto de irrigação com coordenada muito próxima do ponto de carregamento, mas não igual**
   - Entrada: ponto de irrigação a uma distância mínima (ex: `x` difere em
     `0.0001`) do ponto de carregamento.
   - Resultado esperado: `201` — RN17 compara igualdade exata, não proximidade.

## Casos de erro / exceção

8. **Rejeita lista de pontos de irrigação vazia (RN01)**
   - Entrada: `pontosIrrigacao: []`.
   - Resultado esperado: `400`; nenhum `Mapa` persistido.

9. **Rejeita payload sem ponto de carregamento**
   - Resultado esperado: `400`.

10. **Rejeita coordenada com tipo inválido (string em vez de número)**
    - Resultado esperado: `400`.

11. **Rejeita coordenada `NaN`/`Infinity`**
    - Entrada: `pontoCarregamento: {x: Infinity, y: 0}` (via payload que o
      parser JSON aceite, ex.: omitido do teste se JSON não representar
      `Infinity` diretamente — cobrir via valor que o Zod avalie como não
      finito, se aplicável ao transporte HTTP; caso contrário, cobrir apenas
      via teste unitário do schema).
    - Resultado esperado: `400`.

12. **Rejeita lista de pontos de irrigação com mais de 1000 pontos (RN16)**
    - Entrada: 1001 pontos de irrigação distintos.
    - Resultado esperado: `400`; nenhum `Mapa` persistido.

13. **Rejeita ponto de irrigação igual ao ponto de carregamento (RN17)**
    - Entrada: um dos pontos de irrigação com `x`/`y` idênticos ao ponto de
      carregamento.
    - Resultado esperado: `400`; nenhum `Mapa` persistido; mensagem indica que
      um ponto de irrigação não pode ter a mesma coordenada do ponto de
      carregamento.

14. **Rejeita dois pontos de irrigação com coordenadas iguais entre si (RN18)**
    - Entrada: dois pontos de irrigação com o mesmo `x`/`y`.
    - Resultado esperado: `400`; nenhum `Mapa` persistido; mensagem indica que
      existem dois pontos de irrigação com a mesma coordenada.

15. **Rejeita requisição sem token de autenticação**
    - Resultado esperado: `401`; nenhum `Mapa` persistido.
