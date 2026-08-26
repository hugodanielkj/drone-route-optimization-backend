# Sprint 02 — Gestão de Drones (CRUD completo)

## Objetivo

Ao final desta sprint, um usuário autenticado consegue criar, listar, consultar,
editar e excluir seus próprios drones, com todas as regras de validação (RN02) e
posse (RN11) aplicadas — fornecendo a primeira das duas entidades necessárias para
o cálculo de rota (RF-004).

## Histórias

### 1. US-004 — Cadastrar drone

**Justificativa:** nenhuma outra operação desta sprint (listar, consultar, editar,
excluir) tem o que operar sem que drones possam ser criados primeiro.

### 2. US-005 — Listar drones do usuário autenticado

**Justificativa:** leitura simples, sem efeitos colaterais — menor risco. Serve de
base para validar visualmente o resultado das próximas histórias (edição,
exclusão) durante o desenvolvimento.

### 3. US-006 — Consultar drone por id

**Justificativa:** ainda leitura, mas introduz a checagem de posse por id
(RN11) que será reutilizada por edição e exclusão — menor risco que essas duas,
por isso vem antes.

### 4. US-007 — Editar drone

**Justificativa:** depende de US-006 (mesma lógica de busca por id + posse).
Maior risco que as leituras porque introduz o efeito colateral de desativação de
Missões (RN13). Como o schema Prisma já inclui o model `Missao` desde a Sprint 01,
a checagem consulta a tabela real (populada diretamente via fixture de teste, já
que o pipeline de cálculo só existe na Sprint 05) — não é mais uma simulação.

### 5. US-008 — Excluir drone

**Justificativa:** fecha a sprint por ser a operação de maior risco — depende da
checagem de existência de Missões associadas (RN15). Mesma observação de US-007:
a checagem é feita contra a tabela `Missao` real, com registros inseridos
diretamente por fixture de teste nesta sprint.

## Definition of Done da sprint

- Módulo `drone` completo (`drone.routes.ts`, `.controller.ts`, `.service.ts`,
  `.schema.ts`) seguindo a estrutura de `estrutura-pastas.md`.
- Todas as rotas de Drone protegidas pelo middleware de autenticação de US-003.
- Testes automatizados (unitários no service, e2e via Supertest) cobrindo todos os
  critérios de aceite de US-004 a US-008, incluindo validação de DTO, ownership e
  os casos de erro (não encontrado, valores inválidos, exclusão bloqueada).
- RN13 (edição desativa Missões associadas) e RN15 (exclusão bloqueada se houver
  Missão associada) implementadas e testadas contra a tabela `Missao` real
  (registros de teste inseridos diretamente via Prisma, sem depender do pipeline
  de cálculo da Sprint 05) — não há checagem pendente para revalidar depois.
- Implementação de cada história documentada (`docs/implementation/`).
- Sem regressão: suíte completa (Sprint 01 + Sprint 02) passando.
