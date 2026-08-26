# ADR-001 — Algoritmo de hash de senha

## Contexto

RN09/RNF-001.1 exigem que a senha do usuário nunca seja persistida em texto
plano, e que o algoritmo usado seja adequado para hashing de senhas — não um
hash genérico de propósito geral (MD5, SHA-256 puro), que é rápido demais e
vulnerável a ataques de força bruta/rainbow table em GPU.

## Decisão

Usar **bcrypt**, através da biblioteca `bcryptjs` (implementação pura em
JavaScript, sem bindings nativos), com fator de custo (`salt rounds`) igual a
`10`.

`bcryptjs` é usado em vez do pacote nativo `bcrypt` para eliminar a
dependência de compilação nativa (`node-gyp`) do processo de instalação e
deploy — relevante porque o alvo de deploy definido em `stack.md` é um
ambiente sempre ativo (Railway/Render/Fly/VPS) que pode variar de imagem base,
e uma dependência nativa adiciona um ponto de falha na build sem necessidade,
já que o custo de performance do bcrypt em JS puro é aceitável para o volume
de cadastros/logins esperado nesta fase do projeto.

## Alternativas consideradas

- **Argon2** (via `argon2` npm) — vencedor da Password Hashing Competition e
  hoje a recomendação primária da OWASP. Não foi escolhido porque exige
  bindings nativos (compilação em tempo de instalação), o que introduz risco
  de falha de build em diferentes ambientes de deploy sem trazer benefício
  proporcional para o volume e criticidade deste projeto nesta fase (o
  objetivo declarado em `regras-de-negocio.md` é validar o mecanismo de
  autenticação, não maximizar resistência a ataques em escala de produção).
- **SHA-256 / MD5 com salt manual** — descartado por não ser um algoritmo
  adaptativo (não tem fator de custo ajustável), tornando-o inadequado para
  hashing de senha independentemente de salt, conforme RNF-001.1 exige
  explicitamente um algoritmo "adequado para senhas".
- **`bcrypt` nativo (pacote `bcrypt`)** — mesma família de algoritmo escolhida,
  descartado apenas pela dependência de compilação nativa; `bcryptjs` produz
  hashes com o mesmo formato (`$2a$`/`$2b$`) e é intercambiável se a
  performance nativa vier a ser necessária no futuro.

## Consequências

- Hash e comparação de senha centralizados em `src/common/security/senha.ts`
  (`hashSenha`, `compararSenha`), reutilizados por cadastro (US-001) e login
  (US-002).
- `bcryptjs` é mais lento que a implementação nativa em C, mas isso não é
  um problema no volume de requisições esperado nesta fase.
- Se o volume de autenticações crescer a ponto de o custo de CPU do bcrypt em
  JS puro se tornar um gargalo mensurável, migrar para `bcrypt` nativo (ou
  Argon2) é uma troca de implementação isolada nesse módulo, sem impacto no
  restante do sistema — os hashes bcrypt existentes continuam válidos.

## Status

Aceita.
