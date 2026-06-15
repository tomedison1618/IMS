import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createApiClient } from './api.js';
import PostefLogo from './PostefLogo.jsx';

const DEMO_CREDENTIALS = [
  { label: 'Admin demo', email: 'admin@ims.local', password: 'Admin123!', requestedRole: 'ADMIN' },
  { label: 'Finance demo', email: 'finance@ims.local', password: 'Finance123!', requestedRole: 'FINANCE' },
  { label: 'Operations demo', email: 'operations@ims.local', password: 'Ops123!', requestedRole: 'OPERATIONS' }
];
const DEFAULT_LOGIN_FORM = {
  email: DEMO_CREDENTIALS[0].email,
  password: DEMO_CREDENTIALS[0].password,
  requestedRole: DEMO_CREDENTIALS[0].requestedRole
};
const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'LOCKED'];
const SUPPORTED_ITEM_CURRENCIES = ['USD', 'VND'];
const EMPTY_DATA = {
  me: null,
  roles: [],
  users: [],
  suppliers: [],
  customers: [],
  items: [],
  locations: [],
  inventory: [],
  purchaseOrders: [],
  receipts: [],
  salesOrders: [],
  cycleCounts: [],
  discrepancyTickets: [],
  boms: [],
  productionOrders: [],
  scrapRequests: []
};

const DEFAULT_FORMS = {
  login: DEFAULT_LOGIN_FORM,
  user: { email: '', firstName: '', lastName: '', status: 'ACTIVE', password: '', roleIds: [] },
  supplier: { supplierCode: '', supplierName: '', contactEmail: '', contactPhone: '', leadTimeDays: '14' },
  customer: { customerCode: '', customerName: '', contactEmail: '', contactPhone: '' },
  item: { internalSku: '', name: '', itemType: 'RAW_MATERIAL', uom: 'EA', minStockLevel: '0', reorderQuantity: '0', leadTimeDays: '0', unitCost: '0' },
  itemEdit: { internalSku: '', name: '', itemType: 'RAW_MATERIAL', uom: 'EA', supplierSku: '', description: '', minStockLevel: '0', reorderQuantity: '0', leadTimeDays: '0', requiresLotTracking: 'false', requiresSerialTracking: 'false', unitCost: '0' },
  inventoryImport: {
    filePath: 'D:\\apps\\IMS\\docs\\BC ton kho samples.xlsx',
    locationCode: 'STOR-01',
    locationName: '',
    locationType: 'STORAGE',
    defaultItemType: 'RAW_MATERIAL',
    unitCostCurrencyCode: 'VND',
    dryRun: 'true'
  },
  purchaseOrder: { supplierId: '', expectedReceiptDate: '', notes: '' },
  purchaseOrderLine: { itemId: '', orderedQty: '100', unitCost: '0' },
  receipt: { purchaseOrderId: '', notes: '' },
  receiptLine: { receiptId: '', purchaseOrderLineId: '', receivedQty: '100', receivingLocationId: '', putawayLocationId: '', manualLotNumber: '' },
  receivingScan: { itemScan: '', receivingLocationScan: '', putawayLocationScan: '', receivedQty: '1', lotScan: '', serialNumbers: '' },
  salesOrder: { customerId: '', externalReference: '', requestedShipDate: '', itemId: '', orderedQty: '10' },
  pickingScan: { itemScan: '', locationScan: '' },
  cycleCount: { locationId: '', notes: '' },
  cycleCountLine: { cycleCountId: '', itemId: '', countedQty: '0', lotId: '' },
  countScan: { locationScan: '', itemScan: '', lotScan: '', serialScan: '', countedQty: '0' },
  bom: { parentItemId: '', versionName: 'v1.0', notes: '' },
  bomLine: { bomId: '', componentItemId: '', quantity: '1', scrapAllowancePct: '0' },
  bomEdit: { versionName: '', notes: '' },
  bomLineEdit: { componentItemId: '', quantity: '1', scrapAllowancePct: '0' },
  bomExplosion: { quantity: '1' },
  productionOrder: { finishedGoodItemId: '', bomId: '', quantityPlanned: '5', externalReference: '' },
  completion: { productionOrderId: '', quantityCompleted: '5', locationId: '', serialNumbers: '' },
  scrap: { productionOrderId: '', itemId: '', locationId: '', quantity: '1', reason: '' }
};

