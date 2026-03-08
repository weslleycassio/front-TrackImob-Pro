import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { forgotPasswordRequest } from '../../api/authService';
import { AuthLayout } from '../../components/AuthLayout';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu email.')
    .email('Email inválido.'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      await forgotPasswordRequest(data);
      setSuccessMessage(
        'Se o email estiver cadastrado, enviaremos as instruções para redefinição de senha.',
      );
    } catch {
      setGlobalError('Não foi possível enviar as instruções. Tente novamente.');
    }
  };

  return (
    <AuthLayout>
      <section className="auth-card">
        <h1>Esqueci minha senha</h1>
        <p className="info-text">
          Informe seu email para receber as instruções de redefinição de senha.
        </p>

        {globalError && <div className="global-error">{globalError}</div>}
        {successMessage && <div className="global-success">{successMessage}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label>Email</label>
            <input type="email" autoComplete="email" {...register('email')} />
            {errors.email && <span className="error-text">{errors.email.message}</span>}
          </div>

          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar instruções'}
          </button>
        </form>

        <p>
          <Link to="/login">Voltar para login</Link>
        </p>
      </section>
    </AuthLayout>
  );
}
