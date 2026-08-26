# Visão geral da arquitetura

> Retrato do estado atual do sistema — atualizado ao final de cada sprint.
> Última atualização: **Sprint 01** (setup do projeto + autenticação).

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
| `common/middlewares` | `src/common/middlewares/` | `autenticacaoMiddleware` (US-003) — valida o JWT de requisições, anexa `req.usuarioId`; `tratamentoErrosMiddleware` — único ponto que traduz erros (`AppError`, `ZodError`) em resposta HTTP, último middleware registrado em `app.ts`. |
| `common/errors` | `src/common/errors/` | Hierarquia `AppError` (`ValidationError` 400, `UnauthorizedError` 401, `NotFoundError` 404, `ConflictError` 409), cada uma carregando seu próprio `statusCode`. |
| `common/security` | `src/common/security/` | `senha.ts` (hash/comparação bcrypt, ADR-001) e `token.ts` (emissão/validação de JWT, ADR-002) — funções puras reutilizadas por `usuario` e `auth`, sem acesso a `req`/`res`. |
| `config` | `src/config/` | `env.ts` (leitura validada de variáveis de ambiente), `prisma.ts` (instância única do `PrismaClient`). |

**Ainda não existem** (previstos para sprints seguintes, ver
`docs/sprints/`): módulos `drone` (Sprint 02), `mapa` (Sprints 03-04),
`missao` (Sprints 05-06).

## Como os módulos se comunicam

Chamadas diretas em processo (nenhuma fila, nenhum evento) — monólito Express
único:

```mermaid
graph TD
    Client[Cliente HTTP]

    subgraph app.ts
        UsuarioRoutes[usuario.routes]
        AuthRoutes[auth.routes]
        ErroMW[tratamentoErrosMiddleware]
    end

    UsuarioController[usuario.controller]
    UsuarioService[usuario.service]
    AuthController[auth.controller]
    AuthService[auth.service]

    Senha[common/security/senha.ts]
    Token[common/security/token.ts]
    Errors[common/errors/app-error.ts]

    Prisma[(PrismaClient)]
    DB[(PostgreSQL)]

    Client -->|POST /usuarios| UsuarioRoutes --> UsuarioController --> UsuarioService
    Client -->|POST /auth/login| AuthRoutes --> AuthController --> AuthService

    UsuarioService --> Senha
    UsuarioService --> Prisma
    AuthService --> Senha
    AuthService --> Token
    AuthService --> Prisma

    UsuarioService -.erro.-> Errors
    AuthService -.erro.-> Errors
    Errors -.next(erro).-> ErroMW
    ErroMW -->|resposta HTTP| Client

    Prisma --> DB
```

Fluxo de uma requisição autenticada (a partir da Sprint 02, quando existirem
rotas de recurso): `Client → <modulo>.routes (com autenticacaoMiddleware) →
<modulo>.controller → <modulo>.service → Prisma → PostgreSQL`, com
`req.usuarioId` disponível a partir do middleware para checagem de ownership
(RN11) dentro do service de cada módulo.

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
`sprint-04.md`). Só `User` tem lógica de negócio (CRUD) implementada até
aqui.

## O que mudou desde a última atualização

Primeira versão deste documento — reflete o fim da Sprint 01. Projeto
inexistente antes desta sprint (apenas documentação em `docs/backlog` e
`docs/requirements`); agora: projeto Express/TS/Prisma inicializado, schema
completo do domínio migrado, e o mecanismo de autenticação (cadastro, login,
proteção de rota) implementado e testado de ponta a ponta.
