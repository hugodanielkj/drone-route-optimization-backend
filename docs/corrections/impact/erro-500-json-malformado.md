# Impacto — 500 em JSON malformado no corpo da requisição

Referência: `docs/corrections/problem-solution/erro-500-json-malformado.md`.

## Antes

`POST /drones` (ou qualquer rota) com corpo `Content-Type: application/json`
sintaticamente inválido (ex.: `'{"velocidadeMedia":10 "capacidadeBateria":10}'`,
faltando vírgula):

- `express.json()` lança `SyntaxError` (`err.status = 400`,
  `err.type = 'entity.parse.failed'`) antes de qualquer rota/middleware de
  autenticação rodar.
- `tratamentoErrosMiddleware` não tinha branch para esse erro → caía no
  fallback genérico.
- **Resposta: `500` + `{"erro":"Erro interno do servidor"}`**, mascarando um
  erro de cliente como falha interna, e poluindo o log do servidor
  (`console.error`) para um caso de uso normal (corpo mal formado enviado
  pelo cliente).
- Nenhum teste cobria esse cenário (confirmado por grep antes da correção).

## Depois

Adicionado branch dedicado em
`src/common/middlewares/tratamento-erros.middleware.ts` checando
`error instanceof SyntaxError && error.type === 'entity.parse.failed'`,
antes do fallback genérico de 500:

- **Resposta agora: `400` + `{"erro":"Corpo da requisição não é um JSON válido"}`**.
- `console.error` não é mais acionado para esse caso (só permanece no
  fallback genérico, para erros realmente não mapeados).

## Testes

- Novo: `src/common/middlewares/tratamento-erros.middleware.spec.ts` —
  reproduz JSON malformado via `POST /usuarios`, valida `status === 400` e
  `body.erro !== 'Erro interno do servidor'`.
- Já existente (adicionado pelo usuário ao identificar o bug):
  `src/modules/drone/drone.controller.spec.ts` — `POST /drones` autenticado
  com JSON malformado, valida `status === 400`.
- `pnpm typecheck`: sem erros.
- `pnpm test`: **102/102 passando** (8 suítes), incluindo os dois testes
  acima.

## Doc de arquitetura

`docs/architecture/visao-geral.md` — linha de `common/middlewares` atualizada
para registrar que `tratamentoErrosMiddleware` também traduz
`SyntaxError`/`entity.parse.failed` em `400`.

## Fora de escopo (mantido)

Outros erros do `body-parser` (ex.: `413 Payload Too Large`) não foram
tratados — não fizeram parte do problema relatado.
