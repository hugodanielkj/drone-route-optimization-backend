# Plano de testes — US-003 — Proteção de rotas autenticadas

Escopo: middleware `autenticacaoMiddleware`
(`src/common/middlewares/autenticacao.middleware.ts`). Como nenhuma rota de
Drone/Mapa/Missão existe ainda (Sprints 02+), o middleware é exercitado em
testes de integração contra uma rota de teste dedicada, montada apenas dentro
do arquivo de teste — não em `app.ts`. A checagem de posse por recurso
específico (RN11 — "usuário tentando acessar recurso de outro usuário") é
responsabilidade de cada módulo de recurso (Drone, Mapa, Missão) e será
testada quando esses módulos existirem; aqui valida-se apenas que o
middleware identifica corretamente o usuário autenticado e bloqueia
requisições sem identidade válida.

## Caso feliz

1. **Requisição com token válido é autenticada**
   - Entrada: usuário cadastrado e logado (token obtido via `POST
     /auth/login`); requisição a uma rota protegida de teste com header
     `Authorization: Bearer <token>`.
   - Ação: `GET /_teste/protegida`.
   - Resultado esperado: status `200`; o handler da rota recebe
     `req.usuarioId` igual ao `id` do usuário autenticado (fecha o caso 2 do
     plano de US-002: o token emitido no login é utilizável).

## Casos alternativos

2. **Token gerado para usuários diferentes identifica corretamente cada um**
   - Entrada: dois usuários cadastrados e logados (`hugo` e `outro`), cada um
     com seu próprio token.
   - Ação: `GET /_teste/protegida` uma vez com o token de cada usuário.
   - Resultado esperado: `200` em ambas; `req.usuarioId` corresponde ao `id`
     de cada usuário respectivamente, nunca trocado.

## Casos de borda

3. **Token no limite da expiração (mock de tempo)**
   - Entrada: gerar um token com `expiresIn` de 1 segundo; aguardar a
     expiração.
   - Ação: `GET /_teste/protegida` após o token expirar.
   - Resultado esperado: `401` — `jwt.verify` lança `TokenExpiredError`,
     traduzido para `UnauthorizedError`.

4. **Header `Authorization` presente mas vazio**
   - Entrada: header `Authorization: ""`.
   - Ação: `GET /_teste/protegida`.
   - Resultado esperado: `401`.

## Casos de erro / exceção

5. **Sem header `Authorization`**
   - Entrada: requisição sem o header.
   - Ação: `GET /_teste/protegida`.
   - Resultado esperado: `401`, corpo com mensagem de não autenticado; o
     handler da rota protegida não é executado (verificável por um spy/mock
     que nunca é chamado).

6. **Token malformado (string aleatória, não-JWT)**
   - Entrada: `Authorization: Bearer isso-nao-e-um-jwt`.
   - Ação: `GET /_teste/protegida`.
   - Resultado esperado: `401`.

7. **Token assinado com segredo diferente do configurado**
   - Entrada: gerar um JWT válido em formato, mas assinado com um
     `JWT_SECRET` diferente do usado pela aplicação.
   - Ação: `GET /_teste/protegida` com esse token.
   - Resultado esperado: `401` — `jwt.verify` rejeita por assinatura
     inválida.

8. **Header sem o prefixo `Bearer`**
   - Entrada: `Authorization: <token>` (token válido, mas sem o prefixo
     `Bearer `).
   - Ação: `GET /_teste/protegida`.
   - Resultado esperado: `401`.

9. **Token de um esquema diferente (`Basic ...`)**
   - Entrada: `Authorization: Basic dXNlcjpwYXNz`.
   - Ação: `GET /_teste/protegida`.
   - Resultado esperado: `401`.

## Verificação transversal (unitário, nível de middleware)

10. **Middleware chama `next(erro)` em vez de responder diretamente em caso de
    falha**
    - Entrada: chamar o middleware diretamente com um `req` mockado sem
      header `Authorization`, e um `next` mockado (jest.fn()).
    - Resultado esperado: `next` é chamado uma vez, com um `UnauthorizedError`
      como argumento; `res.status`/`res.json` não são chamados pelo próprio
      middleware (delega ao middleware de erro global, conforme convenção de
      `stack.md`).

11. **Middleware chama `next()` sem argumento em caso de sucesso**
    - Entrada: `req` mockado com header `Authorization` válido.
    - Resultado esperado: `next` é chamado uma vez, sem argumentos;
      `req.usuarioId` é definido com o `sub` do token antes da chamada.
