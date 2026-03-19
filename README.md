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
