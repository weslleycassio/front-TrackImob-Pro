export type UserRole = 'ADMIN' | 'CORRETOR';

export type User = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  role: UserRole;
  status?: string;
  createdAt?: string;
  imobiliariaId: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type RegisterImobiliariaRequest = {
  imobiliaria: {
    nome: string;
    telefone: string;
    email?: string;
    cnpj?: string;
  };
  admin: {
    nome: string;
    telefone: string;
    email: string;
    password: string;
  };
};

export type RegisterImobiliariaResponse = {
  imobiliaria: {
    id: number;
    nome: string;
    telefone: string;
    email?: string;
    cnpj?: string;
  };
  admin: User;
  token?: string;
  user?: User;
};

export type CreateUserRequest = {
  nome: string;
  telefone: string;
  email: string;
  password: string;
  role: UserRole;
};
