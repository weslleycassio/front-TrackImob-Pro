export type UserRole = 'ADMIN' | 'CORD' | 'CORRETOR' | 'USER';

export type LoginRequest = {
  email: string;
  senha: string;
};

export type RegisterRequest = {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  role: UserRole;
};

export type AuthResponse = {
  token?: string;
  accessToken?: string;
  user?: {
    id: string;
    nome: string;
    email: string;
    role: UserRole;
  };
};
