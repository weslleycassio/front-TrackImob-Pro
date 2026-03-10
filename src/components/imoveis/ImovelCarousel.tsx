import { useEffect, useMemo, useState } from 'react';
import type { ImagemImovel } from '../../services/imoveisService';
import { getImovelImagemPrincipal, orderImagensByCapa, resolveImageSrc } from '../../utils/imovelImages';

type ImovelCarouselProps = {
  imagens: ImagemImovel[];
  titulo: string;
};

export function ImovelCarousel({ imagens, titulo }: ImovelCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  const imagensOrdenadas = useMemo(() => orderImagensByCapa(imagens), [imagens]);

  const imagensValidas = useMemo(
    () => imagensOrdenadas.filter((imagem) => imagem.url && !failedIds[imagem.id]),
    [imagensOrdenadas, failedIds],
  );

  const total = imagensValidas.length;
  const hasNavigation = total > 1;
  const currentImage = imagensValidas[currentIndex] ?? null;
  const fallbackImage = getImovelImagemPrincipal(imagensOrdenadas);

  useEffect(() => {
    if (currentIndex > total - 1) {
      setCurrentIndex(0);
    }
  }, [currentIndex, total]);

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
  };

  return (
    <div className="imovel-carousel" aria-label={`Fotos do imóvel ${titulo}`}>
      {!currentImage && (
        <img src={fallbackImage} alt={`${titulo} - sem imagem`} className="imovel-carousel-image" loading="lazy" />
      )}

      {currentImage && (
        <>
          <img
            src={resolveImageSrc(currentImage.url)}
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
