# Coffee Shop Ordering System

## Stack
- PostgreSQL (Supabase)
- PHP native WebSocket server (`backend/server.php`)
- React + Vite + TailwindCSS + GSAP (`frontend`)

## Project Structure
- `database/supabase_schema.sql`
- `database/supabase_seed.sql`
- `backend/server.php`
- `frontend/`

## Run Database
1. In Supabase SQL Editor, run:
   - `database/supabase_schema.sql`
2. Seed data:
   - `database/supabase_seed.sql`

## Run Backend WebSocket Server
1. Open terminal in `backend`
2. Run:
   - `php server.php`

### Auto-Restart Backend (Watch Mode)
From project root, run:
- `./scripts/watch-ws.sh`

This watches `backend/server.php` and restarts the WebSocket server automatically on file changes.

## Environment Variables (Backend)
Set these in local shell or Render service environment:

- `DB_DRIVER` = `pgsql`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `DB_SSLMODE` (for postgres/supabase, usually `require`)

### Supabase PostgreSQL Example (Render)
- `DB_DRIVER=pgsql`
- `DB_HOST=<supabase-db-host>`
- `DB_PORT=5432`
- `DB_NAME=postgres`
- `DB_USER=postgres`
- `DB_PASS=<supabase-db-password>`
- `DB_SSLMODE=require`

Important:
- Create schema/tables first in Supabase SQL Editor.
- Runtime bootstrap does not auto-create or alter postgres tables.

## Run Frontend
1. Open terminal in `frontend`
2. Install dependencies:
   - `npm install`
3. Start dev server:
   - `npm run dev`
4. Open the shown Vite URL in browser.

The frontend auto-connects to `ws://<current-host>:8080` (with localhost fallbacks) and uses native WebSocket messages:
- `GET_ACTIVE_ORDERS`
- `PLACE_ORDER`
- `UPDATE_STATUS`

You can override websocket endpoint explicitly:
- `frontend/.env` -> `VITE_WS_URL=wss://<your-backend-domain>`

## Render Deployment (Backend + Frontend)
This repository now includes `render.yaml`.

1. Push repo to GitHub.
2. In Render: `New` -> `Blueprint` -> select this repo.
3. Render will create:
   - `chateauroast-ws-backend` (PHP web service)
   - `chateauroast-frontend` (Static site)
4. Set backend secret env values:
   - `DB_HOST`, `DB_PASS`
5. After backend is live, set frontend env:
   - `VITE_WS_URL=wss://<chateauroast-ws-backend.onrender.com>`
6. Redeploy frontend.

Notes:
- Backend uses `PORT` from Render automatically.
- Health checks are supported on plain HTTP endpoint, while app traffic uses WebSocket upgrade.
