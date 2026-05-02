export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CORRETOR';

export type EntityId = string | number;

export type ImobiliariaSummary = {
  id?: EntityId;
  nome: string;
  logoUrl?: string | null;
};

export type AdminImobiliaria = {
  id: EntityId;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cnpj?: string | null;
  ativa: boolean;
  usuariosAtivos: number;
  limiteUsuarios: number | null;
  whatsappConfig?: {
    groupId: string | null;
    groupName: string | null;
    enabled: boolean;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateAdminImobiliariaConfigPayload = {
  limiteUsuarios?: number | null;
  ativa?: boolean;
};

export type CreateAdminImobiliariaRequest = {
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
  configuracao?: {
    limiteUsuarios?: number | null;
  };
};

export type User = {
  id: EntityId;
  nome: string;
  telefone: string;
  email: string;
  role: UserRole;
  ativo?: boolean;
  status?: string;
  createdAt?: string;
  imobiliariaId?: EntityId;
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


export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  novaSenha: string;
  confirmarNovaSenha: string;
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
