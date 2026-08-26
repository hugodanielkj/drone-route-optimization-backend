# Sprint 01 — Fundação: setup do projeto e autenticação

## Objetivo

Ao final desta sprint, o projeto Express/TypeScript/Prisma está inicializado e
qualquer usuário consegue se cadastrar, fazer login e ter suas requisições a rotas
protegidas identificadas por um token válido — a base sobre a qual todas as demais
funcionalidades (Drones, Mapas, Missões) serão construídas.

## Histórias

### 0. Setup inicial do projeto (pré-requisito técnico, não é US numerada)

Inicialização do projeto conforme `stack.md` e `estrutura-pastas.md`: TypeScript
(strict), Express, Prisma + PostgreSQL, Zod, Jest + Supertest, pnpm, estrutura
`src/modules/`, `src/common/`, `src/config/`, `src/app.ts`, `src/server.ts`,
middleware de erro global.

Inclui também o **schema Prisma completo do sistema**, não só o model `User`:
`Drone`, `Mapa` (com pontos) e `Missao` (com pernas/coordenadas embutidas, campo
`status`, e constraint de unicidade em `(drone_id, mapa_id)` — RNF-004.3) são
definidos agora, ainda que sua lógica de negócio (CRUD, pipeline de cálculo) só
seja implementada nas sprints seguintes. Isso é necessário para que as checagens
de RN13 (edição desativa Missões associadas) e RN15 (exclusão bloqueada se houver
Missão associada) em Drone (Sprint 02) e Mapa (Sprint 04) consultem a tabela real
desde o início, em vez de depender de simulação até a Sprint 05 existir.

**Justificativa da ordem:** nenhuma história pode ser implementada sem o projeto
existir. Entra antes de qualquer US. Definir o schema completo agora (não apenas
`User`) evita que RN13/RN15 fiquem com checagem incompleta nas Sprints 02 e 04.

### 1. US-001 — Cadastro de usuário

**Justificativa:** não existe login (US-002) nem qualquer outra operação
autenticada sem que usuários possam se cadastrar primeiro. É o ponto de entrada de
toda a cadeia de dependência do sistema.

### 2. US-002 — Login de usuário

**Justificativa:** depende de US-001 (precisa haver usuários cadastrados para
autenticar). A decisão técnica do mecanismo de token (ADR) é tomada aqui, e essa
decisão é pré-requisito direto de US-003.

### 3. US-003 — Proteção de rotas autenticadas

**Justificativa:** depende do mecanismo de emissão de token decidido em US-002 —
não há como validar um middleware de autenticação sem conseguir emitir um token
válido para testá-lo. Fecha a sprint porque é o item que efetivamente passa a
proteger todas as rotas que serão criadas nas sprints seguintes (Drones, Mapas,
Missões).

## Definition of Done da sprint

- Projeto roda localmente (`pnpm install`, migrations do Prisma aplicadas,
  servidor sobe sem erros).
- US-001, US-002 e US-003 implementadas com testes automatizados (unitários nos
  services, e2e nas rotas via Supertest) cobrindo os critérios de aceite de cada
  história, incluindo os casos de rejeição.
- Nenhuma senha em texto plano em nenhum ponto do código ou do banco.
- Middleware de autenticação aplicável e testável isoladamente, pronto para ser
  usado nas rotas das próximas sprints.
- ADRs registrados para: algoritmo de hash de senha, mecanismo de emissão/
  validação de token, e estrutura de persistência escolhida para pernas/
  coordenadas dentro do agregado Missão (ex: JSON vs. tabelas relacionadas
  internas).
- Schema Prisma completo (`User`, `Drone`, `Mapa`, `Missao`) migrado e aplicável,
  mesmo que apenas o model `User` tenha lógica de negócio implementada nesta
  sprint.
- Implementação de cada história documentada (`docs/implementation/`).
- Sem regressão: suíte de testes completa passando.

---

**Confirma este recorte da Sprint 01 antes de eu começar a implementação da
primeira história (setup do projeto + US-001)?**
