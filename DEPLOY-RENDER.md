# Despliegue en Render — Donaive API

## PostgreSQL

1. Crea **PostgreSQL** en Render (ya hecho).
2. En el **Web Service** de la API → **Environment** → añade:
   - `DATABASE_URL` = **Internal Database URL** (copiar del panel del Postgres).
   - `JWT_SECRET` = cadena aleatoria larga.
   - `CORS_ORIGIN` = URL del frontend (ej. `https://donaive-web.onrender.com`).
   - `NODE_VERSION` = `20`

No commits la URL real al repositorio.

## Web Service (API)

| Campo | Valor |
|--------|--------|
| **Root Directory** | *(vacío — raíz del repo)* |
| **Build Command** | `pnpm install --frozen-lockfile && pnpm run build:api` |
| **Start Command** | `pnpm run start:api:render` |

No uses `corepack enable` en Render (falla con *read-only file system*).

Render detecta **pnpm** por `packageManager` en `package.json`.

## Health check

`/api/v1/health`

## Primera vez

`start:api:render` ejecuta `db push` + `seed` + arranque. Crea tablas y usuario admin del seed.

## Tras cambios en GitHub

Haz **Manual Deploy** o espera auto-deploy en `main`.
