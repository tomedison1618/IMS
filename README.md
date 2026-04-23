# IMS MVP

Initial backend foundation for an inventory management system supporting:

- Item master with strict financial data silos
- Multi-level BoMs with PostgreSQL recursive explosion for backflushing
- Purchasing, receiving, manufacturing, fulfillment, and cycle count workflows
- Role-based access control for Admin, Finance, and Operations users

## Structure

- `database/schema/001_ims_mvp.sql`: PostgreSQL schema and indexes
- `database/queries/backflush_bom_explosion.sql`: recursive CTE for BoM explosion/backflushing
- `docs/api-endpoints.md`: exact REST API surface for the MVP
- `docs/USER_MANUAL.md`: English user manual with overview and role workflows
- `docs/USER_MANUAL_VI.md`: Vietnamese user manual for demo and operational workflows
- `docs/IMPROVEMENT_BACKLOG.md`: prioritized product and engineering backlog for the next IMS iterations
- `src/`: Node.js / Express backend scaffold

## Notes

- `items.unit_cost` is stored in the schema, but it must only be returned by the API for `ADMIN` and `FINANCE`.
- The frontend now signs in through `POST /api/v1/auth/login`, then sends the selected request role through headers on subsequent API calls.
- Everything is container-ready: configuration is env-driven and no deployment vendor assumptions are hard-coded.

## Seed Data

Run the baseline seed after the schema:

```powershell
psql "YOUR_DATABASE_URL" -f database/seeds/001_baseline_roles_and_users.sql
```

Useful seeded user IDs for local testing:

- `ADMIN`: `10000000-0000-0000-0000-000000000001`
- `FINANCE`: `10000000-0000-0000-0000-000000000002`
- `OPERATIONS`: `10000000-0000-0000-0000-000000000003`

Seeded demo login credentials:

- `admin@ims.local` / `Admin123!`
- `cfo@ims.local` / `Finance123!`
- `ops.test@ims.local` / `Ops123!`

Useful seeded master data:

- Supplier: `40000000-0000-0000-0000-000000000001` (`SUP-DEMO`)
- Receiving location: `50000000-0000-0000-0000-000000000001` (`RCV-01`)
- Storage location: `50000000-0000-0000-0000-000000000002` (`STOR-01`)

## Demo Smoke Test

Once the API is running and the seed data is loaded, you can exercise the core inbound, outbound, inventory-control, and manufacturing flows with:

```powershell
.\scripts\demo-smoke-test.ps1
```

The script uses unique SKUs and codes on each run, so it is safe to rerun against the same local database.

## Automated Tests

Fast API contract tests are available with:

```powershell
npm test
```

These tests use the built-in Node test runner and cover:

- health and 404 behavior
- auth-required and RBAC contract checks
- finance-only `unitCost` enforcement
- placeholder route behavior for unfinished endpoints

Run the seeded end-to-end workflow with:

```powershell
npm run test:smoke
```

Run both in sequence with:

```powershell
npm run test:full
```

## Frontend

A React operations workbench is included under `frontend/`.

Quick start from the project root:

```bat
Start-IMS-App.bat
```

The launcher now waits for `http://localhost:3000/health` before opening the frontend, which avoids the initial Vite proxy `ECONNREFUSED` burst when the API is still starting.

Install frontend dependencies:

```powershell
cd frontend
npm install
```

Run the frontend in development mode:

```powershell
npm run dev
```

Keep the backend running in a separate terminal:

```powershell
cd ..
npm run dev
```

If you start the frontend by itself, Vite will log proxy `ECONNREFUSED` errors for `/api/...` until the backend is available on `http://localhost:3000`.

Build the frontend for production:

```powershell
cd ..
npm run build:web
```

After the build completes, the Express backend will serve the compiled frontend from `frontend/dist`.

## Windows Demo Package

You can build a Windows demo install package with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-demo-package.ps1
```

This produces:

- an unpacked demo package folder under `dist/`
- a zip archive ready to copy to a customer PC

The package bundles the built frontend, backend, runtime dependencies, and a portable `node.exe`. PostgreSQL is still required on the demo machine. Full instructions are in [docs/WINDOWS_DEMO_PACKAGE.md](docs/WINDOWS_DEMO_PACKAGE.md).
