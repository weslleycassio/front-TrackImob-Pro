import type { Imovel, MotivoInativacaoImovel } from '../services/imoveisService';

const motivosPermitidosParaAtivacao = new Set<MotivoInativacaoImovel>([
  'DESISTIU_DA_VENDA',
  'DESISTIU_DA_LOCACAO',
  'OUTRO',
]);

export function canActivateImovel(imovel: Pick<Imovel, 'status' | 'motivoInativacao'> | null | undefined) {
  if (!imovel) {
    return false;
  }

  return String(imovel.status).toUpperCase() === 'INATIVO' && motivosPermitidosParaAtivacao.has(imovel.motivoInativacao as MotivoInativacaoImovel);
}
