param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

$SeedUsers = @{
    Admin       = "10000000-0000-0000-0000-000000000001"
    CFO         = "10000000-0000-0000-0000-000000000002"
    Procurement = "10000000-0000-0000-0000-000000000003"
    Warehouse   = "10000000-0000-0000-0000-000000000004"
    Production  = "10000000-0000-0000-0000-000000000005"
}

$SeedData = @{
    SupplierId        = "40000000-0000-0000-0000-000000000001"
    ReceivingLocation = "50000000-0000-0000-0000-000000000001"
    StorageLocation   = "50000000-0000-0000-0000-000000000002"
}

function New-Headers {
    param(
        [Parameter(Mandatory = $true)][string]$Role,
        [Parameter(Mandatory = $true)][string]$UserId
    )

    return @{
        "x-user-roles" = $Role
        "x-user-id"    = $UserId
    }
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [hashtable]$Headers,
        [object]$Body
    )

    $request = @{
        Method  = $Method
        Uri     = "$BaseUrl$Path"
        Headers = $Headers
    }

    if ($null -ne $Body) {
        $request.ContentType = "application/json"
        $request.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }

    return Invoke-RestMethod @request
}

function Assert-Equal {
    param(
        [Parameter(Mandatory = $true)]$Actual,
        [Parameter(Mandatory = $true)]$Expected,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if ($Actual -ne $Expected) {
        throw "$Message. Expected '$Expected' but got '$Actual'."
    }
}

$suffix = Get-Date -Format "yyyyMMddHHmmss"

Write-Host "Checking API health..."
$health = Invoke-RestMethod "$BaseUrl/health"
Assert-Equal $health.status "ok" "Health check failed"

Write-Host "Creating raw material item..."
$rawItem = Invoke-Api -Method Post -Path "/api/v1/items" -Headers (New-Headers -Role "PROCUREMENT_MANAGER" -UserId $SeedUsers.Procurement) -Body @{
    internalSku      = "RM-DEMO-$suffix"
    name             = "Demo Raw Component $suffix"
    itemType         = "RAW_MATERIAL"
    uom              = "EA"
    minStockLevel    = 10
    reorderQuantity  = 100
    leadTimeDays     = 5
    unitCost         = 0.10
}

Write-Host "Creating purchase order and receiving raw material..."
$purchaseOrder = Invoke-Api -Method Post -Path "/api/v1/purchase-orders" -Headers (New-Headers -Role "PROCUREMENT_MANAGER" -UserId $SeedUsers.Procurement) -Body @{
    supplierId          = $SeedData.SupplierId
    expectedReceiptDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
    notes               = "Smoke test PO $suffix"
}

$purchaseOrder = Invoke-Api -Method Post -Path "/api/v1/purchase-orders/$($purchaseOrder.data.purchaseOrderId)/lines" -Headers (New-Headers -Role "PROCUREMENT_MANAGER" -UserId $SeedUsers.Procurement) -Body @{
    itemId     = $rawItem.data.itemId
    orderedQty = 100
    unitCost   = 0.10
}

[void](Invoke-Api -Method Post -Path "/api/v1/purchase-orders/$($purchaseOrder.data.purchaseOrderId)/approve" -Headers (New-Headers -Role "PROCUREMENT_MANAGER" -UserId $SeedUsers.Procurement))

$receipt = Invoke-Api -Method Post -Path "/api/v1/receipts" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse) -Body @{
    purchaseOrderId = $purchaseOrder.data.purchaseOrderId
    notes           = "Smoke test receipt $suffix"
}

$receipt = Invoke-Api -Method Post -Path "/api/v1/receipts/$($receipt.data.receiptId)/lines" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse) -Body @{
    purchaseOrderLineId = $purchaseOrder.data.lines[0].purchaseOrderLineId
    receivedQty         = 100
    receivingLocationId = $SeedData.ReceivingLocation
    putawayLocationId   = $SeedData.StorageLocation
    manualLotNumber     = "LOT-$suffix"
}

[void](Invoke-Api -Method Post -Path "/api/v1/receipts/$($receipt.data.receiptId)/post" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse))

$rawInventoryAfterReceipt = Invoke-Api -Method Get -Path "/api/v1/items/$($rawItem.data.itemId)/inventory" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)
Assert-Equal $rawInventoryAfterReceipt.data.totals.quantityOnHand 100 "Raw inventory after receipt is wrong"

