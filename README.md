# Frontend BTImoveis

Frontend independente do BTImoveis criado com **React + Vite + TypeScript**, com fluxo inicial de autenticação (Login/Cadastro) integrado via API externa.

## Stack

- React + Vite + TypeScript
- React Router
- Axios
- React Hook Form + Zod
- CSS global simples e responsivo

## Como rodar

```bash
npm install
npm run dev
```

Aplicação disponível por padrão em `http://localhost:5173`.

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```bash
VITE_API_URL=http://localhost:3000
```

- `VITE_API_URL`: URL base da API backend Node.

## Rotas implementadas

- `/login`
- `/register`
- `/dashboard` (protegida)

## Fluxo de autenticação

- Login chama endpoint `/auth/login`.
- Cadastro chama endpoint `/auth/register`.
- Token JWT é salvo em memória e no `localStorage` (MVP).
- Interceptor Axios anexa `Authorization: Bearer <token>` automaticamente.
- Em `401`, o usuário é deslogado e redirecionado para `/login`.

## Estrutura principal

```text
src/
  api/
    endpoints/
    authService.ts
    client.ts
    types.ts
  auth/
    AuthContext.tsx
    PrivateRoute.tsx
    storage.ts
    useAuth.ts
  components/
    AuthLayout.tsx
  pages/
    Login/
    Register/
    Dashboard/
  routes/
    AppRoutes.tsx
  utils/
    errorMessages.ts
```
