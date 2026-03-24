# IMS MVP

Initial backend foundation for an inventory management system supporting:

- Item master with strict financial data silos
- Multi-level BoMs with PostgreSQL recursive explosion for backflushing
- Purchasing, receiving, manufacturing, fulfillment, and cycle count workflows
- Role-based access control for Admin, CFO, Procurement, Warehouse, and Production users

## Structure

- `database/schema/001_ims_mvp.sql`: PostgreSQL schema and indexes
- `database/queries/backflush_bom_explosion.sql`: recursive CTE for BoM explosion/backflushing
- `docs/api-endpoints.md`: exact REST API surface for the MVP
- `src/`: Node.js / Express backend scaffold

## Notes

- `items.unit_cost` is stored in the schema, but it must only be returned by the API for `ADMIN`, `CFO`, and `PROCUREMENT_MANAGER`.
- The auth middleware in this scaffold reads request context from headers so the API surface can be built before the final authentication provider is chosen.
- Everything is container-ready: configuration is env-driven and no deployment vendor assumptions are hard-coded.

## Seed Data

Run the baseline seed after the schema:

```powershell
psql "YOUR_DATABASE_URL" -f database/seeds/001_baseline_roles_and_users.sql
```

Useful seeded user IDs for header-based local testing:

- `ADMIN`: `10000000-0000-0000-0000-000000000001`
- `CFO`: `10000000-0000-0000-0000-000000000002`
- `PROCUREMENT_MANAGER`: `10000000-0000-0000-0000-000000000003`
- `WAREHOUSE`: `10000000-0000-0000-0000-000000000004`
- `PRODUCTION_MANAGER`: `10000000-0000-0000-0000-000000000005`

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

## Frontend

A React operations workbench is included under `frontend/`.

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

Build the frontend for production:

```powershell
cd ..
npm run build:web
```

After the build completes, the Express backend will serve the compiled frontend from `frontend/dist`.