Write-Host "Creating customer and outbound pick flow..."
$customer = Invoke-Api -Method Post -Path "/api/v1/customers" -Headers (New-Headers -Role "PROCUREMENT_MANAGER" -UserId $SeedUsers.Procurement) -Body @{
    customerCode = "CUST-$suffix"
    customerName = "Demo Customer $suffix"
    contactEmail = "customer+$suffix@test.local"
    contactPhone = "555-0400"
}

$salesOrder = Invoke-Api -Method Post -Path "/api/v1/sales-orders" -Headers (New-Headers -Role "PROCUREMENT_MANAGER" -UserId $SeedUsers.Procurement) -Body @{
    customerId        = $customer.data.customerId
    externalReference = "SO-$suffix"
    requestedShipDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
    lines             = @(
        @{
            itemId     = $rawItem.data.itemId
            orderedQty = 10
        }
    )
}

$allocated = Invoke-Api -Method Post -Path "/api/v1/sales-orders/$($salesOrder.data.salesOrderId)/allocate" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)
$pick = Invoke-Api -Method Post -Path "/api/v1/fulfillment/sales-orders/$($salesOrder.data.salesOrderId)/picks" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)
$pickConfirmed = Invoke-Api -Method Post -Path "/api/v1/fulfillment/sales-orders/$($salesOrder.data.salesOrderId)/picks/$($pick.data.pick.pickId)/confirm" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)
$rawInventoryAfterPick = Invoke-Api -Method Get -Path "/api/v1/items/$($rawItem.data.itemId)/inventory" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)

Assert-Equal $pickConfirmed.data.salesOrder.status "PICKED" "Sales order did not reach PICKED"
Assert-Equal $rawInventoryAfterPick.data.totals.quantityOnHand 90 "Raw inventory after pick is wrong"

Write-Host "Running cycle count mismatch and approval..."
$cycleCount = Invoke-Api -Method Post -Path "/api/v1/cycle-counts" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse) -Body @{
    locationId = $SeedData.StorageLocation
    notes      = "Smoke test cycle count $suffix"
}

$cycleCount = Invoke-Api -Method Post -Path "/api/v1/cycle-counts/$($cycleCount.data.cycleCountId)/lines" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse) -Body @{
    itemId     = $rawItem.data.itemId
    lotId      = $rawInventoryAfterPick.data.balances[0].lotId
    countedQty = 85
    notes      = "Found 5 short"
}

$cycleCount = Invoke-Api -Method Post -Path "/api/v1/cycle-counts/$($cycleCount.data.cycleCountId)/submit" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)
$tickets = Invoke-Api -Method Get -Path "/api/v1/cycle-counts/discrepancy-tickets" -Headers (New-Headers -Role "CFO" -UserId $SeedUsers.CFO)
$ticket = $tickets.data | Where-Object { $_.cycleCountId -eq $cycleCount.data.cycleCountId } | Select-Object -First 1

if (-not $ticket) {
    throw "No discrepancy ticket was created for cycle count $($cycleCount.data.cycleCountId)."
}

$ticketApproved = Invoke-Api -Method Post -Path "/api/v1/cycle-counts/discrepancy-tickets/$($ticket.discrepancyTicketId)/approve" -Headers (New-Headers -Role "CFO" -UserId $SeedUsers.CFO)
$rawInventoryAfterCycleCount = Invoke-Api -Method Get -Path "/api/v1/items/$($rawItem.data.itemId)/inventory" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)

Assert-Equal $ticketApproved.data.status "APPLIED" "Discrepancy ticket did not apply"
Assert-Equal $rawInventoryAfterCycleCount.data.totals.quantityOnHand 85 "Raw inventory after cycle count adjustment is wrong"

Write-Host "Creating finished good, BoM, production order, and backflush..."
$finishedGood = Invoke-Api -Method Post -Path "/api/v1/items" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production) -Body @{
    internalSku      = "FG-DEMO-$suffix"
    name             = "Demo Finished Good $suffix"
    itemType         = "FINISHED_GOOD"
    uom              = "EA"
    minStockLevel    = 5
    reorderQuantity  = 10
    leadTimeDays     = 2
}

$bom = Invoke-Api -Method Post -Path "/api/v1/boms" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production) -Body @{
    parentItemId = $finishedGood.data.itemId
    versionName  = "v1.0"
    notes        = "Smoke test BoM"
}

$bom = Invoke-Api -Method Post -Path "/api/v1/boms/$($bom.data.bomId)/lines" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production) -Body @{
    componentItemId   = $rawItem.data.itemId
    quantity          = 2
    scrapAllowancePct = 0
}

