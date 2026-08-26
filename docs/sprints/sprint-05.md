# Sprint 05 — Núcleo: cálculo de rota para um novo par (drone, mapa)

## Objetivo

Ao final desta sprint, o pipeline determinístico de cálculo de rota (vizinho mais
próximo → 2-opt no trajeto completo → divisão em pernas respeitando a capacidade
de bateria → `move` entre pernas → 2-opt por perna) está implementado, testado
isoladamente e disponível via API para o primeiro cálculo de uma Missão.

## Histórias

### 1. US-016 — Calcular rota para um novo par (drone, mapa)

**Justificativa:** história única e isolada em sua própria sprint, por decisão
deliberada — é o núcleo determinístico do sistema (RN06), a peça de maior
complexidade algorítmica e maior risco de todo o backlog (RF-004.6 a RF-004.11
formam um pipeline de cinco etapas que só faz sentido testado e entregue por
inteiro, nunca parcialmente). Isolá-la evita que o tempo de teste desse algoritmo
seja espremido por outras histórias na mesma sprint.

## Definition of Done da sprint

- Módulo `missao` criado, com o motor de cálculo isolado da camada HTTP (função
  pura, testável sem Express/Prisma) — cada etapa do pipeline (vizinho mais
  próximo, 2-opt, divisão em pernas, `move`, 2-opt por perna) testada
  unitariamente, além do pipeline completo ponta a ponta.
- Teste automatizado de determinismo (RN06): mesma entrada, executada duas vezes,
  produz resultado idêntico.
- Teste cobrindo RN05 (rota inviável: nem o ponto mais próximo é alcançável) —
  API responde com erro e nenhuma Missão é persistida.
- Teste cobrindo RN03 e RN04 (toda perna inicia/termina no ponto de carregamento;
  nenhuma perna excede a capacidade de bateria).
- Rota protegida, validando que drone e mapa pertencem ao usuário autenticado
  (RN11) antes de calcular.
- Model `Missao` (schema, ADR de estrutura de persistência e constraint de
  unicidade em (drone_id, mapa_id) — RNF-004.3) já definidos na Sprint 01; esta
  sprint apenas passa a escrever/atualizar registros reais nele via pipeline.
- Implementação documentada (`docs/implementation/`).
- Sem regressão: suíte completa (Sprints 01-05) passando.
