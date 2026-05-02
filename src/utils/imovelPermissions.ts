import type { User } from '../api/types';
import type { InternalImovel } from '../services/imoveisService';

type ImovelPermissionTarget = Pick<InternalImovel, 'corretorCaptadorId'> | null | undefined;

function isAdmin(user: User | null | undefined) {
  return user?.role === 'ADMIN';
}

function isCorretorCaptador(user: User | null | undefined, imovel: ImovelPermissionTarget) {
  if (!user || !imovel) {
    return false;
  }

  if (imovel.corretorCaptadorId === undefined || imovel.corretorCaptadorId === null) {
    return false;
  }

  return String(imovel.corretorCaptadorId) === String(user.id);
}

export function canManageImovel(user: User | null | undefined, imovel: ImovelPermissionTarget) {
  return isAdmin(user) || isCorretorCaptador(user, imovel);
}

export function canEditImovel(user: User | null | undefined, imovel: ImovelPermissionTarget) {
  return canManageImovel(user, imovel);
}

export function canManageImovelImages(user: User | null | undefined, imovel: ImovelPermissionTarget) {
  return canManageImovel(user, imovel);
}

export function canViewDadosCaptacaoImovel(user: User | null | undefined, imovel: ImovelPermissionTarget) {
  return canManageImovel(user, imovel);
}

export function canChangeImovelCaptador(user: User | null | undefined) {
  return isAdmin(user);
}
