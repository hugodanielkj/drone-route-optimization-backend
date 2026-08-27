# Plano de testes — US-004 — Cadastrar drone

Escopo: `POST /drones` (`drone.service.ts` unitário + rota e2e via Supertest).
Requer autenticação (US-003): todas as requisições passam pelo
`autenticacaoMiddleware`.

## Caso feliz

1. **Cadastro com todos os atributos válidos**
   - Entrada: usuário autenticado; `{ nome, consumoPorIrrigacao,
     velocidadeMedia, capacidadeBateria }`, todos numéricos positivos.
   - Ação: `POST /drones` com `Authorization: Bearer <token>`.
   - Resultado esperado: `201`; corpo contém o drone criado (incluindo `id`),
     associado ao `usuarioId` do token.

## Casos alternativos

2. **Valores decimais (float) são aceitos**
   - Entrada: `consumoPorIrrigacao: 0.5`, `velocidadeMedia: 12.75`,
     `capacidadeBateria: 999.99`.
   - Resultado esperado: `201`.

3. **Drone criado é associado ao usuário correto, não a outros**
   - Entrada: dois usuários (`hugo`, `outro`) autenticados; `hugo` cadastra um
     drone.
   - Ação: consulta direta via Prisma ao registro criado (`AC3` de US-004 —
     verificação de ponta a ponta por id/listagem só existe a partir de
     US-005/US-006).
   - Resultado esperado: `userId` do registro persistido é o `id` de `hugo`,
     não o de `outro`.

4. **Campos extras no payload são ignorados**
   - Entrada: payload válido + campo `foo: "bar"` não esperado pelo schema.
   - Resultado esperado: `201`; `foo` não aparece no corpo de resposta.

## Casos de borda

5. **Valor numérico positivo muito pequeno (próximo de zero) é aceito**
   - Entrada: `consumoPorIrrigacao: 0.0001`.
   - Resultado esperado: `201` (RN02 exige apenas positivo, sem piso mínimo
     definido).

6. **Múltiplos drones cadastrados pelo mesmo usuário recebem ids distintos**
   - Entrada: dois cadastros válidos consecutivos do mesmo usuário.
   - Resultado esperado: `201` em ambos; ids diferentes; ambos associados ao
     mesmo `userId`.

## Casos de erro / exceção

7. **`consumoPorIrrigacao` igual a zero**
   - Resultado esperado: `400` (RN02); nenhum drone persistido.

8. **`consumoPorIrrigacao` negativo**
   - Resultado esperado: `400`.

9. **`velocidadeMedia` igual a zero**
   - Resultado esperado: `400`.

10. **`velocidadeMedia` negativa**
    - Resultado esperado: `400`.

11. **`capacidadeBateria` igual a zero**
    - Resultado esperado: `400`.

12. **`capacidadeBateria` negativa**
    - Resultado esperado: `400`.

13. **Nome vazio**
    - Resultado esperado: `400`.

14. **Payload sem `nome`**
    - Resultado esperado: `400`.

15. **Payload sem algum atributo numérico obrigatório**
    - Entrada: payload sem `capacidadeBateria`.
    - Resultado esperado: `400`.

16. **Tipos inválidos (string em campo numérico)**
    - Entrada: `consumoPorIrrigacao: "dez"`.
    - Resultado esperado: `400`.

17. **Requisição sem token de autenticação**
    - Ação: `POST /drones` sem header `Authorization`.
    - Resultado esperado: `401`; nenhum drone persistido.
