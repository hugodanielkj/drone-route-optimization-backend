# ADR-002 — Mecanismo de emissão/validação de token de acesso

## Contexto

RF-001.4/RF-001.5 exigem que o login retorne um token de acesso, e que toda
operação sobre Drone, Mapa ou Missão exija esse token válido, identificando o
usuário autenticado. `regras-de-negocio.md` já fixou como decisão de escopo
que não existe recuperação de senha nem logout com invalidação server-side —
o descarte do token é responsabilidade do cliente. Falta decidir o mecanismo
concreto de emissão/validação.

## Decisão

**JWT stateless**, assinado com HMAC-SHA256 (`HS256`), via a biblioteca
`jsonwebtoken`. O payload contém apenas o claim `sub` com o `id` do usuário
(`{ sub: userId }`); `iat` e `exp` são adicionados automaticamente pela
biblioteca. O segredo de assinatura vem de `JWT_SECRET` (variável de
ambiente); a expiração é configurável via `JWT_EXPIRES_IN` (padrão `24h`).
Validação acontece em `src/common/security/token.ts` (`verificarToken`),
reutilizado pelo middleware de autenticação (US-003).

## Alternativas consideradas

- **Sessão em banco/Redis (token opaco + tabela de sessões)** — descartada
  porque exigiria um mecanismo de armazenamento e limpeza adicional (tabela
  `Session` ou dependência de Redis) sem trazer benefício necessário nesta
  fase: não há requisito de invalidação server-side (logout), que é o
  principal motivo de se preferir sessão a JWT. Adicionar esse componente
  contradiria a decisão de escopo já tomada de não ter invalidação de token.
- **JWT com refresh token** — descartado por ser complexidade adicional
  (endpoint de refresh, rotação, revogação de refresh tokens) não pedida por
  nenhuma história do backlog; RF-001 e US-002 não mencionam múltiplos
  dispositivos nem renovação de sessão.
- **Algoritmo assimétrico (RS256) em vez de HS256** — descartado porque RS256
  só traz vantagem quando um serviço separado precisa *verificar* tokens sem
  poder *emitir* (ex: múltiplos microsserviços, um API Gateway). O sistema é
  um monólito Express único nesta fase — emissão e validação acontecem no
  mesmo processo, então a chave simétrica (HS256) é suficiente e mais simples
  de operar (uma única variável de ambiente, sem par de chaves).

## Consequências

- Nenhum estado de sessão no banco — a escalabilidade horizontal do servidor
  não depende de sticky sessions nem de um store compartilhado.
- Não é possível revogar um token individual antes de expirar (ex: se
  vazado) sem invalidar `JWT_SECRET` inteiro, afetando todos os usuários —
  aceitável nesta fase por já ser a decisão de escopo declarada
  (`regras-de-negocio.md`: "não há mecanismo de recuperação de senha [nem]
  logout com invalidação server-side").
- `JWT_SECRET` precisa ser um segredo forte e mantido fora do controle de
  versão (`.env`, já presente em `.gitignore`) — comprometer esse segredo
  compromete a autenticação de todos os usuários.
- O claim `sub` carrega apenas o `id` do usuário, não o `nome` — qualquer rota
  protegida que precise do nome consulta o banco por `id`, evitando que o
  token fique desatualizado caso o sistema venha a permitir alteração de nome
  no futuro (hoje fora de escopo).

## Status

Aceita.
