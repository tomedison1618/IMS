# IMS MVP REST API

Base path: `/api/v1`

## Authentication

- `POST /auth/login`
  - body: `email`, `password`, optional `requestedRole`
- `GET /auth/me`

## Roles and Users

- `GET /roles`
- `GET /users`
- `POST /users`
  - body supports `password` and `roleIds`
- `GET /users/:userId`
- `PATCH /users/:userId`
  - body supports `password` for reset/rotation
- `POST /users/:userId/roles`
- `DELETE /users/:userId/roles/:roleId`

## Suppliers and Customers

- `GET /suppliers`
- `POST /suppliers`
- `GET /suppliers/:supplierId`
- `PATCH /suppliers/:supplierId`
- `GET /customers`
- `POST /customers`
- `GET /customers/:customerId`
- `PATCH /customers/:customerId`

## Items and Locations

- `GET /items`
- `POST /items`
- `GET /items/:itemId`
- `PATCH /items/:itemId`
- `GET /items/:itemId/inventory`
- `POST /items/:itemId/internal-barcode`
- `GET /locations`
- `POST /locations`
- `GET /locations/:locationId`
- `PATCH /locations/:locationId`
- `POST /locations/suggest-putaway`

## Inventory

- `GET /inventory/balances`
- `GET /inventory/transactions`
- `GET /inventory/lots`
- `GET /inventory/serials`

## Bill of Materials

- `GET /boms`
- `POST /boms`
- `GET /boms/:bomId`
- `PATCH /boms/:bomId`
- `POST /boms/:bomId/activate`
- `GET /boms/:bomId/explosion`
- `POST /boms/:bomId/lines`
- `PATCH /boms/:bomId/lines/:lineId`
- `DELETE /boms/:bomId/lines/:lineId`

## Purchasing and Receiving

- `GET /purchase-orders`
- `POST /purchase-orders`
- `GET /purchase-orders/:purchaseOrderId`
- `PATCH /purchase-orders/:purchaseOrderId`
- `POST /purchase-orders/:purchaseOrderId/approve`
- `POST /purchase-orders/:purchaseOrderId/lines`
- `PATCH /purchase-orders/:purchaseOrderId/lines/:lineId`
- `GET /receipts`
- `POST /receipts`
- `GET /receipts/:receiptId`
- `POST /receipts/:receiptId/lines`
- `POST /receipts/:receiptId/post`
- `POST /receipts/:receiptId/putaway-suggestions`

## Manufacturing and Scrap

- `GET /manufacturing/production-orders`
- `POST /manufacturing/production-orders`
- `GET /manufacturing/production-orders/:productionOrderId`
- `POST /manufacturing/production-orders/:productionOrderId/completions`
- `GET /manufacturing/production-orders/:productionOrderId/backflush-preview`
- `POST /manufacturing/production-orders/:productionOrderId/backflush`
- `GET /manufacturing/scrap-requests`
- `POST /manufacturing/scrap-requests`
- `POST /manufacturing/scrap-requests/:scrapRequestId/sign-production`
- `POST /manufacturing/scrap-requests/:scrapRequestId/sign-warehouse`

## Sales, Picking, and 3PL Export

- `GET /sales-orders`
- `POST /sales-orders`
- `GET /sales-orders/:salesOrderId`
- `PATCH /sales-orders/:salesOrderId`
- `POST /sales-orders/:salesOrderId/allocate`
- `POST /fulfillment/sales-orders/:salesOrderId/picks`
- `POST /fulfillment/sales-orders/:salesOrderId/picks/:pickId/confirm`
- `POST /fulfillment/exports/3pl`
- `GET /fulfillment/exports/3pl/:exportId`

## Cycle Counts and Discrepancies

- `GET /cycle-counts`
- `POST /cycle-counts`
- `GET /cycle-counts/:cycleCountId`
- `POST /cycle-counts/:cycleCountId/lines`
- `POST /cycle-counts/:cycleCountId/submit`
- `GET /cycle-counts/discrepancy-tickets`
- `GET /cycle-counts/discrepancy-tickets/:ticketId`
- `POST /cycle-counts/discrepancy-tickets/:ticketId/approve`
- `POST /cycle-counts/discrepancy-tickets/:ticketId/reject`
