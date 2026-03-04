import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginRequest } from '../../api/authService';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../auth/useAuth';
import { toFriendlyError } from '../../utils/errorMessages';

const loginSchema = z.object({
  email: z.string().email('Informe um email válido'),
  senha: z.string().min(1, 'Informe sua senha'),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginPageProps = {
  infoMessage?: string;
};

export function LoginPage({ infoMessage }: LoginPageProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setGlobalError(null);

    try {
      const response = await loginRequest({
        email: data.email,
        password: data.senha,
      });
      const token = response.token ?? response.accessToken;

      if (!token) {
        setGlobalError('A resposta de login não trouxe token de autenticação.');
        return;
      }

      login(token);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setGlobalError(toFriendlyError(error, 'Não foi possível realizar login.'));
    }
  };

  return (
    <AuthLayout>
      <section className="auth-card">
        <h1>Entrar</h1>
        <p>Use seu email e senha para acessar.</p>

        {infoMessage && <div className="info-text">{infoMessage}</div>}
        {globalError && <div className="global-error">{globalError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <span className="error-text">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" autoComplete="current-password" {...register('senha')} />
            {errors.senha && <span className="error-text">{errors.senha.message}</span>}
          </div>

          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p>
          Ainda não tem conta? <Link to="/register">Criar conta</Link>
        </p>
      </section>
    </AuthLayout>
  );
}