const TEXT = {
  en: {
    'brand.eyebrow': 'Electronics IMS',
    'brand.title': 'Operations Workbench',
    'brand.description': 'Scanner-friendly UI for receiving, inventory control, fulfillment, production, and administration.',
    'auth.title': 'IMS Login',
    'auth.description': 'Sign in with a seeded demo account or a managed user account to open the workbench.',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.requestRole': 'Requested role',
    'auth.signIn': 'Sign in',
    'auth.demoAccount': '{role} demo',
    'auth.demoHint': 'Demo logins: admin@ims.local / Admin123!, finance@ims.local / Finance123!, and operations@ims.local / Ops123!.',
    'hero.eyebrow': 'Live warehouse + production console',
    'hero.title': 'Single-warehouse IMS frontend',
    'hero.description': 'The UI uses the current REST API directly and keeps backend RBAC visible through authenticated request roles.',
    'sidebar.user': 'Signed in user',
    'sidebar.requestRole': 'Request role',
    'sidebar.language': 'Language',
    'sidebar.refresh': 'Refresh workspace',
    'sidebar.logout': 'Sign out',
    'language.en': 'English',
    'language.vi': 'Vietnamese',
    'toast.status': 'Status',
    'message.ready': 'Ready.',
    'message.workspaceRefreshed': 'Workspace refreshed for {role}.',
    'message.actionCompleted': '{action} completed.',
    'message.workingOn': 'Working on {action}...',
    'message.loginSuccess': 'Signed in successfully.',
    'message.sessionExpired': 'Your session is no longer valid. Sign in again.',
    'message.signedOut': 'Signed out.',
    'message.itemRequiresBomSetup': '{sku} is now a manufactured item. Set up its BoM in Components next.',
    'nav.overview': 'Overview',
    'nav.master': 'Master',
    'nav.purchaseOrders': 'Purchase Orders',
    'nav.receiving': 'Receiving',
    'nav.fulfillment': 'Fulfillment',
    'nav.counts': 'Counts',
    'nav.manufacturing': 'Manufacturing',
    'nav.users': 'Users',
    'nav.more': 'More',
    'users.directoryTitle': 'User Directory',
    'users.directoryDescription': 'Admin-only list of IMS users and their current roles.',
    'users.createTitle': 'Create User',
    'users.createDescription': 'Add a new login, assign roles, and activate the account.',
    'users.editTitle': 'Edit User',
    'users.editDescription': 'Update profile fields, account status, role assignments, or rotate the password.',
    'users.newUser': 'New user',
    'users.email': 'Email',
    'users.name': 'Name',
    'users.firstName': 'First name',
    'users.lastName': 'Last name',
    'users.status': 'Status',
    'users.roles': 'Roles',
    'users.rolesDescription': 'Assign one or more request roles to the selected account.',
    'users.password': 'Password',
    'users.passwordReset': 'Set new password',
    'users.passwordResetPlaceholder': 'Leave blank to keep the current password',
    'users.createUser': 'Create user',
    'users.saveUser': 'Save user',
    'users.clearSelection': 'Clear selection',
    'users.lastLogin': 'Last login',
    'common.notSet': 'Not set',
    'common.noRecords': 'No records yet.',
    'common.restricted': 'Restricted',
    'common.sku': 'SKU',
    'common.code': 'Code',
    'common.name': 'Name',
    'common.type': 'Type',
    'common.status': 'Status',
    'common.item': 'Item',
    'common.location': 'Location',
    'common.qty': 'Qty',
    'common.notes': 'Notes',
    'common.reason': 'Reason',
    'common.customer': 'Customer',
    'common.supplier': 'Supplier',
    'common.version': 'Version',
    'common.quantity': 'Quantity',
    'common.available': 'Available',
    'common.onHand': 'On hand',
    'common.reserved': 'Reserved',
    'common.created': 'Created',
    'common.required': 'Required',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.updated': 'Updated',
    'common.date': 'Ngày',
    'common.reference': 'Tham chiếu',
    'common.createdBy': 'Tạo bởi',
    'common.lot': 'Lô',
    'common.serial': 'Sê-ri',
    'common.yes': 'Có',
    'common.no': 'Không',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.enterReason': 'Enter reason',
    'common.searchSkuName': 'Search SKU or name',
    'common.selectSupplier': 'Select supplier',
    'common.selectCustomer': 'Select customer',
    'common.selectItem': 'Select item',
    'common.selectLocation': 'Select location',
    'common.selectFg': 'Select manufactured item',
    'common.selectComponent': 'Select component',
    'itemType.RAW_MATERIAL': 'Raw Material',
    'itemType.SUB_ASSEMBLY': 'Sub-Assembly',
    'itemType.FINISHED_GOOD': 'Finished Good',
    'metric.openPos': 'Open POs',
    'metric.openPosSub': 'Purchasing pipeline',
    'metric.receipts': 'Receipts',
    'metric.receiptsSub': 'Inbound activity',
    'metric.salesOrders': 'Sales Orders',
    'metric.salesOrdersSub': 'Outbound demand',
    'metric.discrepancies': 'Discrepancies',
    'metric.discrepanciesSub': 'Approval queue',
    'metric.productionOrders': 'Production Orders',
    'metric.productionOrdersSub': 'Manufacturing queue',
    'metric.zeroAvailable': 'Zero Available',
    'metric.zeroAvailableSub': 'At-risk balances',
    'overview.inventoryTitle': 'Live Inventory',
    'overview.inventoryDescription': 'Visible balances in the current warehouse state.',
    'overview.locationCode': 'Location',
    'overview.lot': 'Lot',
    'master.createItemTitle': 'Create Item',
    'master.createItemDescription': 'Raw materials, sub-assemblies, or finished goods.',
    'master.internalSku': 'Internal SKU',
    'master.itemType': 'Item Type',
    'master.uom': 'UoM',
    'master.minStock': 'Min stock',
    'master.reorderQty': 'Reorder qty',
    'master.leadTime': 'Lead time',
    'master.unitCost': 'Unit cost',
    'master.unitCostPlaceholder': 'USD 1.25 or VND 25000',
    'master.unitCostHint': 'Use USD, VND, $, or ₫. Plain numbers default to USD.',
    'master.unitCostInvalid': 'Enter a valid unit cost like USD 1.25 or VND 25000.',
    'master.createItem': 'Create item',
    'master.partnersTitle': 'Partners',
    'master.partnersDescription': 'Quick-create suppliers and customers for testing.',
    'master.supplierTitle': 'Supplier',
    'master.customerTitle': 'Customer',
    'master.createSupplier': 'Create supplier',
    'master.createCustomer': 'Create customer',
    'master.itemsInventoryTitle': 'Items and Inventory',
    'master.itemsInventoryDescription': 'Inspect stock and generate internal barcodes.',
    'master.selectItemTitle': 'Select an Item',
    'master.selectItemDescription': 'Choose an item from the list to inspect balances, transactions, lots, and serials.',
    'master.activeItems': 'Active Items',
    'master.archivedItems': 'Archived Items',
    'master.archiveItem': 'Archive item',
    'master.restoreItem': 'Restore item',
    'master.deleteArchivedItem': 'Delete archived item',
    'master.archiveWarning': 'Archive removes the item from the active list but keeps history.',
    'master.archivedWarning': 'Archived items can be restored. Admin can permanently delete archived items that have no references.',
    'master.archiveConfirm': 'Archive the selected item?',
    'master.restoreConfirm': 'Restore the selected item?',
    'master.deleteArchivedConfirm': 'Permanently delete the selected archived item?',
    'master.barcode': 'Barcode',
    'master.refreshInventory': 'Refresh inventory',
    'master.generateBarcode': 'Generate barcode',
    'master.importTab': 'Import',
    'master.importTitle': 'Import Ending Balances',
    'master.importDescription': 'Load a flat ending-balance workbook into the current warehouse using the backend import module.',
    'master.importFilePath': 'Workbook path',
    'master.importLocationCode': 'Location code',
    'master.importLocationName': 'Location name',
    'master.importLocationType': 'Location type',
    'master.importDefaultItemType': 'Default item type',
    'master.importCurrency': 'Unit cost currency',
    'master.importDryRun': 'Mode',
    'master.importDryRunOption': 'Dry run only',
    'master.importApplyOption': 'Apply import',
    'master.importButton': 'Run import',
    'master.importSummaryTitle': 'Last import summary',
    'master.importRowsRead': 'Rows read',
    'master.importItemsCreated': 'Items created',
    'master.importItemsUpdated': 'Items updated',
    'master.importBalancesCreated': 'Balances created',
    'master.importBalancesAdjusted': 'Balances adjusted',
    'master.importTransactionsCreated': 'Transactions created',
    'master.importPreviewTitle': 'Preview rows',
    'master.importWarningsTitle': 'Duplicate SKU warnings',
    'master.importWarningsDescription': 'If a SKU appears more than once in the workbook, the importer keeps the current behavior: the last row wins for the final on-hand balance.',
    'master.importWarningRows': 'Rows',
    'master.importWarningBehavior': 'Behavior',
    'master.importWarningBehaviorLastRowWins': 'Last row wins',
    'master.editItem': 'Edit item',
    'master.saveItem': 'Save item',
    'master.cancelEdit': 'Cancel edit',
    'master.itemSettingsTitle': 'Item Settings',
    'master.itemSettingsDescription': 'Maintain the selected item master data and planning rules.',
    'master.overviewTab': 'Overview',
    'master.componentsTab': 'Components',
    'master.transactionsTab': 'Transactions',
    'master.lotsTab': 'Lots',
    'master.serialsTab': 'Serials',
    'master.editTab': 'Edit',
    'master.supplierSku': 'Supplier SKU',
    'master.descriptionLabel': 'Description',
    'master.lotTracking': 'Lot tracking',
    'master.serialTracking': 'Serial tracking',
    'master.trackingRequired': 'Required',
    'master.trackingNotRequired': 'Not required',
    'master.componentsTitle': 'Components / BoM',
    'master.componentsDescription': 'Active component list linked to this finished item or sub-assembly.',
    'master.activeBomVersion': 'Active BoM',
    'master.componentCount': 'Components',
    'master.openBomWorkspace': 'Open BoM workspace',
    'master.createBomWorkspace': 'Create in BoM workspace',
    'master.noActiveBomTitle': 'No active BoM linked',
    'master.noActiveBomDescription': 'This item does not have an active component list yet.',
    'master.loadingBom': 'Loading active BoM...',
    'master.restrictedBomDescription': 'BoM details are available to Admin and Operations personas.',
    'master.balanceBreakdownTitle': 'Balance Breakdown',
    'master.balanceBreakdownDescription': 'Current balances by location, lot, and serial.',
    'master.transactionHistoryTitle': 'Transaction History',
    'master.transactionHistoryDescription': 'Posted inventory movements for the selected item.',
    'master.lotsTitle': 'Lots',
    'master.lotsDescription': 'Lot records and current quantity exposure.',
    'master.serialsTitle': 'Serials',
    'master.serialsDescription': 'Tracked serial numbers and current warehouse state.',
    'master.supplierLot': 'Supplier lot',
    'master.expiration': 'Expiration',
    'master.locationCount': 'Locations',
    'master.currentLocation': 'Current location',
    'inbound.purchaseOrdersTitle': 'Purchase Orders',
    'inbound.purchaseOrdersDescription': 'Create, line, and approve procurement orders.',
    'inbound.expectedReceipt': 'Expected receipt',
    'inbound.createPo': 'Create PO',
    'inbound.approveSelectedPo': 'Approve selected PO',
    'inbound.addPoLine': 'Add PO line',
    'inbound.receivingTitle': 'Receiving',
    'inbound.receivingDescription': 'Capture lot numbers and post stock into storage.',
    'inbound.createReceipt': 'Create receipt',
    'inbound.postSelectedReceipt': 'Post selected receipt',
    'inbound.poLineUuid': 'PO line UUID',
    'inbound.receivedQty': 'Received qty',
    'inbound.receivingBin': 'Receiving bin',
    'inbound.putawayBin': 'Putaway bin',
    'inbound.manualLot': 'Manual lot',
    'inbound.addReceiptLine': 'Add receipt line',
    'inbound.scanReceiveTitle': 'Guided Receive',
    'inbound.scanReceiveDescription': 'Scan item and location values, then add a receipt line with resolved context.',
    'inbound.itemScan': 'Item scan',
    'inbound.locationScan': 'Location scan',
    'inbound.putawayScan': 'Putaway scan',
    'inbound.serialList': 'Serial list',
    'inbound.applyScannedReceipt': 'Apply scanned receipt line',
    'inbound.receiptContext': 'Receipt context',
    'inbound.poLineMatch': 'PO line match',
    'inbound.autoReceiptNote': 'If no receipt is selected, the app will create one for the selected PO.',
    'inbound.recentPurchaseOrdersTitle': 'Recent Purchase Orders',
    'inbound.recentPurchaseOrdersDescription': 'Select one to set the receipt context.',
    'inbound.po': 'PO',
    'inbound.expected': 'Expected',
    'inbound.recentReceiptsTitle': 'Recent Receipts',
    'inbound.recentReceiptsDescription': 'Posted receipts create lot-level inventory balances.',
    'inbound.receipt': 'Receipt',
    'inbound.posted': 'Posted',
    'fulfillment.createSalesOrderTitle': 'Create Sales Order',
    'fulfillment.createSalesOrderDescription': 'Outbound picking remains one order at a time.',
    'fulfillment.externalReference': 'External reference',
    'fulfillment.requestedShipDate': 'Requested ship date',
    'fulfillment.createSalesOrder': 'Create sales order',
    'fulfillment.allocate': 'Allocate',
    'fulfillment.createPick': 'Create pick',
    'fulfillment.confirmPick': 'Confirm pick',
    'fulfillment.guidedPickTitle': 'Guided Pick',
    'fulfillment.guidedPickDescription': 'Load the current open pick, scan a location and item, then confirm the pick.',
    'fulfillment.loadOpenPick': 'Load open pick',
    'fulfillment.pickLocationScan': 'Pick location scan',
    'fulfillment.pickItemScan': 'Pick item scan',
    'fulfillment.confirmGuidedPick': 'Confirm guided pick',
    'fulfillment.openPickLines': 'Open pick lines',
    'fulfillment.matchedPickLine': 'Matched pick line',
    'fulfillment.confirmWholePickNote': 'Confirming the guided pick posts all lines on the open pick.',
    'fulfillment.pickerContextTitle': 'Picker Context',
    'fulfillment.pickerContextDescription': 'Use the Operations persona to stay aligned with permissions.',
    'fulfillment.currentRequestRole': 'Current request role',
    'fulfillment.currentPick': 'Current pick',
    'fulfillment.createPickToTrack': 'Create a pick to track it here.',
    'fulfillment.salesOrdersTitle': 'Sales Orders',
    'fulfillment.salesOrdersDescription': 'Select an order to allocate and pick it.',
    'fulfillment.so': 'SO',
    'fulfillment.ship': 'Ship',
    'counts.entryTitle': 'Cycle Count Entry',
    'counts.entryDescription': 'Counts never auto-adjust. Mismatches become approval tickets.',
    'counts.createCount': 'Create count',
    'counts.submitSelectedCount': 'Submit selected count',
    'counts.countedQty': 'Counted qty',
    'counts.addCountLine': 'Add count line',
    'counts.scanEntryTitle': 'Guided Scan Count',
    'counts.scanEntryDescription': 'Scan a location, item, lot, or serial and add the count line directly.',
    'counts.scanLocation': 'Count location scan',
    'counts.itemScan': 'Count item scan',
    'counts.lotScan': 'Lot scan',
    'counts.serialScan': 'Serial scan',
    'counts.applyScannedCount': 'Apply scanned count line',
    'counts.autoCountNote': 'If no cycle count is selected, the app will create one for the scanned location.',
    'counts.countContext': 'Count context',
    'counts.discrepancyApprovalsTitle': 'Discrepancy Approvals',
    'counts.discrepancyApprovalsDescription': 'Finance/Admin only.',
    'counts.count': 'Count',
    'counts.delta': 'Delta',
    'counts.approveSelectedTicket': 'Approve selected ticket',
    'counts.recentCycleCountsTitle': 'Recent Cycle Counts',
    'counts.recentCycleCountsDescription': 'Operations submits, finance/admin resolves mismatches.',
    'manufacturing.bomTitle': 'Bill of Materials',
    'manufacturing.bomDescription': 'Create and activate a versioned BoM for a manufactured item.',
    'manufacturing.bomWorkspaceTitle': 'BoM Workspace',
    'manufacturing.bomWorkspaceDescription': 'Create, review, and maintain BoMs inside this tab.',
    'manufacturing.openBomWorkspace': 'Open BoM workspace',
    'manufacturing.returnToProduction': 'Return to production console',
    'manufacturing.closeWindow': 'Close window',
    'manufacturing.useBomWorkspaceHint': 'Review an existing BoM first, then edit it or create a new one if needed.',
    'manufacturing.selectBom': 'Select BoM',
    'manufacturing.selectedBom': 'Selected BoM',
    'manufacturing.noBomLinked': 'No BoM selected',
    'manufacturing.findBomTitle': 'Find a BoM',
    'manufacturing.findBomDescription': 'Search existing BoMs by parent item, SKU, or version before creating a new one.',
    'manufacturing.createIfMissing': 'Create new BoM',
    'manufacturing.cancelCreate': 'Back to library',
    'manufacturing.reviewBomTitle': 'Review and Edit BoM',
    'manufacturing.reviewBomDescription': 'Inspect the selected BoM, then update its header, lines, and requirements.',
    'manufacturing.componentEditorAddTitle': 'Add Component',
    'manufacturing.componentEditorAddDescription': 'Use this form to add a new component to the selected BoM.',
    'manufacturing.componentEditorEditTitle': 'Edit Selected Component',
    'manufacturing.componentEditorEditDescription': 'Adjust the selected line, or clear the selection to add a new component.',
    'manufacturing.noBomReviewState': 'Select a BoM from the library, or create a new one if it does not exist.',
    'manufacturing.newBomTitle': 'Create New BoM',
    'manufacturing.newBomDescription': 'Start a new version for a manufactured item. After creation, continue in the maintenance area.',
    'manufacturing.addComponentTitle': 'Add Component Line',
    'manufacturing.addComponentDescription': 'Add a new component to the selected BoM.',
    'manufacturing.selectionGuideTitle': 'BoM Workflow',
    'manufacturing.selectionGuideDescription': 'Select or create a BoM, maintain its header and lines, then preview requirements.',
    'manufacturing.summaryLineCount': 'Component lines',
    'manufacturing.summaryUpdated': 'Last updated',
    'manufacturing.currentSelectionTitle': 'Selected BoM Summary',
    'manufacturing.currentSelectionDescription': 'The current working context for edits and requirement previews.',
    'manufacturing.noSelectedBomSummary': 'Select a BoM from the library to begin editing.',
    'manufacturing.selectedLineTitle': 'Selected Line',
    'manufacturing.selectedLineDescription': 'Review the active line before updating or deleting it.',
    'manufacturing.noSelectedLineSummary': 'Select a component line to edit it.',
    'manufacturing.parentFinishedGood': 'Parent item',
    'manufacturing.component': 'Component',
    'manufacturing.createBom': 'Create BoM',
    'manufacturing.addLine': 'Add line',
    'manufacturing.activate': 'Activate',
    'manufacturing.productionTitle': 'Production and Backflush',
    'manufacturing.productionDescription': 'Record manufactured output, then deduct recursive raw demand.',
    'manufacturing.finishedGood': 'Manufactured item',
    'manufacturing.plannedQty': 'Planned qty',
    'manufacturing.fgLocation': 'FG location',
    'manufacturing.completedQty': 'Completed qty',
    'manufacturing.createOrder': 'Create order',
    'manufacturing.recordCompletion': 'Record completion',
    'manufacturing.previewBackflush': 'Preview backflush',
    'manufacturing.runBackflush': 'Run backflush',
    'manufacturing.backflushPreviewTitle': 'Backflush Preview',
    'manufacturing.backflushPreviewDescription': 'Recursive BoM demand for the selected production order.',
    'manufacturing.runPreviewToLoad': 'Run backflush preview to load requirements.',
    'manufacturing.scrapTitle': 'Scrap Dual Signoff',
    'manufacturing.scrapDescription': 'Operations completes both manufacturing and warehouse signoff steps.',
    'manufacturing.createScrapRequest': 'Create scrap request',
    'manufacturing.productionSign': 'Production sign',
    'manufacturing.warehouseSign': 'Warehouse sign',
    'manufacturing.bomLibraryTitle': 'BoM Library',
    'manufacturing.bomLibraryDescription': 'Select an existing BoM to review and maintain it.',
    'manufacturing.currentBomTitle': 'Current BoM',
    'manufacturing.currentBomDescription': 'Review the selected BoM, update its header, and inspect its lines.',
    'manufacturing.bomNotes': 'Notes',
    'manufacturing.saveBom': 'Save BoM',
    'manufacturing.previewBomExplosion': 'Preview requirements',
    'manufacturing.bomLinesTitle': 'BoM Lines',
    'manufacturing.bomLinesDescription': 'Select a line to edit the component, quantity, or scrap allowance.',
    'manufacturing.lineNumber': 'Line',
    'manufacturing.scrapAllowancePct': 'Scrap %',
    'manufacturing.lineEditorTitle': 'Line Editor',
    'manufacturing.lineEditorDescription': 'Add a new line from the create panel, then use this editor for changes.',
    'manufacturing.updateLine': 'Update line',
    'manufacturing.deleteLine': 'Delete line',
    'manufacturing.clearLineSelection': 'Clear selection',
    'manufacturing.noBomSelected': 'Select a BoM from the library or create a new one first.',
    'manufacturing.noBomLineSelected': 'Select a BoM line to edit it.',
    'manufacturing.confirmDeleteLine': 'Delete the selected BoM line?',
    'manufacturing.explosionTitle': 'BoM Requirement Preview',
    'manufacturing.explosionDescription': 'Review the recursive material requirement for the selected quantity.',
    'manufacturing.explosionQty': 'Preview quantity',
    'role.admin': 'Admin',
    'role.finance': 'Finance',
    'role.operations': 'Operations',
    'status.draft': 'Draft',
    'status.open': 'Open',
    'status.approved': 'Approved',
    'status.posted': 'Posted',
    'status.allocated': 'Allocated',
    'status.picking': 'Picking',
    'status.completed': 'Completed',
    'status.pending': 'Pending',
    'status.backflushed': 'Backflushed',
    'status.discrepancyRecorded': 'Discrepancy Recorded',
    'status.rejected': 'Rejected',
    'action.refreshWorkspace': 'workspace refresh',
    'action.login': 'login',
    'action.logout': 'logout',
    'action.userCreation': 'user creation',
    'action.userUpdate': 'user update',
    'action.supplierCreation': 'supplier creation',
    'action.customerCreation': 'customer creation',
    'action.itemCreation': 'item creation',
    'action.itemArchive': 'item archive',
    'action.itemRestore': 'item restore',
    'action.itemDelete': 'item deletion',
    'action.purchaseOrderCreation': 'purchase order creation',
    'action.purchaseOrderLineAdd': 'purchase order line add',
    'action.purchaseOrderApproval': 'purchase order approval',
    'action.receiptCreation': 'receipt creation',
    'action.receiptLineAdd': 'receipt line add',
    'action.receiptPosting': 'receipt posting',
    'action.salesOrderCreation': 'sales order creation',
    'action.salesOrderAllocation': 'sales order allocation',
    'action.pickCreation': 'pick creation',
    'action.pickConfirmation': 'pick confirmation',
    'action.cycleCountCreation': 'cycle count creation',
    'action.cycleCountLineAdd': 'cycle count line add',
    'action.cycleCountSubmit': 'cycle count submit',
    'action.discrepancyApproval': 'discrepancy approval',
    'action.bomCreation': 'BoM creation',
    'action.bomLineAdd': 'BoM line add',
    'action.bomActivation': 'BoM activation',
    'action.bomUpdate': 'BoM update',
    'action.bomLineUpdate': 'BoM line update',
    'action.bomLineDelete': 'BoM line deletion',
    'action.bomExplosionPreview': 'BoM requirement preview',
    'action.productionOrderCreation': 'production order creation',
    'action.productionCompletion': 'production completion',
    'action.backflushPreview': 'backflush preview',
    'action.backflushExecution': 'backflush execution',
    'action.scrapRequestCreation': 'scrap request creation',
    'action.productionScrapSignoff': 'production scrap signoff',
    'action.warehouseScrapSignoff': 'warehouse scrap signoff',
    'action.barcodeGeneration': 'barcode generation',
    'action.inventoryImport': 'inventory import',
    'error.createPickFirst': 'Create a pick first.',
    'error.selectUserFirst': 'Select a user first.',
    'error.selectItemFirst': 'Select an item first.',
    'error.scanValidItemFirst': 'Scan a valid item barcode or SKU first.',
    'error.scanValidReceivingLocationFirst': 'Scan a valid receiving location first.',
    'error.receivingPoLineMismatch': 'The scanned item does not match a line on the selected purchase order.',
    'error.receivingLotRequired': 'Lot-tracked items require a lot number.',
    'error.receivingWholeNumberQty': 'Serial-tracked receiving requires a whole-number quantity.',
    'error.receivingSerialCountMismatch': 'Serial list count must match received quantity.',
    'error.selectPurchaseOrderBeforeReceivingScan': 'Select a purchase order before scanning receipt lines.',
    'error.selectSalesOrderFirst': 'Select a sales order first.',
    'error.guidedPickMismatch': 'Scan a location and item that match an open pick line.',
    'error.scanValidCountLocationFirst': 'Scan a valid count location first.',
    'error.countLocationMismatch': 'The scanned location does not match the selected cycle count.',
    'error.scanValidCountItemFirst': 'Scan a valid item or serial first.',
    'roleDescription.admin': 'Full system access',
    'roleDescription.finance': 'Financial visibility and discrepancy approval',
    'roleDescription.operations': 'Combined procurement, warehouse, and production operations',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.locked': 'Locked',
    'status.received': 'Received',
    'status.cancelled': 'Cancelled',
    'status.pendingApproval': 'Pending Approval',
    'status.partiallyReceived': 'Partially Received',
    'status.voided': 'Voided',
    'status.shipped': 'Shipped',
    'status.inProgress': 'In Progress',
    'status.submitted': 'Submitted',
    'status.applied': 'Applied'
  },
  vi: {
    'brand.eyebrow': 'IMS Điện Tử',
    'brand.title': 'Bảng Điều Hành Vận Hành',
    'brand.description': 'Giao diện thân thiện với máy quét cho nhập hàng, kiểm kê tồn kho, xuất hàng và sản xuất.',
    'auth.title': 'Đăng nhập IMS',
    'auth.description': 'Đăng nhập bằng tài khoản mẫu hoặc tài khoản người dùng để mở bảng điều hành.',
    'auth.email': 'Email',
    'auth.password': 'Mật khẩu',
    'auth.requestRole': 'Vai trò yêu cầu',
    'auth.signIn': 'Đăng nhập',
    'auth.demoAccount': 'Tài khoản mẫu {role}',
    'auth.demoHint': 'Tài khoản mẫu: admin@ims.local / Admin123!, finance@ims.local / Finance123!, và operations@ims.local / Ops123!.',
    'hero.eyebrow': 'Bảng điều khiển kho + sản xuất trực tiếp',
    'hero.title': 'Giao diện IMS một kho',
    'hero.description': 'Giao diện dùng trực tiếp REST API hiện tại và giữ RBAC của backend hiển thị qua chuyển đổi persona.',
    'sidebar.user': 'Người dùng đăng nhập',
    'sidebar.persona': 'Vai trò',
    'sidebar.requestRole': 'Vai trò yêu cầu',
    'sidebar.language': 'Ngôn ngữ',
    'sidebar.refresh': 'Làm mới dữ liệu',
    'sidebar.logout': 'Đăng xuất',
    'language.en': 'English',
    'language.vi': 'Tiếng Việt',
    'toast.status': 'Trạng thái',
    'message.ready': 'Sẵn sàng.',
    'message.workspaceRefreshed': 'Đã làm mới dữ liệu cho {role}.',
    'message.actionCompleted': 'Đã hoàn tất {action}.',
    'message.workingOn': 'Đang xử lý {action}...',
    'message.loginSuccess': 'Đăng nhập thành công.',
    'message.sessionExpired': 'Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.',
    'message.signedOut': 'Đã đăng xuất.',
    'message.itemRequiresBomSetup': '{sku} hiện là mặt hàng sản xuất. Hãy thiết lập định mức trong tab Thành phần tiếp theo.',
    'nav.overview': 'Tổng quan',
    'nav.master': 'Danh mục',
    'nav.purchaseOrders': 'Đơn mua hàng',
    'nav.receiving': 'Nhận hàng',
    'nav.fulfillment': 'Xuất hàng',
    'nav.counts': 'Kiểm kê',
    'nav.manufacturing': 'Sản xuất',
    'nav.users': 'Người dùng',
    'nav.more': 'Khác',
    'users.directoryTitle': 'Danh sách người dùng',
    'users.directoryDescription': 'Danh sách người dùng IMS và vai trò hiện tại, chỉ dành cho quản trị.',
    'users.createTitle': 'Tạo người dùng',
    'users.createDescription': 'Thêm tài khoản đăng nhập mới, gán vai trò và kích hoạt tài khoản.',
    'users.editTitle': 'Sửa người dùng',
    'users.editDescription': 'Cập nhật hồ sơ, trạng thái tài khoản, vai trò hoặc đổi mật khẩu.',
    'users.newUser': 'Người dùng mới',
    'users.email': 'Email',
    'users.name': 'Tên',
    'users.firstName': 'Tên',
    'users.lastName': 'Họ',
    'users.status': 'Trạng thái',
    'users.roles': 'Vai trò',
    'users.rolesDescription': 'Gán một hoặc nhiều vai trò yêu cầu cho tài khoản đang chọn.',
    'users.password': 'Mật khẩu',
    'users.passwordReset': 'Đặt mật khẩu mới',
    'users.passwordResetPlaceholder': 'Để trống nếu muốn giữ mật khẩu hiện tại',
    'users.createUser': 'Tạo người dùng',
    'users.saveUser': 'Lưu người dùng',
    'users.clearSelection': 'Bỏ chọn',
    'users.lastLogin': 'Lần đăng nhập cuối',
    'persona.admin.label': 'Quản trị',
    'persona.admin.name': 'Quản trị hệ thống',
    'persona.finance.label': 'Tài chính',
    'persona.finance.name': 'Tài chính',
    'persona.operations.label': 'Vận hành',
    'persona.operations.name': 'Vận hành',
    'common.notSet': 'Chưa đặt',
    'common.noRecords': 'Chưa có dữ liệu.',
    'common.restricted': 'Bị giới hạn',
    'common.sku': 'Mã hàng',
    'common.code': 'Mã',
    'common.name': 'Tên',
    'common.type': 'Loại',
    'common.status': 'Trạng thái',
    'common.item': 'Mặt hàng',
    'common.location': 'Vị trí',
    'common.qty': 'Số lượng',
    'common.notes': 'Ghi chú',
    'common.reason': 'Lý do',
    'common.customer': 'Khách hàng',
    'common.supplier': 'Nhà cung cấp',
    'common.version': 'Phiên bản',
    'common.quantity': 'Số lượng',
    'common.available': 'Khả dụng',
    'common.onHand': 'Tồn thực',
    'common.reserved': 'Đã giữ',
    'common.created': 'Đã tạo',
    'common.required': 'Cần dùng',
    'common.active': 'Đang hiệu lực',
    'common.inactive': 'Không hiệu lực',
    'common.updated': 'Cập nhật',
    'common.date': 'Ngày',
    'common.reference': 'Tham chiếu',
    'common.createdBy': 'Người tạo',
    'common.lot': 'Lô',
    'common.serial': 'Sê-ri',
    'common.yes': 'Có',
    'common.no': 'Không',
    'common.enterReason': 'Nhập lý do',
    'common.searchSkuName': 'Tìm mã hàng hoặc tên',
    'common.selectSupplier': 'Chọn nhà cung cấp',
    'common.selectCustomer': 'Chọn khách hàng',
    'common.selectItem': 'Chọn mặt hàng',
    'common.selectLocation': 'Chọn vị trí',
    'common.selectFg': 'Chọn mặt hàng sản xuất',
    'common.selectComponent': 'Chọn linh kiện',
    'itemType.RAW_MATERIAL': 'Nguyên vật liệu',
    'itemType.SUB_ASSEMBLY': 'Bán thành phẩm',
    'itemType.FINISHED_GOOD': 'Thành phẩm',
    'metric.openPos': 'Đơn mua đang mở',
    'metric.openPosSub': 'Luồng mua hàng',
    'metric.receipts': 'Phiếu nhập',
    'metric.receiptsSub': 'Hoạt động nhập kho',
    'metric.salesOrders': 'Đơn bán hàng',
    'metric.salesOrdersSub': 'Nhu cầu xuất hàng',
    'metric.discrepancies': 'Chênh lệch',
    'metric.discrepanciesSub': 'Hàng chờ phê duyệt',
    'metric.productionOrders': 'Lệnh sản xuất',
    'metric.productionOrdersSub': 'Hàng chờ sản xuất',
    'metric.zeroAvailable': 'Khả dụng bằng 0',
    'metric.zeroAvailableSub': 'Tồn kho có rủi ro',
    'overview.inventoryTitle': 'Tồn kho trực tiếp',
    'overview.inventoryDescription': 'Số dư hiển thị trong trạng thái kho hiện tại.',
    'overview.locationCode': 'Vị trí',
    'overview.lot': 'Lô',
    'master.createItemTitle': 'Tạo mặt hàng',
    'master.createItemDescription': 'Nguyên vật liệu, bán thành phẩm hoặc thành phẩm.',
    'master.internalSku': 'Mã hàng nội bộ',
    'master.itemType': 'Loại mặt hàng',
    'master.uom': 'Đơn vị tính',
    'master.minStock': 'Tồn tối thiểu',
    'master.reorderQty': 'SL đặt lại',
    'master.leadTime': 'Thời gian dẫn',
    'master.unitCost': 'Đơn giá',
    'master.unitCostPlaceholder': 'USD 1.25 hoặc VND 25000',
    'master.unitCostHint': 'Nhập USD, VND, $, hoặc ₫. Nếu chỉ nhập số, hệ thống sẽ hiểu là USD.',
    'master.unitCostInvalid': 'Nhập đơn giá hợp lệ, ví dụ USD 1.25 hoặc VND 25000.',
    'master.createItem': 'Tạo mặt hàng',
    'master.partnersTitle': 'Đối tác',
    'master.partnersDescription': 'Tạo nhanh nhà cung cấp và khách hàng để kiểm thử.',
    'master.supplierTitle': 'Nhà cung cấp',
    'master.customerTitle': 'Khách hàng',
    'master.createSupplier': 'Tạo nhà cung cấp',
    'master.createCustomer': 'Tạo khách hàng',
    'master.itemsInventoryTitle': 'Mặt hàng và tồn kho',
    'master.itemsInventoryDescription': 'Kiểm tra tồn kho và tạo mã vạch nội bộ.',
    'master.selectItemTitle': 'Chọn mặt hàng',
    'master.selectItemDescription': 'Chọn một mặt hàng trong danh sách để xem số dư, giao dịch, lô và sê-ri.',
    'master.activeItems': 'Mặt hàng đang dùng',
    'master.archivedItems': 'Mặt hàng lưu trữ',
    'master.archiveItem': 'Lưu trữ mặt hàng',
    'master.restoreItem': 'Khôi phục mặt hàng',
    'master.deleteArchivedItem': 'Xóa mặt hàng lưu trữ',
    'master.archiveWarning': 'Lưu trữ sẽ đưa mặt hàng ra khỏi danh sách đang dùng nhưng vẫn giữ lịch sử.',
    'master.archivedWarning': 'Mặt hàng lưu trữ có thể được khôi phục. Quản trị có thể xóa vĩnh viễn nếu mặt hàng không còn tham chiếu.',
    'master.archiveConfirm': 'Lưu trữ mặt hàng đã chọn?',
    'master.restoreConfirm': 'Khôi phục mặt hàng đã chọn?',
    'master.deleteArchivedConfirm': 'Xóa vĩnh viễn mặt hàng lưu trữ đã chọn?',
    'master.barcode': 'Mã vạch',
    'master.refreshInventory': 'Làm mới tồn kho',
    'master.generateBarcode': 'Tạo mã vạch',
    'master.importTab': 'Nhập tồn kho',
    'master.importTitle': 'Nhập số dư cuối kỳ',
    'master.importDescription': 'Tải workbook số dư cuối kỳ dạng phẳng vào kho hiện tại bằng bộ import phía backend.',
    'master.importFilePath': 'Đường dẫn workbook',
    'master.importLocationCode': 'Mã vị trí',
    'master.importLocationName': 'Tên vị trí',
    'master.importLocationType': 'Loại vị trí',
    'master.importDefaultItemType': 'Loại mặt hàng mặc định',
    'master.importCurrency': 'Tiền tệ đơn giá',
    'master.importDryRun': 'Chế độ',
    'master.importDryRunOption': 'Chỉ chạy thử',
    'master.importApplyOption': 'Áp dụng nhập',
    'master.importButton': 'Chạy nhập dữ liệu',
    'master.importSummaryTitle': 'Tóm tắt lần nhập gần nhất',
    'master.importRowsRead': 'Số dòng đọc',
    'master.importItemsCreated': 'Mặt hàng tạo mới',
    'master.importItemsUpdated': 'Mặt hàng cập nhật',
    'master.importBalancesCreated': 'Số dư tạo mới',
    'master.importBalancesAdjusted': 'Số dư điều chỉnh',
    'master.importTransactionsCreated': 'Giao dịch tạo mới',
    'master.importPreviewTitle': 'Dòng xem trước',
    'master.importWarningsTitle': 'Cảnh báo trùng mã hàng',
    'master.importWarningsDescription': 'Nếu một mã hàng xuất hiện nhiều hơn một lần trong workbook, bộ import sẽ giữ nguyên hành vi hiện tại: dòng cuối cùng quyết định tồn cuối cùng.',
    'master.importWarningRows': 'Dòng',
    'master.importWarningBehavior': 'Hành vi',
    'master.importWarningBehaviorLastRowWins': 'Dòng cuối cùng được giữ lại',
    'master.editItem': 'Sửa mặt hàng',
    'master.saveItem': 'Lưu mặt hàng',
    'master.cancelEdit': 'Hủy chỉnh sửa',
    'master.itemSettingsTitle': 'Thiết lập mặt hàng',
    'master.itemSettingsDescription': 'Cập nhật dữ liệu gốc và quy tắc hoạch định của mặt hàng đã chọn.',
    'master.overviewTab': 'Tổng quan',
    'master.componentsTab': 'Thành phần',
    'master.transactionsTab': 'Giao dịch',
    'master.lotsTab': 'Lô',
    'master.serialsTab': 'Sê-ri',
    'master.editTab': 'Chỉnh sửa',
    'master.supplierSku': 'Mã hàng NCC',
    'master.descriptionLabel': 'Mô tả',
    'master.lotTracking': 'Theo dõi lô',
    'master.serialTracking': 'Theo dõi sê-ri',
    'master.trackingRequired': 'Bắt buộc',
    'master.trackingNotRequired': 'Không bắt buộc',
    'master.componentsTitle': 'Thành phần / BoM',
    'master.componentsDescription': 'Danh sách thành phần đang hiệu lực gắn với thành phẩm hoặc bán thành phẩm này.',
    'master.activeBomVersion': 'BoM hiệu lực',
    'master.componentCount': 'Số thành phần',
    'master.openBomWorkspace': 'Mở khu vực BoM',
    'master.createBomWorkspace': 'Tạo trong khu vực BoM',
    'master.noActiveBomTitle': 'Chưa có BoM hiệu lực',
    'master.noActiveBomDescription': 'Mặt hàng này chưa có danh sách thành phần đang hiệu lực.',
    'master.loadingBom': 'Đang tải BoM hiệu lực...',
    'master.restrictedBomDescription': 'Chi tiết BoM chỉ hiển thị cho persona Quản trị và Vận hành.',
    'master.balanceBreakdownTitle': 'Phân rã số dư',
    'master.balanceBreakdownDescription': 'Số dư hiện tại theo vị trí, lô và sê-ri.',
    'master.transactionHistoryTitle': 'Lịch sử giao dịch',
    'master.transactionHistoryDescription': 'Các biến động tồn kho đã ghi nhận cho mặt hàng đã chọn.',
    'master.lotsTitle': 'Lô',
    'master.lotsDescription': 'Hồ sơ lô và lượng tồn hiện tại.',
    'master.serialsTitle': 'Sê-ri',
    'master.serialsDescription': 'Số sê-ri được theo dõi và trạng thái hiện tại trong kho.',
    'master.supplierLot': 'Lô nhà cung cấp',
    'master.expiration': 'Hạn dùng',
    'master.locationCount': 'Số vị trí',
    'master.currentLocation': 'Vị trí hiện tại',
    'inbound.purchaseOrdersTitle': 'Đơn mua hàng',
    'inbound.purchaseOrdersDescription': 'Tạo, thêm dòng và phê duyệt đơn mua.',
    'inbound.expectedReceipt': 'Ngày nhận dự kiến',
    'inbound.createPo': 'Tạo đơn mua',
    'inbound.approveSelectedPo': 'Duyệt đơn mua đã chọn',
    'inbound.addPoLine': 'Thêm dòng đơn mua',
    'inbound.receivingTitle': 'Nhận hàng',
    'inbound.receivingDescription': 'Ghi nhận số lô và nhập tồn vào kho.',
    'inbound.createReceipt': 'Tạo phiếu nhập',
    'inbound.postSelectedReceipt': 'Hạch toán phiếu nhập đã chọn',
    'inbound.poLineUuid': 'UUID dòng đơn mua',
    'inbound.receivedQty': 'SL nhận',
    'inbound.receivingBin': 'Ô nhận hàng',
    'inbound.putawayBin': 'Ô cất kho',
    'inbound.manualLot': 'Lô nhập tay',
    'inbound.addReceiptLine': 'Thêm dòng phiếu nhập',
    'inbound.scanReceiveTitle': 'Nhận hàng theo quét',
    'inbound.scanReceiveDescription': 'Quét mặt hàng và vị trí, sau đó thêm dòng phiếu nhập với ngữ cảnh đã nhận diện.',
    'inbound.itemScan': 'Quét mặt hàng',
    'inbound.locationScan': 'Quét vị trí',
    'inbound.putawayScan': 'Quét vị trí cất kho',
    'inbound.serialList': 'Danh sách sê-ri',
    'inbound.applyScannedReceipt': 'Áp dụng dòng nhập đã quét',
    'inbound.receiptContext': 'Ngữ cảnh phiếu nhập',
    'inbound.poLineMatch': 'Dòng đơn mua khớp',
    'inbound.autoReceiptNote': 'Nếu chưa chọn phiếu nhập, ứng dụng sẽ tự tạo một phiếu cho đơn mua đã chọn.',
    'inbound.recentPurchaseOrdersTitle': 'Đơn mua gần đây',
    'inbound.recentPurchaseOrdersDescription': 'Chọn một đơn để đặt ngữ cảnh nhận hàng.',
    'inbound.po': 'Đơn mua',
    'inbound.expected': 'Dự kiến',
    'inbound.recentReceiptsTitle': 'Phiếu nhập gần đây',
    'inbound.recentReceiptsDescription': 'Phiếu nhập đã hạch toán tạo ra tồn kho theo lô.',
    'inbound.receipt': 'Phiếu nhập',
    'inbound.posted': 'Đã hạch toán',
    'fulfillment.createSalesOrderTitle': 'Tạo đơn bán hàng',
    'fulfillment.createSalesOrderDescription': 'Xuất hàng vẫn xử lý từng đơn một.',
    'fulfillment.externalReference': 'Mã tham chiếu ngoài',
    'fulfillment.requestedShipDate': 'Ngày giao yêu cầu',
    'fulfillment.createSalesOrder': 'Tạo đơn bán hàng',
    'fulfillment.allocate': 'Phân bổ',
    'fulfillment.createPick': 'Tạo phiếu lấy hàng',
    'fulfillment.confirmPick': 'Xác nhận lấy hàng',
    'fulfillment.guidedPickTitle': 'Lấy hàng theo quét',
    'fulfillment.guidedPickDescription': 'Tải phiếu lấy hàng đang mở, quét vị trí và mặt hàng, rồi xác nhận lấy hàng.',
    'fulfillment.loadOpenPick': 'Tải phiếu đang mở',
    'fulfillment.pickLocationScan': 'Quét vị trí lấy hàng',
    'fulfillment.pickItemScan': 'Quét mặt hàng lấy',
    'fulfillment.confirmGuidedPick': 'Xác nhận lấy hàng theo quét',
    'fulfillment.openPickLines': 'Các dòng phiếu đang mở',
    'fulfillment.matchedPickLine': 'Dòng phiếu khớp',
    'fulfillment.confirmWholePickNote': 'Xác nhận lấy hàng theo quét sẽ ghi nhận toàn bộ các dòng của phiếu đang mở.',
    'fulfillment.pickerContextTitle': 'Ngữ cảnh lấy hàng',
    'fulfillment.pickerContextDescription': 'Dùng persona Vận hành để khớp với quyền hiện tại.',
    'fulfillment.currentRequestRole': 'Vai trò yêu cầu hiện tại',
    'fulfillment.currentPick': 'Phiếu lấy hàng hiện tại',
    'fulfillment.createPickToTrack': 'Hãy tạo phiếu lấy hàng để theo dõi tại đây.',
    'fulfillment.salesOrdersTitle': 'Đơn bán hàng',
    'fulfillment.salesOrdersDescription': 'Chọn một đơn để phân bổ và lấy hàng.',
    'fulfillment.so': 'Đơn bán',
    'fulfillment.ship': 'Giao hàng',
    'counts.entryTitle': 'Nhập kiểm kê',
    'counts.entryDescription': 'Kiểm kê không tự động điều chỉnh. Chênh lệch sẽ thành phiếu phê duyệt.',
    'counts.createCount': 'Tạo phiếu kiểm',
    'counts.submitSelectedCount': 'Gửi phiếu kiểm đã chọn',
    'counts.countedQty': 'SL đếm',
    'counts.addCountLine': 'Thêm dòng kiểm',
    'counts.scanEntryTitle': 'Kiểm kê theo quét',
    'counts.scanEntryDescription': 'Quét vị trí, mặt hàng, lô hoặc sê-ri để thêm trực tiếp dòng kiểm kê.',
    'counts.scanLocation': 'Quét vị trí kiểm kê',
    'counts.itemScan': 'Quét mặt hàng kiểm kê',
    'counts.lotScan': 'Quét lô',
    'counts.serialScan': 'Quét sê-ri',
    'counts.applyScannedCount': 'Áp dụng dòng kiểm đã quét',
    'counts.autoCountNote': 'Nếu chưa chọn phiếu kiểm, ứng dụng sẽ tự tạo một phiếu cho vị trí đã quét.',
    'counts.countContext': 'Ngữ cảnh kiểm kê',
    'counts.discrepancyApprovalsTitle': 'Phê duyệt chênh lệch',
    'counts.discrepancyApprovalsDescription': 'Chỉ dành cho Tài chính/Quản trị.',
    'counts.count': 'Phiếu kiểm',
    'counts.delta': 'Chênh lệch',
    'counts.approveSelectedTicket': 'Duyệt phiếu đã chọn',
    'counts.recentCycleCountsTitle': 'Phiếu kiểm gần đây',
    'counts.recentCycleCountsDescription': 'Vận hành gửi phiếu, tài chính/quản trị xử lý chênh lệch.',
    'manufacturing.bomTitle': 'Định mức nguyên vật liệu',
    'manufacturing.bomDescription': 'Tạo và kích hoạt định mức có phiên bản cho mặt hàng sản xuất.',
    'manufacturing.parentFinishedGood': 'Mặt hàng cha',
    'manufacturing.component': 'Linh kiện',
    'manufacturing.createBom': 'Tạo định mức',
    'manufacturing.addLine': 'Thêm dòng',
    'manufacturing.activate': 'Kích hoạt',
    'manufacturing.productionTitle': 'Sản xuất và xuất trừ nguyên liệu',
    'manufacturing.productionDescription': 'Ghi nhận đầu ra sản xuất, sau đó trừ nguyên vật liệu theo nhu cầu đệ quy.',
    'manufacturing.finishedGood': 'Mặt hàng sản xuất',
    'manufacturing.plannedQty': 'SL kế hoạch',
    'manufacturing.fgLocation': 'Vị trí thành phẩm',
    'manufacturing.completedQty': 'SL hoàn thành',
    'manufacturing.createOrder': 'Tạo lệnh',
    'manufacturing.recordCompletion': 'Ghi nhận hoàn thành',
    'manufacturing.previewBackflush': 'Xem trước xuất trừ nguyên liệu',
    'manufacturing.runBackflush': 'Thực hiện xuất trừ nguyên liệu',
    'manufacturing.backflushPreviewTitle': 'Xem trước xuất trừ nguyên liệu',
    'manufacturing.backflushPreviewDescription': 'Nhu cầu định mức đệ quy cho lệnh sản xuất đã chọn.',
    'manufacturing.runPreviewToLoad': 'Chạy xem trước xuất trừ nguyên liệu để tải nhu cầu.',
    'manufacturing.scrapTitle': 'Phế phẩm hai bước ký',
    'manufacturing.scrapDescription': 'Vận hành thực hiện cả bước ký sản xuất và kho.',
    'manufacturing.createScrapRequest': 'Tạo yêu cầu phế phẩm',
    'manufacturing.productionSign': 'Sản xuất ký',
    'manufacturing.warehouseSign': 'Kho ký',
    'manufacturing.bomLibraryTitle': 'Danh sách định mức',
    'manufacturing.bomLibraryDescription': 'Chọn một định mức hiện có để xem và quản lý.',
    'manufacturing.currentBomTitle': 'Định mức hiện tại',
    'manufacturing.currentBomDescription': 'Xem định mức đã chọn, cập nhật thông tin đầu mục và kiểm tra các dòng vật tư.',
    'manufacturing.bomNotes': 'Ghi chú',
    'manufacturing.saveBom': 'Lưu định mức',
    'manufacturing.previewBomExplosion': 'Xem trước nhu cầu',
    'manufacturing.bomLinesTitle': 'Các dòng định mức',
    'manufacturing.bomLinesDescription': 'Chọn một dòng để sửa linh kiện, số lượng hoặc tỷ lệ hao hụt.',
    'manufacturing.lineNumber': 'Dòng',
    'manufacturing.scrapAllowancePct': 'Hao hụt %',
    'manufacturing.lineEditorTitle': 'Trình sửa dòng',
    'manufacturing.lineEditorDescription': 'Thêm dòng mới ở khung tạo định mức, sau đó dùng trình sửa này để cập nhật.',
    'manufacturing.updateLine': 'Cập nhật dòng',
    'manufacturing.deleteLine': 'Xóa dòng',
    'manufacturing.clearLineSelection': 'Bỏ chọn dòng',
    'manufacturing.noBomSelected': 'Hãy chọn một định mức trong danh sách hoặc tạo mới trước.',
    'manufacturing.noBomLineSelected': 'Hãy chọn một dòng định mức để chỉnh sửa.',
    'manufacturing.confirmDeleteLine': 'Xóa dòng định mức đã chọn?',
    'manufacturing.explosionTitle': 'Xem trước nhu cầu định mức',
    'manufacturing.explosionDescription': 'Xem nhu cầu vật tư đệ quy cho số lượng đã chọn.',
    'manufacturing.explosionQty': 'Số lượng xem trước',
    'role.admin': 'Quản trị',
    'role.finance': 'Tài chính',
    'role.operations': 'Vận hành',
    'status.draft': 'Nháp',
    'status.open': 'Đang mở',
    'status.approved': 'Đã duyệt',
    'status.posted': 'Đã hạch toán',
    'status.allocated': 'Đã phân bổ',
    'status.picking': 'Đang lấy hàng',
    'status.completed': 'Hoàn thành',
    'status.pending': 'Chờ xử lý',
    'status.backflushed': 'Đã xuất trừ',
    'status.discrepancyRecorded': 'Đã ghi nhận chênh lệch',
    'status.rejected': 'Từ chối',
    'action.login': 'đăng nhập',
    'action.logout': 'đăng xuất',
    'action.refreshWorkspace': 'làm mới dữ liệu',
    'action.userCreation': 'tạo người dùng',
    'action.userUpdate': 'cập nhật người dùng',
    'action.supplierCreation': 'tạo nhà cung cấp',
    'action.customerCreation': 'tạo khách hàng',
    'action.itemCreation': 'tạo mặt hàng',
    'action.itemArchive': 'lưu trữ mặt hàng',
    'action.itemRestore': 'khôi phục mặt hàng',
    'action.itemDelete': 'xóa mặt hàng',
    'action.purchaseOrderCreation': 'tạo đơn mua',
    'action.purchaseOrderLineAdd': 'thêm dòng đơn mua',
    'action.purchaseOrderApproval': 'phê duyệt đơn mua',
    'action.receiptCreation': 'tạo phiếu nhập',
    'action.receiptLineAdd': 'thêm dòng phiếu nhập',
    'action.receiptPosting': 'hạch toán phiếu nhập',
    'action.salesOrderCreation': 'tạo đơn bán hàng',
    'action.salesOrderAllocation': 'phân bổ đơn bán hàng',
    'action.pickCreation': 'tạo phiếu lấy hàng',
    'action.pickConfirmation': 'xác nhận phiếu lấy hàng',
    'action.cycleCountCreation': 'tạo phiếu kiểm',
    'action.cycleCountLineAdd': 'thêm dòng kiểm',
    'action.cycleCountSubmit': 'gửi phiếu kiểm',
    'action.discrepancyApproval': 'phê duyệt chênh lệch',
    'action.bomCreation': 'tạo định mức',
    'action.bomLineAdd': 'thêm dòng định mức',
    'action.bomActivation': 'kích hoạt định mức',
    'action.bomUpdate': 'cập nhật định mức',
    'action.bomLineUpdate': 'cập nhật dòng định mức',
    'action.bomLineDelete': 'xóa dòng định mức',
    'action.bomExplosionPreview': 'xem trước nhu cầu định mức',
    'action.productionOrderCreation': 'tạo lệnh sản xuất',
    'action.productionCompletion': 'ghi nhận hoàn thành',
    'action.backflushPreview': 'xem trước xuất trừ nguyên liệu',
    'action.backflushExecution': 'thực hiện xuất trừ nguyên liệu',
    'action.scrapRequestCreation': 'tạo yêu cầu phế phẩm',
    'action.productionScrapSignoff': 'ký phế phẩm phía sản xuất',
    'action.warehouseScrapSignoff': 'ký phế phẩm phía kho',
    'action.barcodeGeneration': 'tạo mã vạch',
    'action.inventoryImport': 'nhập tồn kho',
    'manufacturing.bomWorkspaceTitle': 'Không gian định mức',
    'manufacturing.bomWorkspaceDescription': 'Tạo, xem và quản lý định mức ngay trong tab này.',
    'manufacturing.openBomWorkspace': 'Mở cửa sổ định mức',
    'manufacturing.returnToProduction': 'Quay lại màn hình sản xuất',
    'manufacturing.closeWindow': 'Đóng cửa sổ',
    'manufacturing.useBomWorkspaceHint': 'Ưu tiên tìm và xem định mức hiện có, sau đó chỉnh sửa hoặc tạo mới khi cần.',
    'manufacturing.selectBom': 'Chọn định mức',
    'manufacturing.selectedBom': 'Định mức đã chọn',
    'manufacturing.noBomLinked': 'Chưa chọn định mức',
    'manufacturing.findBomTitle': 'Tìm định mức',
    'manufacturing.findBomDescription': 'Tìm định mức hiện có theo thành phẩm, mã hàng hoặc phiên bản trước khi tạo mới.',
    'manufacturing.createIfMissing': 'Tạo định mức mới',
    'manufacturing.cancelCreate': 'Quay lại danh sách',
    'manufacturing.reviewBomTitle': 'Xem và chỉnh sửa định mức',
    'manufacturing.reviewBomDescription': 'Kiểm tra định mức đã chọn, sau đó cập nhật đầu mục, các dòng và nhu cầu.',
    'manufacturing.componentEditorAddTitle': 'Thêm linh kiện',
    'manufacturing.componentEditorAddDescription': 'Dùng biểu mẫu này để thêm một linh kiện mới vào định mức đang chọn.',
    'manufacturing.componentEditorEditTitle': 'Sửa linh kiện đã chọn',
    'manufacturing.componentEditorEditDescription': 'Điều chỉnh dòng đã chọn, hoặc bỏ chọn để quay lại chế độ thêm mới.',
    'manufacturing.noBomReviewState': 'Chọn một định mức từ danh sách, hoặc tạo mới nếu chưa có.',
    'manufacturing.newBomTitle': 'Tạo định mức mới',
    'manufacturing.newBomDescription': 'Khởi tạo phiên bản mới cho thành phẩm. Sau khi tạo, tiếp tục ở khu vực quản lý.',
    'manufacturing.addComponentTitle': 'Thêm dòng linh kiện',
    'manufacturing.addComponentDescription': 'Thêm một linh kiện mới vào định mức đang chọn.',
    'manufacturing.selectionGuideTitle': 'Quy trình định mức',
    'manufacturing.selectionGuideDescription': 'Chọn hoặc tạo định mức, cập nhật đầu mục và các dòng, sau đó xem trước nhu cầu.',
    'manufacturing.summaryLineCount': 'Số dòng linh kiện',
    'manufacturing.summaryUpdated': 'Cập nhật gần nhất',
    'manufacturing.currentSelectionTitle': 'Tóm tắt định mức đang chọn',
    'manufacturing.currentSelectionDescription': 'Ngữ cảnh làm việc hiện tại cho chỉnh sửa và xem trước nhu cầu.',
    'manufacturing.noSelectedBomSummary': 'Chọn một định mức từ danh sách để bắt đầu chỉnh sửa.',
    'manufacturing.selectedLineTitle': 'Dòng đang chọn',
    'manufacturing.selectedLineDescription': 'Xem lại dòng hiện tại trước khi cập nhật hoặc xóa.',
    'manufacturing.noSelectedLineSummary': 'Chọn một dòng linh kiện để chỉnh sửa.',
    'error.createPickFirst': 'Hãy tạo phiếu lấy hàng trước.',
    'error.selectUserFirst': 'Hãy chọn người dùng trước.',
    'error.selectItemFirst': 'Hãy chọn mặt hàng trước.',
    'error.scanValidItemFirst': 'Hãy quét mã vạch hoặc SKU hợp lệ của mặt hàng trước.',
    'error.scanValidReceivingLocationFirst': 'Hãy quét vị trí nhận hàng hợp lệ trước.',
    'error.receivingPoLineMismatch': 'Mặt hàng đã quét không khớp với dòng nào trên đơn mua đã chọn.',
    'error.receivingLotRequired': 'Mặt hàng theo dõi lô bắt buộc phải nhập số lô.',
    'error.receivingWholeNumberQty': 'Nhận hàng theo sê-ri yêu cầu số lượng nguyên.',
    'error.receivingSerialCountMismatch': 'Số lượng sê-ri phải khớp với số lượng nhận.',
    'error.selectPurchaseOrderBeforeReceivingScan': 'Hãy chọn đơn mua trước khi quét dòng nhận hàng.',
    'error.selectSalesOrderFirst': 'Hãy chọn đơn bán hàng trước.',
    'error.guidedPickMismatch': 'Hãy quét vị trí và mặt hàng khớp với một dòng lấy hàng đang mở.',
    'error.scanValidCountLocationFirst': 'Hãy quét vị trí kiểm kê hợp lệ trước.',
    'error.countLocationMismatch': 'Vị trí đã quét không khớp với vị trí của phiếu kiểm kê đã chọn.',
    'error.scanValidCountItemFirst': 'Hãy quét mặt hàng hoặc sê-ri hợp lệ trước.',
    'roleDescription.admin': 'Toàn quyền hệ thống',
    'roleDescription.finance': 'Xem tài chính và phê duyệt chênh lệch',
    'roleDescription.operations': 'Nghiệp vụ mua hàng, kho và sản xuất',
    'status.active': 'Đang hiệu lực',
    'status.inactive': 'Không hiệu lực',
    'status.locked': 'Bị khóa',
    'status.received': 'Đã nhận',
    'status.cancelled': 'Đã hủy',
    'status.pendingApproval': 'Chờ duyệt',
    'status.partiallyReceived': 'Nhận một phần',
    'status.voided': 'Đã hủy hiệu lực',
    'status.shipped': 'Đã giao',
    'status.inProgress': 'Đang xử lý',
    'status.submitted': 'Đã gửi',
    'status.applied': 'Đã áp dụng'
  }
};

