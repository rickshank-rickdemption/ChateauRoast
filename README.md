# ChateauRoast

Web-based cafeteria ordering system with real-time updates using WebSocket.

## Tech Stack
- React + Vite + TailwindCSS
- PHP WebSocket server
- PostgreSQL (Supabase)

## Core Features
- Live order placement and kitchen queue updates
- Admin dashboard (users, menu/price, inventory, reports)
- Kitchen dashboard (Pending -> Preparing -> Completed)
- Sales and order history tracking

## Quick Start
1. Run `database/supabase_schema.sql` then `database/supabase_seed.sql` in Supabase.
2. Start backend:
   - `php backend/server.php`
3. Start frontend:
   - `cd frontend && npm install && npm run dev`

## Environment
Backend (`backend/.env`):
- `DB_DRIVER=pgsql`
- `DB_HOST=...`
- `DB_PORT=5432`
- `DB_NAME=postgres`
- `DB_USER=postgres`
- `DB_PASS=...`
- `DB_SSLMODE=require`

Frontend (`frontend/.env`):
- `VITE_WS_URL=ws://localhost:8080` (or your deployed wss URL)
