import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUsersRequest, updateUserRequest } from '../../api/usersService';
import type { UpdateUserRequest, User, UserRole } from '../../api/types';
import { useAuth } from '../../auth/useAuth';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, TableContainer } from '../../components/ui/Table';
import { Toast } from '../../components/ui/Toast';
import { APP_NAME } from '../../config/app';

const roleLabel: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super administrador',
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
    location.state && (location.state as { forbidden?: boolean; forbiddenMessage?: string }).forbidden
      ? (location.state as { forbiddenMessage?: string }).forbiddenMessage ?? 'Sem permissao para acessar usuarios.'
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
        setError('Sem permissao para acessar usuarios.');
      } else {
        setError('Erro ao carregar usuarios.');
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
      setSuccessMessage('Usuario atualizado com sucesso.');
      setEditingUser(null);
      await loadUsers();
    } catch {
      setEditError('Erro ao atualizar usuario.');
    } finally {
      setIsSaving(false);
    }
  };

  const showActions = user?.role === 'ADMIN';

  return (
    <main className="content-page">
      <PageHeader
        title="Usuarios"
        subtitle="Controle equipe, papeis e disponibilidade com uma visao mais organizada."
        actions={
          showActions ? (
            <Link to="/app/usuarios/cadastrar">
              <Button>Cadastrar usuario</Button>
            </Link>
          ) : null
        }
      />

      {successMessage ? (
        <div className="toast-stack">
          <Toast title="Equipe atualizada" description={successMessage} variant="success" onClose={() => setSuccessMessage(null)} />
        </div>
      ) : null}

      <Card
        title="Equipe cadastrada"
        subtitle={!loading && !error ? `${totalUsers} usuario(s) encontrados.` : 'Visualize e mantenha os acessos atualizados.'}
      >
        {error ? <div className="global-error">{error}</div> : null}

        {loading ? (
          <div className="table-skeleton">
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        ) : null}

        {!loading && !error && users.length === 0 ? (
          <EmptyState
            title="Nenhum usuario encontrado"
            description={`Cadastre a equipe para distribuir a operação comercial dentro do ${APP_NAME}.`}
            action={
              showActions ? (
                <Link to="/app/usuarios/cadastrar">
                  <Button size="sm">Novo usuario</Button>
                </Link>
              ) : null
            }
          />
        ) : null}

        {!loading && !error && users.length > 0 ? (
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Funcao</th>
                  <th>Status</th>
                  <th>Acoes</th>
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
                      <Badge variant={item.ativo ? 'success' : 'danger'}>{item.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="users-actions-cell">
                      {showActions ? (
                        <Button variant="secondary" size="sm" onClick={() => openEditModal(item)}>
                          Editar
                        </Button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        ) : null}
      </Card>

      {editingUser ? (
        <Modal
          title="Editar usuario"
          subtitle={editingUser.nome}
          onClose={closeEditModal}
          actions={
            <>
              <Button variant="secondary" onClick={closeEditModal} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={onSaveEdit} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          }
        >
          {editError ? <div className="global-error">{editError}</div> : null}

          <div className="modal-form-grid">
            <Select
              id="edit-role"
              label="Funcao"
              value={editForm.role}
              onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value as UserRole }))}
            >
              <option value="ADMIN">Administrador</option>
              <option value="CORRETOR">Corretor</option>
            </Select>

            <Input
              id="edit-telefone"
              label="Telefone"
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

            <Select
              id="edit-ativo"
              label="Status"
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
            </Select>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