const NAV = ['master', 'purchaseOrders', 'receiving', 'fulfillment', 'counts', 'manufacturing'];
const PRIMARY_TOP_NAV = ['master', 'receiving', 'manufacturing'];
const ROLE_LABEL_KEYS = {
  ADMIN: 'role.admin',
  FINANCE: 'role.finance',
  OPERATIONS: 'role.operations'
};
const ROLE_DESCRIPTION_KEYS = {
  ADMIN: 'roleDescription.admin',
  FINANCE: 'roleDescription.finance',
  OPERATIONS: 'roleDescription.operations'
};
const STATUS_LABEL_KEYS = {
  ACTIVE: 'status.active',
  INACTIVE: 'status.inactive',
  LOCKED: 'status.locked',
  DRAFT: 'status.draft',
  OPEN: 'status.open',
  APPROVED: 'status.approved',
  RECEIVED: 'status.received',
  CANCELLED: 'status.cancelled',
  PENDING_APPROVAL: 'status.pendingApproval',
  PARTIALLY_RECEIVED: 'status.partiallyReceived',
  VOIDED: 'status.voided',
  POSTED: 'status.posted',
  ALLOCATED: 'status.allocated',
  PICKING: 'status.picking',
  SHIPPED: 'status.shipped',
  IN_PROGRESS: 'status.inProgress',
  SUBMITTED: 'status.submitted',
  COMPLETED: 'status.completed',
  PENDING: 'status.pending',
  BACKFLUSHED: 'status.backflushed',
  'DISCREPANCY RECORDED': 'status.discrepancyRecorded',
  REJECTED: 'status.rejected',
  APPLIED: 'status.applied'
};

function createTranslator(language) {
  return (key, values = {}) => {
    const template = TEXT[language]?.[key] ?? TEXT.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
  };
}

function getRoleLabel(t, roleCode) {
  const key = ROLE_LABEL_KEYS[String(roleCode ?? '').toUpperCase()];
  return key ? t(key) : String(roleCode ?? '');
}

function getRoleDescription(t, role) {
  const key = ROLE_DESCRIPTION_KEYS[String(role?.roleCode ?? '').toUpperCase()];
  return key ? t(key) : (role?.description || role?.roleName || '');
}

function getStatusLabel(t, value) {
  const key = STATUS_LABEL_KEYS[String(value ?? '').trim().toUpperCase()];
  return key ? t(key) : String(value ?? '');
}

function loadStoredSession() {
  return null;
}

function loadStoredLanguage() {
  try {
    const raw = window.localStorage.getItem('ims-front-language');
    return raw === 'vi' ? 'vi' : 'en';
  } catch {
    return 'en';
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

function normalizeItemCurrencyCode(value, fallback = 'USD') {
  const normalized = String(value ?? fallback).trim().toUpperCase();
  return SUPPORTED_ITEM_CURRENCIES.includes(normalized) ? normalized : fallback;
}

function formatMoney(value, currencyCode = 'USD', locale = 'en-US') {
  const normalizedCurrencyCode = normalizeItemCurrencyCode(currencyCode);
  const fractionDigits = normalizedCurrencyCode === 'VND' ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalizedCurrencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(Number(value ?? 0));
}

function formatEditableMoneyValue(value, currencyCode = 'USD') {
  const normalizedCurrencyCode = normalizeItemCurrencyCode(currencyCode);
  const fractionDigits = normalizedCurrencyCode === 'VND' ? 0 : 2;
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  }).format(Number(value ?? 0));

  return `${normalizedCurrencyCode} ${formattedAmount}`;
}

function parseMoneyInput(value, fallbackCurrencyCode = 'USD') {
  const raw = String(value ?? '').trim();
  const normalizedCurrencyCode = normalizeItemCurrencyCode(fallbackCurrencyCode);

  if (!raw) {
    return { amount: 0, currencyCode: normalizedCurrencyCode };
  }

  let currencyCode = normalizedCurrencyCode;
  if (/\bVND\b/i.test(raw) || raw.includes('₫')) {
    currencyCode = 'VND';
  } else if (/\bUSD\b/i.test(raw) || raw.includes('$')) {
    currencyCode = 'USD';
  }

  const normalizedNumberText = raw
    .replace(/\bUSD\b/ig, '')
    .replace(/\bVND\b/ig, '')
    .replace(/\$/g, '')
    .replace(/₫/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '');
  const amount = Number(normalizedNumberText);

  if (!Number.isFinite(amount)) {
    throw new Error('Enter a valid unit cost like USD 1.25 or VND 25000.');
  }

  return { amount, currencyCode };
}

function formatSignedNumber(value) {
  const numeric = Number(value ?? 0);
  const formatted = formatNumber(Math.abs(numeric));
  if (numeric > 0) return `+${formatted}`;
  if (numeric < 0) return `-${formatted}`;
  return formatted;
}

function formatDate(value, locale = 'en-US', fallback = 'Not set') {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale, { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value, locale = 'en-US', fallback = 'Not set') {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function buildQueryString(params) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });

  return search.toString();
}

function normalizeScanValue(value) {
  return String(value ?? '').trim().toUpperCase();
}

function parseScanList(value) {
  return String(value ?? '')
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function createItemEditForm(item) {
  return {
    internalSku: item?.internalSku ?? '',
    name: item?.name ?? '',
    itemType: item?.itemType ?? 'RAW_MATERIAL',
    uom: item?.uom ?? 'EA',
    supplierSku: item?.supplierSku ?? '',
    description: item?.description ?? '',
    minStockLevel: String(item?.minStockLevel ?? 0),
    reorderQuantity: String(item?.reorderQuantity ?? 0),
    leadTimeDays: String(item?.leadTimeDays ?? 0),
    requiresLotTracking: item?.requiresLotTracking ? 'true' : 'false',
    requiresSerialTracking: item?.requiresSerialTracking ? 'true' : 'false',
    unitCost: item?.unitCost === undefined
      ? '0'
      : formatEditableMoneyValue(item.unitCost, item?.unitCostCurrencyCode)
  };
}

function createManagedUserForm(user) {
  return {
    email: user?.email ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    status: user?.status ?? 'ACTIVE',
    password: '',
    roleIds: Array.isArray(user?.roles) ? user.roles.map((role) => role.roleId) : []
  };
}

function Badge({ value, t }) {
  const safe = String(value ?? 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <span className={`badge badge--${safe}`}>{getStatusLabel(t, value)}</span>;
}

function Table({ columns, rows, rowKey, onPick, selectedId, emptyMessage }) {
  if (!rows.length) return <div className="empty-state">{emptyMessage}</div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              className={selectedId === row[rowKey] ? 'is-selected' : ''}
              onClick={onPick ? () => onPick(row) : undefined}
            >
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoginScreen({ t, forms, updateForm, language, setLanguage, login, busy, message, applyDemoCredentials }) {
  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <div className="brand">
          <PostefLogo />
          <span className="brand__eyebrow">{t('brand.eyebrow')}</span>
          <h1>{t('auth.title')}</h1>
          <p>{t('auth.description')}</p>
        </div>

        <div className="auth-grid">
          <label className="field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              value={forms.login.email}
              onChange={(event) => updateForm('login', 'email', event.target.value)}
            />
          </label>

          <label className="field">
            <span>{t('auth.password')}</span>
            <input
              type="password"
              value={forms.login.password}
              onChange={(event) => updateForm('login', 'password', event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  login();
                }
              }}
            />
          </label>

          <label className="field">
            <span>{t('auth.requestRole')}</span>
            <select value={forms.login.requestedRole} onChange={(event) => updateForm('login', 'requestedRole', event.target.value)}>
              <option value="ADMIN">{getRoleLabel(t, 'ADMIN')}</option>
              <option value="FINANCE">{getRoleLabel(t, 'FINANCE')}</option>
              <option value="OPERATIONS">{getRoleLabel(t, 'OPERATIONS')}</option>
            </select>
          </label>

          <label className="field">
            <span>{t('sidebar.language')}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="en">{t('language.en')}</option>
              <option value="vi">{t('language.vi')}</option>
            </select>
          </label>
        </div>

        <div className="button-row">
          <button type="button" className="button button--block" onClick={login} disabled={busy === 'login'}>
            {t('auth.signIn')}
          </button>
        </div>

        <div className="detail-card">
          <p className="inline-note">{t('auth.demoHint')}</p>
          <div className="session-card__chips">
            {DEMO_CREDENTIALS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="button button--ghost"
                onClick={() => applyDemoCredentials(account)}
              >
                {t('auth.demoAccount', { role: getRoleLabel(t, account.requestedRole) })}
              </button>
            ))}
          </div>
        </div>

        <div className="toast">
          <strong>{t('toast.status')}</strong>
          <span>{busy === 'login' ? t('message.workingOn', { action: t('action.login') }) : message}</span>
        </div>
      </section>
    </div>
  );
}

