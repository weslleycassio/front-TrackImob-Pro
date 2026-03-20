import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginRequest } from '../../api/authService';
import { useAuth } from '../../auth/useAuth';
import { AuthLayout } from '../../components/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { APP_NAME } from '../../config/app';
import { toFriendlyError } from '../../utils/errorMessages';

const loginSchema = z.object({
  email: z.string().email('Informe um email valido'),
  password: z.string().min(1, 'Informe sua senha'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      setGlobalError(toFriendlyError(error, `Nao foi possivel entrar no ${APP_NAME}.`));
    }
  };

  return (
    <AuthLayout>
      <Card
        className="auth-card auth-card--compact"
        title="Entrar"
        subtitle={`Acesse o ${APP_NAME} com segurança e acompanhe sua operação imobiliária em tempo real.`}
      >
        {globalError ? <div className="global-error">{globalError}</div> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
          <Input id="login-email" label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <div className="ui-field">
            <label className="ui-label" htmlFor="login-password">
              Senha
            </label>
            <div className="password-input-wrapper password-input-wrapper--compact">
              <input
                id="login-password"
                className="ui-control"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                className="password-toggle-btn password-toggle-btn--icon"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {errors.password?.message ? <span className="ui-field__error">{errors.password.message}</span> : null}
          </div>

          <div className="auth-secondary-action">
            <Link to="/esqueci-senha">Esqueci minha senha</Link>
          </div>

          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="auth-helper-text">
          Primeira vez no {APP_NAME}? <Link to="/register">Cadastre sua imobiliária</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
