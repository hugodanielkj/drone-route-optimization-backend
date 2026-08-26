import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../common/errors/app-error';
import { env } from '../../config/env';
import { usuarioService } from '../usuario/usuario.service';
import { authService } from './auth.service';

describe('authService.login', () => {
  // Caso 10 do plano de testes: mesma mensagem de erro nos dois cenários.
  it('rejeita nome inexistente e senha incorreta com a mesma mensagem', async () => {
    await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    let erroNomeInexistente: unknown;
    try {
      await authService.login({ nome: 'inexistente', senha: 'qualquerSenha123' });
    } catch (error) {
      erroNomeInexistente = error;
    }

    let erroSenhaErrada: unknown;
    try {
      await authService.login({ nome: 'hugo', senha: 'senhaErrada123' });
    } catch (error) {
      erroSenhaErrada = error;
    }

    expect(erroNomeInexistente).toBeInstanceOf(UnauthorizedError);
    expect(erroSenhaErrada).toBeInstanceOf(UnauthorizedError);
    expect((erroNomeInexistente as Error).message).toBe((erroSenhaErrada as Error).message);
  });

  // Caso 11 do plano de testes: token contém o id do usuário e tem expiração.
  it('emite um token com o id do usuário e claim de expiração', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    const { token } = await authService.login({ nome: 'hugo', senha: 'senhaForte123' });

    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    expect(payload.sub).toBe(usuario.id);
    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
    expect(payload.exp as number).toBeGreaterThan(payload.iat as number);
  });
});
