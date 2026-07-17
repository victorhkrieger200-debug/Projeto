# Projeto Atlhon Sales

Aplicação separada em dois módulos:

- `frontend/`: interface React + Vite que consome a API do backend.
- `backend/`: API Express que autentica usuários via Supabase e consulta a tabela `profiles`.
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

3. Edite `backend/.env` com as chaves reais do Supabase:

   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

   A chave `SERVICE_ROLE` deve ficar apenas no backend. Nunca exponha essa chave no frontend.

4. Aplique a migration em `supabase/migrations/001_create_profiles.sql` no Supabase.

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