[void](Invoke-Api -Method Post -Path "/api/v1/boms/$($bom.data.bomId)/activate" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production))

$productionOrder = Invoke-Api -Method Post -Path "/api/v1/manufacturing/production-orders" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production) -Body @{
    finishedGoodItemId = $finishedGood.data.itemId
    quantityPlanned    = 5
    externalReference  = "MO-$suffix"
}

[void](Invoke-Api -Method Post -Path "/api/v1/manufacturing/production-orders/$($productionOrder.data.productionOrderId)/completions" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production) -Body @{
    quantityCompleted = 5
    locationId        = $SeedData.StorageLocation
})

$backflush = Invoke-Api -Method Post -Path "/api/v1/manufacturing/production-orders/$($productionOrder.data.productionOrderId)/backflush" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production)
$rawInventoryAfterBackflush = Invoke-Api -Method Get -Path "/api/v1/items/$($rawItem.data.itemId)/inventory" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)
$finishedGoodInventory = Invoke-Api -Method Get -Path "/api/v1/items/$($finishedGood.data.itemId)/inventory" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production)

Assert-Equal $backflush.data.productionOrder.status "BACKFLUSHED" "Production order did not reach BACKFLUSHED"
Assert-Equal $rawInventoryAfterBackflush.data.totals.quantityOnHand 75 "Raw inventory after backflush is wrong"
Assert-Equal $finishedGoodInventory.data.totals.quantityOnHand 5 "Finished good inventory after completion is wrong"

Write-Host "Posting dual-signoff scrap..."
$scrap = Invoke-Api -Method Post -Path "/api/v1/manufacturing/scrap-requests" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production) -Body @{
    productionOrderId = $productionOrder.data.productionOrderId
    itemId            = $rawItem.data.itemId
    locationId        = $SeedData.StorageLocation
    quantity          = 1
    reason            = "Smoke test scrap"
}

$scrapAfterProduction = Invoke-Api -Method Post -Path "/api/v1/manufacturing/scrap-requests/$($scrap.data.scrapRequestId)/sign-production" -Headers (New-Headers -Role "PRODUCTION_MANAGER" -UserId $SeedUsers.Production)
$rawInventoryBeforeWarehouseScrap = Invoke-Api -Method Get -Path "/api/v1/items/$($rawItem.data.itemId)/inventory" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)
$scrapAfterWarehouse = Invoke-Api -Method Post -Path "/api/v1/manufacturing/scrap-requests/$($scrap.data.scrapRequestId)/sign-warehouse" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)
$rawInventoryAfterScrap = Invoke-Api -Method Get -Path "/api/v1/items/$($rawItem.data.itemId)/inventory" -Headers (New-Headers -Role "WAREHOUSE" -UserId $SeedUsers.Warehouse)

Assert-Equal $scrapAfterProduction.data.status "APPROVED" "Scrap request should remain approved after production sign-off"
Assert-Equal $rawInventoryBeforeWarehouseScrap.data.totals.quantityOnHand 75 "Scrap deducted too early before warehouse sign-off"
Assert-Equal $scrapAfterWarehouse.data.status "POSTED" "Scrap request did not post after warehouse sign-off"
Assert-Equal $rawInventoryAfterScrap.data.totals.quantityOnHand 74 "Raw inventory after scrap is wrong"

[pscustomobject]@{
    RawItemSku                    = $rawItem.data.internalSku
    RawQuantityAfterReceipt       = $rawInventoryAfterReceipt.data.totals.quantityOnHand
    RawQuantityAfterPick          = $rawInventoryAfterPick.data.totals.quantityOnHand
    RawQuantityAfterCycleCount    = $rawInventoryAfterCycleCount.data.totals.quantityOnHand
    RawQuantityAfterBackflush     = $rawInventoryAfterBackflush.data.totals.quantityOnHand
    RawQuantityAfterScrap         = $rawInventoryAfterScrap.data.totals.quantityOnHand
    FinishedGoodSku               = $finishedGood.data.internalSku
    FinishedGoodQuantityOnHand    = $finishedGoodInventory.data.totals.quantityOnHand
    SalesOrderStatus              = $pickConfirmed.data.salesOrder.status
    CycleCountStatus              = $cycleCount.data.status
    DiscrepancyTicketStatus       = $ticketApproved.data.status
    ProductionOrderStatus         = $backflush.data.productionOrder.status
    ScrapStatus                   = $scrapAfterWarehouse.data.status
} | Format-List
