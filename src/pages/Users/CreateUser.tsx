import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { createUserRequest } from '../../api/usersService';
import { useAuth } from '../../auth/useAuth';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatPhone = (value: string) => {
  const numbers = onlyDigits(value).slice(0, 11);

  if (numbers.length <= 2) {
    return numbers;
  }

  if (numbers.length <= 10) {
    return numbers.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 14);
  }

  return numbers.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
};

const createUserSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  telefone: z.string().min(1, 'Informe o telefone'),
  email: z.string().email('Informe um email válido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'CORRETOR']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function CreateUser() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'CORRETOR' },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      await createUserRequest({
        ...data,
        telefone: onlyDigits(data.telefone),
      });
      setSuccessMessage('Usuário cadastrado com sucesso!');
      setTimeout(() => {
        navigate('/app/usuarios', { replace: true });
      }, 700);
    } catch (error) {
      const errorResponse = error as AxiosError;
      if (errorResponse.response?.status === 403) {
        setGlobalError('Sem permissão (403)');
        navigate('/app/usuarios', { replace: true, state: { forbidden: true } });
        return;
      }

      setGlobalError('Erro ao cadastrar usuário');
    }
  };

  return (
    <section className="create-user-layout">
      <div className="card create-user-card">
        <h1>Cadastrar usuário</h1>

        {globalError && <div className="global-error">{globalError}</div>}
        {successMessage && <div className="global-success">{successMessage}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label>Nome</label>
            <input type="text" {...register('nome')} />
            {errors.nome && <span className="error-text">{errors.nome.message}</span>}
          </div>

          <div className="form-group">
            <label>Telefone</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={15}
              placeholder="(11) 99999-9999"
              {...register('telefone', {
                onChange: (event) => {
                  event.target.value = formatPhone(event.target.value);
                },
              })}
            />
            {errors.telefone && <span className="error-text">{errors.telefone.message}</span>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" {...register('email')} />
            {errors.email && <span className="error-text">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input type="password" {...register('password')} />
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>

          <div className="form-group">
            <label>Perfil</label>
            <select {...register('role')}>
              <option value="CORRETOR">CORRETOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      <aside className="create-user-brand-panel" aria-hidden="true">
        <p className="create-user-brand-subtitle">Imobiliária logada</p>
        <h2>{user?.imobiliariaNome ?? 'TrackImob Pro'}</h2>
      </aside>
    </section>
  );
}
