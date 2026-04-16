# Goal Stream Platform

Production-structured sports platform with a FastAPI backend and a Next.js frontend. The backend serves sports/news data APIs and admin APIs, while the frontend provides locale-aware public pages and admin management screens.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- Backend: FastAPI
- Database: PostgreSQL
- ORM / Migrations: SQLAlchemy 2.x / Alembic
- Containers: Docker / Docker Compose

## Project Structure

```text
backend/
  alembic/
  app/
frontend/
  src/
    app/
    components/
    features/
    i18n/
    lib/
    messages/
```

## Environment

### Backend

Copy `backend/.env.example` to `backend/.env` and adjust values as needed.

### Frontend

Copy `frontend/.env.example` to `frontend/.env.local` and adjust values as needed.

Important frontend variables:

- `INTERNAL_API_BASE_URL=http://localhost:8000`
- `NEXT_PUBLIC_API_BASE_URL=` (optional; leave blank when the frontend proxies browser requests)
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Run With Docker

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## Run Backend Locally

From the `backend` directory:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.utils.create_admin --username admin --email admin@example.com --password StrongPass123! --superuser
uvicorn app.main:app --reload
```

## Run Frontend Locally

From the `frontend` directory:

```bash
npm install
npm run dev
```

## Deploy To Render

This repo includes a root `render.yaml` for a free-friendly Render setup with:

- `goal-stream-db` as a Render Postgres database
- `goal-stream-api` as a Docker web service
- `goal-stream-web` as a Docker web service

### Render deployment flow

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. On a free account, create three Render resources manually:
   - a Postgres database
   - a backend web service from `./backend/Dockerfile`
   - a frontend web service from `./frontend/Dockerfile`
3. Set the backend service environment variables:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `DATABASE_URL=<Render internal database URL>`
   - `SECRET_KEY=<long random secret>`
   - `FOOTBALL_DATA_API_KEY=<your key>`
   - `GNEWS_API_KEY=<your key>`
   - `ADMIN_BOOTSTRAP_USERNAME=<your first admin username>`
   - `ADMIN_BOOTSTRAP_EMAIL=<your first admin email>`
   - `ADMIN_BOOTSTRAP_PASSWORD=<your first admin password>`
4. Set the frontend service environment variables:
   - `INTERNAL_API_BASE_URL=https://<your-backend-service>.onrender.com`
   - `NEXT_PUBLIC_API_BASE_URL=https://<your-backend-service>.onrender.com` (optional)
   - `NEXT_PUBLIC_APP_URL=https://<your-frontend-service>.onrender.com`
5. Deploy the backend first, then deploy the frontend.
6. Open the frontend service URL once deploys complete.

### Render notes

- The backend runs `alembic upgrade head` on startup before launching Uvicorn.
- On the free plan, both backend and frontend are public web services.
- The frontend can proxy browser API calls through its own service when `INTERNAL_API_BASE_URL` is set.
- If `ADMIN_BOOTSTRAP_USERNAME`, `ADMIN_BOOTSTRAP_EMAIL`, and `ADMIN_BOOTSTRAP_PASSWORD` are all set on the backend, the app will create the first admin user automatically on startup if it does not already exist.
- If you want to call the backend directly from another origin later, set `CORS_ALLOW_ORIGINS` on the backend service to a comma-separated list of allowed frontend URLs.

## Frontend Route Assumptions

- Match pages use `/[locale]/matches/[matchSlug]`, but `matchSlug` is treated as the backend `external_match_id`.
- The frontend URL-encodes the backend identifier instead of generating a separate slug because the backend currently exposes match details by external match ID only.
- News pages use the backend article slug directly.

## Public Pages

- `/{locale}`
- `/{locale}/matches/{matchSlug}`
- `/{locale}/news/{newsSlug}`

## Admin Pages

- `/{locale}/admin/login`
- `/{locale}/admin`
- `/{locale}/admin/streams`
- `/{locale}/admin/streams/new`
- `/{locale}/admin/streams/{externalId}/edit`
- `/{locale}/admin/redirects`

## Notes

- Public pages support English (`/en`) and Arabic (`/ar`) with LTR/RTL handling.
- The global click redirect provider runs only on public routes and uses backend redirect config.
- Frontend admin auth uses the backend token and stores it client-side because the backend currently exposes token login rather than secure cookie sessions.
