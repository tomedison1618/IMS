# IMS User Manual

## 1. Purpose

This manual describes the current Inventory Management System (IMS) application in this repository, based on the implemented React frontend and Express API.

The current app is designed for a single-warehouse electronics operation and supports:

- master data maintenance
- purchasing and receiving
- inventory visibility
- sales order allocation and picking
- cycle counts and discrepancy approval
- bill of materials (BoM) maintenance
- production completion and backflush
- scrap request signoff

## 2. Current Access Model

The current frontend uses a persona switcher instead of a full login flow.

- `Admin`
- `Finance`
- `Operations`

Important notes:

- The persona selector is the current way to test role-based access in the frontend.
- The backend still enforces permissions on every API call.
- Some screens may still be visible to multiple personas, but actions are allowed or blocked by backend authorization.
- The current `POST /auth/login` endpoint is listed in the API but is not implemented yet.

## 3. Application Overview

The frontend is organized into six work areas:

- `Overview`: dashboard metrics and a live inventory snapshot
- `Master`: items, suppliers, customers, item inventory detail, barcode generation
- `Inbound`: purchase orders and receiving
- `Fulfillment`: sales orders, allocation, pick creation, pick confirmation
- `Counts`: cycle count entry and discrepancy approval
- `Manufacturing`: BoMs, production orders, completions, backflush, and scrap

The application follows a simple operational flow:

1. Create or maintain master data.
2. Create purchase orders and receive stock.
3. Review inventory and create sales orders.
4. Allocate demand and confirm picks.
5. Perform cycle counts and resolve discrepancies.
6. Define BoMs and run production.
7. Record scrap when required.

## 4. Common UI Behavior

Several actions depend on selecting a record from a table before using the action buttons above it.

Examples:

- select a purchase order before adding PO lines or approving it
- select a receipt before adding receipt lines or posting it
- select a sales order before allocating it or creating a pick
- select a cycle count before adding count lines or submitting it
- select a discrepancy ticket before approving it
- select a BoM before adding BoM lines or activating it
- select a production order before recording completion, previewing backflush, or running backflush

Other important behavior:

- `Admin` and `Finance` can view item cost fields
- `Operations` can work through most transactional workflows
- the `Refresh workspace` button reloads data for the current persona
- English and Vietnamese are available in the language selector

## 5. Main Data Objects

- `Suppliers` and `Customers`: partner master data
- `Items`: raw materials, sub-assemblies, and finished goods
- `Locations`: receiving and storage locations
- `Purchase Orders`: procurement documents
- `Receipts`: inbound stock receipts
- `Sales Orders`: outbound customer demand
- `Cycle Counts`: stock verification events
- `Discrepancy Tickets`: approval queue created from count mismatches
- `BoMs`: versioned bills of materials
- `Production Orders`: manufacturing jobs for finished goods
- `Scrap Requests`: controlled scrap workflow

## 6. Role Summary

### Admin

Admin has full access to all implemented application areas.

Admin can:

- perform all Operations workflows
- perform all Finance workflows
- view financial item data such as unit cost
- access user and role management endpoints in the backend API

Note:

- User and role administration exists in the API, but there is no dedicated user-management page in the current frontend.

### Finance

Finance is an oversight and approval role.

Finance can:

- review inventory, purchase orders, receipts, and sales orders
- view item cost data
- review cycle count discrepancies
- approve or reject discrepancy tickets

Finance cannot perform the main warehouse and production execution steps such as:

- creating suppliers, customers, items, or locations
- receiving stock
- creating picks or confirming picks
- creating and submitting cycle counts
- creating BoMs or production orders

### Operations

Operations is the main execution role.

Operations can:

- create and maintain suppliers, customers, items, and locations
- create purchase orders, add PO lines, and approve POs
- create receipts, add receipt lines, and post receipts
- create and allocate sales orders
- create picks and confirm picks
- create and submit cycle counts
- create BoMs, add BoM lines, and activate BoMs
- create production orders, record completions, preview backflush, and run backflush
- create scrap requests and complete both signoff steps in the current simplified role model

Operations cannot approve discrepancy tickets unless using the `Admin` role.

## 7. General Operating Workflow

This is the typical end-to-end business flow in the current app:

1. Set up suppliers, customers, items, and locations in `Master`.
2. Create a purchase order in `Inbound`.
3. Add one or more PO lines.
4. Approve the purchase order.
5. Create a receipt for the selected PO.
6. Add receipt lines and post the receipt.
7. Confirm the new stock in `Overview` or `Master > Items and Inventory`.
8. Create a sales order in `Fulfillment`.
9. Allocate the sales order, create a pick, and confirm the pick.
10. Run cycle counts as needed and send discrepancies to Finance/Admin.
11. Maintain BoMs and create production orders in `Manufacturing`.
12. Record completions, preview backflush, and execute backflush.

