# Visão geral da arquitetura

> Retrato do estado atual do sistema — atualizado ao final de cada sprint.
> Última atualização: **Sprint 05** (motor de cálculo de rota + `POST /missoes`, US-016).

## Stack

TypeScript (strict) · Express · Prisma + PostgreSQL · Zod · Jest + Supertest ·
pnpm. Arquitetura modular manual (`src/modules/<nome>/`), sem framework de
injeção de dependência, no espírito do Nest mas registrada manualmente em
`src/app.ts`. Detalhes em `.claude/rules/stack.md` e
`.claude/rules/estrutura-pastas.md`.

## Módulos existentes

| Módulo | Caminho | Responsabilidade |
|---|---|---|
| `usuario` | `src/modules/usuario/` | Cadastro de usuário (`POST /usuarios`): valida DTO, faz hash da senha, persiste, garante unicidade de `nome` (US-001). |
| `auth` | `src/modules/auth/` | Login (`POST /auth/login`): valida credenciais contra o hash persistido, emite JWT (US-002). |
| `common/middlewares` | `src/common/middlewares/` | `autenticacaoMiddleware` (US-003) — valida o JWT de requisições, anexa `req.usuarioId`; `tratamentoErrosMiddleware` — único ponto que traduz erros (`AppError`, `ZodError`, `SyntaxError` de JSON malformado — `entity.parse.failed` do `express.json()`) em resposta HTTP, último middleware registrado em `app.ts`. |
| `common/errors` | `src/common/errors/` | Hierarquia `AppError` (`ValidationError` 400, `UnauthorizedError` 401, `NotFoundError` 404, `ConflictError` 409), cada uma carregando seu próprio `statusCode`. |
| `common/security` | `src/common/security/` | `senha.ts` (hash/comparação bcrypt, ADR-001) e `token.ts` (emissão/validação de JWT, ADR-002) — funções puras reutilizadas por `usuario` e `auth`, sem acesso a `req`/`res`. |
| `config` | `src/config/` | `env.ts` (leitura validada de variáveis de ambiente), `prisma.ts` (instância única do `PrismaClient`). |
| `drone` | `src/modules/drone/` | CRUD completo de Drone, protegido por `autenticacaoMiddleware` em todas as rotas: `POST /` (US-004), `GET /` (US-005), `GET /:id` (US-006), `PATCH /:id` — edição parcial (US-007), `DELETE /:id` (US-008). Ownership por `userId` em toda operação de leitura/edição/exclusão (RN11); `PATCH` desativa Missões `ATIVA` associadas em transação (RN13); `DELETE` bloqueia se houver qualquer Missão associada, ativa ou desativada (RN15). |
| `mapa` | `src/modules/mapa/` | **CRUD completo de Mapa**, protegido por `autenticacaoMiddleware`: `POST /` (US-009), `GET /` (US-010), `GET /:id` (US-011), `PATCH /:id/ponto-carregamento` (US-012), `POST /:id/pontos-irrigacao` (US-013), `DELETE /:id/pontos-irrigacao/:pontoId` (US-014), `DELETE /:id` (US-015). Ownership centralizado em `mapaService.buscarPorId`, réplica do padrão de `drone` (RN11). RN01 (não remover o último ponto de irrigação), RN16 (máx. 1000 pontos), RN17 (ponto de irrigação ≠ ponto de carregamento) e RN18 (sem pontos de irrigação duplicados) são validadas no schema Zod quando a checagem é só sobre o payload (cadastro, US-009), e no service via `ConflictError`/409 quando dependem de estado já persistido (US-012 a US-014) — decisão confirmada explicitamente com o usuário. `PATCH`/`POST`/`DELETE :pontoId` desativam Missões `ATIVA` associadas em transação (RN13); `DELETE /:id` bloqueia se houver qualquer Missão associada, ativa ou desativada (RN15), mesmo padrão de `drone`. Resposta agrupa coordenadas como `{x,y}` em vez dos campos achatados do Prisma (`ADR-003`). |
| `missao` | `src/modules/missao/` | `POST /` (US-016), protegido por `autenticacaoMiddleware`: calcula e persiste uma nova Missão `ATIVA` para um par (drone, mapa) do usuário autenticado (RN11, via `droneService.buscarPorId`/`mapaService.buscarPorId`) sem Missão existente — par já calculado responde `409` (reaproveitamento/reativação reais ficam para a Sprint 06, US-017/US-018). Motor de cálculo isolado em `missao/motor/` (sem Express/Prisma): vizinho mais próximo → 2-opt (ciclo fechado, first-improvement) no trajeto completo → divisão em pernas por capacidade de bateria (RN04, RN05 estendida a todos os pontos) → `move` entre pernas (steepest descent, só confirma troca que preserva RN04 nas duas pernas — regra corrigida nesta sprint) → 2-opt por perna. Rota inviável (RN05) e Missão já existente respondem `409` (`ConflictError`). Pernas persistidas como JSON em `Missao.pernas` (`ADR-004`). |

