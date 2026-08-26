# Sprint 04 — Gestão de Mapas: manipulação de pontos e exclusão

## Objetivo

Ao final desta sprint, o CRUD de Mapas está completo: pontos de carregamento e de
irrigação podem ser manipulados exclusivamente através de operações do próprio
mapa (RN08), e mapas sem missão associada podem ser excluídos (RN15).

## Histórias

### 1. US-012 — Alterar ponto de carregamento do mapa

**Justificativa:** entre as três operações de manipulação de pontos, é a mais
simples (substitui um único valor, sem as invariantes de lista mínima que
US-013/US-014 têm) — menor risco, serve de base para validar o padrão de
"operação do mapa desativa Missões associadas" (RN13) antes das próximas. Como o
model `Missao` já existe desde a Sprint 01, essa checagem é feita contra a tabela
real (fixture de teste), não simulada.

### 2. US-013 — Adicionar ponto de irrigação ao mapa

**Justificativa:** operação de lista sem restrição de invariante (sempre pode
adicionar) — mais simples que a remoção (US-014), que precisa validar o caso de
borda do último ponto.

### 3. US-014 — Remover ponto de irrigação do mapa

**Justificativa:** depende do mesmo padrão de US-013, mas adiciona a validação de
invariante RN01 (lista nunca vazia) — maior risco que a adição, por isso vem
depois.

### 4. US-015 — Excluir mapa

**Justificativa:** fecha a sprint pelo mesmo motivo de US-008 (Drone): é a
operação de maior risco, depende da checagem de existência de Missões associadas
(RN15) — feita contra a tabela `Missao` real, com registros inseridos por fixture
de teste, seguindo o mesmo padrão já validado em US-008.

## Definition of Done da sprint

- Operações de ponto de carregamento e pontos de irrigação implementadas apenas
  como métodos do módulo `mapa` — nenhuma rota, tabela ou schema trata Coordenada
  isoladamente (RN08, RNF-003.3).
- Todas as rotas protegidas pelo middleware de autenticação de US-003.
- Testes automatizados cobrindo os critérios de aceite de US-012 a US-015,
  incluindo a rejeição de remoção do último ponto de irrigação (RN01) e exclusão
  bloqueada por Missão associada (RN15, contra a tabela real).
- RN13 (edição desativa Missões associadas) implementada e testada contra a
  tabela `Missao` real, sem checagem pendente para revalidar depois.
- Implementação de cada história documentada (`docs/implementation/`).
- Sem regressão: suíte completa (Sprints 01-04) passando.
- CRUD de Mapas encerrado nesta sprint — pronto para ser consumido pelo pipeline
  de cálculo de rota da Sprint 05.
