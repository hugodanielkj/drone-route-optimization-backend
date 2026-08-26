# Sprint 03 — Gestão de Mapas: criação e consulta

## Objetivo

Ao final desta sprint, um usuário autenticado consegue criar mapas (respeitando
RN01) e consultá-los — a segunda das duas entidades necessárias para o cálculo de
rota (RF-004).

## Histórias

### 1. US-009 — Cadastrar mapa

**Justificativa:** nenhuma outra história desta sprint (listar, consultar) tem o
que operar sem que mapas possam ser criados primeiro. Introduz a validação central
do agregado (RN01: lista de irrigação nunca vazia).

### 2. US-010 — Listar mapas do usuário autenticado

**Justificativa:** leitura simples, sem efeitos colaterais — menor risco, segue o
mesmo padrão já validado em US-005 (Drone).

### 3. US-011 — Consultar mapa por id

**Justificativa:** fecha a sprint porque introduz a checagem de posse por id
(RN11) que será reutilizada pelas histórias de manipulação de pontos e exclusão
na Sprint 04.

## Definition de Done da sprint

- Módulo `mapa` criado (`mapa.routes.ts`, `.controller.ts`, `.service.ts`,
  `.schema.ts`) seguindo `estrutura-pastas.md`, com Coordenada modelada como
  objeto de valor embutido (sem tabela ou rota própria — RN08).
- Todas as rotas protegidas pelo middleware de autenticação de US-003.
- Testes automatizados cobrindo os critérios de aceite de US-009 a US-011,
  incluindo a rejeição de lista de irrigação vazia (RN01) e ownership.
- Implementação de cada história documentada (`docs/implementation/`).
- Sem regressão: suíte completa (Sprints 01-03) passando.
