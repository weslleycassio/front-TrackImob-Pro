import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { User } from '../../api/types';
import { getBrokerAndAdminUsersRequest } from '../../api/usersService';
import { useAuth } from '../../auth/useAuth';
import { ImovelMidiasExternasSheet } from '../../components/imoveis/ImovelMidiasExternasSheet';
import { InativarImovelModal } from '../../components/imoveis/InativarImovelModal';
import { ImovelCarousel } from '../../components/imoveis/ImovelCarousel';
import { Spinner } from '../../components/ui/Spinner';
import {
  ativarImovel,
  getImovelWhatsAppNotificationMessage,
  getInternalImovelById,
  inativarImovel,
  type InternalImovel,
  type InativarImovelPayload,
  motivoInativacaoImovelOptions,
} from '../../services/imoveisService';
import { toFriendlyError, toImovelActionError } from '../../utils/errorMessages';
import { canEditImovel, canManageImovel, canViewDadosCaptacaoImovel } from '../../utils/imovelPermissions';
import { canActivateImovel } from '../../utils/imovelStatus';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const hasPositiveNumber = (value?: number | null) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const motivoInativacaoLabels = new Map<string, string>(motivoInativacaoImovelOptions.map((option) => [option.value, option.label]));
const getDisplayValue = (value?: string | null) => {
  if (typeof value !== 'string') {
    return '-';
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : '-';
};

export function VisualizarImovelPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [imovel, setImovel] = useState<InternalImovel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInactivationModalOpen, setIsInactivationModalOpen] = useState(false);
  const [isMidiasExternasOpen, setIsMidiasExternasOpen] = useState(false);
  const [isInactivating, setIsInactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [inactivationError, setInactivationError] = useState<string | null>(null);
  const [usuariosFechamento, setUsuariosFechamento] = useState<User[]>([]);
  const [isLoadingUsuariosFechamento, setIsLoadingUsuariosFechamento] = useState(false);
  const [usuariosFechamentoError, setUsuariosFechamentoError] = useState<string | null>(null);

  const isInativo = String(imovel?.status).toUpperCase() === 'INATIVO';
  const precoFormatado =
    typeof imovel?.preco === 'number' && Number.isFinite(imovel.preco) ? currencyFormatter.format(imovel.preco) : '-';
  const corretorCaptadorNome = imovel?.corretorCaptador?.nome || '-';
  const canEditarImovel = useMemo(() => canEditImovel(user, imovel), [imovel, user]);
  const canInativarImovel = useMemo(() => canManageImovel(user, imovel), [imovel, user]);
  const canAtivarImovel = useMemo(() => canInativarImovel && canActivateImovel(imovel), [imovel, canInativarImovel]);
  const canVisualizarDadosCaptacao = useMemo(() => canViewDadosCaptacaoImovel(user, imovel), [imovel, user]);
  const hasMidiasExternas = useMemo(
    () =>
      [imovel?.linkExternoFotos, imovel?.linkExternoVideos].some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      ),
    [imovel?.linkExternoFotos, imovel?.linkExternoVideos],
  );
  const motivoInativacaoLabel =
    (typeof imovel?.motivoInativacao === 'string' ? motivoInativacaoLabels.get(imovel.motivoInativacao) : null) ??
    getDisplayValue(imovel?.motivoInativacao);
  const atualizadorNome = getDisplayValue(imovel?.atualizadoPorNome);
  const inativadorNome = getDisplayValue(imovel?.inativadoPorNome);
  const corretorInativacaoNome = getDisplayValue(imovel?.responsavelFechamentoNome);
  const descricaoInativacao = getDisplayValue(imovel?.descricaoInativacao);

  const loadImovel = useCallback(async () => {
    if (!id) {
      setError('Imovel nao encontrado.');
      setImovel(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getInternalImovelById(id);
      setImovel(response);
    } catch (apiError) {
      if (axios.isAxiosError(apiError) && apiError.response?.status === 404) {
        setError('Imovel nao encontrado.');
      } else {
        setError(toFriendlyError(apiError, 'Nao foi possivel carregar os dados do imovel.'));
      }
      setImovel(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadImovel();
  }, [loadImovel]);

  useEffect(() => {
    const successMessageFromNavigation = (location.state as { successMessage?: string } | null)?.successMessage;

    if (!successMessageFromNavigation) {
      return;
    }

    setSuccessMessage(successMessageFromNavigation);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const loadUsuariosFechamento = useCallback(async () => {
    setIsLoadingUsuariosFechamento(true);
    setUsuariosFechamentoError(null);

    try {
      const usuarios = await getBrokerAndAdminUsersRequest();
      setUsuariosFechamento(usuarios);
    } catch (apiError) {
      setUsuariosFechamento([]);
      setUsuariosFechamentoError(
        toFriendlyError(apiError, 'Nao foi possivel carregar os usuarios para o fechamento do imovel.'),
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

  const openMidiasExternas = () => {
    setIsMidiasExternasOpen(true);
  };

  const closeMidiasExternas = () => {
    setIsMidiasExternasOpen(false);
  };

  const handleConfirmInactivation = async (payload: InativarImovelPayload) => {
    if (!imovel) {
      return;
    }

    setSuccessMessage(null);
    setInactivationError(null);
    setIsInactivating(true);

    try {
      const inactivationResponse = await inativarImovel(imovel.id, payload);
      const whatsappNotificationMessage = getImovelWhatsAppNotificationMessage(inactivationResponse);
      setSuccessMessage(
        whatsappNotificationMessage
          ? `Imovel inativado com sucesso. ${whatsappNotificationMessage}`
          : 'Imovel inativado com sucesso.',
      );
      setIsInactivationModalOpen(false);
      await loadImovel();
    } catch (apiError) {
      setInactivationError(toImovelActionError(apiError, 'Nao foi possivel inativar o imovel. Tente novamente.'));
    } finally {
      setIsInactivating(false);
    }
  };

  const handleActivate = async () => {
    if (!imovel) {
      return;
    }

    setSuccessMessage(null);
    setInactivationError(null);
    setIsActivating(true);

    try {
      await ativarImovel(imovel.id);
      setSuccessMessage('Imovel ativado com sucesso.');
      await loadImovel();
    } catch (apiError) {
      setInactivationError(toImovelActionError(apiError, 'Nao foi possivel ativar o imovel. Tente novamente.'));
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <main className="content-page">
        <section className="card imovel-detail-card">
          <div className="loading-state-card">
            <Spinner label="Carregando as informacoes do imovel..." />
          </div>
        </section>
      </main>
    );
  }

  if (error || !imovel) {
    return (
      <main className="content-page">
        <section className="card imovel-detail-card">
          <div className="row page-header-row">
            <h1>Visualizar Imovel</h1>
            <button type="button" className="secondary" onClick={() => navigate('/imoveis')}>
              Voltar para listagem
            </button>
          </div>

          <div className="global-error">{error ?? 'Imovel nao encontrado.'}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="content-page">
      <section className="card imovel-detail-card">
        <div className="row page-header-row imovel-detail-header">
          <div>
            <h1>Visualizar Imovel</h1>
            <p className="imovel-detail-subtitle">{imovel.titulo || 'Imovel sem titulo'}</p>
          </div>

          <div className="imovel-detail-actions">
            {canEditarImovel && (
              <button type="button" className="secondary" onClick={() => navigate(`/imoveis/${imovel.id}/editar`)}>
                Editar imovel
              </button>
            )}
            {canAtivarImovel && (
              <button type="button" className="secondary" onClick={handleActivate} disabled={isActivating}>
                {isActivating ? 'Ativando...' : 'Ativar'}
              </button>
            )}
            {(hasMidiasExternas || canVisualizarDadosCaptacao) && (
              <button type="button" className="secondary" onClick={openMidiasExternas}>
                {'Informa\u00e7\u00f5es extras'}
              </button>
            )}
            {canInativarImovel && !isInativo && (
              <button
                type="button"
                className="secondary danger"
                onClick={openInactivationModal}
              >
                Inativar imovel
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
            <ImovelCarousel imagens={imovel.imagens ?? []} titulo={imovel.titulo || 'Imovel'} />
          </div>

          <aside className="imovel-detail-summary">
            <span className={`imovel-detail-status ${isInativo ? 'is-inactive' : 'is-active'}`}>{imovel.status || '-'}</span>
            <h2>{imovel.titulo || 'Imovel sem titulo'}</h2>
            <p className="imovel-detail-price">{precoFormatado}</p>
            <p className="imovel-detail-purpose">{imovel.finalidade || '-'}</p>
          </aside>
        </div>

        <div className="imovel-detail-grid">
          <section className="imovel-detail-section">
            <h2>Detalhes do imovel</h2>
            <dl className="imovel-detail-list">
              <div>
                <dt>Tipo</dt>
                <dd>{imovel.tipo || '-'}</dd>
              </div>
              <div>
                <dt>Bairro</dt>
                <dd>{imovel.bairro || '-'}</dd>
              </div>
              <div>
                <dt>Cidade</dt>
                <dd>{imovel.cidade || '-'}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{imovel.estado || '-'}</dd>
              </div>
              <div>
                <dt>Finalidade</dt>
                <dd>{imovel.finalidade || '-'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{imovel.status || '-'}</dd>
              </div>
              {hasPositiveNumber(imovel.quartos) && (
                <div>
                  <dt>Quartos</dt>
                  <dd>{imovel.quartos}</dd>
                </div>
              )}
              {hasPositiveNumber(imovel.metragem) && (
                <div>
                  <dt>Metragem</dt>
                  <dd>{imovel.metragem} m²</dd>
                </div>
              )}
              {hasPositiveNumber(imovel.vagasGaragem) && (
                <div>
                  <dt>Vagas de garagem</dt>
                  <dd>{imovel.vagasGaragem}</dd>
                </div>
              )}
              {hasPositiveNumber(imovel.banheiros) && (
                <div>
                  <dt>Banheiros</dt>
                  <dd>{imovel.banheiros}</dd>
                </div>
              )}
              {hasPositiveNumber(imovel.suites) && (
                <div>
                  <dt>Suites</dt>
                  <dd>{imovel.suites}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="imovel-detail-section">
            <h2>Descricao</h2>
            <p className="imovel-detail-description">{imovel.descricao || 'Sem descricao cadastrada.'}</p>
          </section>

          <section className="imovel-detail-section">
            <h2>Informacoes do cadastro</h2>
            <dl className="imovel-detail-list">
              <div>
                <dt>Criado em</dt>
                <dd>{imovel.createdAt ? dateFormatter.format(new Date(imovel.createdAt)) : '-'}</dd>
              </div>
              <div>
                <dt>Atualizado em</dt>
                <dd>{imovel.updatedAt ? dateFormatter.format(new Date(imovel.updatedAt)) : '-'}</dd>
              </div>
              <div>
                <dt>Quem atualizou</dt>
                <dd>{atualizadorNome}</dd>
              </div>
              <div>
                <dt>Corretor captador</dt>
                <dd>{corretorCaptadorNome}</dd>
              </div>
              {isInativo && (
                <div>
                  <dt>Motivo</dt>
                  <dd>{motivoInativacaoLabel}</dd>
                </div>
              )}
              {isInativo && corretorInativacaoNome !== '-' && (
                <div>
                  <dt>Corretor</dt>
                  <dd>{corretorInativacaoNome}</dd>
                </div>
              )}
              {isInativo && (
                <div>
                  <dt>Quem inativou</dt>
                  <dd>{inativadorNome}</dd>
                </div>
              )}
              {isInativo && descricaoInativacao !== '-' && (
                <div>
                  <dt>Descricao</dt>
                  <dd>{descricaoInativacao}</dd>
                </div>
              )}
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
      <ImovelMidiasExternasSheet
        imovelId={imovel.id}
        isOpen={isMidiasExternasOpen}
        onClose={closeMidiasExternas}
        canViewDadosCaptacao={canVisualizarDadosCaptacao}
        linkExternoFotos={imovel.linkExternoFotos}
        linkExternoVideos={imovel.linkExternoVideos}
      />
    </main>
  );
}