function UserManagementSection({
  t,
  data,
  selectedUser,
  selectedId,
  forms,
  setSelected,
  updateForm,
  toggleManagedUserRole,
  resetManagedUserForm,
  createManagedUser,
  saveManagedUser,
  formatAppDateTime
}) {
  return (
    <div className="stack">
      <div className="grid grid--2">
        <div className="panel">
          <div className="panel__header">
            <div>
              <h2>{t('users.directoryTitle')}</h2>
              <p>{t('users.directoryDescription')}</p>
            </div>
            <button type="button" className="button button--ghost" onClick={resetManagedUserForm}>
              {t('users.newUser')}
            </button>
          </div>
          <Table
            rowKey="userId"
            rows={data.users}
            selectedId={selectedId}
            emptyMessage={t('common.noRecords')}
            onPick={(row) => setSelected((current) => ({ ...current, userId: row.userId }))}
            columns={[
              { key: 'email', label: t('users.email') },
              { key: 'fullName', label: t('users.name'), render: (row) => `${row.firstName} ${row.lastName}` },
              { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} t={t} /> },
              {
                key: 'roles',
                label: t('users.roles'),
                render: (row) => row.roles.length
                  ? row.roles.map((role) => getRoleLabel(t, role.roleCode)).join(', ')
                  : t('common.notSet')
              }
            ]}
          />
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h2>{selectedUser ? t('users.editTitle') : t('users.createTitle')}</h2>
              <p>{selectedUser ? t('users.editDescription') : t('users.createDescription')}</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>{t('users.email')}</span>
              <input value={forms.user.email} onChange={(event) => updateForm('user', 'email', event.target.value)} />
            </label>
            <label className="field">
              <span>{t('users.status')}</span>
              <select value={forms.user.status} onChange={(event) => updateForm('user', 'status', event.target.value)}>
                {USER_STATUSES.map((status) => (
                  <option key={status} value={status}>{getStatusLabel(t, status)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('users.firstName')}</span>
              <input value={forms.user.firstName} onChange={(event) => updateForm('user', 'firstName', event.target.value)} />
            </label>
            <label className="field">
              <span>{t('users.lastName')}</span>
              <input value={forms.user.lastName} onChange={(event) => updateForm('user', 'lastName', event.target.value)} />
            </label>
            <label className="field field--full">
              <span>{selectedUser ? t('users.passwordReset') : t('users.password')}</span>
              <input
                type="password"
                value={forms.user.password}
                placeholder={selectedUser ? t('users.passwordResetPlaceholder') : ''}
                onChange={(event) => updateForm('user', 'password', event.target.value)}
              />
            </label>
          </div>

          <div className="subpanel">
            <div className="panel__header">
              <div>
                <h2>{t('users.roles')}</h2>
                <p>{t('users.rolesDescription')}</p>
              </div>
            </div>
            <div className="role-grid">
              {data.roles.map((role) => {
                const checked = forms.user.roleIds.includes(role.roleId);

                return (
                  <label key={role.roleId} className={checked ? 'role-option role-option--checked' : 'role-option'}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleManagedUserRole(role.roleId)}
                    />
                    <div>
                      <strong>{getRoleLabel(t, role.roleCode)}</strong>
                      <small>{getRoleDescription(t, role)}</small>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="button" onClick={selectedUser ? saveManagedUser : createManagedUser}>
              {selectedUser ? t('users.saveUser') : t('users.createUser')}
            </button>
            <button type="button" className="button button--ghost" onClick={resetManagedUserForm}>
              {t('users.clearSelection')}
            </button>
          </div>

          {selectedUser ? (
            <div className="detail-card">
              <p className="inline-note">{t('users.lastLogin')}: <strong>{formatAppDateTime(selectedUser.lastLoginAt)}</strong></p>
              <p className="inline-note">{t('common.updated')}: <strong>{formatAppDateTime(selectedUser.updatedAt)}</strong></p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState(loadStoredLanguage);
  const t = useMemo(() => createTranslator(language), [language]);
  const [session, setSession] = useState(loadStoredSession);
  const [section, setSection] = useState('master');
  const [masterTab, setMasterTab] = useState('inventory');
  const [isEditingSelectedItem, setIsEditingSelectedItem] = useState(false);
  const [itemDetailTab, setItemDetailTab] = useState('overview');
  const [manufacturingTab, setManufacturingTab] = useState('production');
  const [bomWorkspaceMode, setBomWorkspaceMode] = useState('browse');
  const [forms, setForms] = useState(DEFAULT_FORMS);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(() => createTranslator(loadStoredLanguage())('message.ready'));
  const [selected, setSelected] = useState({});
  const [inventoryDetail, setInventoryDetail] = useState(null);
  const [inventoryImportSummary, setInventoryImportSummary] = useState(null);
  const [itemBomState, setItemBomState] = useState({ status: 'idle', bom: null });
  const [purchaseOrderDetail, setPurchaseOrderDetail] = useState(null);
  const [salesOrderDetail, setSalesOrderDetail] = useState(null);
  const [cycleCountDetail, setCycleCountDetail] = useState(null);
  const [bomDetail, setBomDetail] = useState(null);
  const [bomExplosionPreview, setBomExplosionPreview] = useState([]);
  const [backflushPreview, setBackflushPreview] = useState([]);
  const [picksByOrder, setPicksByOrder] = useState({});
  const [itemSearch, setItemSearch] = useState('');
  const [bomLibrarySearch, setBomLibrarySearch] = useState('');
  const inventoryDetailRef = useRef(null);
  const inventoryWorkspaceRef = useRef(null);
  const pendingWorkspaceScrollRef = useRef(false);
  const deferredItemSearch = useDeferredValue(itemSearch);
  const deferredBomLibrarySearch = useDeferredValue(bomLibrarySearch);
  const [data, setData] = useState(EMPTY_DATA);
  const api = useMemo(() => createApiClient(session), [session]);
  const financeVisible = ['ADMIN', 'FINANCE'].includes(session?.role);
  const adminVisible = session?.role === 'ADMIN';
  const canMaintainItems = ['ADMIN', 'OPERATIONS'].includes(session?.role);
  const dateLocale = language === 'vi' ? 'vi-VN' : 'en-US';
  const moneyLocale = language === 'vi' ? 'vi-VN' : 'en-US';
  const formatAppDate = (value) => formatDate(value, dateLocale, t('common.notSet'));
  const formatAppDateTime = (value) => formatDateTime(value, dateLocale, t('common.notSet'));
  const formatAppMoney = (value, currencyCode) => formatMoney(value, currencyCode, moneyLocale);
  const fail = (key) => {
    throw new Error(t(key));
  };
  const parseItemCostInput = (value, fallbackCurrencyCode) => {
    try {
      return parseMoneyInput(value, fallbackCurrencyCode);
    } catch {
      throw new Error(t('master.unitCostInvalid'));
    }
  };
  const actionLabel = (actionKey) => t(`action.${actionKey}`);
  const selectedManagedUser = useMemo(() => {
    return data.users.find((user) => user.userId === selected.userId) ?? null;
  }, [data.users, selected.userId]);
  const availableRequestRoles = useMemo(() => {
    return Object.keys(ROLE_LABEL_KEYS);
  }, []);
  const navItems = useMemo(() => adminVisible ? [...NAV, 'users'] : NAV, [adminVisible]);
  const primaryTopNavItems = useMemo(() => navItems.filter((item) => PRIMARY_TOP_NAV.includes(item)), [navItems]);
  const secondaryTopNavItems = useMemo(() => navItems.filter((item) => !PRIMARY_TOP_NAV.includes(item)), [navItems]);

  useEffect(() => {
    window.localStorage.removeItem('ims-front-session');
  }, [session]);

  useEffect(() => {
    window.localStorage.setItem('ims-front-language', language);
  }, [language]);

  useEffect(() => {
    if (!session?.userId || !session?.role) {
      setData(EMPTY_DATA);
      setBusy('');
      return undefined;
    }

    let cancelled = false;
    async function load() {
      setBusy('refreshWorkspace');
      try {
        const safe = async (path, fallback) => {
          try {
            return await api.request(path);
          } catch (error) {
            if (error.status === 403 || error.status === 404) return fallback;
            throw error;
          }
        };

        const [me, roles, users, suppliers, customers, items, locations, inventory, purchaseOrders, receipts, salesOrders, cycleCounts, discrepancyTickets, boms, productionOrders, scrapRequests] = await Promise.all([
          safe('/auth/me', { data: null }),
          safe('/roles', { data: [] }),
          safe('/users', { data: [] }),
          safe('/suppliers', { data: [] }),
          safe('/customers', { data: [] }),
          safe('/items?limit=200', { data: [] }),
          safe('/locations?limit=200', { data: [] }),
          safe('/inventory/balances?limit=200', { data: [] }),
          safe('/purchase-orders?limit=50', { data: [] }),
          safe('/receipts?limit=50', { data: [] }),
          safe('/sales-orders?limit=50', { data: [] }),
          safe('/cycle-counts?limit=50', { data: [] }),
          safe('/cycle-counts/discrepancy-tickets?limit=50', { data: [] }),
          safe('/boms?limit=50', { data: [] }),
          safe('/manufacturing/production-orders?limit=50', { data: [] }),
          safe('/manufacturing/scrap-requests?limit=50', { data: [] })
        ]);

        if (cancelled) return;
        setData({
          me: me.data,
          roles: roles.data,
          users: users.data,
          suppliers: suppliers.data,
          customers: customers.data,
          items: items.data,
          locations: locations.data,
          inventory: inventory.data,
          purchaseOrders: purchaseOrders.data,
          receipts: receipts.data,
          salesOrders: salesOrders.data,
          cycleCounts: cycleCounts.data,
          discrepancyTickets: discrepancyTickets.data,
          boms: boms.data,
          productionOrders: productionOrders.data,
          scrapRequests: scrapRequests.data
        });
        setMessage(t('message.workspaceRefreshed', { role: getRoleLabel(t, session.role) }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error.status === 401) {
          setSession(null);
          setData(EMPTY_DATA);
          setMessage(t('message.sessionExpired'));
          return;
        }

        setMessage(error.message);
      } finally {
        if (!cancelled) setBusy('');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api, session?.role, session?.userId, t]);

  function updateForm(group, key, value) {
    setForms((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  }

  function applyDemoCredentials(account) {
    setForms((current) => ({
      ...current,
      login: {
        email: account.email,
        password: account.password,
        requestedRole: account.requestedRole
      }
    }));
  }

  function toggleManagedUserRole(roleId) {
    setForms((current) => {
      const nextRoleIds = current.user.roleIds.includes(roleId)
        ? current.user.roleIds.filter((value) => value !== roleId)
        : [...current.user.roleIds, roleId];

      return {
        ...current,
        user: {
          ...current.user,
          roleIds: nextRoleIds
        }
      };
    });
  }

  function resetManagedUserForm() {
    setSelected((current) => {
      const next = { ...current };
      delete next.userId;
      return next;
    });
    setForms((current) => ({
      ...current,
      user: createManagedUserForm(null)
    }));
  }

  async function login() {
    setBusy('login');

    try {
      const response = await api.request('/auth/login', {
        method: 'POST',
        body: {
          email: forms.login.email,
          password: forms.login.password,
          requestedRole: forms.login.requestedRole
        },
        session: null
      });

      setSession(response.data.session);
      setSection('overview');
      setMessage(t('message.loginSuccess'));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy('');
    }
  }

  function logout() {
    setSession(null);
    setData(EMPTY_DATA);
    setSelected({});
    setInventoryDetail(null);
    setItemBomState({ status: 'idle', bom: null });
    setPurchaseOrderDetail(null);
    setSalesOrderDetail(null);
    setCycleCountDetail(null);
    setBomDetail(null);
    setBomExplosionPreview([]);
    setBackflushPreview([]);
    setPicksByOrder({});
    setForms((current) => ({
      ...current,
      login: { ...current.login, password: '' },
      user: createManagedUserForm(null)
    }));
    setSection('overview');
    setMessage(t('message.signedOut'));
  }

  async function run(actionKey, callback) {
    setBusy(actionKey);
    try {
      const result = await callback();
      setMessage(t('message.actionCompleted', { action: actionLabel(actionKey) }));
      setSession((current) => current ? { ...current } : current);
      return result;
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      setBusy('');
    }
  }

  async function syncManagedUserRoles(userId, previousRoleIds, nextRoleIds) {
    const previous = new Set(previousRoleIds);
    const next = new Set(nextRoleIds);

    for (const roleId of next) {
      if (!previous.has(roleId)) {
        await api.request(`/users/${userId}/roles`, {
          method: 'POST',
          body: { roleId }
        });
      }
    }

    for (const roleId of previous) {
      if (!next.has(roleId)) {
        await api.request(`/users/${userId}/roles/${roleId}`, {
          method: 'DELETE'
        });
      }
    }
  }

  async function createManagedUser() {
    const response = await run('userCreation', () => api.request('/users', {
      method: 'POST',
      body: {
        email: forms.user.email,
        firstName: forms.user.firstName,
        lastName: forms.user.lastName,
        status: forms.user.status,
        password: forms.user.password,
        roleIds: forms.user.roleIds
      }
    }));

    setSelected((current) => ({ ...current, userId: response.data.userId }));
  }

  async function saveManagedUser() {
    if (!selectedManagedUser) {
      fail('error.selectUserFirst');
    }

    await run('userUpdate', async () => {
      await api.request(`/users/${selectedManagedUser.userId}`, {
        method: 'PATCH',
        body: {
          email: forms.user.email,
          firstName: forms.user.firstName,
          lastName: forms.user.lastName,
          status: forms.user.status,
          ...(forms.user.password ? { password: forms.user.password } : {})
        }
      });

      await syncManagedUserRoles(
        selectedManagedUser.userId,
        selectedManagedUser.roles.map((role) => role.roleId),
        forms.user.roleIds
      );
    });
  }

  const findItemByScan = (scanValue) => {
    const normalized = normalizeScanValue(scanValue);
    if (!normalized) return null;

    return data.items.find((item) => (
      [
        item.itemId,
        item.internalSku,
        item.supplierSku,
        item.barcodeValue
      ].some((candidate) => normalizeScanValue(candidate) === normalized)
    )) ?? null;
  };
  const findLocationByScan = (scanValue) => {
    const normalized = normalizeScanValue(scanValue);
    if (!normalized) return null;

    return data.locations.find((location) => (
      [
        location.locationId,
        location.locationCode,
        location.barcodeValue
      ].some((candidate) => normalizeScanValue(candidate) === normalized)
    )) ?? null;
  };
  const findInventoryBalanceByLotScan = (itemId, locationId, scanValue) => {
    const normalized = normalizeScanValue(scanValue);
    if (!itemId || !normalized) return null;

    return data.inventory.find((balance) => (
      balance.itemId === itemId
      && (!locationId || balance.locationId === locationId)
      && [balance.lotId, balance.lotNumber].some((candidate) => normalizeScanValue(candidate) === normalized)
    )) ?? null;
  };
  const findInventoryBalanceBySerialScan = (itemId, locationId, scanValue) => {
    const normalized = normalizeScanValue(scanValue);
    if (!normalized) return null;

    return data.inventory.find((balance) => (
      (!itemId || balance.itemId === itemId)
      && (!locationId || balance.locationId === locationId)
      && [balance.serialId, balance.serialNumber].some((candidate) => normalizeScanValue(candidate) === normalized)
    )) ?? null;
  };
  const filteredItems = useMemo(() => {
    const query = deferredItemSearch.trim().toLowerCase();
    const source = data.items.filter((item) => masterTab === 'inventory' ? item.isActive : !item.isActive);
    if (!query) return source;
    return source.filter((item) => item.internalSku.toLowerCase().includes(query) || item.name.toLowerCase().includes(query));
  }, [data.items, deferredItemSearch, masterTab]);
  const filteredBoms = useMemo(() => {
    const query = deferredBomLibrarySearch.trim().toLowerCase();
    if (!query) return data.boms;
    return data.boms.filter((bom) =>
      [bom.parentInternalSku, bom.parentItemName, bom.versionName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [data.boms, deferredBomLibrarySearch]);
  const availableProductionBoms = useMemo(() => {
    const finishedGoodItemId = forms.productionOrder.finishedGoodItemId;
    return data.boms.filter((bom) => bom.isActive && (!finishedGoodItemId || bom.parentItemId === finishedGoodItemId));
  }, [data.boms, forms.productionOrder.finishedGoodItemId]);
  const linkedProductionBom = useMemo(() => {
    const bomId = forms.productionOrder.bomId || selected.bomId;
    return data.boms.find((bom) => bom.bomId === bomId) ?? null;
  }, [data.boms, forms.productionOrder.bomId, selected.bomId]);
  const pickForSelectedOrder = useMemo(() => {
    return selected.salesOrderId ? (picksByOrder[selected.salesOrderId] ?? null) : null;
  }, [picksByOrder, selected.salesOrderId]);
  const activePick = useMemo(() => {
    return pickForSelectedOrder && ['OPEN', 'IN_PROGRESS'].includes(pickForSelectedOrder.status) ? pickForSelectedOrder : null;
  }, [pickForSelectedOrder]);
  const receivingScannedItem = useMemo(() => findItemByScan(forms.receivingScan.itemScan), [data.items, forms.receivingScan.itemScan]);
  const receivingScannedLocation = useMemo(() => findLocationByScan(forms.receivingScan.receivingLocationScan), [data.locations, forms.receivingScan.receivingLocationScan]);
  const receivingScannedPutawayLocation = useMemo(() => findLocationByScan(forms.receivingScan.putawayLocationScan), [data.locations, forms.receivingScan.putawayLocationScan]);
  const receivingMatchedPoLine = useMemo(() => {
    if (!purchaseOrderDetail?.lines || !receivingScannedItem) {
      return null;
    }

    return purchaseOrderDetail.lines.find((line) => (
      line.itemId === receivingScannedItem.itemId && line.receivedQty < line.orderedQty
    )) ?? purchaseOrderDetail.lines.find((line) => line.itemId === receivingScannedItem.itemId) ?? null;
  }, [purchaseOrderDetail, receivingScannedItem]);
  const receivingSerialNumbers = useMemo(() => parseScanList(forms.receivingScan.serialNumbers), [forms.receivingScan.serialNumbers]);
  const guidedPickItem = useMemo(() => findItemByScan(forms.pickingScan.itemScan), [data.items, forms.pickingScan.itemScan]);
  const guidedPickLocation = useMemo(() => findLocationByScan(forms.pickingScan.locationScan), [data.locations, forms.pickingScan.locationScan]);
  const guidedPickLine = useMemo(() => {
    if (!activePick || !guidedPickItem || !guidedPickLocation) {
      return null;
    }

    return activePick.lines.find((line) => line.itemId === guidedPickItem.itemId && line.locationId === guidedPickLocation.locationId) ?? null;
  }, [activePick, guidedPickItem, guidedPickLocation]);
  const countScannedLocation = useMemo(() => {
    return findLocationByScan(forms.countScan.locationScan) ?? (cycleCountDetail
      ? data.locations.find((location) => location.locationId === cycleCountDetail.locationId) ?? null
      : null);
  }, [cycleCountDetail, data.locations, forms.countScan.locationScan]);
  const countScannedSerialBalance = useMemo(() => findInventoryBalanceBySerialScan(null, countScannedLocation?.locationId ?? null, forms.countScan.serialScan), [countScannedLocation?.locationId, data.inventory, forms.countScan.serialScan]);
  const countScannedItem = useMemo(() => {
    if (countScannedSerialBalance) {
      return data.items.find((item) => item.itemId === countScannedSerialBalance.itemId) ?? null;
    }

    return findItemByScan(forms.countScan.itemScan);
  }, [countScannedSerialBalance, data.items, forms.countScan.itemScan]);
  const countScannedLotBalance = useMemo(() => findInventoryBalanceByLotScan(countScannedItem?.itemId ?? null, countScannedLocation?.locationId ?? null, forms.countScan.lotScan), [countScannedItem?.itemId, countScannedLocation?.locationId, data.inventory, forms.countScan.lotScan]);
  const selectedBomLine = useMemo(() => {
    return bomDetail?.lines?.find((line) => line.bomLineId === selected.bomLineId) ?? null;
  }, [bomDetail, selected.bomLineId]);
  const showBomSecondaryPane = bomWorkspaceMode === 'create' || Boolean(bomDetail);
  const sectionHeroContent = useMemo(() => {
    if (section === 'overview') {
      return {
        title: t('hero.title'),
        description: t('hero.description')
      };
    }

    if (section === 'master') {
      return {
        title: t('nav.master'),
        description: ''
      };
    }

    if (section === 'purchaseOrders') {
      return {
        title: t('nav.purchaseOrders'),
        description: ''
      };
    }

    if (section === 'receiving') {
      return {
        title: t('nav.receiving'),
        description: ''
      };
    }

    if (section === 'fulfillment') {
      return {
        title: t('nav.fulfillment'),
        description: ''
      };
    }

    if (section === 'counts') {
      return {
        title: t('nav.counts'),
        description: ''
      };
    }

    if (section === 'manufacturing') {
      return {
        title: manufacturingTab === 'bom' ? t('manufacturing.bomWorkspaceTitle') : t('manufacturing.productionTitle'),
        description: manufacturingTab === 'bom' ? t('manufacturing.useBomWorkspaceHint') : ''
      };
    }

    if (section === 'users') {
      return {
        title: t('nav.users'),
        description: t('users.directoryDescription')
      };
    }

    return {
      title: t('hero.title'),
      description: t('hero.description')
    };
  }, [manufacturingTab, section, t]);
  const heroTitle = useMemo(() => {
    return sectionHeroContent.title;
  }, [sectionHeroContent]);
  const heroDescription = useMemo(() => {
    return sectionHeroContent.description;
  }, [sectionHeroContent]);

  function applyBomDetails(bom) {
    setBomDetail(bom);
    setForms((current) => ({
      ...current,
      bomEdit: {
        versionName: bom?.versionName ?? '',
        notes: bom?.notes ?? ''
      }
    }));
  }

  function resetBomLineEditor() {
    setSelected((current) => ({ ...current, bomLineId: undefined }));
    setForms((current) => ({
      ...current,
      bomLineEdit: {
        componentItemId: '',
        quantity: '1',
        scrapAllowancePct: '0'
      }
    }));
  }

  function loadBomLineEditor(line) {
    if (!line) {
      resetBomLineEditor();
      return;
    }

    setSelected((current) => ({ ...current, bomLineId: line.bomLineId }));
    setForms((current) => ({
      ...current,
      bomLineEdit: {
        componentItemId: line.componentItemId ?? '',
        quantity: String(line.quantity ?? 1),
        scrapAllowancePct: String(line.scrapAllowancePct ?? 0)
      }
    }));
  }

  async function refreshBomDetails(bomId = selected.bomId) {
    if (!bomId) {
      setBomDetail(null);
      setBomExplosionPreview([]);
      resetBomLineEditor();
      return null;
    }

    const response = await api.request(`/boms/${bomId}`);
    applyBomDetails(response.data);
    return response.data;
  }

  useEffect(() => {
    let cancelled = false;

    if (!selected.bomId) {
      setBomDetail(null);
      setBomExplosionPreview([]);
      resetBomLineEditor();
      return undefined;
    }

    api.request(`/boms/${selected.bomId}`)
      .then((response) => {
        if (!cancelled) {
          applyBomDetails(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBomDetail(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, selected.bomId]);

  useEffect(() => {
    let cancelled = false;

    if (!selected.purchaseOrderId) {
      setPurchaseOrderDetail(null);
      return undefined;
    }

    api.request(`/purchase-orders/${selected.purchaseOrderId}`)
      .then((response) => {
        if (!cancelled) {
          setPurchaseOrderDetail(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPurchaseOrderDetail(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, selected.purchaseOrderId]);

  useEffect(() => {
    let cancelled = false;

    if (!selected.salesOrderId) {
      setSalesOrderDetail(null);
      return undefined;
    }

    api.request(`/sales-orders/${selected.salesOrderId}`)
      .then((response) => {
        if (!cancelled) {
          setSalesOrderDetail(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSalesOrderDetail(null);
        }
      });

    api.request(`/fulfillment/sales-orders/${selected.salesOrderId}/picks/open`)
      .then((response) => {
        if (!cancelled) {
          setPicksByOrder((current) => ({ ...current, [selected.salesOrderId]: response.data.pick }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPicksByOrder((current) => ({ ...current, [selected.salesOrderId]: null }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, selected.salesOrderId]);

  useEffect(() => {
    let cancelled = false;

    if (!selected.cycleCountId) {
      setCycleCountDetail(null);
      return undefined;
    }

    api.request(`/cycle-counts/${selected.cycleCountId}`)
      .then((response) => {
        if (!cancelled) {
          setCycleCountDetail(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCycleCountDetail(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, selected.cycleCountId]);

  useEffect(() => {
    if (!selected.itemId || !['inventory', 'archived'].includes(masterTab)) {
      return;
    }

    const selectedItem = data.items.find((item) => item.itemId === selected.itemId) ?? null;
    const shouldBeVisible = selectedItem ? (masterTab === 'inventory' ? selectedItem.isActive : !selectedItem.isActive) : false;

    if (!shouldBeVisible) {
      setSelected((current) => ({ ...current, itemId: undefined }));
      setInventoryDetail(null);
    }
  }, [data.items, masterTab, selected.itemId]);

  useEffect(() => {
    const item = inventoryDetail?.item;

    setForms((current) => ({
      ...current,
      itemEdit: item ? createItemEditForm(item) : DEFAULT_FORMS.itemEdit
    }));
  }, [inventoryDetail]);

  useEffect(() => {
    setForms((current) => ({
      ...current,
      user: createManagedUserForm(selectedManagedUser)
    }));
  }, [selectedManagedUser]);

  useEffect(() => {
    if (section === 'users' && !adminVisible) {
      setSection('overview');
    }
  }, [adminVisible, section]);

  useEffect(() => {
    const itemType = inventoryDetail?.item?.itemType;
    if (itemDetailTab === 'components' && !['FINISHED_GOOD', 'SUB_ASSEMBLY'].includes(itemType ?? '')) {
      setItemDetailTab('overview');
    }
  }, [inventoryDetail?.item?.itemType, itemDetailTab]);

  useEffect(() => {
    let cancelled = false;
    const item = inventoryDetail?.item;

    if (!item || !['FINISHED_GOOD', 'SUB_ASSEMBLY'].includes(item.itemType)) {
      setItemBomState({ status: 'idle', bom: null });
      return undefined;
    }

    if (!canMaintainItems) {
      setItemBomState({ status: 'restricted', bom: null });
      return undefined;
    }

    setItemBomState({ status: 'loading', bom: null });

    api.request(`/boms?${buildQueryString({ parentItemId: item.itemId, activeOnly: true, limit: 1 })}`)
      .then((response) => {
        const activeBom = response.data?.[0];
        if (!activeBom) {
          if (!cancelled) {
            setItemBomState({ status: 'empty', bom: null });
          }
          return null;
        }

        return api.request(`/boms/${activeBom.bomId}`)
          .then((detailResponse) => {
            if (!cancelled) {
              setItemBomState({ status: 'ready', bom: detailResponse.data });
            }
          });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setItemBomState({ status: error.status === 403 ? 'restricted' : 'empty', bom: null });
      });

    return () => {
      cancelled = true;
    };
  }, [api, canMaintainItems, inventoryDetail?.item?.itemId, inventoryDetail?.item?.itemType]);

  useEffect(() => {
    if (!inventoryDetail || !inventoryDetailRef.current) {
      return;
    }

    if (window.innerWidth >= 1180) {
      return;
    }

    inventoryDetailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [inventoryDetail]);

  useEffect(() => {
    setIsEditingSelectedItem(false);
  }, [selected.itemId]);

  useEffect(() => {
    if (
      !pendingWorkspaceScrollRef.current ||
      itemDetailTab !== 'components' ||
      !inventoryWorkspaceRef.current
    ) {
      return;
    }

    pendingWorkspaceScrollRef.current = false;
    inventoryWorkspaceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [itemDetailTab, inventoryDetail?.item?.itemId]);

  async function refreshInventory(itemId) {
    if (!itemId) return;
    const itemFilter = buildQueryString({ itemId, limit: 25 });
    const [summary, transactions, lots, serials] = await Promise.all([
      api.request(`/items/${itemId}/inventory`),
      api.request(`/inventory/transactions?${itemFilter}`),
      api.request(`/inventory/lots?${itemFilter}`),
      api.request(`/inventory/serials?${itemFilter}`)
    ]);

    setInventoryDetail({
      ...summary.data,
      transactions: transactions.data,
      lots: lots.data,
      serials: serials.data
    });
  }

  async function createSupplier() {
    await run('supplierCreation', () =>
      api.request('/suppliers', {
        method: 'POST',
        body: {
          supplierCode: forms.supplier.supplierCode,
          supplierName: forms.supplier.supplierName,
          contactEmail: forms.supplier.contactEmail || null,
          contactPhone: forms.supplier.contactPhone || null,
          leadTimeDays: Number(forms.supplier.leadTimeDays || 0)
        }
      })
    );
  }

  async function createCustomer() {
    await run('customerCreation', () =>
      api.request('/customers', {
        method: 'POST',
        body: {
          customerCode: forms.customer.customerCode,
          customerName: forms.customer.customerName,
          contactEmail: forms.customer.contactEmail || null,
          contactPhone: forms.customer.contactPhone || null
        }
      })
    );
  }

  async function createItem() {
    const response = await run('itemCreation', () =>
      {
        const payload = {
          internalSku: forms.item.internalSku,
          name: forms.item.name,
          itemType: forms.item.itemType,
          uom: forms.item.uom,
          minStockLevel: Number(forms.item.minStockLevel || 0),
          reorderQuantity: Number(forms.item.reorderQuantity || 0),
          leadTimeDays: Number(forms.item.leadTimeDays || 0)
        };

        if (financeVisible) {
          const { amount, currencyCode } = parseItemCostInput(forms.item.unitCost, 'USD');
          payload.unitCost = amount;
          payload.unitCostCurrencyCode = currencyCode;
        }

        return api.request('/items', { method: 'POST', body: payload });
      }
    );
    setSelected((current) => ({ ...current, itemId: response.data.itemId }));
    setMasterTab('inventory');
  }

  function syncItemState(updatedItem) {
    setData((current) => ({
      ...current,
      items: current.items.map((item) => item.itemId === updatedItem.itemId ? updatedItem : item)
    }));
    setInventoryDetail((current) => current && current.item.itemId === updatedItem.itemId
      ? { ...current, item: { ...current.item, ...updatedItem } }
      : current);
    setForms((current) => ({
      ...current,
      itemEdit: createItemEditForm(updatedItem)
    }));
  }

  function createBomSummary(bom) {
    if (!bom) {
      return null;
    }

    return {
      bomId: bom.bomId,
      parentItemId: bom.parentItemId,
      parentInternalSku: bom.parentInternalSku,
      parentItemName: bom.parentItemName,
      versionName: bom.versionName,
      isActive: bom.isActive,
      notes: bom.notes,
      createdBy: bom.createdBy,
      approvedBy: bom.approvedBy,
      createdAt: bom.createdAt,
      updatedAt: bom.updatedAt,
      lineCount: bom.lineCount ?? bom.lines?.length ?? 0
    };
  }

  function upsertBomSummary(summary) {
    if (!summary?.bomId) {
      return;
    }

    setData((current) => {
      const nextBoms = current.boms
        .filter((bom) => bom.bomId !== summary.bomId)
        .map((bom) => (
          summary.isActive && bom.parentItemId === summary.parentItemId
            ? { ...bom, isActive: false }
            : bom
        ));

      nextBoms.push(summary);
      nextBoms.sort((left, right) => {
        const skuComparison = String(left.parentInternalSku ?? '').localeCompare(String(right.parentInternalSku ?? ''));
        if (skuComparison !== 0) {
          return skuComparison;
        }

        return String(right.versionName ?? '').localeCompare(String(left.versionName ?? ''));
      });

      return {
        ...current,
        boms: nextBoms
      };
    });
  }

  function syncBomState(updatedBom) {
    const summary = createBomSummary(updatedBom);
    if (!summary) {
      return;
    }

    upsertBomSummary(summary);

    if (inventoryDetail?.item?.itemId !== summary.parentItemId) {
      return;
    }

    if (summary.isActive) {
      setItemBomState({ status: 'ready', bom: updatedBom });
    }
  }

  async function generateBarcodeForSelectedItem() {
    if (!selected.itemId) {
      fail('error.selectItemFirst');
    }

    const response = await run('barcodeGeneration', () =>
      api.request(`/items/${selected.itemId}/internal-barcode`, { method: 'POST' })
    );
    syncItemState(response.data.item);
  }

  async function importEndingBalances() {
    const response = await run('inventoryImport', () =>
      api.request('/inventory/import-ending-balances', {
        method: 'POST',
        body: {
          filePath: forms.inventoryImport.filePath,
          locationCode: forms.inventoryImport.locationCode || null,
          locationName: forms.inventoryImport.locationName || null,
          locationType: forms.inventoryImport.locationType,
          defaultItemType: forms.inventoryImport.defaultItemType,
          unitCostCurrencyCode: forms.inventoryImport.unitCostCurrencyCode,
          dryRun: forms.inventoryImport.dryRun === 'true'
        }
      })
    );

    setInventoryImportSummary(response.data);
    setMasterTab('import');
  }

  async function saveSelectedItem() {
    if (!selected.itemId) {
      fail('error.selectItemFirst');
    }

    const previousItemType = inventoryDetail?.item?.itemType ?? null;
    const response = await run('itemUpdate', () =>
      {
        const payload = {
          internalSku: forms.itemEdit.internalSku,
          name: forms.itemEdit.name,
          itemType: forms.itemEdit.itemType,
          uom: forms.itemEdit.uom,
          supplierSku: forms.itemEdit.supplierSku || null,
          description: forms.itemEdit.description || null,
          minStockLevel: Number(forms.itemEdit.minStockLevel || 0),
          reorderQuantity: Number(forms.itemEdit.reorderQuantity || 0),
          leadTimeDays: Number(forms.itemEdit.leadTimeDays || 0),
          requiresLotTracking: forms.itemEdit.requiresLotTracking === 'true',
          requiresSerialTracking: forms.itemEdit.requiresSerialTracking === 'true'
        };

        if (financeVisible) {
          const { amount, currencyCode } = parseItemCostInput(
            forms.itemEdit.unitCost,
            inventoryDetail?.item?.unitCostCurrencyCode ?? 'USD'
          );
          payload.unitCost = amount;
          payload.unitCostCurrencyCode = currencyCode;
        }

        return api.request(`/items/${selected.itemId}`, {
          method: 'PATCH',
          body: payload
        });
      }
    );
    const updatedItem = response.data?.item ?? response.data;
    syncItemState(updatedItem);
    await refreshInventory(updatedItem?.itemId ?? selected.itemId);
    setIsEditingSelectedItem(false);

    if (
      updatedItem?.itemId &&
      ['SUB_ASSEMBLY', 'FINISHED_GOOD'].includes(updatedItem.itemType) &&
      updatedItem.itemType !== previousItemType
    ) {
      const bomLookup = await api.request(`/boms?${buildQueryString({ parentItemId: updatedItem.itemId, limit: 1 })}`);
      const existingBom = bomLookup.data?.[0] ?? null;

      pendingWorkspaceScrollRef.current = true;
      setItemDetailTab('components');
      setMessage(t('message.itemRequiresBomSetup', { sku: updatedItem.internalSku }));
      await openBomWorkspaceForItem(updatedItem, {
        createIfMissing: !existingBom,
        bomId: existingBom?.bomId,
        bomSummary: existingBom
      });
    }
  }

  function openItemEditTab() {
    setIsEditingSelectedItem(true);
  }

  function cancelItemEdit() {
    setIsEditingSelectedItem(false);
    setForms((current) => ({
      ...current,
      itemEdit: inventoryDetail?.item ? createItemEditForm(inventoryDetail.item) : DEFAULT_FORMS.itemEdit
    }));
  }

  async function openBomWorkspaceForItem(item, { createIfMissing = false, bomId, bomSummary } = {}) {
    if (!item) {
      return;
    }

    setSection('manufacturing');
    setManufacturingTab('bom');
    setBomWorkspaceMode(createIfMissing ? 'create' : 'browse');
    setBomExplosionPreview([]);
    setBomDetail(null);
    resetBomLineEditor();
    setSelected((current) => ({
      ...current,
      bomId: createIfMissing ? undefined : bomId,
      bomLineId: undefined
    }));
    setForms((current) => ({
      ...current,
      bom: {
        ...current.bom,
        parentItemId: item.itemId
      },
      productionOrder: {
        ...current.productionOrder,
        finishedGoodItemId: item.itemId,
        bomId: createIfMissing ? '' : bomId ?? current.productionOrder.bomId
      }
    }));

    if (createIfMissing || !bomId) {
      return;
    }

    if (bomSummary) {
      upsertBomSummary(bomSummary);
    }

    try {
      const detail = await refreshBomDetails(bomId);
      syncBomState(detail);
    } catch {
      setBomDetail(null);
    }
  }

  function openBomWorkspaceForSelectedItem({ createIfMissing = false } = {}) {
    openBomWorkspaceForItem(inventoryDetail?.item, {
      createIfMissing,
      bomId: itemBomState.bom?.bomId
    });
  }

  async function archiveSelectedItem() {
    if (!selected.itemId) {
      fail('error.selectItemFirst');
    }

    if (!window.confirm(t('master.archiveConfirm'))) {
      return;
    }

    const response = await run('itemArchive', () =>
      api.request(`/items/${selected.itemId}`, {
        method: 'PATCH',
        body: { isActive: false }
      })
    );
    syncItemState(response.data);
    setMasterTab('archived');
  }

  async function restoreSelectedItem() {
    if (!selected.itemId) {
      fail('error.selectItemFirst');
    }

    if (!window.confirm(t('master.restoreConfirm'))) {
      return;
    }

    const response = await run('itemRestore', () =>
      api.request(`/items/${selected.itemId}`, {
        method: 'PATCH',
        body: { isActive: true }
      })
    );
    syncItemState(response.data);
    setMasterTab('inventory');
  }

  async function deleteSelectedArchivedItem() {
    if (!selected.itemId) {
      fail('error.selectItemFirst');
    }

    if (!window.confirm(t('master.deleteArchivedConfirm'))) {
      return;
    }

    await run('itemDelete', () => api.request(`/items/${selected.itemId}`, { method: 'DELETE' }));
    setData((current) => ({
      ...current,
      items: current.items.filter((item) => item.itemId !== selected.itemId)
    }));
    setSelected((current) => ({ ...current, itemId: undefined }));
    setInventoryDetail(null);
  }

  async function createPurchaseOrder() {
    const response = await run('purchaseOrderCreation', () =>
      api.request('/purchase-orders', {
        method: 'POST',
        body: {
          supplierId: forms.purchaseOrder.supplierId,
          expectedReceiptDate: forms.purchaseOrder.expectedReceiptDate || null,
          notes: forms.purchaseOrder.notes || null
        }
      })
    );
    setSelected((current) => ({ ...current, purchaseOrderId: response.data.purchaseOrderId }));
    setPurchaseOrderDetail(response.data);
    return response.data;
  }

  async function addPurchaseOrderLine() {
    const purchaseOrderId = selected.purchaseOrderId;
    const response = await run('purchaseOrderLineAdd', () =>
      api.request(`/purchase-orders/${purchaseOrderId}/lines`, {
        method: 'POST',
        body: {
          itemId: forms.purchaseOrderLine.itemId,
          orderedQty: Number(forms.purchaseOrderLine.orderedQty),
          unitCost: Number(forms.purchaseOrderLine.unitCost || 0)
        }
      })
    );
    const line = response.data.lines.at(-1);
    updateForm('receiptLine', 'purchaseOrderLineId', line?.purchaseOrderLineId ?? '');
    setPurchaseOrderDetail(response.data);
    return response.data;
  }

  async function approvePurchaseOrder() {
    const response = await run('purchaseOrderApproval', () => api.request(`/purchase-orders/${selected.purchaseOrderId}/approve`, { method: 'POST' }));
    setPurchaseOrderDetail(response.data);
    return response.data;
  }

  async function createReceipt() {
    const response = await run('receiptCreation', () =>
      api.request('/receipts', {
        method: 'POST',
        body: {
          purchaseOrderId: selected.purchaseOrderId || forms.receipt.purchaseOrderId,
          notes: forms.receipt.notes || null
        }
      })
    );
    setSelected((current) => ({ ...current, receiptId: response.data.receiptId }));
    return response.data;
  }

  async function addReceiptLine() {
    await run('receiptLineAdd', () =>
      api.request(`/receipts/${selected.receiptId}/lines`, {
        method: 'POST',
        body: {
          purchaseOrderLineId: forms.receiptLine.purchaseOrderLineId,
          receivedQty: Number(forms.receiptLine.receivedQty),
          receivingLocationId: forms.receiptLine.receivingLocationId,
          putawayLocationId: forms.receiptLine.putawayLocationId || null,
          manualLotNumber: forms.receiptLine.manualLotNumber || null
        }
      })
    );
  }

  async function postReceipt() {
    await run('receiptPosting', () => api.request(`/receipts/${selected.receiptId}/post`, { method: 'POST' }));
  }

  async function createSalesOrder() {
    const response = await run('salesOrderCreation', () =>
      api.request('/sales-orders', {
        method: 'POST',
        body: {
          customerId: forms.salesOrder.customerId,
          externalReference: forms.salesOrder.externalReference || null,
          requestedShipDate: forms.salesOrder.requestedShipDate || null,
          lines: [{ itemId: forms.salesOrder.itemId, orderedQty: Number(forms.salesOrder.orderedQty) }]
        }
      })
    );
    setSelected((current) => ({ ...current, salesOrderId: response.data.salesOrderId }));
    setSalesOrderDetail(response.data);
    return response.data;
  }

  async function allocateSalesOrder() {
    const response = await run('salesOrderAllocation', () => api.request(`/sales-orders/${selected.salesOrderId}/allocate`, { method: 'POST' }));
    setSalesOrderDetail(response.data);
    return response.data;
  }

  async function createPick() {
    const response = await run('pickCreation', () => api.request(`/fulfillment/sales-orders/${selected.salesOrderId}/picks`, { method: 'POST' }));
    setPicksByOrder((current) => ({ ...current, [selected.salesOrderId]: response.data.pick }));
    setSalesOrderDetail(response.data.salesOrder);
    return response.data;
  }

  async function confirmPick() {
    const pick = picksByOrder[selected.salesOrderId];
    if (!pick) throw new Error(t('error.createPickFirst'));
    const response = await run('pickConfirmation', () => api.request(`/fulfillment/sales-orders/${selected.salesOrderId}/picks/${pick.pickId}/confirm`, { method: 'POST' }));
    setPicksByOrder((current) => ({ ...current, [selected.salesOrderId]: response.data.pick }));
    setSalesOrderDetail(response.data.salesOrder);
    return response.data;
  }

  async function createCycleCount(override = {}) {
    const response = await run('cycleCountCreation', () =>
      api.request('/cycle-counts', {
        method: 'POST',
        body: {
          locationId: override.locationId ?? forms.cycleCount.locationId,
          notes: override.notes ?? (forms.cycleCount.notes || null)
        }
      })
    );
    setSelected((current) => ({ ...current, cycleCountId: response.data.cycleCountId }));
    setCycleCountDetail(response.data);
    return response.data;
  }

  async function addCycleCountLine() {
    const response = await run('cycleCountLineAdd', () =>
      api.request(`/cycle-counts/${selected.cycleCountId}/lines`, {
        method: 'POST',
        body: {
          itemId: forms.cycleCountLine.itemId,
          lotId: forms.cycleCountLine.lotId || null,
          countedQty: Number(forms.cycleCountLine.countedQty)
        }
      })
    );
    setCycleCountDetail(response.data);
    return response.data;
  }

  async function submitCycleCount() {
    const response = await run('cycleCountSubmit', () => api.request(`/cycle-counts/${selected.cycleCountId}/submit`, { method: 'POST' }));
    setCycleCountDetail(response.data);
    return response.data;
  }

  async function applyReceivingScan() {
    if (!receivingScannedItem) {
      fail('error.scanValidItemFirst');
    }

    if (!receivingScannedLocation) {
      fail('error.scanValidReceivingLocationFirst');
    }

    if (selected.purchaseOrderId && purchaseOrderDetail && !receivingMatchedPoLine) {
      fail('error.receivingPoLineMismatch');
    }

    if (receivingScannedItem.requiresLotTracking && !forms.receivingScan.lotScan.trim()) {
      fail('error.receivingLotRequired');
    }

    if (receivingScannedItem.requiresSerialTracking) {
      const receivedQty = Number(forms.receivingScan.receivedQty || 0);
      if (!Number.isInteger(receivedQty) || receivedQty <= 0) {
        fail('error.receivingWholeNumberQty');
      }

      if (receivingSerialNumbers.length !== receivedQty) {
        fail('error.receivingSerialCountMismatch');
      }
    }

    const receiptId = selected.receiptId ?? (await createReceipt())?.receiptId;
    if (!receiptId) {
      fail('error.selectPurchaseOrderBeforeReceivingScan');
    }

    await run('receiptLineAdd', () =>
      api.request(`/receipts/${receiptId}/lines`, {
        method: 'POST',
        body: {
          itemId: receivingScannedItem.itemId,
          purchaseOrderLineId: receivingMatchedPoLine?.purchaseOrderLineId ?? null,
          receivedQty: Number(forms.receivingScan.receivedQty || 0),
          receivingLocationId: receivingScannedLocation.locationId,
          putawayLocationId: receivingScannedPutawayLocation?.locationId ?? null,
          manualLotNumber: forms.receivingScan.lotScan.trim() || null,
          serialNumbers: receivingScannedItem.requiresSerialTracking ? receivingSerialNumbers : []
        }
      })
    );
  }

  async function loadOpenPick() {
    if (!selected.salesOrderId) {
      fail('error.selectSalesOrderFirst');
    }

    const response = await api.request(`/fulfillment/sales-orders/${selected.salesOrderId}/picks/open`);
    setPicksByOrder((current) => ({ ...current, [selected.salesOrderId]: response.data.pick }));
    return response.data.pick;
  }

  async function confirmGuidedPick() {
    const pick = activePick ?? await loadOpenPick();
    if (!pick) {
      fail('error.createPickFirst');
    }

    if (!guidedPickLine) {
      fail('error.guidedPickMismatch');
    }

    await confirmPick();
  }

  async function applyCountScan() {
    if (!countScannedLocation) {
      fail('error.scanValidCountLocationFirst');
    }

    if (cycleCountDetail && countScannedLocation.locationId !== cycleCountDetail.locationId) {
      fail('error.countLocationMismatch');
    }

    if (!countScannedItem) {
      fail('error.scanValidCountItemFirst');
    }

    const cycleCount = selected.cycleCountId
      ? { cycleCountId: selected.cycleCountId }
      : await createCycleCount({
          locationId: countScannedLocation.locationId,
          notes: forms.cycleCount.notes || null
        });

    const response = await run('cycleCountLineAdd', () =>
      api.request(`/cycle-counts/${cycleCount.cycleCountId}/lines`, {
        method: 'POST',
        body: {
          itemId: countScannedItem.internalSku,
          lotId: countScannedLotBalance?.lotId ?? null,
          serialId: countScannedSerialBalance?.serialId ?? null,
          countedQty: Number(forms.countScan.countedQty || 0)
        }
      })
    );
    setCycleCountDetail(response.data);
  }

  async function approveTicket() {
    await run('discrepancyApproval', () => api.request(`/cycle-counts/discrepancy-tickets/${selected.ticketId}/approve`, { method: 'POST' }));
  }

  async function createBom() {
    const response = await run('bomCreation', () =>
      api.request('/boms', {
        method: 'POST',
        body: {
          parentItemId: forms.bom.parentItemId,
          versionName: forms.bom.versionName,
          notes: forms.bom.notes || null
        }
      })
    );
    syncBomState(response.data);
    setSelected((current) => ({ ...current, bomId: response.data.bomId, bomLineId: undefined }));
    applyBomDetails(response.data);
    setBomWorkspaceMode('browse');
    setBomExplosionPreview([]);
    setForms((current) => ({
      ...current,
      bomLine: {
        ...current.bomLine,
        componentItemId: '',
        quantity: '1',
        scrapAllowancePct: '0'
      }
    }));
    resetBomLineEditor();
  }

  async function addBomLine() {
    const response = await run('bomLineAdd', () =>
      api.request(`/boms/${selected.bomId}/lines`, {
        method: 'POST',
        body: {
          componentItemId: forms.bomLine.componentItemId,
          quantity: Number(forms.bomLine.quantity),
          scrapAllowancePct: Number(forms.bomLine.scrapAllowancePct || 0)
        }
      })
    );
    syncBomState(response.data);
    applyBomDetails(response.data);
    setForms((current) => ({
      ...current,
      bomLine: {
        ...current.bomLine,
        componentItemId: '',
        quantity: '1',
        scrapAllowancePct: '0'
      }
    }));
  }

  async function activateBom() {
    const response = await run('bomActivation', () => api.request(`/boms/${selected.bomId}/activate`, { method: 'POST' }));
    syncBomState(response.data);
    applyBomDetails(response.data);
  }

  async function updateBomHeader() {
    const response = await run('bomUpdate', () =>
      api.request(`/boms/${selected.bomId}`, {
        method: 'PATCH',
        body: {
          versionName: forms.bomEdit.versionName,
          notes: forms.bomEdit.notes || null
        }
      })
    );
    syncBomState(response.data);
    applyBomDetails(response.data);
  }

  async function previewBomExplosion() {
    const response = await run('bomExplosionPreview', () =>
      api.request(`/boms/${selected.bomId}/explosion?quantity=${encodeURIComponent(forms.bomExplosion.quantity || '1')}`)
    );
    setBomExplosionPreview(response.data);
  }

  async function updateSelectedBomLine() {
    const response = await run('bomLineUpdate', () =>
      api.request(`/boms/${selected.bomId}/lines/${selected.bomLineId}`, {
        method: 'PATCH',
        body: {
          componentItemId: forms.bomLineEdit.componentItemId,
          quantity: Number(forms.bomLineEdit.quantity),
          scrapAllowancePct: Number(forms.bomLineEdit.scrapAllowancePct || 0)
        }
      })
    );
    syncBomState(response.data);
    applyBomDetails(response.data);
    const updatedLine = response.data.lines.find((line) => line.bomLineId === selected.bomLineId);
    loadBomLineEditor(updatedLine);
  }

  async function deleteSelectedBomLine() {
    if (!selected.bomLineId) {
      return;
    }

    if (!window.confirm(t('manufacturing.confirmDeleteLine'))) {
      return;
    }

    const response = await run('bomLineDelete', () =>
      api.request(`/boms/${selected.bomId}/lines/${selected.bomLineId}`, {
        method: 'DELETE'
      })
    );
    syncBomState(response.data);
    applyBomDetails(response.data);
    resetBomLineEditor();
  }

  async function createProductionOrder() {
    const response = await run('productionOrderCreation', () =>
      api.request('/manufacturing/production-orders', {
        method: 'POST',
        body: {
          finishedGoodItemId: forms.productionOrder.finishedGoodItemId,
          bomId: forms.productionOrder.bomId || selected.bomId || null,
          quantityPlanned: Number(forms.productionOrder.quantityPlanned),
          externalReference: forms.productionOrder.externalReference || null
        }
      })
    );
    setSelected((current) => ({ ...current, productionOrderId: response.data.productionOrderId }));
  }

  async function recordCompletion() {
    const serialNumbers = forms.completion.serialNumbers
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    await run('productionCompletion', () =>
      api.request(`/manufacturing/production-orders/${selected.productionOrderId}/completions`, {
        method: 'POST',
        body: {
          quantityCompleted: Number(forms.completion.quantityCompleted),
          locationId: forms.completion.locationId,
          serialNumbers
        }
      })
    );
  }

  async function previewBackflush() {
    const response = await run('backflushPreview', () => api.request(`/manufacturing/production-orders/${selected.productionOrderId}/backflush-preview`));
    setBackflushPreview(response.data);
  }

  async function runBackflush() {
    await run('backflushExecution', () => api.request(`/manufacturing/production-orders/${selected.productionOrderId}/backflush`, { method: 'POST' }));
  }

  async function createScrapRequest() {
    const response = await run('scrapRequestCreation', () =>
      api.request('/manufacturing/scrap-requests', {
        method: 'POST',
        body: {
          productionOrderId: selected.productionOrderId || forms.scrap.productionOrderId,
          itemId: forms.scrap.itemId,
          locationId: forms.scrap.locationId || null,
          quantity: Number(forms.scrap.quantity),
          reason: forms.scrap.reason
        }
      })
    );
    setSelected((current) => ({ ...current, scrapRequestId: response.data.scrapRequestId }));
  }

  async function signProductionScrap() {
    await run('productionScrapSignoff', () => api.request(`/manufacturing/scrap-requests/${selected.scrapRequestId}/sign-production`, { method: 'POST' }));
  }

  async function signWarehouseScrap() {
    await run('warehouseScrapSignoff', () => api.request(`/manufacturing/scrap-requests/${selected.scrapRequestId}/sign-warehouse`, { method: 'POST' }));
  }

  const bomWorkspaceContent = (
    <div className="stack">
      <div className="panel">
        <div className="panel__header">
          <div>
            <h2>{t('manufacturing.findBomTitle')}</h2>
            <p>{t('manufacturing.findBomDescription')}</p>
          </div>
        </div>
        <div className="button-row">
          <input className="search bom-search" placeholder={t('common.searchSkuName')} value={bomLibrarySearch} onChange={(event) => setBomLibrarySearch(event.target.value)} />
          <button
            type="button"
            className={bomWorkspaceMode === 'create' ? 'button button--ghost' : 'button'}
            onClick={() => {
              setBomWorkspaceMode((current) => current === 'create' ? 'browse' : 'create');
              resetBomLineEditor();
            }}
          >
            {bomWorkspaceMode === 'create' ? t('manufacturing.cancelCreate') : t('manufacturing.createIfMissing')}
          </button>
        </div>
      </div>

      <div className={showBomSecondaryPane ? 'bom-shell' : 'stack'}>
        <div className="panel">
          <div className="panel__header">
            <div>
              <h2>{t('manufacturing.bomLibraryTitle')}</h2>
              <p>{t('manufacturing.bomLibraryDescription')}</p>
            </div>
          </div>
          <Table
            rowKey="bomId"
            rows={filteredBoms}
            selectedId={selected.bomId}
            emptyMessage={t('common.noRecords')}
            onPick={(row) => {
              setBomWorkspaceMode('browse');
              setSelected((current) => ({ ...current, bomId: row.bomId, bomLineId: undefined }));
              setBomExplosionPreview([]);
              setForms((current) => ({
                ...current,
                productionOrder: {
                  ...current.productionOrder,
                  bomId: row.bomId,
                  finishedGoodItemId: row.parentItemId ?? current.productionOrder.finishedGoodItemId
                }
              }));
              resetBomLineEditor();
            }}
            columns={[
              { key: 'parentInternalSku', label: t('common.sku') },
              { key: 'parentItemName', label: t('common.name') },
              { key: 'versionName', label: t('common.version') },
              { key: 'isActive', label: t('common.status'), render: (row) => row.isActive ? t('common.active') : t('common.inactive') }
            ]}
          />
        </div>

        {bomWorkspaceMode === 'create' ? (
          <div className="panel">
            <div className="panel__header">
              <div>
                <h2>{t('manufacturing.newBomTitle')}</h2>
                <p>{t('manufacturing.newBomDescription')}</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="field field--full">
                <span>{t('manufacturing.parentFinishedGood')}</span>
                <select value={forms.bom.parentItemId} onChange={(event) => updateForm('bom', 'parentItemId', event.target.value)}>
                  <option value="">{t('common.selectFg')}</option>
                  {data.items.filter((item) => ['FINISHED_GOOD', 'SUB_ASSEMBLY'].includes(item.itemType)).map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                </select>
              </label>
              <label className="field"><span>{t('common.version')}</span><input value={forms.bom.versionName} onChange={(event) => updateForm('bom', 'versionName', event.target.value)} /></label>
              <label className="field"><span>{t('manufacturing.bomNotes')}</span><input value={forms.bom.notes} onChange={(event) => updateForm('bom', 'notes', event.target.value)} /></label>
            </div>
            <div className="button-row">
              <button type="button" className="button" onClick={createBom} disabled={!forms.bom.parentItemId}>{t('manufacturing.createBom')}</button>
              <button type="button" className="button button--ghost" onClick={() => setBomWorkspaceMode('browse')}>{t('manufacturing.cancelCreate')}</button>
            </div>
          </div>
        ) : null}

        {bomDetail ? (
          <div className="bom-main">
            <div className="stack">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('manufacturing.reviewBomTitle')}</h2>
                    <p>{t('manufacturing.reviewBomDescription')}</p>
                  </div>
                </div>
                <div className="bom-stat-grid">
                  <div className="detail-card bom-stat">
                    <span>{t('manufacturing.parentFinishedGood')}</span>
                    <strong>{bomDetail.parentInternalSku}</strong>
                    <small>{bomDetail.parentItemName}</small>
                  </div>
                  <div className="detail-card bom-stat">
                    <span>{t('common.version')}</span>
                    <strong>{bomDetail.versionName}</strong>
                    <small>{bomDetail.isActive ? t('common.active') : t('common.inactive')}</small>
                  </div>
                  <div className="detail-card bom-stat">
                    <span>{t('manufacturing.summaryLineCount')}</span>
                    <strong>{formatNumber(bomDetail.lineCount ?? bomDetail.lines?.length ?? 0)}</strong>
                    <small>{t('manufacturing.bomLinesTitle')}</small>
                  </div>
                  <div className="detail-card bom-stat">
                    <span>{t('common.updated')}</span>
                    <strong>{formatAppDate(bomDetail.updatedAt ?? bomDetail.createdAt)}</strong>
                    <small>{t('common.status')}: {bomDetail.isActive ? t('common.active') : t('common.inactive')}</small>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field"><span>{t('common.version')}</span><input value={forms.bomEdit.versionName} onChange={(event) => updateForm('bomEdit', 'versionName', event.target.value)} /></label>
                  <label className="field"><span>{t('manufacturing.explosionQty')}</span><input value={forms.bomExplosion.quantity} onChange={(event) => updateForm('bomExplosion', 'quantity', event.target.value)} /></label>
                  <label className="field field--full">
                    <span>{t('manufacturing.bomNotes')}</span>
                    <input value={forms.bomEdit.notes} onChange={(event) => updateForm('bomEdit', 'notes', event.target.value)} />
                  </label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={updateBomHeader} disabled={!bomDetail}>{t('manufacturing.saveBom')}</button>
                  <button type="button" className="button button--secondary" onClick={activateBom} disabled={!bomDetail}>{t('manufacturing.activate')}</button>
                  <button type="button" className="button button--ghost" onClick={previewBomExplosion} disabled={!bomDetail}>{t('manufacturing.previewBomExplosion')}</button>
                </div>
              </div>

              <div className="bom-workspace-grid">
                <div className="panel">
                  <div className="panel__header">
                    <div>
                      <h2>{t('manufacturing.bomLinesTitle')}</h2>
                      <p>{t('manufacturing.bomLinesDescription')}</p>
                    </div>
                  </div>
                  <Table
                    rowKey="bomLineId"
                    rows={bomDetail.lines ?? []}
                    selectedId={selected.bomLineId}
                    emptyMessage={t('common.noRecords')}
                    onPick={(line) => {
                      loadBomLineEditor(line);
                    }}
                    columns={[
                      { key: 'lineNumber', label: t('manufacturing.lineNumber') },
                      { key: 'componentInternalSku', label: t('common.sku') },
                      { key: 'componentItemName', label: t('common.name') },
                      { key: 'quantity', label: t('common.quantity'), render: (row) => formatNumber(row.quantity) },
                      { key: 'scrapAllowancePct', label: t('manufacturing.scrapAllowancePct'), render: (row) => formatNumber(row.scrapAllowancePct) }
                    ]}
                  />
                </div>

                <div className="panel">
                  <div className="panel__header">
                    <div>
                      <h2>{selectedBomLine ? t('manufacturing.componentEditorEditTitle') : t('manufacturing.componentEditorAddTitle')}</h2>
                      <p>{selectedBomLine ? t('manufacturing.componentEditorEditDescription') : t('manufacturing.componentEditorAddDescription')}</p>
                    </div>
                  </div>
                  {selectedBomLine ? (
                    <div className="stack">
                      <div className="detail-card">
                        <p className="inline-note">{t('manufacturing.lineNumber')}: <strong>{selectedBomLine.lineNumber}</strong></p>
                        <p className="inline-note">{t('manufacturing.component')}: <strong>{selectedBomLine.componentInternalSku} - {selectedBomLine.componentItemName}</strong></p>
                      </div>
                      <div className="form-grid">
                        <label className="field field--full">
                          <span>{t('manufacturing.component')}</span>
                          <select value={forms.bomLineEdit.componentItemId} onChange={(event) => updateForm('bomLineEdit', 'componentItemId', event.target.value)}>
                            <option value="">{t('common.selectComponent')}</option>
                            {data.items.filter((item) => item.itemType !== 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                          </select>
                        </label>
                        <label className="field"><span>{t('common.quantity')}</span><input value={forms.bomLineEdit.quantity} onChange={(event) => updateForm('bomLineEdit', 'quantity', event.target.value)} /></label>
                        <label className="field"><span>{t('manufacturing.scrapAllowancePct')}</span><input value={forms.bomLineEdit.scrapAllowancePct} onChange={(event) => updateForm('bomLineEdit', 'scrapAllowancePct', event.target.value)} /></label>
                      </div>
                      <div className="button-row">
                        <button type="button" className="button" onClick={updateSelectedBomLine}>{t('manufacturing.updateLine')}</button>
                        <button type="button" className="button button--secondary" onClick={deleteSelectedBomLine}>{t('manufacturing.deleteLine')}</button>
                        <button type="button" className="button button--ghost" onClick={resetBomLineEditor}>{t('manufacturing.clearLineSelection')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="stack">
                      <div className="form-grid">
                        <label className="field field--full">
                          <span>{t('manufacturing.component')}</span>
                          <select value={forms.bomLine.componentItemId} onChange={(event) => updateForm('bomLine', 'componentItemId', event.target.value)}>
                            <option value="">{t('common.selectComponent')}</option>
                            {data.items.filter((item) => item.itemType !== 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                          </select>
                        </label>
                        <label className="field"><span>{t('common.quantity')}</span><input value={forms.bomLine.quantity} onChange={(event) => updateForm('bomLine', 'quantity', event.target.value)} /></label>
                        <label className="field"><span>{t('manufacturing.scrapAllowancePct')}</span><input value={forms.bomLine.scrapAllowancePct} onChange={(event) => updateForm('bomLine', 'scrapAllowancePct', event.target.value)} /></label>
                      </div>
                      <button type="button" className="button button--secondary" onClick={addBomLine} disabled={!bomDetail || !forms.bomLine.componentItemId}>{t('manufacturing.addLine')}</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('manufacturing.explosionTitle')}</h2>
                    <p>{t('manufacturing.explosionDescription')}</p>
                  </div>
                </div>
                <Table
                  rowKey="rawItemId"
                  rows={bomExplosionPreview}
                  emptyMessage={t('manufacturing.runPreviewToLoad')}
                  columns={[
                    { key: 'internalSku', label: t('common.sku') },
                    { key: 'name', label: t('common.name') },
                    { key: 'uom', label: t('master.uom') },
                    { key: 'totalRequiredQty', label: t('common.required'), render: (row) => formatNumber(row.totalRequiredQty) }
                  ]}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!session) {
    return (
      <LoginScreen
        t={t}
        forms={forms}
        updateForm={updateForm}
        language={language}
        setLanguage={setLanguage}
        login={login}
        busy={busy}
        message={message}
        applyDemoCredentials={applyDemoCredentials}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar__left">
          <div
            className="topbar__brand"
            role="button"
            tabIndex={0}
            onClick={() => setSection('overview')}
            onKeyDown={(e) => e.key === 'Enter' && setSection('overview')}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            <PostefLogo />
            <div className="topbar__brand-copy">
              <strong>{t('brand.title')}</strong>
            </div>
          </div>

          <div className="topbar__nav">
            {primaryTopNavItems.map((item) => (
              <button
                key={item}
                type="button"
                className={section === item ? 'button topbar__nav-button' : 'button button--ghost topbar__nav-button'}
                onClick={() => setSection(item)}
              >
                {t(`nav.${item}`)}
              </button>
            ))}

            {secondaryTopNavItems.length ? (
              <div className="nav-dropdown">
                <button type="button" className={secondaryTopNavItems.includes(section) ? 'button topbar__nav-button' : 'button button--ghost topbar__nav-button'}>
                  {t('nav.more')} ▾
                </button>
                <div className="nav-dropdown__menu">
                  {secondaryTopNavItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={section === item ? 'nav-dropdown__item nav-dropdown__item--active' : 'nav-dropdown__item'}
                      onClick={() => setSection(item)}
                    >
                      {t(`nav.${item}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="topbar__right">
          <div className="topbar__settings">
            <label className="field topbar__field topbar__field--compact">
              <select value={session.role} onChange={(event) => setSession((current) => ({ ...current, role: event.target.value }))}>
                {(availableRequestRoles.length ? availableRequestRoles : [session.role]).map((roleCode) => (
                  <option key={roleCode} value={roleCode}>
                    {getRoleLabel(t, roleCode)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field topbar__field topbar__field--compact">
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="en">{t('language.en')}</option>
                <option value="vi">{t('language.vi')}</option>
              </select>
            </label>
          </div>

          <div className="topbar__session">
            <div className="session-card__meta">
              <span>{data.me ? `${data.me.firstName} ${data.me.lastName}` : t('sidebar.user')}</span>
              <small>{data.me?.email ?? session.userId}</small>
            </div>
            <div className="session-card__chips">
              {(data.me?.roles ?? []).map((role) => (
                <span key={role.roleId ?? role.roleCode} className="chip">
                  {getRoleLabel(t, role.roleCode)}
                </span>
              ))}
            </div>
          </div>

          <div className="topbar__actions">
            <button type="button" className="button button--ghost" onClick={() => setSession((current) => current ? { ...current } : current)}>
              {t('sidebar.refresh')}
            </button>
            <button type="button" className="button button--ghost" onClick={logout}>
              {t('sidebar.logout')}
            </button>
          </div>
        </div>
      </div>

      <main className="content">
        <header className={section === 'manufacturing' ? 'hero hero--compact' : 'hero'}>
          <div className={section === 'manufacturing' ? 'hero__body hero__body--compact' : 'hero__body'}>
            <h2>{heroTitle}</h2>
            {section === 'manufacturing' ? (
              <p className={heroDescription ? 'hero__description' : 'hero__description hero__description--placeholder'}>
                {heroDescription || 'placeholder'}
              </p>
            ) : heroDescription ? (
              <p className="hero__description">{heroDescription}</p>
            ) : null}
          </div>

          <div className={section === 'manufacturing' ? 'toast toast--compact' : 'toast'}>
            <strong>{busy ? actionLabel(busy) : t('toast.status')}</strong>
            <span>{busy ? t('message.workingOn', { action: actionLabel(busy) }) : message}</span>
          </div>
        </header>

        {section === 'overview' ? (
          <div className="stack">
            <section className="metrics-grid">
              <div className="metric"><span>{t('metric.openPos')}</span><strong>{data.purchaseOrders.length}</strong><small>{t('metric.openPosSub')}</small></div>
              <div className="metric metric--accent"><span>{t('metric.receipts')}</span><strong>{data.receipts.length}</strong><small>{t('metric.receiptsSub')}</small></div>
              <div className="metric"><span>{t('metric.salesOrders')}</span><strong>{data.salesOrders.length}</strong><small>{t('metric.salesOrdersSub')}</small></div>
              <div className="metric metric--warning"><span>{t('metric.discrepancies')}</span><strong>{data.discrepancyTickets.length}</strong><small>{t('metric.discrepanciesSub')}</small></div>
              <div className="metric"><span>{t('metric.productionOrders')}</span><strong>{data.productionOrders.length}</strong><small>{t('metric.productionOrdersSub')}</small></div>
              <div className="metric metric--danger"><span>{t('metric.zeroAvailable')}</span><strong>{data.inventory.filter((row) => row.quantityAvailable <= 0).length}</strong><small>{t('metric.zeroAvailableSub')}</small></div>
            </section>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{t('overview.inventoryTitle')}</h2>
                  <p>{t('overview.inventoryDescription')}</p>
                </div>
              </div>
              <Table
                rowKey="inventoryBalanceId"
                rows={data.inventory.slice(0, 12)}
                emptyMessage={t('common.noRecords')}
                columns={[
                  { key: 'internalSku', label: t('common.sku') },
                  { key: 'locationCode', label: t('overview.locationCode') },
                  { key: 'lotNumber', label: t('overview.lot') },
                  { key: 'quantityOnHand', label: t('common.onHand'), render: (row) => formatNumber(row.quantityOnHand) },
                  { key: 'quantityAvailable', label: t('common.available'), render: (row) => formatNumber(row.quantityAvailable) }
                ]}
              />
            </div>
          </div>
        ) : null}

        {section === 'master' ? (
          <div className="stack">
            <div className="toggle-row toggle-row--flush">
              <button
                type="button"
                className={masterTab === 'inventory' ? 'button' : 'button button--ghost'}
                onClick={() => setMasterTab('inventory')}
              >
                {t('master.activeItems')}
              </button>
              <button
                type="button"
                className={masterTab === 'item' ? 'button' : 'button button--ghost'}
                onClick={() => setMasterTab('item')}
              >
                {t('master.createItemTitle')}
              </button>
              {adminVisible ? (
                <button
                  type="button"
                  className={masterTab === 'import' ? 'button' : 'button button--ghost'}
                  onClick={() => setMasterTab('import')}
                >
                  {t('master.importTab')}
                </button>
              ) : null}
              <button
                type="button"
                className={masterTab === 'partners' ? 'button' : 'button button--ghost'}
                onClick={() => setMasterTab('partners')}
              >
                {t('master.partnersTitle')}
              </button>
              <button
                type="button"
                className={masterTab === 'archived' ? 'button' : 'button button--ghost'}
                onClick={() => setMasterTab('archived')}
              >
                {t('master.archivedItems')}
              </button>
            </div>

            {masterTab === 'inventory' || masterTab === 'archived' ? (
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{masterTab === 'inventory' ? t('master.activeItems') : t('master.archivedItems')}</h2>
                  </div>
                  <input className="search" placeholder={t('common.searchSkuName')} value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} />
                </div>
                <div className="inventory-shell">
                  <div className="inventory-shell__list">
                    <Table
                      rowKey="itemId"
                      rows={filteredItems}
                      selectedId={selected.itemId}
                      emptyMessage={t('common.noRecords')}
                      onPick={(row) => {
                        setSelected((current) => ({ ...current, itemId: row.itemId }));
                        refreshInventory(row.itemId).catch(() => {});
                      }}
                      columns={[
                        { key: 'internalSku', label: t('common.sku') },
                        { key: 'name', label: t('common.name') },
                        { key: 'itemType', label: t('common.type'), render: (row) => t(`itemType.${row.itemType}`) },
                        { key: 'barcodeValue', label: t('master.barcode') },
                        {
                          key: 'unitCost',
                          label: t('master.unitCost'),
                          render: (row) => (row.unitCost === undefined ? t('common.restricted') : formatAppMoney(row.unitCost, row.unitCostCurrencyCode))
                        }
                      ]}
                    />
                  </div>
                  <div className="inventory-shell__aside">
                    {inventoryDetail ? (
                      <>
                        <div ref={inventoryDetailRef} className="detail-card stack inventory-shell__detail">
                          <div className="button-row">
                            <button type="button" className="button button--secondary" onClick={() => refreshInventory(selected.itemId)}>{t('master.refreshInventory')}</button>
                            <button type="button" className="button button--ghost" onClick={generateBarcodeForSelectedItem}>{t('master.generateBarcode')}</button>
                            {canMaintainItems ? (
                              <button type="button" className={isEditingSelectedItem ? 'button button--secondary' : 'button button--ghost'} onClick={openItemEditTab}>{t('master.editItem')}</button>
                            ) : null}
                            {inventoryDetail.item.isActive ? (
                              <button type="button" className="button button--ghost" onClick={archiveSelectedItem}>{t('master.archiveItem')}</button>
                            ) : (
                              <button type="button" className="button button--ghost" onClick={restoreSelectedItem}>{t('master.restoreItem')}</button>
                            )}
                            {!inventoryDetail.item.isActive && adminVisible ? (
                              <button type="button" className="button button--ghost" onClick={deleteSelectedArchivedItem}>{t('master.deleteArchivedItem')}</button>
                            ) : null}
                          </div>
                          <p className="inline-note"><strong>{inventoryDetail.item.internalSku}</strong> - {inventoryDetail.item.name}</p>
                          <div className="inventory-summary">
                            <div className="metric"><span>{t('common.onHand')}</span><strong>{formatNumber(inventoryDetail.totals.quantityOnHand)}</strong></div>
                            <div className="metric"><span>{t('common.reserved')}</span><strong>{formatNumber(inventoryDetail.totals.quantityReserved)}</strong></div>
                            <div className="metric metric--accent"><span>{t('common.available')}</span><strong>{formatNumber(inventoryDetail.totals.quantityAvailable)}</strong></div>
                          </div>
                          <div className="bom-stat-grid">
                            <div className="detail-card bom-stat">
                              <span>{t('master.itemType')}</span>
                              <strong>{t(`itemType.${inventoryDetail.item.itemType}`)}</strong>
                              <small>{t('master.uom')}: {inventoryDetail.item.uom}</small>
                            </div>
                            <div className="detail-card bom-stat">
                              <span>{t('master.supplierSku')}</span>
                              <strong>{inventoryDetail.item.supplierSku || t('common.notSet')}</strong>
                              <small>{t('master.unitCost')}: {inventoryDetail.item.unitCost === undefined ? t('common.restricted') : formatAppMoney(inventoryDetail.item.unitCost, inventoryDetail.item.unitCostCurrencyCode)}</small>
                            </div>
                            <div className="detail-card bom-stat">
                              <span>{t('master.activeBomVersion')}</span>
                              <strong>{itemBomState.status === 'ready' ? itemBomState.bom.versionName : t('common.notSet')}</strong>
                              <small>{itemBomState.status === 'ready' ? `${t('master.componentCount')}: ${formatNumber(itemBomState.bom.lineCount ?? itemBomState.bom.lines?.length ?? 0)}` : t('master.componentsDescription')}</small>
                            </div>
                          </div>
                          {isEditingSelectedItem && canMaintainItems ? (
                            <div className="subpanel">
                              <div className="panel__header">
                                <div>
                                  <h2>{t('master.itemSettingsTitle')}</h2>
                                </div>
                              </div>
                              <div className="form-grid">
                                <label className="field"><span>{t('master.internalSku')}</span><input value={forms.itemEdit.internalSku} onChange={(event) => updateForm('itemEdit', 'internalSku', event.target.value)} /></label>
                                <label className="field"><span>{t('common.name')}</span><input value={forms.itemEdit.name} onChange={(event) => updateForm('itemEdit', 'name', event.target.value)} /></label>
                                <label className="field">
                                  <span>{t('master.itemType')}</span>
                                  <select value={forms.itemEdit.itemType} onChange={(event) => updateForm('itemEdit', 'itemType', event.target.value)}>
                                    <option value="RAW_MATERIAL">{t('itemType.RAW_MATERIAL')}</option>
                                    <option value="SUB_ASSEMBLY">{t('itemType.SUB_ASSEMBLY')}</option>
                                    <option value="FINISHED_GOOD">{t('itemType.FINISHED_GOOD')}</option>
                                  </select>
                                </label>
                                <label className="field"><span>{t('master.uom')}</span><input value={forms.itemEdit.uom} onChange={(event) => updateForm('itemEdit', 'uom', event.target.value)} /></label>
                                <label className="field"><span>{t('master.supplierSku')}</span><input value={forms.itemEdit.supplierSku} onChange={(event) => updateForm('itemEdit', 'supplierSku', event.target.value)} /></label>
                                <label className="field">
                                  <span>{t('master.unitCost')}</span>
                                  <input
                                    value={financeVisible ? forms.itemEdit.unitCost : t('common.restricted')}
                                    disabled={!financeVisible}
                                    placeholder={t('master.unitCostPlaceholder')}
                                    title={t('master.unitCostHint')}
                                    onChange={(event) => updateForm('itemEdit', 'unitCost', event.target.value)}
                                  />
                                </label>
                                <label className="field"><span>{t('master.minStock')}</span><input value={forms.itemEdit.minStockLevel} onChange={(event) => updateForm('itemEdit', 'minStockLevel', event.target.value)} /></label>
                                <label className="field"><span>{t('master.reorderQty')}</span><input value={forms.itemEdit.reorderQuantity} onChange={(event) => updateForm('itemEdit', 'reorderQuantity', event.target.value)} /></label>
                                <label className="field"><span>{t('master.leadTime')}</span><input value={forms.itemEdit.leadTimeDays} onChange={(event) => updateForm('itemEdit', 'leadTimeDays', event.target.value)} /></label>
                                <label className="field">
                                  <span>{t('master.lotTracking')}</span>
                                  <select value={forms.itemEdit.requiresLotTracking} onChange={(event) => updateForm('itemEdit', 'requiresLotTracking', event.target.value)}>
                                    <option value="false">{t('master.trackingNotRequired')}</option>
                                    <option value="true">{t('master.trackingRequired')}</option>
                                  </select>
                                </label>
                                <label className="field">
                                  <span>{t('master.serialTracking')}</span>
                                  <select value={forms.itemEdit.requiresSerialTracking} onChange={(event) => updateForm('itemEdit', 'requiresSerialTracking', event.target.value)}>
                                    <option value="false">{t('master.trackingNotRequired')}</option>
                                    <option value="true">{t('master.trackingRequired')}</option>
                                  </select>
                                </label>
                                <label className="field field--full"><span>{t('master.descriptionLabel')}</span><input value={forms.itemEdit.description} onChange={(event) => updateForm('itemEdit', 'description', event.target.value)} /></label>
                              </div>
                              <div className="button-row">
                                <button type="button" className="button" onClick={saveSelectedItem} disabled={!forms.itemEdit.internalSku || !forms.itemEdit.name || !forms.itemEdit.uom}>{t('master.saveItem')}</button>
                                <button type="button" className="button button--ghost" onClick={cancelItemEdit}>{t('master.cancelEdit')}</button>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div ref={inventoryWorkspaceRef} className="subpanel stack inventory-workspace">
                          <div className="toggle-row">
                            <button
                              type="button"
                              className={itemDetailTab === 'overview' ? 'button' : 'button button--ghost'}
                              onClick={() => setItemDetailTab('overview')}
                            >
                              {t('master.overviewTab')}
                            </button>
                            {['FINISHED_GOOD', 'SUB_ASSEMBLY'].includes(inventoryDetail.item.itemType) ? (
                              <button
                                type="button"
                                className={itemDetailTab === 'components' ? 'button' : 'button button--ghost'}
                                onClick={() => setItemDetailTab('components')}
                              >
                                {t('master.componentsTab')}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={itemDetailTab === 'transactions' ? 'button' : 'button button--ghost'}
                              onClick={() => setItemDetailTab('transactions')}
                            >
                              {t('master.transactionsTab')}
                            </button>
                            <button
                              type="button"
                              className={itemDetailTab === 'lots' ? 'button' : 'button button--ghost'}
                              onClick={() => setItemDetailTab('lots')}
                            >
                              {t('master.lotsTab')}
                            </button>
                            <button
                              type="button"
                              className={itemDetailTab === 'serials' ? 'button' : 'button button--ghost'}
                              onClick={() => setItemDetailTab('serials')}
                            >
                              {t('master.serialsTab')}
                            </button>
                          </div>

                          {itemDetailTab === 'overview' ? (
                            <div className="stack">
                              <div className="subpanel">
                                <div className="panel__header">
                                  <div>
                                    <h2>{t('master.itemSettingsTitle')}</h2>
                                  </div>
                                </div>
                                <div className="bom-stat-grid">
                                  <div className="detail-card bom-stat">
                                    <span>{t('master.itemType')}</span>
                                    <strong>{t(`itemType.${inventoryDetail.item.itemType}`)}</strong>
                                    <small>{t('master.uom')}: {inventoryDetail.item.uom}</small>
                                  </div>
                                  <div className="detail-card bom-stat">
                                    <span>{t('master.supplierSku')}</span>
                                    <strong>{inventoryDetail.item.supplierSku || t('common.notSet')}</strong>
                                    <small>{t('master.unitCost')}: {inventoryDetail.item.unitCost === undefined ? t('common.restricted') : formatAppMoney(inventoryDetail.item.unitCost, inventoryDetail.item.unitCostCurrencyCode)}</small>
                                  </div>
                                  <div className="detail-card bom-stat">
                                    <span>{t('common.quantity')}</span>
                                    <strong>{formatNumber(inventoryDetail.item.minStockLevel)} / {formatNumber(inventoryDetail.item.reorderQuantity)}</strong>
                                    <small>{t('master.minStock')} / {t('master.reorderQty')}</small>
                                  </div>
                                  <div className="detail-card bom-stat">
                                    <span>{t('master.leadTime')}</span>
                                    <strong>{formatNumber(inventoryDetail.item.leadTimeDays)}</strong>
                                    <small>{t('common.date')}: {formatAppDate(inventoryDetail.item.updatedAt ?? inventoryDetail.item.createdAt)}</small>
                                  </div>
                                  <div className="detail-card bom-stat">
                                    <span>{t('master.lotTracking')}</span>
                                    <strong>{inventoryDetail.item.requiresLotTracking ? t('common.yes') : t('common.no')}</strong>
                                    <small>{t('master.serialTracking')}: {inventoryDetail.item.requiresSerialTracking ? t('common.yes') : t('common.no')}</small>
                                  </div>
                                  <div className="detail-card bom-stat">
                                    <span>{t('master.descriptionLabel')}</span>
                                    <strong>{inventoryDetail.item.description || t('common.notSet')}</strong>
                                    <small>{t('common.status')}: {inventoryDetail.item.isActive ? t('common.active') : t('common.inactive')}</small>
                                  </div>
                                </div>
                              </div>
                              <div className="subpanel">
                                <div className="panel__header">
                                  <div>
                                    <h2>{t('master.balanceBreakdownTitle')}</h2>
                                  </div>
                                </div>
                                <Table
                                  rowKey="inventoryBalanceId"
                                  rows={inventoryDetail.balances}
                                  emptyMessage={t('common.noRecords')}
                                  columns={[
                                    { key: 'locationCode', label: t('overview.locationCode') },
                                    { key: 'lotNumber', label: t('common.lot'), render: (row) => row.lotNumber || t('common.notSet') },
                                    { key: 'serialNumber', label: t('common.serial'), render: (row) => row.serialNumber || t('common.notSet') },
                                    { key: 'quantityOnHand', label: t('common.onHand'), render: (row) => formatNumber(row.quantityOnHand) },
                                    { key: 'quantityReserved', label: t('common.reserved'), render: (row) => formatNumber(row.quantityReserved) },
                                    { key: 'quantityAvailable', label: t('common.available'), render: (row) => formatNumber(row.quantityAvailable) }
                                  ]}
                                />
                              </div>
                            </div>
                          ) : null}

                          {itemDetailTab === 'components' && ['FINISHED_GOOD', 'SUB_ASSEMBLY'].includes(inventoryDetail.item.itemType) ? (
                            <div className="subpanel">
                              <div className="panel__header">
                                <div>
                                  <h2>{t('master.componentsTitle')}</h2>
                                </div>
                                {canMaintainItems ? (
                                  <button
                                    type="button"
                                    className="button button--ghost"
                                    disabled={itemBomState.status === 'loading'}
                                    onClick={() => openBomWorkspaceForSelectedItem({ createIfMissing: itemBomState.status !== 'ready' })}
                                  >
                                    {itemBomState.status === 'ready' ? t('master.openBomWorkspace') : t('master.createBomWorkspace')}
                                  </button>
                                ) : null}
                              </div>
                              {itemBomState.status === 'loading' ? (
                                <div className="detail-card">
                                  <p className="inline-note">{t('master.loadingBom')}</p>
                                </div>
                              ) : null}
                              {itemBomState.status === 'restricted' ? (
                                <div className="detail-card">
                                  <h3>{t('master.componentsTitle')}</h3>
                                  <p>{t('master.restrictedBomDescription')}</p>
                                </div>
                              ) : null}
                              {itemBomState.status === 'empty' ? (
                                <div className="detail-card">
                                  <h3>{t('master.noActiveBomTitle')}</h3>
                                  <p>{t('master.noActiveBomDescription')}</p>
                                </div>
                              ) : null}
                              {itemBomState.status === 'ready' ? (
                                <div className="stack">
                                  <div className="bom-stat-grid">
                                    <div className="detail-card bom-stat">
                                      <span>{t('master.activeBomVersion')}</span>
                                      <strong>{itemBomState.bom.versionName}</strong>
                                      <small>{t('common.status')}: {itemBomState.bom.isActive ? t('common.active') : t('common.inactive')}</small>
                                    </div>
                                    <div className="detail-card bom-stat">
                                      <span>{t('master.componentCount')}</span>
                                      <strong>{formatNumber(itemBomState.bom.lineCount ?? itemBomState.bom.lines?.length ?? 0)}</strong>
                                      <small>{t('manufacturing.bomLinesTitle')}</small>
                                    </div>
                                    <div className="detail-card bom-stat">
                                      <span>{t('common.updated')}</span>
                                      <strong>{formatAppDate(itemBomState.bom.updatedAt ?? itemBomState.bom.createdAt)}</strong>
                                      <small>{t('common.version')}: {itemBomState.bom.versionName}</small>
                                    </div>
                                  </div>
                                  <Table
                                    rowKey="bomLineId"
                                    rows={itemBomState.bom.lines ?? []}
                                    emptyMessage={t('common.noRecords')}
                                    columns={[
                                      { key: 'lineNumber', label: t('manufacturing.lineNumber') },
                                      { key: 'componentInternalSku', label: t('common.sku') },
                                      { key: 'componentItemName', label: t('common.name') },
                                      { key: 'quantity', label: t('common.quantity'), render: (row) => formatNumber(row.quantity) },
                                      { key: 'scrapAllowancePct', label: t('manufacturing.scrapAllowancePct'), render: (row) => formatNumber(row.scrapAllowancePct) }
                                    ]}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {itemDetailTab === 'transactions' ? (
                            <div className="subpanel">
                              <div className="panel__header">
                                <div>
                                  <h2>{t('master.transactionHistoryTitle')}</h2>
                                </div>
                              </div>
                              <Table
                                rowKey="inventoryTransactionId"
                                rows={inventoryDetail.transactions ?? []}
                                emptyMessage={t('common.noRecords')}
                                columns={[
                                  { key: 'createdAt', label: t('common.date'), render: (row) => formatAppDateTime(row.createdAt) },
                                  { key: 'transactionType', label: t('common.type') },
                                  { key: 'locationCode', label: t('overview.locationCode'), render: (row) => row.locationCode || t('common.notSet') },
                                  { key: 'lotNumber', label: t('common.lot'), render: (row) => row.lotNumber || t('common.notSet') },
                                  { key: 'serialNumber', label: t('common.serial'), render: (row) => row.serialNumber || t('common.notSet') },
                                  { key: 'quantityDelta', label: t('counts.delta'), render: (row) => formatSignedNumber(row.quantityDelta) },
                                  {
                                    key: 'referenceType',
                                    label: t('common.reference'),
                                    render: (row) => (row.referenceId ? `${row.referenceType} ${row.referenceId.slice(0, 8)}` : row.referenceType || t('common.notSet'))
                                  },
                                  { key: 'createdByName', label: t('common.createdBy'), render: (row) => row.createdByName || t('common.notSet') }
                                ]}
                              />
                            </div>
                          ) : null}

                          {itemDetailTab === 'lots' ? (
                            <div className="subpanel">
                              <div className="panel__header">
                                <div>
                                  <h2>{t('master.lotsTitle')}</h2>
                                </div>
                              </div>
                              <Table
                                rowKey="lotId"
                                rows={inventoryDetail.lots ?? []}
                                emptyMessage={t('common.noRecords')}
                                columns={[
                                  { key: 'lotNumber', label: t('common.lot') },
                                  { key: 'supplierLotNumber', label: t('master.supplierLot'), render: (row) => row.supplierLotNumber || t('common.notSet') },
                                  { key: 'quantityOnHand', label: t('common.onHand'), render: (row) => formatNumber(row.quantityOnHand) },
                                  { key: 'quantityAvailable', label: t('common.available'), render: (row) => formatNumber(row.quantityAvailable) },
                                  { key: 'activeLocationCount', label: t('master.locationCount'), render: (row) => formatNumber(row.activeLocationCount) },
                                  { key: 'expirationDate', label: t('master.expiration'), render: (row) => formatAppDate(row.expirationDate) }
                                ]}
                              />
                            </div>
                          ) : null}

                          {itemDetailTab === 'serials' ? (
                            <div className="subpanel">
                              <div className="panel__header">
                                <div>
                                  <h2>{t('master.serialsTitle')}</h2>
                                </div>
                              </div>
                              <Table
                                rowKey="serialId"
                                rows={inventoryDetail.serials ?? []}
                                emptyMessage={t('common.noRecords')}
                                columns={[
                                  { key: 'serialNumber', label: t('common.serial') },
                                  { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} t={t} /> },
                                  { key: 'currentLocationCode', label: t('master.currentLocation'), render: (row) => row.currentLocationCode || t('common.notSet') },
                                  { key: 'quantityAvailable', label: t('common.available'), render: (row) => formatNumber(row.quantityAvailable) },
                                  { key: 'createdAt', label: t('common.created'), render: (row) => formatAppDate(row.createdAt) }
                                ]}
                              />
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="detail-card inventory-shell__placeholder">
                        <h3>{t('master.selectItemTitle')}</h3>
                        <p>{t('master.selectItemDescription')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {masterTab === 'item' ? (
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('master.createItemTitle')}</h2>
                    <p>{t('master.createItemDescription')}</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field"><span>{t('master.internalSku')}</span><input value={forms.item.internalSku} onChange={(event) => updateForm('item', 'internalSku', event.target.value)} /></label>
                  <label className="field"><span>{t('common.name')}</span><input value={forms.item.name} onChange={(event) => updateForm('item', 'name', event.target.value)} /></label>
                  <label className="field">
                    <span>{t('master.itemType')}</span>
                    <select value={forms.item.itemType} onChange={(event) => updateForm('item', 'itemType', event.target.value)}>
                      <option value="RAW_MATERIAL">{t('itemType.RAW_MATERIAL')}</option>
                      <option value="SUB_ASSEMBLY">{t('itemType.SUB_ASSEMBLY')}</option>
                      <option value="FINISHED_GOOD">{t('itemType.FINISHED_GOOD')}</option>
                    </select>
                  </label>
                  <label className="field"><span>{t('master.uom')}</span><input value={forms.item.uom} onChange={(event) => updateForm('item', 'uom', event.target.value)} /></label>
                  <label className="field"><span>{t('master.minStock')}</span><input value={forms.item.minStockLevel} onChange={(event) => updateForm('item', 'minStockLevel', event.target.value)} /></label>
                  <label className="field"><span>{t('master.reorderQty')}</span><input value={forms.item.reorderQuantity} onChange={(event) => updateForm('item', 'reorderQuantity', event.target.value)} /></label>
                  <label className="field"><span>{t('master.leadTime')}</span><input value={forms.item.leadTimeDays} onChange={(event) => updateForm('item', 'leadTimeDays', event.target.value)} /></label>
                  <label className="field">
                    <span>{t('master.unitCost')}</span>
                    <input
                      value={financeVisible ? forms.item.unitCost : t('common.restricted')}
                      disabled={!financeVisible}
                      placeholder={t('master.unitCostPlaceholder')}
                      title={t('master.unitCostHint')}
                      onChange={(event) => updateForm('item', 'unitCost', event.target.value)}
                    />
                  </label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createItem}>{t('master.createItem')}</button>
                </div>
              </div>
            ) : null}

            {masterTab === 'import' && adminVisible ? (
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('master.importTitle')}</h2>
                    <p>{t('master.importDescription')}</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field field--full">
                    <span>{t('master.importFilePath')}</span>
                    <input value={forms.inventoryImport.filePath} onChange={(event) => updateForm('inventoryImport', 'filePath', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>{t('master.importLocationCode')}</span>
                    <input value={forms.inventoryImport.locationCode} onChange={(event) => updateForm('inventoryImport', 'locationCode', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>{t('master.importLocationName')}</span>
                    <input value={forms.inventoryImport.locationName} onChange={(event) => updateForm('inventoryImport', 'locationName', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>{t('master.importLocationType')}</span>
                    <select value={forms.inventoryImport.locationType} onChange={(event) => updateForm('inventoryImport', 'locationType', event.target.value)}>
                      <option value="RECEIVING">RECEIVING</option>
                      <option value="STORAGE">STORAGE</option>
                      <option value="PICK_FACE">PICK_FACE</option>
                      <option value="STAGING">STAGING</option>
                      <option value="PRODUCTION">PRODUCTION</option>
                      <option value="SHIPPING">SHIPPING</option>
                      <option value="QUARANTINE">QUARANTINE</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('master.importDefaultItemType')}</span>
                    <select value={forms.inventoryImport.defaultItemType} onChange={(event) => updateForm('inventoryImport', 'defaultItemType', event.target.value)}>
                      <option value="RAW_MATERIAL">{t('itemType.RAW_MATERIAL')}</option>
                      <option value="SUB_ASSEMBLY">{t('itemType.SUB_ASSEMBLY')}</option>
                      <option value="FINISHED_GOOD">{t('itemType.FINISHED_GOOD')}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('master.importCurrency')}</span>
                    <select value={forms.inventoryImport.unitCostCurrencyCode} onChange={(event) => updateForm('inventoryImport', 'unitCostCurrencyCode', event.target.value)}>
                      {SUPPORTED_ITEM_CURRENCIES.map((currencyCode) => <option key={currencyCode} value={currencyCode}>{currencyCode}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('master.importDryRun')}</span>
                    <select value={forms.inventoryImport.dryRun} onChange={(event) => updateForm('inventoryImport', 'dryRun', event.target.value)}>
                      <option value="true">{t('master.importDryRunOption')}</option>
                      <option value="false">{t('master.importApplyOption')}</option>
                    </select>
                  </label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={importEndingBalances} disabled={!forms.inventoryImport.filePath}>
                    {t('master.importButton')}
                  </button>
                </div>
                {inventoryImportSummary ? (
                  <div className="subpanel">
                    <div className="panel__header">
                      <div>
                        <h2>{t('master.importSummaryTitle')}</h2>
                        <p>{inventoryImportSummary.workbookPath}</p>
                      </div>
                    </div>
                    <div className="metrics-grid">
                      <div className="metric"><span>{t('master.importRowsRead')}</span><strong>{formatNumber(inventoryImportSummary.totals?.rowsRead ?? 0)}</strong></div>
                      <div className="metric"><span>{t('master.importItemsCreated')}</span><strong>{formatNumber(inventoryImportSummary.totals?.itemsCreated ?? 0)}</strong></div>
                      <div className="metric"><span>{t('master.importItemsUpdated')}</span><strong>{formatNumber(inventoryImportSummary.totals?.itemsUpdated ?? 0)}</strong></div>
                      <div className="metric"><span>{t('master.importBalancesCreated')}</span><strong>{formatNumber(inventoryImportSummary.totals?.balancesCreated ?? 0)}</strong></div>
                      <div className="metric"><span>{t('master.importBalancesAdjusted')}</span><strong>{formatNumber(inventoryImportSummary.totals?.balancesAdjusted ?? 0)}</strong></div>
                      <div className="metric"><span>{t('master.importTransactionsCreated')}</span><strong>{formatNumber(inventoryImportSummary.totals?.transactionsCreated ?? 0)}</strong></div>
                    </div>
                    {inventoryImportSummary.warnings?.hasDuplicates ? (
                      <div className="stack">
                        <div>
                          <h3>{t('master.importWarningsTitle')}</h3>
                          <p>{t('master.importWarningsDescription')}</p>
                        </div>
                        <Table
                          rowKey="internalSku"
                          rows={inventoryImportSummary.warnings.duplicateSkus}
                          emptyMessage={t('common.noRecords')}
                          columns={[
                            { key: 'internalSku', label: t('common.sku') },
                            { key: 'count', label: t('common.quantity'), render: (row) => formatNumber(row.count) },
                            { key: 'rowNumbers', label: t('master.importWarningRows'), render: (row) => row.rowNumbers.join(', ') },
                            {
                              key: 'behavior',
                              label: t('master.importWarningBehavior'),
                              render: () => t('master.importWarningBehaviorLastRowWins')
                            }
                          ]}
                        />
                      </div>
                    ) : null}
                    {Array.isArray(inventoryImportSummary.preview) && inventoryImportSummary.preview.length ? (
                      <div className="stack">
                        <p className="inline-note">{t('master.importPreviewTitle')}</p>
                        <Table
                          rowKey="rowNumber"
                          rows={inventoryImportSummary.preview}
                          emptyMessage={t('common.noRecords')}
                          columns={[
                            { key: 'rowNumber', label: '#' },
                            { key: 'internalSku', label: t('common.sku') },
                            { key: 'itemName', label: t('common.name') },
                            { key: 'uom', label: t('master.uom') },
                            { key: 'quantityOnHand', label: t('common.onHand'), render: (row) => formatNumber(row.quantityOnHand) }
                          ]}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {masterTab === 'partners' ? (
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('master.partnersTitle')}</h2>
                    <p>{t('master.partnersDescription')}</p>
                  </div>
                </div>
                <div className="subpanel">
                  <h3>{t('master.supplierTitle')}</h3>
                  <div className="form-grid">
                    <label className="field"><span>{t('common.code')}</span><input value={forms.supplier.supplierCode} onChange={(event) => updateForm('supplier', 'supplierCode', event.target.value)} /></label>
                    <label className="field"><span>{t('common.name')}</span><input value={forms.supplier.supplierName} onChange={(event) => updateForm('supplier', 'supplierName', event.target.value)} /></label>
                  </div>
                  <button type="button" className="button button--secondary" onClick={createSupplier}>{t('master.createSupplier')}</button>
                </div>
                <div className="subpanel">
                  <h3>{t('master.customerTitle')}</h3>
                  <div className="form-grid">
                    <label className="field"><span>{t('common.code')}</span><input value={forms.customer.customerCode} onChange={(event) => updateForm('customer', 'customerCode', event.target.value)} /></label>
                    <label className="field"><span>{t('common.name')}</span><input value={forms.customer.customerName} onChange={(event) => updateForm('customer', 'customerName', event.target.value)} /></label>
                  </div>
                  <button type="button" className="button button--secondary" onClick={createCustomer}>{t('master.createCustomer')}</button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {section === 'purchaseOrders' ? (
          <div className="stack">
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{t('inbound.purchaseOrdersTitle')}</h2>
                  <p>{t('inbound.purchaseOrdersDescription')}</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>{t('common.supplier')}</span>
                  <select value={forms.purchaseOrder.supplierId} onChange={(event) => updateForm('purchaseOrder', 'supplierId', event.target.value)}>
                    <option value="">{t('common.selectSupplier')}</option>
                    {data.suppliers.map((supplier) => <option key={supplier.supplierId} value={supplier.supplierId}>{supplier.supplierCode} - {supplier.supplierName}</option>)}
                  </select>
                </label>
                <label className="field"><span>{t('inbound.expectedReceipt')}</span><input type="date" value={forms.purchaseOrder.expectedReceiptDate} onChange={(event) => updateForm('purchaseOrder', 'expectedReceiptDate', event.target.value)} /></label>
              </div>
              <div className="button-row">
                <button type="button" className="button" onClick={createPurchaseOrder}>{t('inbound.createPo')}</button>
                <button type="button" className="button button--secondary" onClick={approvePurchaseOrder}>{t('inbound.approveSelectedPo')}</button>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>{t('common.item')}</span>
                  <select value={forms.purchaseOrderLine.itemId} onChange={(event) => updateForm('purchaseOrderLine', 'itemId', event.target.value)}>
                    <option value="">{t('common.selectItem')}</option>
                    {data.items.map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                  </select>
                </label>
                <label className="field"><span>{t('common.qty')}</span><input value={forms.purchaseOrderLine.orderedQty} onChange={(event) => updateForm('purchaseOrderLine', 'orderedQty', event.target.value)} /></label>
              </div>
              <button type="button" className="button button--ghost" onClick={addPurchaseOrderLine}>{t('inbound.addPoLine')}</button>
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{t('inbound.recentPurchaseOrdersTitle')}</h2>
                  <p>{t('inbound.recentPurchaseOrdersDescription')}</p>
                </div>
              </div>
              <Table
                rowKey="purchaseOrderId"
                rows={data.purchaseOrders}
                selectedId={selected.purchaseOrderId}
                emptyMessage={t('common.noRecords')}
                onPick={(row) => setSelected((current) => ({ ...current, purchaseOrderId: row.purchaseOrderId }))}
                columns={[
                  { key: 'poNumber', label: t('inbound.po') },
                  { key: 'supplierName', label: t('common.supplier') },
                  { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} t={t} /> },
                  { key: 'expectedReceiptDate', label: t('inbound.expected'), render: (row) => formatAppDate(row.expectedReceiptDate) }
                ]}
              />
            </div>
          </div>
        ) : null}
        {section === 'receiving' ? (
          <div className="stack">
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{t('inbound.receivingTitle')}</h2>
                  <p>{t('inbound.receivingDescription')}</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field field--full">
                  <span>{t('inbound.po')}</span>
                  <select
                    value={selected.purchaseOrderId ?? forms.receipt.purchaseOrderId ?? ''}
                    onChange={(event) => {
                      const purchaseOrderId = event.target.value;
                      setSelected((current) => ({ ...current, purchaseOrderId }));
                      updateForm('receipt', 'purchaseOrderId', purchaseOrderId);
                    }}
                  >
                    <option value="">{t('inbound.recentPurchaseOrdersDescription')}</option>
                    {data.purchaseOrders.map((purchaseOrder) => (
                      <option key={purchaseOrder.purchaseOrderId} value={purchaseOrder.purchaseOrderId}>
                        {purchaseOrder.poNumber} - {purchaseOrder.supplierName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="button-row">
                <button type="button" className="button" onClick={createReceipt}>{t('inbound.createReceipt')}</button>
                <button type="button" className="button button--secondary" onClick={postReceipt}>{t('inbound.postSelectedReceipt')}</button>
              </div>
              <div className="form-grid">
                <label className="field"><span>{t('inbound.poLineUuid')}</span><input value={forms.receiptLine.purchaseOrderLineId} onChange={(event) => updateForm('receiptLine', 'purchaseOrderLineId', event.target.value)} /></label>
                <label className="field"><span>{t('inbound.receivedQty')}</span><input value={forms.receiptLine.receivedQty} onChange={(event) => updateForm('receiptLine', 'receivedQty', event.target.value)} /></label>
                <label className="field">
                  <span>{t('inbound.receivingBin')}</span>
                  <select value={forms.receiptLine.receivingLocationId} onChange={(event) => updateForm('receiptLine', 'receivingLocationId', event.target.value)}>
                    <option value="">{t('common.selectLocation')}</option>
                    {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>{t('inbound.putawayBin')}</span>
                  <select value={forms.receiptLine.putawayLocationId} onChange={(event) => updateForm('receiptLine', 'putawayLocationId', event.target.value)}>
                    <option value="">{t('common.selectLocation')}</option>
                    {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode}</option>)}
                  </select>
                </label>
                <label className="field"><span>{t('inbound.manualLot')}</span><input value={forms.receiptLine.manualLotNumber} onChange={(event) => updateForm('receiptLine', 'manualLotNumber', event.target.value)} /></label>
              </div>
              <button type="button" className="button button--ghost" onClick={addReceiptLine}>{t('inbound.addReceiptLine')}</button>
              <div className="subpanel">
                <div className="panel__header">
                  <div>
                    <h2>{t('inbound.scanReceiveTitle')}</h2>
                    <p>{t('inbound.scanReceiveDescription')}</p>
                  </div>
                </div>
                <p className="inline-note">
                  {t('inbound.receiptContext')}: <strong>{selected.receiptId || t('common.notSet')}</strong>
                  {selected.purchaseOrderId ? ` | ${t('inbound.po')}: ${purchaseOrderDetail?.poNumber || selected.purchaseOrderId}` : ''}
                </p>
                <p className="inline-note">{t('inbound.autoReceiptNote')}</p>
                <div className="form-grid">
                  <label className="field"><span>{t('inbound.itemScan')}</span><input value={forms.receivingScan.itemScan} onChange={(event) => updateForm('receivingScan', 'itemScan', event.target.value)} /></label>
                  <label className="field"><span>{t('inbound.receivedQty')}</span><input value={forms.receivingScan.receivedQty} onChange={(event) => updateForm('receivingScan', 'receivedQty', event.target.value)} /></label>
                  <label className="field"><span>{t('inbound.locationScan')}</span><input value={forms.receivingScan.receivingLocationScan} onChange={(event) => updateForm('receivingScan', 'receivingLocationScan', event.target.value)} /></label>
                  <label className="field"><span>{t('inbound.putawayScan')}</span><input value={forms.receivingScan.putawayLocationScan} onChange={(event) => updateForm('receivingScan', 'putawayLocationScan', event.target.value)} /></label>
                  <label className="field"><span>{t('inbound.manualLot')}</span><input value={forms.receivingScan.lotScan} onChange={(event) => updateForm('receivingScan', 'lotScan', event.target.value)} /></label>
                  <label className="field"><span>{t('inbound.serialList')}</span><input value={forms.receivingScan.serialNumbers} onChange={(event) => updateForm('receivingScan', 'serialNumbers', event.target.value)} /></label>
                </div>
                <div className="detail-card">
                  <p className="inline-note">
                    {t('common.item')}: <strong>{receivingScannedItem ? `${receivingScannedItem.internalSku} - ${receivingScannedItem.name}` : t('common.notSet')}</strong>
                  </p>
                  <p className="inline-note">
                    {t('common.location')}: <strong>{receivingScannedLocation ? `${receivingScannedLocation.locationCode} - ${receivingScannedLocation.locationName}` : t('common.notSet')}</strong>
                  </p>
                  <p className="inline-note">
                    {t('inbound.poLineMatch')}: <strong>{receivingMatchedPoLine ? `${receivingMatchedPoLine.lineNumber} / ${receivingMatchedPoLine.internalSku}` : t('common.notSet')}</strong>
                  </p>
                </div>
                <button type="button" className="button button--secondary" onClick={applyReceivingScan}>{t('inbound.applyScannedReceipt')}</button>
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{t('inbound.recentReceiptsTitle')}</h2>
                  <p>{t('inbound.recentReceiptsDescription')}</p>
                </div>
              </div>
              <Table
                rowKey="receiptId"
                rows={data.receipts}
                selectedId={selected.receiptId}
                emptyMessage={t('common.noRecords')}
                onPick={(row) => setSelected((current) => ({ ...current, receiptId: row.receiptId }))}
                columns={[
                  { key: 'receiptNumber', label: t('inbound.receipt') },
                  { key: 'poNumber', label: t('inbound.po') },
                  { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} t={t} /> },
                  { key: 'postedAt', label: t('inbound.posted'), render: (row) => formatAppDate(row.postedAt) }
                ]}
              />
            </div>
          </div>
        ) : null}
        {section === 'fulfillment' ? (
          <div className="stack">
            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('fulfillment.createSalesOrderTitle')}</h2>
                    <p>{t('fulfillment.createSalesOrderDescription')}</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>{t('common.customer')}</span>
                    <select value={forms.salesOrder.customerId} onChange={(event) => updateForm('salesOrder', 'customerId', event.target.value)}>
                      <option value="">{t('common.selectCustomer')}</option>
                      {data.customers.map((customer) => <option key={customer.customerId} value={customer.customerId}>{customer.customerCode} - {customer.customerName}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>{t('fulfillment.externalReference')}</span><input value={forms.salesOrder.externalReference} onChange={(event) => updateForm('salesOrder', 'externalReference', event.target.value)} /></label>
                  <label className="field"><span>{t('fulfillment.requestedShipDate')}</span><input type="date" value={forms.salesOrder.requestedShipDate} onChange={(event) => updateForm('salesOrder', 'requestedShipDate', event.target.value)} /></label>
                  <label className="field">
                    <span>{t('common.item')}</span>
                    <select value={forms.salesOrder.itemId} onChange={(event) => updateForm('salesOrder', 'itemId', event.target.value)}>
                      <option value="">{t('common.selectItem')}</option>
                      {data.items.map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>{t('common.qty')}</span><input value={forms.salesOrder.orderedQty} onChange={(event) => updateForm('salesOrder', 'orderedQty', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createSalesOrder}>{t('fulfillment.createSalesOrder')}</button>
                  <button type="button" className="button button--secondary" onClick={allocateSalesOrder}>{t('fulfillment.allocate')}</button>
                  <button type="button" className="button button--ghost" onClick={createPick}>{t('fulfillment.createPick')}</button>
                  <button type="button" className="button button--ghost" onClick={confirmPick}>{t('fulfillment.confirmPick')}</button>
                </div>
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('fulfillment.pickerContextTitle')}</h2>
                    <p>{t('fulfillment.pickerContextDescription')}</p>
                  </div>
                </div>
                <div className="detail-card">
                  <p className="inline-note">{t('fulfillment.currentRequestRole')}: <strong>{getRoleLabel(t, session.role)}</strong></p>
                  {selected.salesOrderId && picksByOrder[selected.salesOrderId] ? (
                    <div className="pick-summary">
                      <div><span>{t('fulfillment.currentPick')}</span><strong>{picksByOrder[selected.salesOrderId].pickId}</strong></div>
                      <Badge value={picksByOrder[selected.salesOrderId].status} t={t} />
                    </div>
                  ) : (
                    <div className="empty-state">{t('fulfillment.createPickToTrack')}</div>
                  )}
                </div>
                <div className="subpanel">
                  <div className="panel__header">
                    <div>
                      <h2>{t('fulfillment.guidedPickTitle')}</h2>
                      <p>{t('fulfillment.guidedPickDescription')}</p>
                    </div>
                  </div>
                  <p className="inline-note">{t('fulfillment.confirmWholePickNote')}</p>
                  <div className="button-row">
                    <button type="button" className="button button--ghost" onClick={loadOpenPick}>{t('fulfillment.loadOpenPick')}</button>
                  </div>
                  <div className="form-grid">
                    <label className="field"><span>{t('fulfillment.pickLocationScan')}</span><input value={forms.pickingScan.locationScan} onChange={(event) => updateForm('pickingScan', 'locationScan', event.target.value)} /></label>
                    <label className="field"><span>{t('fulfillment.pickItemScan')}</span><input value={forms.pickingScan.itemScan} onChange={(event) => updateForm('pickingScan', 'itemScan', event.target.value)} /></label>
                  </div>
                  <div className="detail-card">
                    <p className="inline-note">
                      {t('fulfillment.matchedPickLine')}: <strong>{guidedPickLine ? `${guidedPickLine.locationCode} / ${guidedPickLine.internalSku} / ${formatNumber(guidedPickLine.pickedQty)}` : t('common.notSet')}</strong>
                    </p>
                    <p className="inline-note">
                      {t('fulfillment.openPickLines')}: <strong>{activePick?.lines?.length ?? 0}</strong>
                    </p>
                  </div>
                  {activePick?.lines?.length ? (
                    <Table
                      rowKey="pickLineId"
                      rows={activePick.lines}
                      emptyMessage={t('common.noRecords')}
                      columns={[
                        { key: 'locationCode', label: t('common.location') },
                        { key: 'internalSku', label: t('common.sku') },
                        { key: 'lotNumber', label: t('common.lot'), render: (row) => row.lotNumber || t('common.notSet') },
                        { key: 'serialNumber', label: t('common.serial'), render: (row) => row.serialNumber || t('common.notSet') },
                        { key: 'pickedQty', label: t('common.qty'), render: (row) => formatNumber(row.pickedQty) }
                      ]}
                    />
                  ) : null}
                  <button type="button" className="button button--secondary" onClick={confirmGuidedPick}>{t('fulfillment.confirmGuidedPick')}</button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{t('fulfillment.salesOrdersTitle')}</h2>
                  <p>{t('fulfillment.salesOrdersDescription')}</p>
                </div>
              </div>
              <Table
                rowKey="salesOrderId"
                rows={data.salesOrders}
                selectedId={selected.salesOrderId}
                emptyMessage={t('common.noRecords')}
                onPick={(row) => setSelected((current) => ({ ...current, salesOrderId: row.salesOrderId }))}
                columns={[
                  { key: 'salesOrderNumber', label: t('fulfillment.so') },
                  { key: 'customerName', label: t('common.customer') },
                  { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} t={t} /> },
                  { key: 'requestedShipDate', label: t('fulfillment.ship'), render: (row) => formatAppDate(row.requestedShipDate) }
                ]}
              />
            </div>
          </div>
        ) : null}
        {section === 'counts' ? (
          <div className="stack">
            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('counts.entryTitle')}</h2>
                    <p>{t('counts.entryDescription')}</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>{t('common.location')}</span>
                    <select value={forms.cycleCount.locationId} onChange={(event) => updateForm('cycleCount', 'locationId', event.target.value)}>
                      <option value="">{t('common.selectLocation')}</option>
                      {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode} - {location.locationName}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>{t('common.notes')}</span><input value={forms.cycleCount.notes} onChange={(event) => updateForm('cycleCount', 'notes', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createCycleCount}>{t('counts.createCount')}</button>
                  <button type="button" className="button button--secondary" onClick={submitCycleCount}>{t('counts.submitSelectedCount')}</button>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>{t('common.item')}</span>
                    <select value={forms.cycleCountLine.itemId} onChange={(event) => updateForm('cycleCountLine', 'itemId', event.target.value)}>
                      <option value="">{t('common.selectItem')}</option>
                      {data.items.map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>{t('counts.countedQty')}</span><input value={forms.cycleCountLine.countedQty} onChange={(event) => updateForm('cycleCountLine', 'countedQty', event.target.value)} /></label>
                </div>
                <button type="button" className="button button--ghost" onClick={addCycleCountLine}>{t('counts.addCountLine')}</button>
                <div className="subpanel">
                  <div className="panel__header">
                    <div>
                      <h2>{t('counts.scanEntryTitle')}</h2>
                      <p>{t('counts.scanEntryDescription')}</p>
                    </div>
                  </div>
                  <p className="inline-note">
                    {t('counts.countContext')}: <strong>{cycleCountDetail?.cycleCountNumber || selected.cycleCountId || t('common.notSet')}</strong>
                  </p>
                  <p className="inline-note">{t('counts.autoCountNote')}</p>
                  <div className="form-grid">
                    <label className="field"><span>{t('counts.scanLocation')}</span><input value={forms.countScan.locationScan} onChange={(event) => updateForm('countScan', 'locationScan', event.target.value)} /></label>
                    <label className="field"><span>{t('counts.itemScan')}</span><input value={forms.countScan.itemScan} onChange={(event) => updateForm('countScan', 'itemScan', event.target.value)} /></label>
                    <label className="field"><span>{t('counts.lotScan')}</span><input value={forms.countScan.lotScan} onChange={(event) => updateForm('countScan', 'lotScan', event.target.value)} /></label>
                    <label className="field"><span>{t('counts.serialScan')}</span><input value={forms.countScan.serialScan} onChange={(event) => updateForm('countScan', 'serialScan', event.target.value)} /></label>
                    <label className="field"><span>{t('counts.countedQty')}</span><input value={forms.countScan.countedQty} onChange={(event) => updateForm('countScan', 'countedQty', event.target.value)} /></label>
                  </div>
                  <div className="detail-card">
                    <p className="inline-note">
                      {t('common.location')}: <strong>{countScannedLocation ? `${countScannedLocation.locationCode} - ${countScannedLocation.locationName}` : t('common.notSet')}</strong>
                    </p>
                    <p className="inline-note">
                      {t('common.item')}: <strong>{countScannedItem ? `${countScannedItem.internalSku} - ${countScannedItem.name}` : t('common.notSet')}</strong>
                    </p>
                    <p className="inline-note">
                      {t('common.lot')}: <strong>{countScannedLotBalance?.lotNumber || t('common.notSet')}</strong> | {t('common.serial')}: <strong>{countScannedSerialBalance?.serialNumber || t('common.notSet')}</strong>
                    </p>
                  </div>
                  <button type="button" className="button button--secondary" onClick={applyCountScan}>{t('counts.applyScannedCount')}</button>
                </div>
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('counts.discrepancyApprovalsTitle')}</h2>
                    <p>{t('counts.discrepancyApprovalsDescription')}</p>
                  </div>
                </div>
                <Table
                  rowKey="discrepancyTicketId"
                  rows={data.discrepancyTickets}
                  selectedId={selected.ticketId}
                  emptyMessage={t('common.noRecords')}
                  onPick={(row) => setSelected((current) => ({ ...current, ticketId: row.discrepancyTicketId }))}
                  columns={[
                    { key: 'cycleCountNumber', label: t('counts.count') },
                    { key: 'internalSku', label: t('common.sku') },
                    { key: 'discrepancyQty', label: t('counts.delta'), render: (row) => formatNumber(row.discrepancyQty) },
                    { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} t={t} /> }
                  ]}
                />
                <div className="button-row">
                  <button type="button" className="button button--secondary" onClick={approveTicket}>{t('counts.approveSelectedTicket')}</button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{t('counts.recentCycleCountsTitle')}</h2>
                  <p>{t('counts.recentCycleCountsDescription')}</p>
                </div>
              </div>
              <Table
                rowKey="cycleCountId"
                rows={data.cycleCounts}
                selectedId={selected.cycleCountId}
                emptyMessage={t('common.noRecords')}
                onPick={(row) => setSelected((current) => ({ ...current, cycleCountId: row.cycleCountId }))}
                columns={[
                  { key: 'cycleCountNumber', label: t('counts.count') },
                  { key: 'locationCode', label: t('common.location') },
                  { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} t={t} /> },
                  { key: 'createdAt', label: t('common.created'), render: (row) => formatAppDate(row.createdAt) }
                ]}
              />
            </div>
          </div>
        ) : null}
        {section === 'users' ? (
          <UserManagementSection
            t={t}
            data={data}
            selectedUser={selectedManagedUser}
            selectedId={selected.userId}
            forms={forms}
            setSelected={setSelected}
            updateForm={updateForm}
            toggleManagedUserRole={toggleManagedUserRole}
            resetManagedUserForm={resetManagedUserForm}
            createManagedUser={createManagedUser}
            saveManagedUser={saveManagedUser}
            formatAppDateTime={formatAppDateTime}
          />
        ) : null}
        {section === 'manufacturing' ? (
          <div className="stack">
            <div className="toggle-row toggle-row--flush">
              <button
                type="button"
                className={manufacturingTab === 'production' ? 'button' : 'button button--ghost'}
                onClick={() => setManufacturingTab('production')}
              >
                {t('manufacturing.productionTitle')}
              </button>
              <button
                type="button"
                className={manufacturingTab === 'bom' ? 'button' : 'button button--ghost'}
                onClick={() => setManufacturingTab('bom')}
              >
                {t('manufacturing.bomWorkspaceTitle')}
              </button>
            </div>
            {manufacturingTab === 'production' ? (
              <div className="stack">
                  <div className="grid grid--2">
                    <div className="panel">
                      <div className="panel__header">
                        <div>
                          <h2>{t('manufacturing.productionTitle')}</h2>
                          <p>{t('manufacturing.productionDescription')}</p>
                        </div>
                      </div>
                      <div className="detail-card">
                        <p className="inline-note">{t('manufacturing.selectedBom')}: <strong>{linkedProductionBom ? `${linkedProductionBom.parentInternalSku} - ${linkedProductionBom.versionName}` : t('manufacturing.noBomLinked')}</strong></p>
                        <p className="inline-note">{t('manufacturing.useBomWorkspaceHint')}</p>
                      </div>
                      <div className="form-grid">
                        <label className="field">
                          <span>{t('manufacturing.finishedGood')}</span>
                          <select
                            value={forms.productionOrder.finishedGoodItemId}
                            onChange={(event) => {
                              const nextFinishedGoodItemId = event.target.value;
                              updateForm('productionOrder', 'finishedGoodItemId', nextFinishedGoodItemId);
                              const matchingBoms = data.boms.filter((bom) => bom.isActive && bom.parentItemId === nextFinishedGoodItemId);
                              updateForm('productionOrder', 'bomId', matchingBoms[0]?.bomId ?? '');
                            }}
                          >
                            <option value="">{t('common.selectFg')}</option>
                            {data.items
                              .filter((item) => ['SUB_ASSEMBLY', 'FINISHED_GOOD'].includes(item.itemType))
                              .map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                          </select>
                        </label>
                        <label className="field">
                          <span>{t('manufacturing.selectBom')}</span>
                          <select value={forms.productionOrder.bomId} onChange={(event) => updateForm('productionOrder', 'bomId', event.target.value)}>
                            <option value="">{t('manufacturing.noBomLinked')}</option>
                            {availableProductionBoms.map((bom) => (
                              <option key={bom.bomId} value={bom.bomId}>
                                {bom.parentInternalSku} - {bom.versionName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field"><span>{t('manufacturing.plannedQty')}</span><input value={forms.productionOrder.quantityPlanned} onChange={(event) => updateForm('productionOrder', 'quantityPlanned', event.target.value)} /></label>
                        <label className="field">
                          <span>{t('manufacturing.fgLocation')}</span>
                          <select value={forms.completion.locationId} onChange={(event) => updateForm('completion', 'locationId', event.target.value)}>
                            <option value="">{t('common.selectLocation')}</option>
                            {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode}</option>)}
                          </select>
                        </label>
                        <label className="field"><span>{t('manufacturing.completedQty')}</span><input value={forms.completion.quantityCompleted} onChange={(event) => updateForm('completion', 'quantityCompleted', event.target.value)} /></label>
                      </div>
                      <div className="button-row">
                        <button type="button" className="button" onClick={createProductionOrder}>{t('manufacturing.createOrder')}</button>
                        <button type="button" className="button button--secondary" onClick={recordCompletion}>{t('manufacturing.recordCompletion')}</button>
                        <button type="button" className="button button--ghost" onClick={previewBackflush}>{t('manufacturing.previewBackflush')}</button>
                        <button type="button" className="button button--ghost" onClick={runBackflush}>{t('manufacturing.runBackflush')}</button>
                      </div>
                    </div>

                    <div className="panel">
                      <div className="panel__header">
                        <div>
                          <h2>{t('manufacturing.backflushPreviewTitle')}</h2>
                          <p>{t('manufacturing.backflushPreviewDescription')}</p>
                        </div>
                      </div>
                      <Table
                        rowKey="rawItemId"
                        rows={backflushPreview}
                        emptyMessage={t('manufacturing.runPreviewToLoad')}
                        columns={[
                          { key: 'internalSku', label: t('common.sku') },
                          { key: 'name', label: t('common.name') },
                          { key: 'uom', label: t('master.uom') },
                          { key: 'totalRequiredQty', label: t('common.required'), render: (row) => formatNumber(row.totalRequiredQty) }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel__header">
                      <div>
                        <h2>{t('manufacturing.scrapTitle')}</h2>
                        <p>{t('manufacturing.scrapDescription')}</p>
                      </div>
                    </div>
                    <div className="form-grid">
                      <label className="field">
                        <span>{t('common.item')}</span>
                        <select value={forms.scrap.itemId} onChange={(event) => updateForm('scrap', 'itemId', event.target.value)}>
                          <option value="">{t('common.selectItem')}</option>
                          {data.items.map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku}</option>)}
                        </select>
                      </label>
                      <label className="field"><span>{t('common.qty')}</span><input value={forms.scrap.quantity} onChange={(event) => updateForm('scrap', 'quantity', event.target.value)} /></label>
                      <label className="field">
                        <span>{t('common.location')}</span>
                        <select value={forms.scrap.locationId} onChange={(event) => updateForm('scrap', 'locationId', event.target.value)}>
                          <option value="">{t('common.selectLocation')}</option>
                          {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode}</option>)}
                        </select>
                      </label>
                      <label className="field"><span>{t('common.reason')}</span><input value={forms.scrap.reason} placeholder={t('common.enterReason')} onChange={(event) => updateForm('scrap', 'reason', event.target.value)} /></label>
                    </div>
                    <div className="button-row">
                      <button type="button" className="button" onClick={createScrapRequest}>{t('manufacturing.createScrapRequest')}</button>
                      <button type="button" className="button button--secondary" onClick={signProductionScrap}>{t('manufacturing.productionSign')}</button>
                      <button type="button" className="button button--ghost" onClick={signWarehouseScrap}>{t('manufacturing.warehouseSign')}</button>
                      </div>
                    </div>
              </div>
            ) : bomWorkspaceContent}
          </div>
        ) : null}
      </main>
    </div>
  );
}
