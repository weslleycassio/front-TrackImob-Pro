# Front TrackImob Pro

Front-end em React + TypeScript (Vite) para operacao multi-imobiliaria.

## Configuracao

1. Crie um `.env.local` na raiz:

```bash
VITE_API_URL=http://localhost:3000
```

Tambem ha fallback para `REACT_APP_API_URL`.

## Rodar projeto

```bash
npm install
npm run dev
```

## Documentacao funcional

A documentacao funcional atual do projeto esta em [docs/documentacao-funcional.md](./docs/documentacao-funcional.md).

## Rotas principais

- `/register`: cadastro da imobiliaria + admin inicial
- `/login`: autenticacao
- `/app`: dashboard e area privada
- `/imoveis`: consulta da carteira
- `/app/usuarios`: listagem da equipe
