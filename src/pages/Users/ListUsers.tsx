import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { getUsersRequest, updateUserRequest } from '../../api/usersService';
import type { UpdateUserRequest, User, UserRole } from '../../api/types';

import { useAuth } from '../../auth/useAuth';

const roleLabel: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  CORRETOR: 'Corretor',
};

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

type EditFormData = {
  role: UserRole;
  telefone: string;
  ativo: boolean;

};

export function ListUsers() {
  const { user } = useAuth();
  const location = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [error, setError] = useState<string | null>(
    location.state && (location.state as { forbidden?: boolean }).forbidden
      ? 'Sem permissão (403)'
      : null,
  );
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    role: 'CORRETOR',
    telefone: '',
    ativo: true,
  });

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

  useEffect(() => {
    loadUsers();
  }, []);

  const openEditModal = (selectedUser: User) => {
    setSuccessMessage(null);
    setEditError(null);
    setEditingUser(selectedUser);
    setEditForm({
      role: selectedUser.role,
      telefone: formatPhone(selectedUser.telefone ?? ''),
      ativo: selectedUser.ativo ?? true,
    });
  };

  const closeEditModal = () => {
    if (isSaving) {
      return;
    }

    setEditingUser(null);
    setEditError(null);
  };

  const onSaveEdit = async () => {
    if (!editingUser) {
      return;
    }

    setEditError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    const payload: UpdateUserRequest = {
      role: editForm.role,
      telefone: onlyDigits(editForm.telefone),
      ativo: editForm.ativo,
    };

    try {
      await updateUserRequest(String(editingUser.id), payload);
      setSuccessMessage('Usuário atualizado com sucesso');
      setEditingUser(null);
      await loadUsers();
    } catch {
      setEditError('Erro ao atualizar usuário');
    } finally {
      setIsSaving(false);
    }
  };

  const showActions = user?.role === 'ADMIN';

  return (
    <section className="card">
      <div className="row">
        <h1>Usuários</h1>
        {showActions && (
          <Link className="link-button" to="/app/usuarios/cadastrar">
            Cadastrar usuário
          </Link>
        )}
      </div>

      {successMessage && <div className="global-success">{successMessage}</div>}

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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{item.email}</td>
                <td>{item.telefone}</td>
                <td>{roleLabel[item.role] ?? item.role}</td>
                <td className="users-actions-cell">
                  {showActions ? (
                    <button type="button" className="secondary action-button" onClick={() => openEditModal(item)}>
                      Editar
                    </button>
                  ) : (
                    '-'
                  )}
                  <span
                    className={`status-dot ${item.ativo ? 'status-dot-active' : 'status-dot-inactive'}`}
                    aria-label={item.ativo ? 'Usuário ativo' : 'Usuário inativo'}
                    title={item.ativo ? 'Usuário ativo' : 'Usuário inativo'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
            <h2 id="edit-user-title">Editar usuário</h2>
            <p className="info-text">{editingUser.nome}</p>

            {editError && <div className="global-error">{editError}</div>}

            <div className="form-group">
              <label htmlFor="edit-role">Função</label>
              <select
                id="edit-role"
                value={editForm.role}
                onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value as UserRole }))}
              >
                <option value="ADMIN">Administrador</option>
                <option value="CORRETOR">Corretor</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-telefone">Telefone</label>
              <input
                id="edit-telefone"
                type="text"
                inputMode="numeric"
                maxLength={15}
                placeholder="(11) 99999-9999"
                value={editForm.telefone}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    telefone: formatPhone(event.target.value),
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-ativo">Status</label>
              <select
                id="edit-ativo"
                value={String(editForm.ativo)}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    ativo: event.target.value === 'true',
                  }))
                }
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <div className="row">
              <button type="button" className="secondary" onClick={closeEditModal} disabled={isSaving}>
                Cancelar
              </button>
              <button type="button" className="primary modal-save-button" onClick={onSaveEdit} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
