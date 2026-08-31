# ADR-004 — Formato de persistência das pernas de rota da Missão

## Contexto

`prisma/schema.prisma` já define, desde a Sprint 01, o campo `Missao.pernas`
como `Json?` — mas nunca decidiu o formato interno desse JSON. O comentário no
schema referenciava prematuramente "ADR 0003" para essa decisão; o `ADR-003`
(Sprint 03) esclareceu que essa referência estava incorreta (ADR-003 trata do
formato de **resposta** de coordenadas do Mapa, uma decisão diferente) e
previu que a decisão de persistência de pernas deveria virar `ADR-004` quando
a Sprint 05 (US-016) a implementasse — o que acontece agora.

Perna de rota e Coordenada são objetos de valor (`.claude/rules/regras-de-negocio.md`):
não têm identidade própria, não existem fora do agregado Missão, e não há
tabela própria para elas (decisão já tomada na Sprint 01) — precisam ser
embutidas dentro do JSON de `pernas`.

## Decisão

`Missao.pernas` persiste diretamente o array retornado pelo motor de cálculo
(`ResultadoCalculoRota.pernas`), sem transformação:

```json
[
  {
    "sequencia": [{ "x": 0, "y": 0 }, { "x": 5, "y": 5 }, { "x": 3, "y": 1 }, { "x": 0, "y": 0 }],
    "distanciaTotal": 14.62,
    "consumoTotal": 9321.47
  }
]
```

- `sequencia` — `Coordenada[]` (`{x, y}`, sem `id`), sempre iniciando e
  terminando no ponto de carregamento do mapa (RN03). Sem identidade, ecoando
  o precedente já estabelecido por ADR-003 para Coordenada como objeto de
  valor.
- `distanciaTotal` — soma das distâncias euclidianas trecho a trecho da
  perna; já calculada por `calcularPerna` ao validar RN04, sem custo extra
  para persistir.
- `consumoTotal` — consumo energético da perna (fórmula `consumo_trecho`,
  RF-004.8/RF-004.11); `Missao.consumoEnergeticoTotal` (coluna escalar já
  existente) é a soma de `pernas[].consumoTotal` de todas as pernas.

## Alternativas consideradas

- **Registrar o breakdown por trecho dentro de cada perna** (distância e
  consumo de cada segmento individual, não só o agregado da perna) —
  descartada: o pipeline é determinístico (RN06), então esse detalhe é
  recomputável a qualquer momento a partir de `sequencia` sem custo de
  precisão; persistir o breakdown seria dado redundante sem uso previsto por
  nenhum requisito (RF-004.13 só expõe a sequência e os agregados).
- **Referenciar `PontoIrrigacao.id` em vez de `{x, y}` cru** — descartada:
  contradiz a definição de Coordenada como objeto de valor sem identidade
  (`regras-de-negocio.md`); também criaria referências pendentes se o Mapa for
  editado depois (o que já desativa a Missão via RN13, mas o JSON persistido
  ficaria com ids de pontos potencialmente removidos).
- **Tabela `Perna`/`Trecho` própria, relacionada a `Missao`** — já descartada
  desde a Sprint 01 (`regras-de-negocio.md`: "não existem tabelas próprias
  para elas"); este ADR só decide o formato interno do JSON, não o mecanismo
  de armazenamento (`Json?` embutido).

## Consequências

- O comentário `// ver ADR 0003` no model `Missao` de `prisma/schema.prisma`
  é corrigido para `// ver ADR-004` (sem migration — o campo já é `Json?`
  sem schema tipado).
- Qualquer consumidor futuro de `GET /missoes/:id` (RF-004.13, Sprint 06) lê
  `pernas` diretamente como está persistido, sem transformação adicional.
- `docs/sprints/sprint-05.md` (escrita antes do ADR-003) tem uma frase que dá
  a entender que essa ADR já existia desde a Sprint 01 — não existia; esse
  documento de sprint não é reescrito retroativamente (registro histórico),
  mas este ADR e a atualização do comentário no schema são os artefatos que
  corrigem a lacuna daqui em diante.

## Status

Aceita.
