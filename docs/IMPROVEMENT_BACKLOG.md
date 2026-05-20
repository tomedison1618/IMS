# IMS Improvement Backlog

## Purpose

This backlog converts the current product assessment into a repo-specific execution plan.

It is based on the current implemented scope:

- single-warehouse electronics operation
- React workbench in `frontend/src/App.jsx`
- Express API mounted from `src/routes/index.js`
- working purchasing, receiving, fulfillment, counts, and manufacturing flows

The priorities below are ordered by product value and dependency, not by technical convenience.

## Product Direction

The next version of IMS should improve three things first:

1. inventory trust
2. operator speed
3. planner visibility

That means the roadmap should favor traceability, scanner-first execution, and replenishment signals before adding broader ERP surface area.

Status note:
- `P0.1 Inventory Ledger And Traceability` is now implemented in the current repo state.

## Current Constraints

The current codebase already exposes the main operational loop, but several important capabilities are incomplete:

- `POST /auth/login` is still not implemented
- `GET /inventory/transactions` is not implemented
- `GET /inventory/lots` is not implemented
- `GET /inventory/serials` is not implemented
- 3PL export endpoints are placeholders
- the frontend still relies on persona switching
- the app is currently framed as a single-warehouse system

## P0

### 1. Inventory Ledger And Traceability

Status:
- implemented in the current build

Why:
- Modern systems answer "what happened to this stock?" immediately.
- This is the main trust gap in the current build.

Backend:
- implement `GET /inventory/transactions`
- implement `GET /inventory/lots`
- implement `GET /inventory/serials`
- add filters for item, location, lot, serial, transaction type, reference type, and date range
- expose source document references for receipts, picks, cycle counts, production, and scrap

Likely files:
- `src/routes/inventory.routes.js`
- `src/controllers/inventory.controller.js`
- `src/repositories/inventory.repository.js`
- `src/serializers/inventory.js`

Frontend:
- add an inventory history panel to `Overview` and `Master`
- let users drill from item inventory detail into transaction history
- show lot and serial history when the item requires lot or serial tracking

Likely files:
- `frontend/src/App.jsx`
- `frontend/src/api.js`

Acceptance:
- a user can start from an item and explain current on-hand from posted transactions
- a user can filter lot and serial movement history without using SQL

### 2. Scanner-First Receiving, Picking, And Counting

Why:
- The current UX is still form-first and selection-heavy.
- Warehouse work should be guided task execution, not table navigation.

Backend:
- keep current endpoints, but tighten validation for scan flows
- support scan-oriented request patterns for item barcode, location barcode, lot, and serial input
- return workflow hints such as expected location, required lot tracking, serial count remaining, and next action

Likely files:
- `src/controllers/receipts.controller.js`
- `src/repositories/receipts.repository.js`
- `src/controllers/fulfillment.controller.js`
- `src/repositories/salesOrders.repository.js`
- `src/controllers/cycleCounts.controller.js`
- `src/repositories/cycleCounts.repository.js`
- `src/utils/barcode.js`

Frontend:
- add dedicated guided modes for receiving, picking, and cycle count entry
- reduce dependency on selecting a row in a table before every transaction
- default the operator to scan item -> scan location -> confirm quantity

Likely files:
- `frontend/src/App.jsx`
- `frontend/src/styles.css`

Acceptance:
- an operator can complete receiving and picking from a narrow task flow with minimal table interaction
- scan errors are explicit and recoverable

### 3. Real Login And User Accountability

Why:
- Persona switching is acceptable for a scaffold, not for production control.
- Every stock movement should be attributable to a real user.

Backend:
- implement `POST /auth/login`
- formalize `GET /auth/me`
- preserve current RBAC behavior, but derive request context from authenticated identity rather than manual persona headers

Likely files:
- `src/routes/auth.routes.js`
- `src/controllers/auth.controller.js`
- `src/middleware/auth.js`
- `src/utils/authContext.js`

Frontend:
- replace the persona switcher with a real login/session shell
- show current user identity, role, and session state

Likely files:
- `frontend/src/App.jsx`
- `frontend/src/api.js`

Acceptance:
- every transaction in the main warehouse and manufacturing flows is tied to an authenticated user
- the persona selector no longer appears in the main UI

## P1

### 4. Replenishment And Stock Risk Dashboard

