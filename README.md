# Front TrackImob Pro

Front-end em React + TypeScript (Vite) para escopo multi-imobiliária.

## Configuração

1. Crie um `.env.local` na raiz:

```bash
VITE_API_URL=http://localhost:3000
```

> Também há fallback para `REACT_APP_API_URL`.

## Rodar projeto

```bash
npm install
npm run dev
```

## Rotas principais

- `/register`: cadastro da imobiliária + admin
- `/login`: autenticação
- `/app`: área privada com layout e sidebar
- `/app/users`: listagem/cadastro de usuários (cadastro apenas ADMIN)
