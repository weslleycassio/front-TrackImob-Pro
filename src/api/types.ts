export type UserRole = 'ADMIN' | 'CORRETOR';

export type EntityId = string | number;

export type User = {
  id: EntityId;
  nome: string;
  telefone: string;
  email: string;
  role: UserRole;
  ativo?: boolean;
  status?: string;
  createdAt?: string;
  imobiliariaId: EntityId;
  imobiliariaNome?: string;
};

export type UpdateUserRequest = {
  role: UserRole;
  telefone: string;
  ativo: boolean;
};

export type UpdateMeRequest = {
  nome: string;
  email: string;
  telefone: string;
};

export type AlterarSenhaPayload = {
  senhaAtual: string;
  novaSenha: string;
  confirmarNovaSenha: string;
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
    id: EntityId;
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
