# Plano de testes — US-002 — Login de usuário

Endpoint: `POST /auth/login`

## Caso feliz

1. **Login com credenciais corretas**
   - Entrada: usuário previamente cadastrado com `{ nome: "hugo", senha:
     "senhaForte123" }`; login com as mesmas credenciais.
   - Ação: `POST /auth/login` com `{ nome: "hugo", senha: "senhaForte123" }`.
   - Resultado esperado: status `200`; corpo contém `token` (string não
     vazia); o token, decodificado, contém o `id` do usuário autenticado.

## Casos alternativos

2. **Token emitido é utilizável imediatamente em uma rota protegida**
   - Entrada: login bem-sucedido do caso 1.
   - Ação: usar o `token` retornado no header `Authorization: Bearer <token>`
     de uma requisição a uma rota protegida de teste.
   - Resultado esperado: requisição autenticada com sucesso (validado em
     conjunto com US-003; aqui apenas confirma que o formato do token é o
     esperado pelo middleware).

## Casos de borda

3. **Nome com capitalização diferente da cadastrada**
   - Entrada: usuário cadastrado como `"hugo"`; login tentado com `"Hugo"`.
   - Ação: `POST /auth/login` com `{ nome: "Hugo", senha: "senhaForte123" }`.
   - Resultado esperado: `401` — nome é case-sensitive (mesma decisão de
     US-001), `"Hugo"` não é o mesmo usuário que `"hugo"`.

4. **Múltiplos logins sucessivos do mesmo usuário**
   - Entrada: mesmo usuário fazendo login duas vezes seguidas.
   - Ação: dois `POST /auth/login` sequenciais com as mesmas credenciais.
   - Resultado esperado: ambos retornam `200`; nada impede múltiplos tokens
     válidos simultâneos (não há invalidação de sessão anterior — decisão de
     escopo, token stateless).

## Casos de erro / exceção

5. **Nome não cadastrado**
   - Entrada: `{ nome: "inexistente", senha: "qualquerSenha123" }`.
   - Ação: `POST /auth/login`.
   - Resultado esperado: `401` com mensagem genérica (ex: "credenciais
     inválidas"), sem revelar se o problema foi o nome ou a senha.

6. **Nome cadastrado, senha incorreta**
   - Entrada: usuário `"hugo"` cadastrado com senha `"senhaForte123"`; login
     com `{ nome: "hugo", senha: "senhaErrada123" }`.
   - Ação: `POST /auth/login`.
   - Resultado esperado: `401` com a **mesma mensagem genérica** do caso 5
     (evita enumeração de usuários por diferença de resposta).

7. **Payload sem campo `nome`**
   - Entrada: `{ senha: "senhaForte123" }`.
   - Ação: `POST /auth/login`.
   - Resultado esperado: `400`, falha de validação de DTO, antes de qualquer
     consulta ao banco.

8. **Payload sem campo `senha`**
   - Entrada: `{ nome: "hugo" }`.
   - Ação: `POST /auth/login`.
   - Resultado esperado: `400`, falha de validação de DTO.

9. **Tipos inválidos**
   - Entrada: `{ nome: 123, senha: true }`.
   - Ação: `POST /auth/login`.
   - Resultado esperado: `400`, falha de validação de DTO.

## Verificação transversal (unitário, nível de service)

10. **Mensagens de erro idênticas entre "nome inexistente" e "senha errada"**
    - Entrada: chamar `authService.login()` diretamente para os dois cenários
      (nome inexistente; nome existente com senha errada).
    - Resultado esperado: mesma instância/mensagem de erro (`UnauthorizedError`
      com o mesmo texto) nos dois casos — garante na origem que não há
      vazamento de informação, independente da camada HTTP.

11. **Token contém o id do usuário e expira conforme configurado**
    - Entrada: chamar `authService.login()` com credenciais válidas.
    - Resultado esperado: `jwt.verify(token, JWT_SECRET)` decodifica sem erro
      e o payload contém `sub` (ou `userId`) igual ao `id` do usuário; o
      claim `exp` está presente e é maior que `iat`.
