import { compararSenha } from '../../common/security/senha';
import { ConflictError } from '../../common/errors/app-error';
import { prisma } from '../../config/prisma';
import { usuarioService } from './usuario.service';

describe('usuarioService.cadastrar', () => {
  // Caso 12 do plano de testes (US-001): hash nunca é a senha em texto plano.
  it('persiste a senha como hash bcrypt, nunca em texto plano', async () => {
    const usuario = await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    const persistido = await prisma.user.findUniqueOrThrow({ where: { id: usuario.id } });

    expect(persistido.senhaHash).not.toBe('senhaForte123');
    expect(persistido.senhaHash).toMatch(/^\$2[aby]\$/);
    await expect(compararSenha('senhaForte123', persistido.senhaHash)).resolves.toBe(true);
  });

  // Caso 7 do plano de testes: nome já cadastrado é rejeitado.
  it('rejeita cadastro com nome já existente', async () => {
    await usuarioService.cadastrar({ nome: 'hugo', senha: 'senhaForte123' });

    await expect(usuarioService.cadastrar({ nome: 'hugo', senha: 'outraSenha123' })).rejects.toThrow(
      ConflictError,
    );

    const usuarios = await prisma.user.findMany({ where: { nome: 'hugo' } });
    expect(usuarios).toHaveLength(1);
  });

  // Caso 6 do plano de testes: corrida entre dois cadastros com o mesmo nome.
  it('sob concorrência, apenas um cadastro com o mesmo nome é bem-sucedido', async () => {
    const resultados = await Promise.allSettled([
      usuarioService.cadastrar({ nome: 'concorrente', senha: 'senhaForte123' }),
      usuarioService.cadastrar({ nome: 'concorrente', senha: 'senhaForte123' }),
    ]);

    const sucesso = resultados.filter((r) => r.status === 'fulfilled');
    const falha = resultados.filter((r) => r.status === 'rejected');

    expect(sucesso).toHaveLength(1);
    expect(falha).toHaveLength(1);
    expect((falha[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
  });
});
