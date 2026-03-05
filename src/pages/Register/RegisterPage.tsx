import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../auth/useAuth';
import { registerImobiliariaRequest } from '../../api/authService';
import { AuthLayout } from '../../components/AuthLayout';
import { toFriendlyError } from '../../utils/errorMessages';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatBrazilianPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  const ddd = digits.slice(0, 2);
  const remaining = digits.slice(2);

  if (remaining.length <= 4) {
    return `(${ddd}) ${remaining}`;
  }

  if (remaining.length <= 8) {
    return `(${ddd}) ${remaining.slice(0, 4)}-${remaining.slice(4)}`;
  }

  return `(${ddd}) ${remaining.slice(0, 5)}-${remaining.slice(5)}`;
};

const formatCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const registerSchema = z
  .object({
    imobiliariaNome: z.string().min(1, 'Informe o nome da imobiliária'),
    imobiliariaTelefone: z
      .string()
      .min(1, 'Telefone é obrigatório')
      .refine((value) => {
        const length = onlyDigits(value).length;
        return length === 10 || length === 11;
      }, 'Informe um telefone com DDD válido'),
    imobiliariaEmail: z.string().email('Email inválido').optional().or(z.literal('')),
    imobiliariaCnpj: z
      .string()
      .optional()
      .refine((value) => !value || onlyDigits(value).length === 14, 'CNPJ deve conter 14 dígitos'),
    adminNome: z.string().min(1, 'Informe o nome do administrador'),
    adminTelefone: z
      .string()
      .min(1, 'Telefone é obrigatório')
      .refine((value) => {
        const length = onlyDigits(value).length;
        return length === 10 || length === 11;
      }, 'Informe um telefone com DDD válido'),
    adminEmail: z.string().email('Informe um email válido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas devem ser iguais',
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      const response = await registerImobiliariaRequest({
        imobiliaria: {
          nome: data.imobiliariaNome,
          telefone: onlyDigits(data.imobiliariaTelefone),
          email: data.imobiliariaEmail || undefined,
          cnpj: data.imobiliariaCnpj ? onlyDigits(data.imobiliariaCnpj) : undefined,
        },
        admin: {
          nome: data.adminNome,
          telefone: onlyDigits(data.adminTelefone),
          email: data.adminEmail,
          password: data.password,
        },
      });

      if (response.token && response.user) {
        login(response.token, response.user);
        navigate('/app', { replace: true });
        return;
      }

      setSuccessMessage('Imobiliária cadastrada com sucesso! Redirecionando para login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (error) {
      setGlobalError(toFriendlyError(error, 'Não foi possível cadastrar a imobiliária.'));
    }
  };

  return (
    <AuthLayout>
      <section className="auth-card">
        <h1>Cadastrar imobiliária</h1>
        {successMessage && <div className="info-text">{successMessage}</div>}
        {globalError && <div className="global-error">{globalError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <h3>Dados da imobiliária</h3>
          <div className="form-group">
            <label>Nome</label>
            <input type="text" {...register('imobiliariaNome')} />
            {errors.imobiliariaNome && <span className="error-text">{errors.imobiliariaNome.message}</span>}
          </div>
          <div className="form-group">
            <label>Telefone</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={15}
              placeholder="(11) 99999-9999"
              {...register('imobiliariaTelefone', {
                onChange: (event) => {
                  event.target.value = formatBrazilianPhone(event.target.value);
                },
              })}
            />
            {errors.imobiliariaTelefone && (
              <span className="error-text">{errors.imobiliariaTelefone.message}</span>
            )}
          </div>
          <div className="form-group">
            <label>Email (opcional)</label>
            <input type="email" {...register('imobiliariaEmail')} />
            {errors.imobiliariaEmail && <span className="error-text">{errors.imobiliariaEmail.message}</span>}
          </div>
          <div className="form-group">
            <label>CNPJ (opcional)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={18}
              placeholder="00.000.000/0000-00"
              {...register('imobiliariaCnpj', {
                onChange: (event) => {
                  event.target.value = formatCnpj(event.target.value);
                },
              })}
            />
            {errors.imobiliariaCnpj && <span className="error-text">{errors.imobiliariaCnpj.message}</span>}
          </div>

          <h3>Dados do admin</h3>
          <div className="form-group">
            <label>Nome</label>
            <input type="text" {...register('adminNome')} />
            {errors.adminNome && <span className="error-text">{errors.adminNome.message}</span>}
          </div>
          <div className="form-group">
            <label>Telefone</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={15}
              placeholder="(11) 99999-9999"
              {...register('adminTelefone', {
                onChange: (event) => {
                  event.target.value = formatBrazilianPhone(event.target.value);
                },
              })}
            />
            {errors.adminTelefone && <span className="error-text">{errors.adminTelefone.message}</span>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" {...register('adminEmail')} />
            {errors.adminEmail && <span className="error-text">{errors.adminEmail.message}</span>}
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" {...register('password')} />
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>
          <div className="form-group">
            <label>Confirmar senha</label>
            <input type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword.message}</span>}
          </div>

          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p>
          Já possui conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </AuthLayout>
  );
}
