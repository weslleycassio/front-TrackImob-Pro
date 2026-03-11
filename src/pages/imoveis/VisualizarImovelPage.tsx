import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import type { User } from '../../api/types';
import { getUsersRequest } from '../../api/usersService';
import { useAuth } from '../../auth/useAuth';
import { InativarImovelModal } from '../../components/imoveis/InativarImovelModal';
import { ImovelCarousel } from '../../components/imoveis/ImovelCarousel';
import {
  getImovelById,
  inativarImovel,
  type Imovel,
  type InativarImovelPayload,
} from '../../services/imoveisService';
import { toFriendlyError } from '../../utils/errorMessages';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function VisualizarImovelPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInactivationModalOpen, setIsInactivationModalOpen] = useState(false);
  const [isInactivating, setIsInactivating] = useState(false);
  const [inactivationError, setInactivationError] = useState<string | null>(null);
  const [usuariosFechamento, setUsuariosFechamento] = useState<User[]>([]);
  const [isLoadingUsuariosFechamento, setIsLoadingUsuariosFechamento] = useState(false);
  const [usuariosFechamentoError, setUsuariosFechamentoError] = useState<string | null>(null);

  const isInativo = String(imovel?.status).toUpperCase() === 'INATIVO';
  const precoFormatado =
    typeof imovel?.preco === 'number' && Number.isFinite(imovel.preco) ? currencyFormatter.format(imovel.preco) : '-';

  const loadImovel = useCallback(async () => {
    if (!id) {
      setError('Imóvel não encontrado.');
      setImovel(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getImovelById(id);
      setImovel(response);
    } catch (apiError) {
      if (axios.isAxiosError(apiError) && apiError.response?.status === 404) {
        setError('Imóvel não encontrado.');
      } else {
        setError(toFriendlyError(apiError, 'Não foi possível carregar os dados do imóvel.'));
      }
      setImovel(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadImovel();
  }, [loadImovel]);

  const canInativarImovel = useMemo(() => {
    if (!user || !imovel) {
      return false;
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    if (imovel.responsavelId === undefined || imovel.responsavelId === null) {
      return false;
    }

    return String(imovel.responsavelId) === String(user.id);
  }, [imovel, user]);

  const loadUsuariosFechamento = useCallback(async () => {
    setIsLoadingUsuariosFechamento(true);
    setUsuariosFechamentoError(null);

    try {
      const response = await getUsersRequest();
      setUsuariosFechamento(response.data.filter((usuario) => usuario.role === 'ADMIN' || usuario.role === 'CORRETOR'));
    } catch (apiError) {
      setUsuariosFechamento([]);
      setUsuariosFechamentoError(
        toFriendlyError(apiError, 'Não foi possível carregar os usuários para o fechamento do imóvel.'),
      );
    } finally {
      setIsLoadingUsuariosFechamento(false);
    }
  }, []);

  const openInactivationModal = () => {
    if (!imovel) {
      return;
    }

    setSuccessMessage(null);
    setInactivationError(null);
    setIsInactivationModalOpen(true);

    if (!usuariosFechamento.length && !isLoadingUsuariosFechamento) {
      loadUsuariosFechamento();
    }
  };

  const closeInactivationModal = () => {
    if (isInactivating) {
      return;
    }

    setIsInactivationModalOpen(false);
    setInactivationError(null);
  };

  const handleConfirmInactivation = async (payload: InativarImovelPayload) => {
    if (!imovel) {
      return;
    }

    setSuccessMessage(null);
    setInactivationError(null);
    setIsInactivating(true);

    try {
      await inativarImovel(imovel.id, payload);
      setSuccessMessage('Imóvel inativado com sucesso.');
      setIsInactivationModalOpen(false);
      await loadImovel();
    } catch (apiError) {
      if (axios.isAxiosError(apiError) && apiError.response?.status === 403) {
        setInactivationError('Você não tem permissão para inativar este imóvel.');
      } else {
        setInactivationError(toFriendlyError(apiError, 'Não foi possível inativar o imóvel. Tente novamente.'));
      }
    } finally {
      setIsInactivating(false);
    }
  };

  if (isLoading) {
    return (
      <main className="content-page">
        <section className="card imovel-detail-card">
          <p>Carregando imóvel...</p>
        </section>
      </main>
    );
  }

  if (error || !imovel) {
    return (
      <main className="content-page">
        <section className="card imovel-detail-card">
          <div className="row page-header-row">
            <h1>Visualizar Imóvel</h1>
            <button type="button" className="secondary" onClick={() => navigate('/imoveis')}>
              Voltar para listagem
            </button>
          </div>

          <div className="global-error">{error ?? 'Imóvel não encontrado.'}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="content-page">
      <section className="card imovel-detail-card">
        <div className="row page-header-row imovel-detail-header">
          <div>
            <h1>Visualizar Imóvel</h1>
            <p className="imovel-detail-subtitle">{imovel.titulo || 'Imóvel sem título'}</p>
          </div>

          <div className="imovel-detail-actions">
            <button type="button" className="secondary" disabled title="Edição ainda não disponível">
              Editar imóvel
            </button>
            {canInativarImovel && (
              <button
                type="button"
                className="secondary danger"
                onClick={openInactivationModal}
                disabled={isInativo}
                title={isInativo ? 'Imóvel já está inativo' : undefined}
              >
                Inativar imóvel
              </button>
            )}
            <button type="button" className="secondary" onClick={() => navigate('/imoveis')}>
              Voltar para listagem
            </button>
          </div>
        </div>

        {successMessage && <div className="global-success">{successMessage}</div>}

        <div className="imovel-detail-hero">
          <div className="imovel-detail-carousel">
            <ImovelCarousel imagens={imovel.imagens ?? []} titulo={imovel.titulo || 'Imóvel'} />
          </div>

          <aside className="imovel-detail-summary">
            <span className={`imovel-detail-status ${isInativo ? 'is-inactive' : 'is-active'}`}>{imovel.status || '-'}</span>
            <h2>{imovel.titulo || 'Imóvel sem título'}</h2>
            <p className="imovel-detail-price">{precoFormatado}</p>
            <p className="imovel-detail-purpose">{imovel.finalidade || '-'}</p>
          </aside>
        </div>

        <div className="imovel-detail-grid">
          <section className="imovel-detail-section">
            <h2>Detalhes do imóvel</h2>
            <dl className="imovel-detail-list">
              <div>
                <dt>Tipo</dt>
                <dd>{imovel?.tipo || '-'}</dd>
              </div>
              <div>
                <dt>Bairro</dt>
                <dd>{imovel?.bairro || '-'}</dd>
              </div>
              <div>
                <dt>Cidade</dt>
                <dd>{imovel?.cidade || '-'}</dd>
              </div>
              <div>
                <dt>Finalidade</dt>
                <dd>{imovel?.finalidade || '-'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{imovel?.status || '-'}</dd>
              </div>
            </dl>
          </section>

          <section className="imovel-detail-section">
            <h2>Descrição</h2>
            <p className="imovel-detail-description">{imovel?.descricao || 'Sem descrição cadastrada.'}</p>
          </section>

          <section className="imovel-detail-section">
            <h2>Informações do cadastro</h2>
            <dl className="imovel-detail-list">
              <div>
                <dt>Criado em</dt>
                <dd>{imovel.createdAt ? dateFormatter.format(new Date(imovel.createdAt)) : '-'}</dd>
              </div>
              <div>
                <dt>Atualizado em</dt>
                <dd>{imovel.updatedAt ? dateFormatter.format(new Date(imovel.updatedAt)) : '-'}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>

      <InativarImovelModal
        imovel={isInactivationModalOpen ? imovel : null}
        usuariosFechamento={usuariosFechamento}
        isLoadingUsuariosFechamento={isLoadingUsuariosFechamento}
        usuariosFechamentoError={usuariosFechamentoError}
        isSubmitting={isInactivating}
        error={inactivationError}
        onCancel={closeInactivationModal}
        onConfirm={handleConfirmInactivation}
      />
    </main>
  );
}
