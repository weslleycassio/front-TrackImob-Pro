import { useMemo, useState } from 'react';

export type ImagemImovel = {
  id: string;
  url: string;
};

type ImovelCarouselProps = {
  imagens: ImagemImovel[];
  titulo: string;
};

const PLACEHOLDER_TEXT = 'Sem imagem disponível';

export function ImovelCarousel({ imagens, titulo }: ImovelCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  const imagensValidas = useMemo(
    () => imagens.filter((imagem) => imagem.url && !failedIds[imagem.id]),
    [imagens, failedIds],
  );

  const total = imagensValidas.length;
  const hasNavigation = total > 1;
  const currentImage = imagensValidas[currentIndex] ?? null;

  const goToPrevious = () => {
    if (!hasNavigation) return;
    setCurrentIndex((previous) => (previous === 0 ? total - 1 : previous - 1));
  };

  const goToNext = () => {
    if (!hasNavigation) return;
    setCurrentIndex((previous) => (previous === total - 1 ? 0 : previous + 1));
  };

  const handleImageError = (id: string) => {
    setFailedIds((previous) => ({ ...previous, [id]: true }));
    setCurrentIndex(0);
  };

  return (
    <div className="imovel-carousel" aria-label={`Fotos do imóvel ${titulo}`}>
      {!currentImage && <div className="imovel-carousel-placeholder">{PLACEHOLDER_TEXT}</div>}

      {currentImage && (
        <>
          <img
            src={currentImage.url}
            alt={`${titulo} - foto ${currentIndex + 1}`}
            className="imovel-carousel-image"
            loading="lazy"
            onError={() => handleImageError(currentImage.id)}
          />

          {hasNavigation && (
            <>
              <button
                type="button"
                className="imovel-carousel-nav imovel-carousel-nav-prev"
                onClick={goToPrevious}
                aria-label="Imagem anterior"
              >
                ‹
              </button>
              <button
                type="button"
                className="imovel-carousel-nav imovel-carousel-nav-next"
                onClick={goToNext}
                aria-label="Próxima imagem"
              >
                ›
              </button>

              <div className="imovel-carousel-dots" role="tablist" aria-label="Selecionar imagem">
                {imagensValidas.map((imagem, index) => (
                  <button
                    key={imagem.id}
                    type="button"
                    className={`imovel-carousel-dot ${index === currentIndex ? 'active' : ''}`}
                    aria-label={`Ir para imagem ${index + 1}`}
                    aria-selected={index === currentIndex}
                    role="tab"
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
