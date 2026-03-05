import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUsersRequest } from '../../api/usersService';
import type { User } from '../../api/types';
import { useAuth } from '../../auth/useAuth';

export function ListUsers() {
  const { user } = useAuth();
  const location = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(
    location.state && (location.state as { forbidden?: boolean }).forbidden
      ? 'Sem permissão (403)'
      : null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const data = await getUsersRequest();
        setUsers(data);
      } catch (err) {
        const errorResponse = err as AxiosError;
        if (errorResponse.response?.status === 403) {
          setError('Sem permissão (403)');
        } else {
          setError('Erro ao carregar usuários');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  return (
    <section className="card">
      <div className="row">
        <h1>Consultar usuários</h1>
        {user?.role === 'ADMIN' && (
          <Link className="link-button" to="/app/usuarios/novo">
            Cadastrar usuário
          </Link>
        )}
      </div>

      {error && <div className="global-error">{error}</div>}

      {loading && <p>Carregando...</p>}

      {!loading && !error && users.length === 0 && <p>Nenhum usuário encontrado.</p>}

      {!loading && users.length > 0 && (
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
    </section>
  );
}
