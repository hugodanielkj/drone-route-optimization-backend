# Correção — 500 em JSON malformado no corpo da requisição

## Contexto

O usuário testou `POST /drones` com um curl que tinha um erro de digitação
(faltou vírgula entre `"velocidadeMedia":10` e `"capacidadeBateria": 10`
no JSON). A API respondeu `{"erro":"Erro interno do servidor"}` com
status `500`, em vez de um erro `400` de validação — o que é enganoso: o
problema é do cliente (JSON malformado), não uma falha interna do
servidor.

**Causa raiz confirmada (investigação em `body-parser@1.20.6`, o parser
usado por `express.json()`):** quando o corpo não é um JSON válido,
`express.json()` chama `next(err)` com um objeto que:
- é `instanceof SyntaxError`;
- tem `err.status === 400` e `err.type === 'entity.parse.failed'`
  (setados pelo próprio body-parser/`http-errors`).

`src/common/middlewares/tratamento-erros.middleware.ts` — o único lugar
que decide o formato de resposta de erro (convenção de `stack.md`) — hoje
só trata `ZodError` e subclasses de `AppError`; qualquer outro erro,
incluindo esse `SyntaxError`, cai no branch genérico (`console.error` +
`500`). O middleware nunca teve um caso para erros de parsing do próprio
`express.json()`, que roda *antes* de qualquer rota/controller — por isso
nenhum teste existente cobre esse cenário (confirmado: não há
`tratamento-erros.middleware.spec.ts`, e grep por `SyntaxError` /
`entity.parse.failed` no `src/` não retornou nada).

## O que muda

### 1. `src/common/middlewares/tratamento-erros.middleware.ts`

Adicionar um novo branch, antes do fallback genérico de 500, tratando
especificamente o erro de parsing do `express.json()`:

```ts
if (error instanceof SyntaxError && (error as { type?: string }).type === 'entity.parse.failed') {
  res.status(400).json({ erro: 'Corpo da requisição não é um JSON válido' });
  return;
}
```

A checagem usa `error.type === 'entity.parse.failed'` (não apenas
`instanceof SyntaxError`) para não capturar por engano outros
`SyntaxError` que eventualmente venham de código da aplicação — é a marca
específica que o body-parser grava nesse tipo de erro.

### 2. Novo teste: `src/common/middlewares/tratamento-erros.middleware.spec.ts`

Segue o padrão e2e já usado em `usuario.controller.spec.ts` /
`drone.controller.spec.ts` (Supertest direto contra `createApp()`, sem
precisar de uma rota de teste dedicada — `express.json()` roda antes do
roteamento, então qualquer rota existente serve, ex: `POST /usuarios`).

Caso a cobrir (reproduzindo o bug relatado):
- **JSON malformado no corpo retorna 400, não 500** — `POST /usuarios`
  com corpo raw `'{"nome": "hugo" "senha": "x"}'` (vírgula faltando,
  igual ao erro do usuário) e header `Content-Type: application/json`.
  Resultado esperado: `resposta.status === 400`;
  `resposta.body.erro !== 'Erro interno do servidor'`.

### 3. `docs/architecture/visao-geral.md`

Pequeno ajuste na linha da tabela de módulos referente a
`common/middlewares`, para registrar que `tratamentoErrosMiddleware`
também traduz erro de JSON malformado (`entity.parse.failed`) em `400` —
mantendo o documento como retrato fiel do estado atual, sem abrir uma
nova sprint só para isso (é correção de um middleware já existente da
Sprint 01, não uma nova história de negócio).

## Fora de escopo

- Outros erros do `body-parser` (ex: `413 Payload Too Large` por corpo
  muito grande) — não foi o que o usuário reportou; se aparecer, trata-se
  separadamente.
- Não é necessário ADR: é uma correção de bug que completa um contrato já
  decidido (middleware de erro global decide todo o formato de resposta),
  não uma nova decisão arquitetural.

## Verificação

1. `pnpm typecheck` e `pnpm test` — suíte completa deve continuar 100%
   verde, com o novo teste incluído.
2. Reprodução manual: subir o servidor (`pnpm dev`) e repetir o curl
   original do usuário (com o JSON malformado) — deve retornar `400` com
   uma mensagem clara, em vez de `500`.

## Status

Implementado e verificado. Ver
`docs/corrections/impact/erro-500-json-malformado.md`.