## 8. Role-Based Workflows

### 8.1 Admin Workflow

Use Admin when you need full-system supervision or when another role is blocked by permissions.

Recommended Admin workflow:

1. Open the app and select the `Admin` persona.
2. Review `Overview` for open POs, receipts, sales orders, discrepancies, production orders, and zero-available inventory.
3. Go to `Master` to inspect inventory, restricted item cost fields, and barcode generation.
4. Use `Inbound`, `Fulfillment`, `Counts`, and `Manufacturing` for corrective or supervisory actions as needed.
5. Open `Counts` and approve discrepancy tickets when stock mismatches require resolution.
6. If user or role maintenance is required, use the backend user/role endpoints rather than the current frontend.

When to use Admin:

- initial setup
- troubleshooting blocked workflows
- approving discrepancies when Finance is unavailable
- checking restricted financial fields
- backend user and role maintenance

### 8.2 Finance Workflow

Use Finance for visibility, review, and discrepancy control.

Recommended Finance workflow:

1. Open the app and select the `Finance` persona.
2. Review `Overview` to understand current inbound, outbound, and manufacturing load.
3. Go to `Master` and inspect item master data. Unit cost is visible for this role.
4. Open `Inbound` to review purchase orders and receipts.
5. Open `Fulfillment` to review sales orders and shipment demand.
6. Open `Counts` and monitor the discrepancy approval queue.
7. Select a discrepancy ticket in the right-side table and approve or reject it.

Finance workflow outcome:

- Finance confirms the financial and control side of the operation.
- Finance does not execute warehouse or production transactions.

### 8.3 Operations Workflow

Use Operations for day-to-day execution.

#### A. Master Data Setup

1. Open the app and select the `Operations` persona.
2. Go to `Master`.
3. Create suppliers and customers in the `Partners` panel.
4. Create items in the `Create Item` panel.
5. Select an item in `Items and Inventory` to inspect balances.
6. Generate internal barcodes when needed.

#### B. Purchasing and Receiving

1. Go to `Inbound`.
2. Create a purchase order.
3. Select the purchase order from `Recent Purchase Orders`.
4. Add one or more PO lines.
5. Approve the selected purchase order.
6. Create a receipt for the selected PO.
7. Add one or more receipt lines.
8. Enter receiving location, optional putaway location, and optional manual lot number.
9. Post the selected receipt.
10. Confirm the posted receipt appears in `Recent Receipts`.

Important detail:

- After a PO line is added, the app attempts to prefill the `PO line UUID` in the receipt form from the latest added line.

#### C. Sales and Fulfillment

1. Go to `Fulfillment`.
2. Create a sales order.
3. Select the sales order from the `Sales Orders` table.
4. Allocate the sales order.
5. Create a pick.
6. Confirm the pick.
7. Use the `Picker Context` panel to verify the current pick status.

#### D. Cycle Counts

1. Go to `Counts`.
2. Create a cycle count for a location.
3. Select the cycle count from `Recent Cycle Counts`.
4. Add one or more count lines.
5. Submit the cycle count.
6. If a discrepancy exists, Finance or Admin must resolve it from the approval queue.

#### E. Manufacturing

1. Go to `Manufacturing`.
2. Create a BoM for a finished good.
3. Select the BoM and add one or more component lines.
4. Activate the BoM.
5. Create a production order for the finished good.
6. Select the production order.
7. Record a completion into the chosen finished-goods location.
8. Run `Preview Backflush` to inspect raw material demand.
9. Run `Backflush` to consume the required material.

#### F. Scrap Workflow

1. Stay in `Manufacturing`.
2. Create a scrap request with production order, item, location, quantity, and reason.
3. Use `Production sign`.
4. Use `Warehouse sign`.

Current-role note:

- In the simplified role model, both signoff steps are performed by `Operations`.

## 9. Functional Limits in the Current Build

The following capabilities are not fully implemented in the current application:

- login flow is not implemented; persona switching is used instead
- 3PL export endpoints are placeholders
- inventory transactions, lots, and serial listing endpoints are placeholders
- backend user and role administration is not exposed in a dedicated frontend page

## 10. Launching the App

From the project root, you can use:

```bat
Start-IMS-App.bat
```

This starts:

- backend on `http://localhost:3000`
- frontend on `http://localhost:5173`

## 11. Reference

For the exact REST surface, see:

- `docs/api-endpoints.md`
