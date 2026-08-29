# ADR-003 — Formato de resposta agrupado para coordenadas do Mapa

## Contexto

O schema Prisma persiste o ponto de carregamento como dois campos escalares
achatados (`pontoCarregamentoX`, `pontoCarregamentoY`) diretamente na tabela
`mapas`, e os pontos de irrigação como uma tabela relacionada
(`pontos_irrigacao`, campos `x`/`y`). O módulo `drone` (Sprint 02) nunca
reformata a saída do Prisma — os controllers devolvem o objeto retornado pelo
service, cru. Ao desenhar `POST /mapas`, `GET /mapas` e `GET /mapas/:id`
(US-009 a US-011), essa mesma convenção produziria uma resposta com
`pontoCarregamentoX`/`pontoCarregamentoY` soltos, inconsistente com o formato
de entrada do payload de criação (`pontoCarregamento: {x, y}`).

## Decisão

A resposta de toda rota de Mapa agrupa o ponto de carregamento como um objeto
`pontoCarregamento: {x, y}`, e cada item de `pontosIrrigacao` como `{id, x,
y}`, em vez de expor os campos achatados do Prisma. Essa transformação é feita
por uma função pura de formatação (`formatarMapa`) no `mapa.controller.ts` —
o `mapa.service.ts` continua retornando o objeto cru do Prisma (com
`include: { pontosIrrigacao: true }`), preservando a separação de
responsabilidade já estabelecida (service não conhece formato de
apresentação).

## Alternativas consideradas

- **Manter campos achatados, replicando o padrão de `drone`** — descartada
  porque o payload de entrada de `POST /mapas` já usa `{x, y}` agrupado (mais
  natural para representar uma coordenada); expor a saída em formato diferente
  do de entrada para o mesmo conceito (coordenada) criaria uma assimetria
  desnecessária no contrato da API, sem ganho compensatório.
- **Reformatar dentro do `mapa.service.ts`** — descartada para manter o
  service focado em lógica de negócio e acesso a dados, sem responsabilidade de
  apresentação; a formatação de resposta é presentation concern do controller.

## Consequências

- Todo consumidor da API de Mapa (incluindo o próprio pipeline de cálculo de
  rota, Sprint 05, se vier a reaproveitar esse formato) trabalha com
  coordenadas como `{x, y}`, nunca com campos achatados.
- Esse padrão de formatação de resposta deve ser mantido nas rotas de
  manipulação de pontos da Sprint 04 (US-012 a US-014), para consistência.
- O comentário em `prisma/schema.prisma` (model `Missao`) referencia "ADR 0003"
  para a decisão de estrutura de persistência de pernas/coordenadas — essa é
  uma decisão diferente, ainda não escrita (prevista para a Sprint 05/06). Como
  este ADR reivindicou o número 003 primeiro, a decisão de persistência de
  pernas deverá ser registrada como ADR-004 quando chegar sua vez, e o
  comentário no schema deverá ser atualizado nesse momento.

## Status

Aceita.
