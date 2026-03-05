import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createUserRequest, getUsersRequest } from '../../api/usersService';
import type { User } from '../../api/types';
import { useAuth } from '../../auth/useAuth';

const createUserSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  telefone: z.string().min(1, 'Informe o telefone'),
  email: z.string().email('Informe um email válido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'CORRETOR']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'CORRETOR' },
  });

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsersRequest();
      setUsers(data);
    } catch (err) {
      const errorResponse = err as AxiosError;
      if (errorResponse.response?.status === 403) {
        setError('Sem permissão');
      } else {
        setError('Erro ao carregar usuários');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onSubmit = async (data: CreateUserFormData) => {
    setError(null);
    try {
      await createUserRequest(data);
      setIsModalOpen(false);
      reset();
      await loadUsers();
    } catch (err) {
      const errorResponse = err as AxiosError;
      if (errorResponse.response?.status === 403) {
        setError('Sem permissão');
      } else {
        setError('Erro ao cadastrar usuário');
      }
    }
  };

  return (
    <section className="card">
      <div className="row">
        <h1>Usuários</h1>
        {isAdmin && (
          <button type="button" className="secondary" onClick={() => setIsModalOpen(true)}>
            Novo Usuário
          </button>
        )}
      </div>

      {error && <div className="global-error">{error}</div>}
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{item.telefone}</td>
                <td>{item.email}</td>
                <td>{item.role}</td>
                <td>{item.status ?? '-'}</td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Novo usuário</h2>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group">
                <label>Nome</label>
                <input type="text" {...register('nome')} />
                {errors.nome && <span className="error-text">{errors.nome.message}</span>}
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input type="text" {...register('telefone')} />
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
              <div className="row">
                <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
