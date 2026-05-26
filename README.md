# ADAS Validation Platform — User Management & RBAC

Mini-module for an AI-powered ADAS validation platform: **JWT authentication**, **password hashing**, **PostgreSQL** persistence via SQLAlchemy (`postgresql+psycopg://`), **permission-based RBAC**, **validation projects** with ownership and review workflow, and a **React + TypeScript + Tailwind** admin UI (login, dashboard, users, projects, role assignment).

## Quick start

### Option A — Full project (PostgreSQL in Docker + local API + UI)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/). The repo ships **`docker-compose.yml`** with **only the database**; the FastAPI app and Vite UI still run on your machine (hot reload preserved).

```powershell
cd c:\pem_assignment
docker compose up -d    
```

Wait until Postgres is ready, then in **two terminals**:

```powershell
cd c:\pem_assignment\backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8088
```

```powershell
cd c:\pem_assignment\frontend
npm install
npm run dev
```

**Windows shortcut:** from `c:\pem_assignment`, run `.\scripts\run-dev.ps1` — it starts `docker compose`, waits for `pg_isready`, then opens new windows for the API and UI.

- API: `http://127.0.0.1:8088` (docs: `/docs`)
- UI: `http://localhost:5173` (Vite may use another port if 5173 is busy)
- DB: `localhost:5432` — user `adas`, password `adas`, database `adas_validation`

### Option B — PostgreSQL you install yourself (no Docker)

Create role and database (names must match `DATABASE_URL` in `backend/.env` or the default in `backend/app/config.py`):

```sql
CREATE USER adas WITH PASSWORD 'adas';
CREATE DATABASE adas_validation OWNER adas;
```

Copy `backend/.env.example` to `backend/.env` if you need custom `DATABASE_URL` / `JWT_SECRET`.

Then run the same **backend** and **frontend** commands as in option A.

### Demo accounts (seeded on API startup)

| Email                 | Password       | Role                 |
| --------------------- | -------------- | -------------------- |
| `admin@example.com`   | `Admin12345!`  | admin                |
| `engineer@example.com`| `Demo12345!`   | validation_engineer |
| `reviewer@example.com`| `Demo12345!`  | reviewer             |
| `viewer@example.com`  | `Demo12345!`   | viewer               |

Change or remove demo seeding before any real deployment.

Use `backend/.env` for `DATABASE_URL`, `JWT_SECRET`, and CORS overrides (`backend/.env.example` is a template).

## API overview

| Method & path            | Description                                      | Auth / notes                          |
| ------------------------ | ------------------------------------------------ | ------------------------------------- |
| `POST /login`            | Assignment-compatible alias for login          | Public                                |
| `POST /api/auth/login`   | Login, returns JWT                               | Public                                |
| `POST /api/auth/register`| Signup (admin role blocked)                      | Public                                |
| `GET /api/auth/me`       | Current user + flattened permission codes      | Bearer JWT                            |
| `GET /api/roles`         | Roles with permission lists                      | Public (for signup & admin UI)        |
| `GET /api/users`         | List users                                       | `users:read`                          |
| `POST /api/users`        | Create user                                      | `users:create`                        |
| `PUT /api/users/{id}/role` | Assign role                                    | `users:assign_role`                   |
| `PATCH /api/users/{id}/active` | Enable/disable account                     | `users:update`                       |
| `GET /api/projects`      | Projects visible under RBAC                      | Bearer JWT                            |
| `POST /api/projects`     | Create project                                   | `projects:create`                     |
| `PUT /api/projects/{id}` | Update project / review status                   | Rules in `app/routers/projects.py`  |
| `DELETE /api/projects/{id}` | Delete project                                | `projects:delete`                     |

## RBAC model

### Roles (seeded)

| Role                 | Intent |
| -------------------- | ------ |
| **admin**            | Full access (`admin:full` plus explicit permission codes). |
| **validation_engineer** | Create projects; view all projects; edit **own** project fields. |
| **reviewer**         | View all projects; update **review_status** only. |
| **viewer**           | View all projects (read-only). |

### Permission codes (excerpt)

- `admin:full` — bypass for administrators.
- `users:*` — directory operations (read/create/update/assign_role).
- `projects:create`, `projects:read_all`, `projects:read_own`, `projects:update_own`, `projects:update_review`, `projects:delete`.

Authorization is enforced in FastAPI dependencies (`require_permissions`) and in project route handlers (`app/rbac.py`).

## Database schema

Tables: `users`, `roles`, `permissions`, `role_permissions`, `user_roles` (one role per user enforced by app + unique constraint on `user_id`), `projects`.

```mermaid
erDiagram
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : assigned
  roles ||--o{ role_permissions : grants
  permissions ||--o{ role_permissions : ""
  users ||--o{ projects : creates

  users {
    int id PK
    string name
    string email UK
    string password_hash
    bool is_active
    timestamptz created_at
  }
  roles {
    int id PK
    string name UK
    text description
  }
  permissions {
    int id PK
    string code UK
    text description
  }
  role_permissions {
    int role_id PK, FK
    int permission_id PK, FK
  }
  user_roles {
    int id PK
    int user_id FK
    int role_id FK
  }
  projects {
    int id PK
    string name
    string vehicle_platform
    string odd_type
    string status
    string review_status
    int created_by_id FK
    timestamptz created_at
  }
```

Equivalent DDL (abbreviated):

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(128) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_roles_user_id UNIQUE (user_id)
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  vehicle_platform VARCHAR(128) NOT NULL,
  odd_type VARCHAR(128) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'draft',
  review_status VARCHAR(64) NOT NULL DEFAULT 'pending',
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Architecture

```mermaid
flowchart LR
  subgraph client [React SPA]
    UI[Pages: Login Dashboard Users Projects]
  end
  subgraph api [FastAPI]
    AUTH[Auth router JWT]
    RBAC[Deps and rbac helpers]
    SVC[Users Projects Roles]
  end
  DB[(PostgreSQL)]
  UI -->|HTTPS JSON| AUTH
  UI --> SVC
  AUTH --> DB
  SVC --> RBAC
  SVC --> DB
```

## Screenshots / demo

After the API and `npm run dev` in `frontend/` are running, capture:

1. Login screen  
2. Dashboard showing role and permission summary  
3. Projects list with create form (as engineer/admin) and review control (as reviewer)  
4. Users table with role assignment (as admin)

Optionally record a short walkthrough video with the same flows.

## Project layout

```
backend/           FastAPI app (app/main.py, routers, rbac, seed)
frontend/          Vite + React + TS + Tailwind
docker-compose.yml PostgreSQL only (optional local DB)
scripts/run-dev.ps1 Windows helper: compose + API + UI windows
README.md
```

## Security notes

- Replace `JWT_SECRET` and demo passwords for any shared or production environment.
- HTTPS termination should sit in front of the API in real deployments.
- Registration allows choosing a non-admin role; admin accounts should be provisioned by trusted operators.

## License

Assessment / sample code — use and modify as needed for your submission.
