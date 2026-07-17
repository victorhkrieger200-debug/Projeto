# Projeto Atlhon Sales

Aplicação separada em dois módulos:

- `frontend/`: interface React + Vite que autentica diretamente no Supabase e mantém a sessão local.
- `backend/`: API Express opcional para rotas server-side que precisem da service role do Supabase.
- `supabase/migrations/`: migrations oficiais do banco Supabase.

## Pré-requisitos

- Node.js 20+
- npm
- Projeto Supabase com Auth habilitado

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   npm install --prefix frontend
   npm install --prefix backend
   ```

2. Configure as variáveis de ambiente:

   ```bash
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   ```

3. Edite `frontend/.env` e `backend/.env` com as chaves reais do Supabase:

   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no frontend.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no backend, se ele for usado.

   A chave `SERVICE_ROLE` deve ficar apenas no backend. Nunca exponha essa chave no frontend. O login do frontend usa somente a anon key pública e valida as credenciais no Supabase Auth.

4. Aplique a migration mais recente em `supabase/migrations/` no Supabase para criar a tabela `profiles`, as policies RLS e o trigger que cria o perfil ao registrar usuários.

## Desenvolvimento

Em terminais separados:

```bash
npm run dev:backend
npm run dev:frontend
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Health check: http://localhost:4000/health

## Scripts úteis

```bash
npm run build
npm run lint
npm run start:backend
```
