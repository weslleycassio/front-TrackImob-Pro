import axios from 'axios';

export function toFriendlyError(error: unknown, fallback = 'Ocorreu um erro inesperado.') {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string })?.message;

    if (error.response?.status === 401) {
      return 'Credenciais inválidas. Verifique e tente novamente.';
    }

    if (apiMessage) return apiMessage;

    if (!error.response) {
      return 'Não foi possível conectar ao servidor. Verifique se a API está disponível.';
    }
  }

  return fallback;
}