**Ainda não existe** (previsto para a Sprint 06, ver `docs/sprints/sprint-06.md`):
reaproveitamento de missão ativa (RN12, US-017), recálculo/reativação de
missão desativada (RN14, US-018), listagem (US-019) e consulta de detalhe
(US-020) de Missões.

## Como os módulos se comunicam

Chamadas diretas em processo (nenhuma fila, nenhum evento) — monólito Express
único:

```mermaid
graph TD
    Client[Cliente HTTP]

    subgraph app.ts
        UsuarioRoutes[usuario.routes]
        AuthRoutes[auth.routes]
        DroneRoutes[drone.routes]
        MapaRoutes[mapa.routes]
        MissaoRoutes[missao.routes]
        AuthMW[autenticacaoMiddleware]
        ErroMW[tratamentoErrosMiddleware]
    end

    UsuarioController[usuario.controller]
    UsuarioService[usuario.service]
    AuthController[auth.controller]
    AuthService[auth.service]
    DroneController[drone.controller]
    DroneService[drone.service]
    MapaController[mapa.controller]
    MapaService[mapa.service]
    MissaoController[missao.controller]
    MissaoService[missao.service]
    Motor["missao/motor (função pura: vizinho mais próximo → 2-opt → divisão em pernas → move → 2-opt por perna)"]

    Senha[common/security/senha.ts]
    Token[common/security/token.ts]
    Errors[common/errors/app-error.ts]
    Distancia[common/util/distancia.ts]

    Prisma[(PrismaClient)]
    DB[(PostgreSQL)]

    Client -->|POST /usuarios| UsuarioRoutes --> UsuarioController --> UsuarioService
    Client -->|POST /auth/login| AuthRoutes --> AuthController --> AuthService
    Client -->|"/drones/*"| DroneRoutes --> AuthMW --> DroneController --> DroneService
    Client -->|"/mapas/*"| MapaRoutes --> AuthMW --> MapaController --> MapaService
    Client -->|POST /missoes| MissaoRoutes --> AuthMW --> MissaoController --> MissaoService

    UsuarioService --> Senha
    UsuarioService --> Prisma
    AuthService --> Senha
    AuthService --> Token
    AuthService --> Prisma
    DroneService --> Prisma
    MapaService --> Prisma
    MissaoService -->|"RN11: reaproveita buscarPorId"| DroneService
    MissaoService -->|"RN11: reaproveita buscarPorId"| MapaService
    MissaoService --> Motor
    MissaoService --> Prisma
    Motor --> Distancia

    UsuarioService -.erro.-> Errors
    AuthService -.erro.-> Errors
    DroneService -.erro.-> Errors
    MapaService -.erro.-> Errors
    MissaoService -.erro.-> Errors
    AuthMW -.token inválido.-> Errors
    Errors -.next(erro).-> ErroMW
    ErroMW -->|resposta HTTP| Client

    Prisma --> DB
```

Fluxo de uma requisição autenticada (padrão seguido por `drone` desde a
Sprint 02, reaproveitado por `mapa` na Sprint 04 e por `missao` nesta
sprint): `Client → <modulo>.routes (com autenticacaoMiddleware) →
<modulo>.controller → <modulo>.service → Prisma → PostgreSQL`, com
`req.usuarioId` disponível a partir do middleware para checagem de ownership
(RN11) dentro do service de cada módulo — em `drone`, centralizada em
`droneService.buscarPorId`, reaproveitada por `editar` e `excluir`; em `mapa`,
a mesma estrutura em `mapaService.buscarPorId`; `missaoService` é o primeiro
módulo do projeto a importar o service de outros dois módulos diretamente
(`droneService`/`mapaService`), reaproveitando a checagem de ownership já
existente em vez de duplicá-la.

