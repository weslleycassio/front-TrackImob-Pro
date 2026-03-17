import type { User } from '../api/types';
import type { Imovel } from '../services/imoveisService';

export function canEditImovel(user: User | null | undefined, imovel: Pick<Imovel, 'corretorCaptadorId'> | null | undefined) {
  if (!user || !imovel) {
    return false;
  }

  if (user.role === 'ADMIN') {
    return true;
  }

  if (imovel.corretorCaptadorId === undefined || imovel.corretorCaptadorId === null) {
    return false;
  }

  return String(imovel.corretorCaptadorId) === String(user.id);
}
