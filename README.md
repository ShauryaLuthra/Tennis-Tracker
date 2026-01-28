# Tennis Tracker (Full-Stack)

A personal tennis match tracking app with authentication, per-user data isolation, and a Wimbledon-themed UI.

## Features
- Signup / Login / Logout (JWT stored in HTTP-only cookie)
- Per-user match CRUD (Create, Read, Update, Delete)
- Match notes + score
- Filters on match list (opponent, result, date range)
- Opponent summary dashboard (SQL aggregation: GROUP BY, COUNT, CASE)

## Tech Stack
- Frontend: React (Vite), React Router
- Backend: Node.js, Express
- Database: PostgreSQL
- Auth: bcrypt password hashing + JWT + HTTP-only cookies

## Repo Structure
- `backend/` Express API + Postgres
- `frontend/` React UI

## Local Setup

### 1) Database
Create a Postgres DB named `tennis_tracker` and run the schema:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_date DATE NOT NULL,
  opponent_name TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('W', 'L')),
  score TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX matches_user_id_idx ON matches(user_id);
