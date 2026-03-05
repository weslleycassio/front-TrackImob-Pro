import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginRequest } from '../../api/authService';
import { useAuth } from '../../auth/useAuth';
import { AuthLayout } from '../../components/AuthLayout';
import { toFriendlyError } from '../../utils/errorMessages';

const loginSchema = z.object({
  email: z.string().email('Informe um email válido'),
  password: z.string().min(1, 'Informe sua senha'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
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
      const response = await loginRequest(data);
      login(response.token, response.user);
      navigate('/app', { replace: true });
    } catch (error) {
      setGlobalError(toFriendlyError(error, 'Não foi possível realizar login.'));
    }
  };

  return (
    <AuthLayout>
      <section className="auth-card">
        <h1>Entrar</h1>
        {globalError && <div className="global-error">{globalError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label>Email</label>
            <input type="email" autoComplete="email" {...register('email')} />
            {errors.email && <span className="error-text">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>

          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p>
          Primeira vez aqui? <Link to="/register">Cadastre sua imobiliária</Link>
        </p>
      </section>
    </AuthLayout>
  );
}
