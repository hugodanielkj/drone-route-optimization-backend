# Plano de testes — US-007 — Editar drone

Escopo: `PATCH /drones/:id` (`drone.service.ts` unitário + rota e2e via
Supertest). Edição parcial: o corpo aceita qualquer subconjunto dos 4
atributos (nome, consumo por irrigação, velocidade média, capacidade de
bateria) — decisão confirmada com o usuário antes da implementação, já que
os critérios de aceite de US-007 não especificavam PUT completo vs. PATCH
parcial.

Reaproveita a checagem de ownership de `droneService.buscarPorId`
(US-006) antes de editar.

## Caso feliz

1. **Edita um único atributo, mantendo os demais inalterados**
   - Entrada: drone existente; body `{ nome: "Novo nome" }`.
   - Ação: `PATCH /drones/:id`.
   - Resultado esperado: `200`; `nome` atualizado; os demais atributos
     permanecem com os valores originais.

2. **Edita todos os 4 atributos de uma vez**
   - Entrada: body com `nome`, `consumoPorIrrigacao`, `velocidadeMedia`,
     `capacidadeBateria`, todos válidos.
   - Resultado esperado: `200`; todos os atributos atualizados.

## Casos alternativos

3. **Edita apenas um dos atributos numéricos**
   - Entrada: body `{ capacidadeBateria: 80000 }`.
   - Resultado esperado: `200`; apenas `capacidadeBateria` muda.

## Casos de borda

4. **Payload vazio (nenhum campo enviado)**
   - Entrada: body `{}`.
   - Resultado esperado: `400` — nenhuma edição sem ao menos um campo.

5. **Campos extras no payload são ignorados**
   - Entrada: body válido + campo não esperado.
   - Resultado esperado: `200`; campo extra não persiste nem aparece na
     resposta.

## Casos de erro / exceção

6. **Atributo numérico igual a zero ou negativo é rejeitado**
   - Entrada: `{ consumoPorIrrigacao: 0 }` (e variações para os outros dois
     atributos numéricos, negativo e zero). (RN02)
   - Resultado esperado: `400`; drone não é alterado no banco.

7. **Nome vazio é rejeitado**
   - Entrada: `{ nome: "" }`.
   - Resultado esperado: `400`.

8. **Tipo inválido em campo numérico**
   - Entrada: `{ velocidadeMedia: "rápido" }`.
   - Resultado esperado: `400`.

9. **Drone que não existe**
   - Ação: `PATCH /drones/id-inexistente`.
   - Resultado esperado: `404`.

10. **Drone que pertence a outro usuário**
    - Ação: `PATCH /drones/:id` (id de drone de `outro`) autenticado como
      `hugo`.
    - Resultado esperado: `404`; drone do outro usuário não é alterado.

11. **Requisição sem token de autenticação**
    - Resultado esperado: `401`.

## RN13 — edição desativa Missões associadas (fixture direta no banco)

Como o pipeline de cálculo só existe na Sprint 05, os registros de `Missao`
são inseridos diretamente via Prisma nos testes, cobrindo a relação sem
depender do cálculo real.

12. **Editar com sucesso desativa todas as Missões ativas do drone**
    - Entrada: drone com 2 Missões `ATIVA` associadas (mapas diferentes,
      inseridas via fixture).
    - Ação: `PATCH /drones/:id` com edição válida.
    - Resultado esperado: `200`; as 2 Missões passam para `DESATIVADA` no
      banco.

13. **Missões já desativadas permanecem desativadas (idempotência)**
    - Entrada: drone com 1 Missão `DESATIVADA` associada.
    - Ação: edição válida.
    - Resultado esperado: `200`; a Missão continua `DESATIVADA`, sem erro.

14. **Missões de outros drones não são afetadas**
    - Entrada: drone A com 1 Missão `ATIVA`; drone B (não editado) com 1
      Missão `ATIVA`.
    - Ação: edita o drone A.
    - Resultado esperado: Missão de A vira `DESATIVADA`; Missão de B
      permanece `ATIVA`.