Why:
- The schema already contains `min_stock_level` and `reorder_quantity`.
- The product should move from passive visibility to active planning.

Backend:
- add a replenishment endpoint or extend inventory summary responses
- flag items below min, at reorder point, and projected shortage
- include recommended PO quantity and lead-time aware risk windows where possible

Likely files:
- `src/repositories/items.repository.js`
- `src/repositories/inventory.repository.js`
- `src/controllers/items.controller.js` or `src/controllers/inventory.controller.js`

Frontend:
- add a replenishment dashboard to `Overview`
- add a low-stock and stock-risk view in `Master`
- let users jump from a risk row to draft PO creation

Likely files:
- `frontend/src/App.jsx`

Acceptance:
- buyers can identify shortage risk without exporting data
- low-stock review becomes a daily workflow, not a manual audit

### 5. Better Location Strategy And Internal Transfers

Why:
- The schema already supports meaningful location types.
- The product narrative is still single-warehouse and receipt-centric.

Backend:
- add explicit transfer workflows between receiving, storage, pick-face, staging, production, shipping, and quarantine
- expose stronger putaway and location-capacity behavior

Likely files:
- `src/repositories/locations.repository.js`
- `src/controllers/locations.controller.js`
- `src/routes/locations.routes.js`
- `database/schema/001_ims_mvp.sql` only if extra transfer entities are needed

Frontend:
- add transfer creation and confirmation flows
- show location purpose and stock by location more clearly

Likely files:
- `frontend/src/App.jsx`

Acceptance:
- users can move inventory internally without using receipt or adjustment workarounds
- location dashboards make pick-face, bulk, and quarantine stock visible

### 6. Exception Management

Why:
- The best systems make problems obvious before users search for them.

Backend:
- expose exception summaries for short picks, overdue open receipts, unresolved discrepancies, open scrap, and zero-available items with demand

Likely files:
- `src/repositories/inventory.repository.js`
- `src/repositories/receipts.repository.js`
- `src/repositories/salesOrders.repository.js`
- `src/repositories/cycleCounts.repository.js`
- `src/repositories/manufacturing.repository.js`

Frontend:
- convert `Overview` from a metric board into an exception board
- make each warning metric clickable into the underlying queue

Likely files:
- `frontend/src/App.jsx`

Acceptance:
- supervisors can see the top operational risks from one screen

## P2

### 7. Multi-Warehouse Readiness

Why:
- The current manual frames the system as single-warehouse.
- Growth will eventually require site-aware planning and execution.

Backend:
- review assumptions that silently treat all locations as one facility
- add warehouse or site grouping where needed

Likely files:
- `database/schema/001_ims_mvp.sql`
- repositories that aggregate balances or allocate stock

Frontend:
- add warehouse filters to overview, inventory, receiving, and fulfillment views

Acceptance:
- stock visibility and allocation can be constrained by warehouse or site

### 8. 3PL And External Fulfillment Integration

Why:
- The endpoints exist in the API surface but are still placeholders.

Backend:
- implement `POST /fulfillment/exports/3pl`
- implement `GET /fulfillment/exports/3pl/:exportId`
- persist export payloads and statuses

Likely files:
- `src/routes/fulfillment.routes.js`
- `src/controllers/fulfillment.controller.js`
- `src/repositories/salesOrders.repository.js` or a dedicated export repository

Frontend:
- add export initiation and status tracking in `Fulfillment`

Acceptance:
- outbound orders can be handed off to an external fulfillment process with status visibility

### 9. Dedicated Admin Workspace

Why:
- User and role administration already exists in the API.
- It should not remain backend-only.

Backend:
- reuse existing user and role endpoints

Frontend:
- add a user and role management workspace for `Admin`

Likely files:
- `frontend/src/App.jsx`

Acceptance:
- admin users can manage access without leaving the product

## Recommended Execution Order

1. P0.2 Scanner-first execution flows
2. P0.3 Real login and user accountability
3. P1.4 Replenishment dashboard
4. P1.5 Internal transfers and stronger location workflows
5. P1.6 Exception management
6. P2 items after the core operating loop is stable

## What To Avoid

- Do not expand into large ERP configuration screens before traceability is complete.
- Do not build advanced planning on top of incomplete transaction visibility.
- Do not add more manual table workflows when guided operator flows are the bigger need.
- Do not add multi-warehouse logic until current single-site execution is reliable.
