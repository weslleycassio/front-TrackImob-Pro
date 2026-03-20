import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { createUserRequest } from '../../api/usersService';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';

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
  email: z.string().email('Informe um email valido'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres'),
  role: z.enum(['ADMIN', 'CORRETOR']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function CreateUser() {
  const navigate = useNavigate();
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
      setSuccessMessage('Usuario cadastrado com sucesso.');
      window.setTimeout(() => {
        navigate('/app/usuarios', { replace: true });
      }, 900);
    } catch (error) {
      const errorResponse = error as AxiosError;
      if (errorResponse.response?.status === 403) {
        setGlobalError('Sem permissao para cadastrar usuarios.');
        navigate('/app/usuarios', { replace: true, state: { forbidden: true } });
        return;
      }

      setGlobalError('Erro ao cadastrar usuario.');
    }
  };

  return (
    <main className="content-page">
      <PageHeader
        title="Cadastrar usuario"
        subtitle="Adicione novos membros da equipe com papel definido e dados padronizados."
      />

      <section className="create-user-layout">
        <Card
          className="create-user-card"
          title="Dados do colaborador"
          subtitle="Mantenha as informacoes da equipe organizadas desde o primeiro acesso."
        >
          {globalError ? <div className="global-error">{globalError}</div> : null}
          {successMessage ? <div className="global-success">{successMessage}</div> : null}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="saas-form-grid">
            <Input id="nome" label="Nome" error={errors.nome?.message} {...register('nome')} />
            <Input
              id="telefone"
              label="Telefone"
              inputMode="numeric"
              maxLength={15}
              placeholder="(11) 99999-9999"
              error={errors.telefone?.message}
              {...register('telefone', {
                onChange: (event) => {
                  event.target.value = formatPhone(event.target.value);
                },
              })}
            />
            <Input id="email" label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Input id="password" label="Senha" type="password" error={errors.password?.message} {...register('password')} />
            <Select id="role" label="Perfil" error={errors.role?.message} {...register('role')}>
              <option value="CORRETOR">Corretor</option>
              <option value="ADMIN">Administrador</option>
            </Select>

            <div className="saas-form-actions">
              <Button variant="secondary" onClick={() => navigate('/app/usuarios')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar usuario'}
              </Button>
            </div>
          </form>
        </Card>

        <Card
          className="saas-accent-card"
          title="Boas praticas"
          subtitle="Crie acessos com clareza e reduza retrabalho na operacao."
        >
          <ul className="dashboard-checklist">
            <li>
              <strong>Padronize perfis</strong>
              <span>Use administrador para gestao e corretor para operacao comercial.</span>
            </li>
            <li>
              <strong>Valide contatos</strong>
              <span>Telefone e email corretos agilizam comunicacao e recuperacao de acesso.</span>
            </li>
            <li>
              <strong>Evolua com controle</strong>
              <span>Mantenha a equipe atualizada conforme a estrutura da imobiliaria cresce.</span>
            </li>
          </ul>
        </Card>
      </section>
    </main>
  );
}
