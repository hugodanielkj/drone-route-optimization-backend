# Plano de testes — US-001 — Cadastro de usuário

Endpoint: `POST /usuarios`

## Caso feliz

1. **Cadastro com nome e senha válidos**
   - Entrada: `{ nome: "hugo", senha: "senhaForte123" }`, nome ainda não
     cadastrado.
   - Ação: `POST /usuarios`.
   - Resultado esperado: status `201`; corpo contém `id` e `nome` do usuário
     criado; corpo **não** contém a senha nem o hash; usuário persistido no
     banco com `senhaHash` preenchido.

## Casos alternativos

2. **Nomes diferentes por capitalização não colidem indevidamente**
   - Entrada: cadastrar `"hugo"` com sucesso; depois cadastrar `"Hugo"`.
   - Ação: dois `POST /usuarios` sequenciais.
   - Resultado esperado: ambos succeed com `201` — unicidade é sensível a
     caixa (decisão: nome é comparado exatamente como enviado, sem
     normalização, pois RF-001 não define normalização).

## Casos de borda

3. **Nome com tamanho mínimo aceitável (1 caractere) e senha no limite mínimo**
   - Entrada: `{ nome: "a", senha: "12345678" }` (senha com 8 caracteres —
     limite mínimo adotado).
   - Ação: `POST /usuarios`.
   - Resultado esperado: `201` (dentro do limite definido pelo schema Zod).

4. **Senha abaixo do tamanho mínimo**
   - Entrada: `{ nome: "usuario1", senha: "1234567" }` (7 caracteres).
   - Ação: `POST /usuarios`.
   - Resultado esperado: `400`, falha de validação de DTO, nenhum usuário
     criado.

5. **Nome vazio (string vazia)**
   - Entrada: `{ nome: "", senha: "senhaForte123" }`.
   - Ação: `POST /usuarios`.
   - Resultado esperado: `400`, falha de validação de DTO.

6. **Cadastro concorrente com o mesmo nome (corrida)**
   - Entrada: duas requisições `POST /usuarios` simultâneas com
     `{ nome: "concorrente", senha: "senhaForte123" }`.
   - Ação: disparar as duas requisições em paralelo (`Promise.all`).
   - Resultado esperado: exatamente uma retorna `201`; a outra retorna `409`
     (a constraint `@unique` do banco garante isso mesmo sob concorrência,
     não apenas a checagem prévia na aplicação).

## Casos de erro / exceção

7. **Nome já cadastrado**
   - Entrada: cadastrar `{ nome: "hugo", senha: "senhaForte123" }` com
     sucesso; repetir o mesmo `nome` com senha diferente.
   - Ação: dois `POST /usuarios` sequenciais.
   - Resultado esperado: segundo retorna `409` com mensagem indicando nome já
     em uso; nenhum dado do segundo usuário é persistido; usuário original
     inalterado.

8. **Payload sem campo `nome`**
   - Entrada: `{ senha: "senhaForte123" }`.
   - Ação: `POST /usuarios`.
   - Resultado esperado: `400`, falha de validação de DTO, antes de qualquer
     lógica de negócio (nenhuma consulta ao banco).

9. **Payload sem campo `senha`**
   - Entrada: `{ nome: "hugo" }`.
   - Ação: `POST /usuarios`.
   - Resultado esperado: `400`, falha de validação de DTO.

10. **Tipos inválidos (nome numérico, senha numérica)**
    - Entrada: `{ nome: 123, senha: 456 }`.
    - Ação: `POST /usuarios`.
    - Resultado esperado: `400`, falha de validação de DTO.

11. **Campos extras não esperados no payload**
    - Entrada: `{ nome: "hugo", senha: "senhaForte123", admin: true }`.
    - Ação: `POST /usuarios`.
    - Resultado esperado: `201`; o campo `admin` é ignorado (schema Zod não
      permite escalonar privilégio via payload — RN não define roles).

## Verificação transversal (unitário, nível de service)

12. **Hash de senha nunca é a senha em texto plano**
    - Entrada: chamar `usuarioService.cadastrar({ nome, senha })`
      diretamente.
    - Resultado esperado: `senhaHash` persistido é diferente da `senha`
      original, tem prefixo compatível com bcrypt (`$2a$`/`$2b$`), e
      `bcrypt.compare(senha, senhaHash)` retorna `true`.
