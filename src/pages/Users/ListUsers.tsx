import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUsersRequest } from '../../api/usersService';
import type { Usuario } from '../../api/usersService';
import type { UserRole } from '../../api/types';
import { useAuth } from '../../auth/useAuth';

const roleLabel: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  CORRETOR: 'Corretor',
};

const statusLabel: Record<string, string> = {
  true: 'Ativo',
  false: 'Inativo',
};

export function ListUsers() {
  const { user } = useAuth();
  const location = useLocation();
  const [users, setUsers] = useState<Usuario[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [error, setError] = useState<string | null>(
    location.state && (location.state as { forbidden?: boolean }).forbidden
      ? 'Sem permissão (403)'
      : null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getUsersRequest();
        setUsers(response.data);
        setTotalUsers(response.total);
      } catch (err) {
        const errorResponse = err as AxiosError;
        if (errorResponse.response?.status === 403) {
          setError('Sem permissão (403)');
        } else {
          setError('Erro ao carregar usuários.');
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
        <h1>Usuários</h1>
        {user?.role === 'ADMIN' && (
          <Link className="link-button" to="/app/usuarios/cadastrar">
            Cadastrar usuário
          </Link>
        )}
      </div>

      {!loading && !error && <p>Total de usuários: {totalUsers}</p>}

      {error && <div className="global-error">{error}</div>}

      {loading && <p>Carregando usuários...</p>}

      {!loading && !error && users.length === 0 && <p>Nenhum usuário encontrado.</p>}

      {!loading && !error && users.length > 0 && (
        <div className="users-table-wrapper">
          <table className="users-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Função</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{item.email}</td>
                <td>{item.telefone}</td>
                <td>{roleLabel[item.role] ?? item.role}</td>
                <td>
                  <span className={`status-badge ${item.ativo ? 'status-badge-active' : 'status-badge-inactive'}`}>
                    {statusLabel[String(item.ativo)]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
