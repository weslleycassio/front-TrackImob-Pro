import { useEffect, useState } from 'react';
import axios from 'axios';
import { getDadosCaptacaoImovel, type DadosCaptacaoImovel } from '../../services/imoveisService';
import { toFriendlyError } from '../../utils/errorMessages';

type ImovelMidiasExternasSheetProps = {
  imovelId: string | number;
  isOpen: boolean;
  onClose: () => void;
  linkExternoFotos?: string | null;
  linkExternoVideos?: string | null;
};

const normalizeExternalLink = (value?: string | null) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatPhone = (value?: string | null) => {
  if (typeof value !== 'string') {
    return '-';
  }

  const numbers = onlyDigits(value);

  if (!numbers) {
    return '-';
  }

  if (numbers.length <= 2) {
    return numbers;
  }

  if (numbers.length <= 10) {
    return numbers.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 14);
  }

  if (numbers.length === 11) {
    return numbers.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
  }

  return value;
};

const getDisplayValue = (value?: string | null) => {
  if (typeof value !== 'string') {
    return '-';
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : '-';
};

export function ImovelMidiasExternasSheet({
  imovelId,
  isOpen,
  onClose,
  linkExternoFotos,
  linkExternoVideos,
}: ImovelMidiasExternasSheetProps) {
  const [dadosCaptacao, setDadosCaptacao] = useState<DadosCaptacaoImovel | null>(null);
  const [isLoadingDadosCaptacao, setIsLoadingDadosCaptacao] = useState(false);
  const [dadosCaptacaoError, setDadosCaptacaoError] = useState<string | null>(null);
  const [shouldShowDadosCaptacao, setShouldShowDadosCaptacao] = useState(true);
  const fotosLink = normalizeExternalLink(linkExternoFotos);
  const videosLink = normalizeExternalLink(linkExternoVideos);
  const hasAnyMedia = Boolean(fotosLink || videosLink);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadDadosCaptacao = async () => {
      setIsLoadingDadosCaptacao(true);
      setDadosCaptacaoError(null);
      setShouldShowDadosCaptacao(true);

      try {
        const response = await getDadosCaptacaoImovel(imovelId);

        if (!isMounted) {
          return;
        }

        setDadosCaptacao(response);
        setShouldShowDadosCaptacao(true);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDadosCaptacao(null);

        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setDadosCaptacaoError(null);
          setShouldShowDadosCaptacao(false);
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setDadosCaptacaoError(null);
          setShouldShowDadosCaptacao(true);
          return;
        }

        setShouldShowDadosCaptacao(true);
        setDadosCaptacaoError(toFriendlyError(error, 'Nao foi possivel carregar os dados da captacao.'));
      } finally {
        if (isMounted) {
          setIsLoadingDadosCaptacao(false);
        }
      }
    };

    loadDadosCaptacao();

    return () => {
      isMounted = false;
    };
  }, [imovelId, isOpen]);

  return (
    <>
      {isOpen && <button type="button" className="sheet-overlay" aria-label="Fechar midias externas" onClick={onClose} />}
      <aside
        className={`right-side-sheet ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="midias-externas-title"
      >
        <div className="right-side-sheet-header">
          <div>
            <p className="right-side-sheet-eyebrow">Imovel</p>
            <h2 id="midias-externas-title">Midias externas</h2>
          </div>
          <button type="button" className="secondary right-side-sheet-close" onClick={onClose}>
            Fechar
          </button>
        </div>

        {!hasAnyMedia && <p className="right-side-sheet-empty">Nenhuma midia externa cadastrada.</p>}

        {fotosLink && (
          <section className="right-side-sheet-section">
            <h3>Fotos externas</h3>
            <a className="link-button right-side-sheet-link" href={fotosLink} target="_blank" rel="noreferrer">
              Abrir fotos externas
            </a>
          </section>
        )}

        {videosLink && (
          <section className="right-side-sheet-section">
            <h3>Videos externos</h3>
            <a className="link-button right-side-sheet-link" href={videosLink} target="_blank" rel="noreferrer">
              Abrir videos externos
            </a>
          </section>
        )}

        {shouldShowDadosCaptacao && (
          <section className="right-side-sheet-section">
            <h3>Dados da captacao</h3>

            {isLoadingDadosCaptacao ? (
              <p className="right-side-sheet-empty">Carregando dados da captacao...</p>
            ) : dadosCaptacaoError ? (
              <p className="right-side-sheet-empty">{dadosCaptacaoError}</p>
            ) : (
              <dl className="imovel-detail-list">
                <div>
                  <dt>Nome do proprietario</dt>
                  <dd>{getDisplayValue(dadosCaptacao?.nomeProprietario)}</dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>{formatPhone(dadosCaptacao?.telefoneProprietario)}</dd>
                </div>
                <div>
                  <dt>Endereco da captacao</dt>
                  <dd>{getDisplayValue(dadosCaptacao?.enderecoCaptacao)}</dd>
                </div>
              </dl>
            )}
          </section>
        )}
      </aside>
    </>
  );
}