## Dependências externas

- **PostgreSQL** — único armazenamento persistente, acessado exclusivamente
  via Prisma Client (nenhuma query SQL crua). Duas bases locais nesta fase:
  `backend_ic_dev` e `backend_ic_test` (usada pela suíte automatizada, limpa
  entre testes por `src/test/setup.ts`).
- **`jsonwebtoken`** — emissão/validação de token stateless (ADR-002); nenhum
  serviço externo de identidade.
- **`bcryptjs`** — hash de senha em JS puro, sem dependência nativa
  (ADR-001).
- Nenhuma dependência de fila, cache ou serviço de terceiros até esta sprint.

## Schema de dados

O schema Prisma (`prisma/schema.prisma`) já contém **todos** os models do
domínio completo (`User`, `Drone`, `Mapa`, `PontoIrrigacao`, `Missao`),
antecipados na Sprint 01 para que as regras RN13/RN15 (edição desativa
Missão; exclusão bloqueada se houver Missão associada), implementadas a
partir da Sprint 02, consultem tabelas reais desde o início — decisão
registrada nos arquivos de sprint (`docs/sprints/sprint-01.md` a
`sprint-04.md`). `User`, `Drone` e `Mapa`/`PontoIrrigacao` têm CRUD completo
implementado; `Missao` agora tem seu primeiro service (`missaoService.calcular`,
US-016) escrevendo registros reais nela — até a Sprint 04, era usada só como
fixture de teste inserida diretamente via Prisma para validar RN13/RN15 dos
módulos `drone` e `mapa`. `Missao.pernas` (`Json?`) persiste o array de pernas
retornado pelo motor de cálculo, formato decidido em `ADR-004`.

## O que mudou desde a última atualização

**Sprint 05** — módulo `missao` criado (US-016): `POST /missoes` calcula e
persiste a primeira Missão para um par (drone, mapa). Motor de cálculo isolado
em `src/modules/missao/motor/` (função pura, sem Express/Prisma), decomposto
em uma etapa por arquivo — `consumo-trecho.ts` (fórmula e constantes fixas),
`perna.ts` (`calcularPerna`, reaproveitada por divisão em pernas, `move` e
agregação final), `vizinho-mais-proximo.ts`, `dois-opt.ts` (ciclo fechado,
first-improvement, reaproveitado no trajeto completo e por perna),
`divisao-pernas.ts` (`verificarViabilidadeMinima` — RN05 estendida a todos os
pontos, não só o mais próximo, decisão confirmada com o usuário — e
`dividirEmPernas`), `mover-entre-pernas.ts` e `pipeline.ts` (`calcularRota`,
composição das 5 etapas). Distância euclidiana extraída para
`src/common/util/distancia.ts`, primeiro utilitário genérico fora de
`common/security`. `missaoService.calcular` é o primeiro service do projeto a
importar diretamente os services de outros dois módulos (`droneService` e
`mapaService`), reaproveitando `buscarPorId` de ambos para RN11 em vez de
duplicar a checagem de ownership. Rota inviável (RN05) e Missão já existente
para o par (fora de escopo desta sprint — reaproveitamento/reativação são
US-017/US-018, Sprint 06) respondem `409` (`ConflictError`).

**Correção de regra de negócio durante a implementação**: a especificação
original do `move` (RF-004.9/`regras-de-negocio.md`) previa nenhuma checagem
de viabilidade após a troca, por decisão deliberada. Ao testar o pipeline de
ponta a ponta, ficou claro que essa ausência de checagem não era um caso de
borda: como a constante `alpha` domina a fórmula de consumo, o `move` tendia
a desfazer a divisão em pernas quase sempre que pontos de pernas diferentes
estivessem próximos, consolidando-os de volta numa perna que ultrapassa a
capacidade de bateria. Reportado ao usuário, que decidiu reverter a regra:
`moverEntrePernas` agora só confirma uma troca quando as duas pernas
resultantes continuam dentro de `capacidadeBateria` (RN04) **e** o consumo
combinado diminui — RN04 tratada como invariante do sistema, nunca violável
pelo `move`. `regras-de-negocio.md` e `RF-004.md` foram atualizados; detalhes
completos em `docs/implementation/US-016.md`.

