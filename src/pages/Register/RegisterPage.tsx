import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { registerRequest } from '../../api/authService';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../auth/useAuth';
import { toFriendlyError } from '../../utils/errorMessages';
import type { UserRole } from '../../api/types';

const roles: UserRole[] = ['ADMIN', 'CORD', 'CORRETOR', 'USER'];

const registerSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  email: z.string().email('Informe um email válido'),
  senha: z.string().min(1, 'Informe a senha'),
  telefone: z.string().optional(),
  role: z.enum(['ADMIN', 'CORD', 'CORRETOR', 'USER']),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'USER',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setGlobalError(null);

    try {
      const response = await registerRequest({
        nome: data.nome,
        email: data.email,
        password: data.senha,
        telefone: data.telefone,
        role: data.role,
      });
      const token = response.token ?? response.accessToken;

      if (token) {
        login(token);
        navigate('/dashboard', { replace: true });
        return;
      }

      navigate('/login', {
        replace: true,
        state: { message: 'Conta criada com sucesso. Faça login para continuar.' },
      });
    } catch (error) {
      setGlobalError(toFriendlyError(error, 'Não foi possível criar a conta.'));
    }
  };

  return (
    <AuthLayout>
      <section className="auth-card">
        <h1>Criar conta</h1>
        <p>Preencha os dados para se cadastrar.</p>

        {globalError && <div className="global-error">{globalError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label htmlFor="nome">Nome</label>
            <input id="nome" type="text" {...register('nome')} />
            {errors.nome && <span className="error-text">{errors.nome.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <span className="error-text">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" autoComplete="new-password" {...register('senha')} />
            {errors.senha && <span className="error-text">{errors.senha.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="telefone">Telefone (opcional)</label>
            <input id="telefone" type="text" {...register('telefone')} />
          </div>

          <div className="form-group">
            <label htmlFor="role">Perfil</label>
            <select id="role" {...register('role')}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && <span className="error-text">{errors.role.message}</span>}
          </div>

          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </AuthLayout>
  );
}
