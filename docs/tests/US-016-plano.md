# Plano de testes — US-016 — Calcular rota para um novo par (drone, mapa)

Escopo: motor de cálculo isolado (`src/modules/missao/motor/`, testado sem
Express/Prisma) e `POST /missoes` (`missao.service.ts` unitário + rota e2e via
Supertest). Reaproveita `droneService.buscarPorId` e `mapaService.buscarPorId`
(RN11). Reaproveitamento/reativação de Missão existente (RN12/RN14) são fora
de escopo (US-017/US-018, Sprint 06).

## Motor de cálculo (unitário, sem HTTP/Prisma)

### consumo-trecho

1. **Calcula o consumo de um trecho terminando em ponto de irrigação**
   - Entrada: distância, entregas pendentes > 0, `destinoEhPontoDeIrrigacao: true`.
   - Resultado esperado: valor calculado à mão com a fórmula de
     `regras-de-negocio.md` (inclui `tempoNoPonto`).
2. **Calcula o consumo de um trecho terminando no ponto de carregamento**
   - Entrada: `destinoEhPontoDeIrrigacao: false`.
   - Resultado esperado: mesmo cálculo, sem somar `tempoNoPonto`.
3. **Payload zero (nenhuma entrega pendente) reduz o consumo ao termo `alpha`**
   - Entrada: `entregasPendentesNoTrecho: 0`.
   - Resultado esperado: `(alpha) × (distancia/velocidade + tempoNoPonto)`.

### perna (calcularPerna)

4. **Perna de um único ponto**: sequência fechada `[C, p, C]`, consumo do
   primeiro trecho com payload = 1 entrega pendente e `tempoNoPonto`, segundo
   trecho com payload 0 e sem `tempoNoPonto`.
5. **Perna de múltiplos pontos**: payload decrescente a cada ponto de
   irrigação já visitado (RN04/regra de payload); soma de distâncias bate com
   a soma das distâncias euclidianas trecho a trecho.

### vizinho-mais-proximo

6. **Ordena pontos pela heurística gulosa a partir do carregamento**
   - Cenário com 3+ pontos onde a ordem gulosa é conhecida manualmente.
7. **Empate de distância é resolvido de forma determinística**
   - Dois pontos equidistantes do carregamento — mantém a ordem original do
     array de entrada (RN06).

### dois-opt (otimizarDoisOpt)

8. **Reduz a distância total quando há cruzamento no trajeto guloso**
   - Cenário construído (4 pontos) onde a ordem por vizinho mais próximo cria
     um cruzamento e o 2-opt produz uma ordem estritamente mais curta.
9. **É um no-op quando o trajeto já é ótimo**
   - Rerodar `otimizarDoisOpt` sobre um resultado já convergido não muda a
     ordem nem a distância.
10. **Funciona com 0 ou 1 ponto intermediário sem erro** (nada a reverter).

### divisao-pernas

11. **`verificarViabilidadeMinima` não lança erro quando todos os pontos são
    individualmente alcançáveis.**
12. **`verificarViabilidadeMinima` lança `RotaInviavelError` quando o ponto
    mais próximo excede a capacidade de bateria (RN05, caso literal).**
13. **`verificarViabilidadeMinima` lança `RotaInviavelError` quando um ponto
    NÃO-mais-próximo é individualmente inviável, mesmo com o mais próximo
    viável** (RN05 estendida — gap identificado e confirmado com o usuário).
14. **`dividirEmPernas` mantém todos os pontos numa única perna quando a
    capacidade de bateria comporta o trajeto inteiro.**
15. **`dividirEmPernas` divide em múltiplas pernas quando a capacidade não
    comporta todos os pontos de uma vez** — cada perna resultante respeita
    `consumoTotal <= capacidadeBateria` (RN04).
16. **Limite exato: uma perna cujo `consumoTotal` bate exatamente em
    `capacidadeBateria` é aceita (`<=`, não `<`).**

### mover-entre-pernas

17. **Realoca um ponto para a perna de destino que reduz o consumo combinado**
    - Cenário construído com 2 pernas onde mover um ponto específico reduz o
      consumo total das duas pernas envolvidas.
18. **É um no-op quando nenhuma realocação melhora o consumo combinado**
    - Rerodar sobre um resultado já convergido não muda a composição das
      pernas.
19. **Descarta uma troca que reduziria o consumo combinado mas tornaria a
    perna de destino inviável (RN04)** — cenário onde a troca seria vantajosa
    em consumo bruto, mas a perna resultante ultrapassaria
    `capacidadeBateria`; o teste confirma que a troca NÃO acontece (RN04 nunca
    pode ser violada pelo `move` — decisão corrigida durante a Sprint 05 após
    constatar, com o usuário, que a ausência dessa checagem desfazia a
    divisão em pernas na prática).
20. **Nunca deixa uma perna vazia no resultado final** (pernas sem nenhum
    ponto de irrigação são filtradas).

### pipeline (calcularRota) — determinismo e integração do motor

21. **RN06 — determinismo**: chamar `calcularRota` duas vezes com a mesma
    entrada produz resultado idêntico (`toEqual` profundo, incluindo campos
    de ponto flutuante).
22. **RN03/RN04 de ponta a ponta**: toda perna do resultado começa/termina no
    ponto de carregamento; nenhuma perna excede `capacidadeBateria` — inclusive
    quando a capacidade de bateria força mais de uma perna e o `move` tem
    candidatas a realocar (RN04 é um invariante do sistema, garantido tanto
    pela divisão em pernas quanto pela checagem de viabilidade do `move`).
23. **RN05 de ponta a ponta**: entrada com um ponto individualmente inviável
    lança `RotaInviavelError` antes de qualquer outra etapa rodar.
24. **Ponto único**: mapa com um só ponto de irrigação produz exatamente uma
    perna com um só ponto.
25. **Todos os pontos cabem em uma única perna** quando a capacidade de
    bateria é suficientemente grande.

## Camada HTTP — `POST /missoes` (e2e via Supertest)

26. **Caso feliz**: calcula e persiste uma nova Missão `ATIVA` para um par
    (drone, mapa) próprios sem Missão existente — `201`, corpo com `pernas` e
    `consumoEnergeticoTotal`.
27. **404 quando o drone não existe.**
28. **404 quando o mapa não existe.**
29. **404 quando o drone pertence a outro usuário (RN11).**
30. **404 quando o mapa pertence a outro usuário (RN11).**
31. **400 quando `droneId`/`mapaId` não são uuid válidos.**
32. **401 sem token de autenticação.**
33. **409 quando nenhuma rota viável existe (RN05)** — nenhuma Missão é
    persistida (`prisma.missao.count` continua 0).
34. **409 quando já existe Missão persistida para o par** (fora de escopo
    desta sprint reaproveitar/reativar — US-017/US-018).