Novo `ADR-004`: formato de persistência de `Missao.pernas` (array de
`{sequencia, distanciaTotal, consumoTotal}`, coordenadas sem identidade,
ecoando o precedente de `ADR-003`) — comentário em `prisma/schema.prisma`
corrigido de `ADR 0003` (referência incorreta, já sinalizada pelo próprio
`ADR-003`) para `ADR-004`.

**Sprint 04** — CRUD de Mapa encerrado (US-012 a US-015): `PATCH
/mapas/:id/ponto-carregamento` (US-012), `POST /mapas/:id/pontos-irrigacao`
(US-013), `DELETE /mapas/:id/pontos-irrigacao/:pontoId` (US-014) e `DELETE
/mapas/:id` (US-015), como sub-recursos aninhados sob `/mapas/:id` — decisão
confirmada com o usuário para manter uma responsabilidade por rota, em vez de
um `PATCH /mapas/:id` genérico com campos mutuamente exclusivos. As três
operações de escrita desativam Missões `ATIVA` associadas em transação
(RN13), mesmo padrão de `drone`; `DELETE /mapas/:id` bloqueia por qualquer
Missão associada (RN15). RN16/RN17/RN18 — que em US-009 (Sprint 03) só
podiam ser validadas no schema Zod porque todos os pontos chegavam num único
payload — precisaram migrar para o service em US-012/US-013, pois a nova
coordenada precisa ser comparada contra pontos já persistidos no banco; a
mesma mudança de contexto trocou o tipo de erro de `400` (`ZodError`) para
`409` (`ConflictError`), decisão confirmada explicitamente com o usuário e
alinhada ao padrão já usado por RN15 em `drone.excluir`. RN01 (não remover o
último ponto de irrigação) segue a mesma lógica em US-014. Nenhum ADR novo
(nenhuma decisão de infraestrutura/mecanismo nova além de `ADR-003`, já
registrada na Sprint 03).

**Sprint 03** — módulo `mapa` implementado (cadastro e consulta: US-009 a
US-011). `POST /mapas` cria o Mapa e seus PontosIrrigacao atomicamente via
nested write do Prisma, validando no schema Zod (`cadastroMapaSchema`) tanto
as regras já previstas no backlog (RN01: lista de irrigação não vazia) quanto
três regras de negócio novas, decididas explicitamente pelo usuário durante o
planejamento desta sprint e formalizadas em `regras-de-negocio.md` (RN16:
máximo de 1000 pontos de irrigação por mapa; RN17: nenhum ponto de irrigação
pode coincidir com o ponto de carregamento; RN18: nenhum ponto de irrigação
pode coincidir com outro do mesmo mapa — cada uma com mensagem de erro
dedicada). `GET /mapas` e `GET /mapas/:id` seguem o mesmo padrão de listagem
e ownership já validado em `drone` (RN11), com `buscarPorId` pronto para
reuso pelas histórias de manipulação de pontos e exclusão da Sprint 04. Novo
`ADR-003`: resposta de toda rota de Mapa agrupa coordenadas como `{x,y}` em
vez dos campos achatados do Prisma, decisão confirmada explicitamente com o
usuário e que deve se manter consistente na Sprint 04.

**Sprint 02** — módulo `drone` implementado por completo (US-004 a US-008):
cadastro, listagem, consulta por id, edição (`PATCH` parcial — decisão de
contrato tomada explicitamente com o usuário, já que os critérios de
aceite de US-007 não determinavam PUT completo vs. PATCH parcial) e
exclusão, todas protegidas por `autenticacaoMiddleware` e com checagem de
ownership centralizada em `droneService.buscarPorId`. RN13 (edição desativa
Missões `ATIVA` associadas, em transação) e RN15 (exclusão bloqueada por
qualquer Missão associada, ativa ou desativada) implementadas e testadas
contra a tabela `Missao` real via fixtures — sem pendência para revalidar
quando o pipeline de cálculo (US-016) existir. Nenhum ADR novo nesta sprint
(nenhuma decisão de infraestrutura/mecanismo, só de contrato de API,
registrada em `docs/implementation/US-007.md`).

Sprint 01 (anterior): projeto Express/TS/Prisma inicializado, schema
completo do domínio migrado, mecanismo de autenticação (cadastro, login,
proteção de rota) implementado e testado de ponta a ponta.
