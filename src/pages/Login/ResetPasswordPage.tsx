import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { resetPasswordRequest } from '../../api/authService';
import { AuthLayout } from '../../components/AuthLayout';
import { toFriendlyError } from '../../utils/errorMessages';

const resetPasswordSchema = z
  .object({
    novaSenha: z.string().min(1, 'Informe a nova senha.'),
    confirmarNovaSenha: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((data) => data.novaSenha === data.confirmarNovaSenha, {
    message: 'As senhas não conferem.',
    path: ['confirmarNovaSenha'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setGlobalError(null);
    setSuccessMessage(null);

    if (!token) {
      setGlobalError('Token inválido ou ausente.');
      return;
    }

    try {
      await resetPasswordRequest({
        token,
        novaSenha: data.novaSenha,
        confirmarNovaSenha: data.confirmarNovaSenha,
      });

      setSuccessMessage('Senha redefinida com sucesso.');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (error) {
      setGlobalError(toFriendlyError(error, 'Não foi possível redefinir a senha.'));
    }
  };

  return (
    <AuthLayout>
      <section className="auth-card">
        <h1>Redefinir senha</h1>
        <p className="info-text">Digite sua nova senha para acessar novamente o sistema.</p>

        {globalError && <div className="global-error">{globalError}</div>}
        {successMessage && <div className="global-success">{successMessage}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label>Nova senha</label>
            <div className="password-input-wrapper">
              <input
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('novaSenha')}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPasswords((current) => !current)}
              >
                {showPasswords ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.novaSenha && <span className="error-text">{errors.novaSenha.message}</span>}
          </div>

          <div className="form-group">
            <label>Confirmar nova senha</label>
            <div className="password-input-wrapper">
              <input
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('confirmarNovaSenha')}
              />
            </div>
            {errors.confirmarNovaSenha && (
              <span className="error-text">{errors.confirmarNovaSenha.message}</span>
            )}
          </div>

          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        <p>
          <Link to="/login">Voltar para login</Link>
        </p>
      </section>
    </AuthLayout>
  );
}
