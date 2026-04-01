import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createApiClient } from './api.js';

const SEEDED_PERSONAS = [
  { key: 'admin', userId: '10000000-0000-0000-0000-000000000001', roles: ['ADMIN'] },
  { key: 'finance', userId: '10000000-0000-0000-0000-000000000002', roles: ['FINANCE'] },
  { key: 'operations', userId: '10000000-0000-0000-0000-000000000003', roles: ['OPERATIONS'] }
];

const DEFAULT_SESSION = { userId: SEEDED_PERSONAS[0].userId, role: SEEDED_PERSONAS[0].roles[0] };

const DEFAULT_FORMS = {
  supplier: { supplierCode: '', supplierName: '', contactEmail: '', contactPhone: '', leadTimeDays: '14' },
  customer: { customerCode: '', customerName: '', contactEmail: '', contactPhone: '' },
  item: { internalSku: '', name: '', itemType: 'RAW_MATERIAL', uom: 'EA', minStockLevel: '0', reorderQuantity: '0', leadTimeDays: '0', unitCost: '0' },
  purchaseOrder: { supplierId: '', expectedReceiptDate: '', notes: '' },
  purchaseOrderLine: { itemId: '', orderedQty: '100', unitCost: '0' },
  receipt: { purchaseOrderId: '', notes: '' },
  receiptLine: { receiptId: '', purchaseOrderLineId: '', receivedQty: '100', receivingLocationId: '', putawayLocationId: '', manualLotNumber: '' },
  salesOrder: { customerId: '', externalReference: '', requestedShipDate: '', itemId: '', orderedQty: '10' },
  cycleCount: { locationId: '', notes: '' },
  cycleCountLine: { cycleCountId: '', itemId: '', countedQty: '0', lotId: '' },
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
    'brand.description': 'Scanner-friendly UI for receiving, inventory control, fulfillment, and production.',
    'hero.eyebrow': 'Live warehouse + production console',
    'hero.title': 'Single-warehouse IMS frontend',
    'hero.description': 'The UI uses the current REST API directly and keeps the backend RBAC visible through persona switching.',
    'sidebar.persona': 'Persona',
    'sidebar.requestRole': 'Request role',
    'sidebar.language': 'Language',
    'sidebar.refresh': 'Refresh workspace',
    'language.en': 'English',
    'language.vi': 'Tiếng Việt',
    'toast.status': 'Status',
    'message.ready': 'Ready.',
    'message.workspaceRefreshed': 'Workspace refreshed for {role}.',
    'message.actionCompleted': '{action} completed.',
    'message.workingOn': 'Working on {action}...',
    'nav.overview': 'Overview',
    'nav.master': 'Master',
    'nav.inbound': 'Inbound',
    'nav.fulfillment': 'Fulfillment',
    'nav.counts': 'Counts',
    'nav.manufacturing': 'Manufacturing',
    'persona.admin.label': 'Admin',
    'persona.admin.name': 'System Admin',
    'persona.finance.label': 'Finance',
    'persona.finance.name': 'Finance',
    'persona.operations.label': 'Operations',
    'persona.operations.name': 'Operations',
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
    'common.enterReason': 'Enter reason',
    'common.searchSkuName': 'Search SKU or name',
    'common.selectSupplier': 'Select supplier',
    'common.selectCustomer': 'Select customer',
    'common.selectItem': 'Select item',
    'common.selectLocation': 'Select location',
    'common.selectFg': 'Select FG',
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
    'master.createItem': 'Create item',
    'master.partnersTitle': 'Partners',
    'master.partnersDescription': 'Quick-create suppliers and customers for testing.',
    'master.supplierTitle': 'Supplier',
    'master.customerTitle': 'Customer',
    'master.createSupplier': 'Create supplier',
    'master.createCustomer': 'Create customer',
    'master.itemsInventoryTitle': 'Items and Inventory',
    'master.itemsInventoryDescription': 'Inspect stock and generate internal barcodes.',
    'master.barcode': 'Barcode',
    'master.refreshInventory': 'Refresh inventory',
    'master.generateBarcode': 'Generate barcode',
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
    'counts.discrepancyApprovalsTitle': 'Discrepancy Approvals',
    'counts.discrepancyApprovalsDescription': 'Finance/Admin only.',
    'counts.count': 'Count',
    'counts.delta': 'Delta',
    'counts.approveSelectedTicket': 'Approve selected ticket',
    'counts.recentCycleCountsTitle': 'Recent Cycle Counts',
    'counts.recentCycleCountsDescription': 'Operations submits, finance/admin resolves mismatches.',
    'manufacturing.bomTitle': 'Bill of Materials',
    'manufacturing.bomDescription': 'Create and activate a versioned BoM for a finished good.',
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
    'manufacturing.findBomDescription': 'Search existing BoMs by finished good, SKU, or version before creating a new one.',
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
    'manufacturing.newBomDescription': 'Start a new version for a finished good. After creation, continue in the maintenance area.',
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
    'manufacturing.parentFinishedGood': 'Parent finished good',
    'manufacturing.component': 'Component',
    'manufacturing.createBom': 'Create BoM',
    'manufacturing.addLine': 'Add line',
    'manufacturing.activate': 'Activate',
    'manufacturing.productionTitle': 'Production and Backflush',
    'manufacturing.productionDescription': 'Record finished goods, then deduct recursive raw demand.',
    'manufacturing.finishedGood': 'Finished good',
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
    'action.supplierCreation': 'supplier creation',
    'action.customerCreation': 'customer creation',
    'action.itemCreation': 'item creation',
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
    'error.createPickFirst': 'Create a pick first.'
  },
  vi: {
    'brand.eyebrow': 'IMS Điện Tử',
    'brand.title': 'Bảng Điều Hành Vận Hành',
    'brand.description': 'Giao diện thân thiện với máy quét cho nhập hàng, kiểm kê tồn kho, xuất hàng và sản xuất.',
    'hero.eyebrow': 'Bảng điều khiển kho + sản xuất trực tiếp',
    'hero.title': 'Giao diện IMS một kho',
    'hero.description': 'Giao diện dùng trực tiếp REST API hiện tại và giữ RBAC của backend hiển thị qua chuyển đổi persona.',
    'sidebar.persona': 'Persona',
    'sidebar.requestRole': 'Vai trò yêu cầu',
    'sidebar.language': 'Ngôn ngữ',
    'sidebar.refresh': 'Làm mới dữ liệu',
    'language.en': 'English',
    'language.vi': 'Tiếng Việt',
    'toast.status': 'Trạng thái',
    'message.ready': 'Sẵn sàng.',
    'message.workspaceRefreshed': 'Đã làm mới dữ liệu cho {role}.',
    'message.actionCompleted': 'Đã hoàn tất {action}.',
    'message.workingOn': 'Đang xử lý {action}...',
    'nav.overview': 'Tổng quan',
    'nav.master': 'Danh mục',
    'nav.inbound': 'Nhập hàng',
    'nav.fulfillment': 'Xuất hàng',
    'nav.counts': 'Kiểm kê',
    'nav.manufacturing': 'Sản xuất',
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
    'common.enterReason': 'Nhập lý do',
    'common.searchSkuName': 'Tìm mã hàng hoặc tên',
    'common.selectSupplier': 'Chọn nhà cung cấp',
    'common.selectCustomer': 'Chọn khách hàng',
    'common.selectItem': 'Chọn mặt hàng',
    'common.selectLocation': 'Chọn vị trí',
    'common.selectFg': 'Chọn thành phẩm',
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
    'master.createItem': 'Tạo mặt hàng',
    'master.partnersTitle': 'Đối tác',
    'master.partnersDescription': 'Tạo nhanh nhà cung cấp và khách hàng để kiểm thử.',
    'master.supplierTitle': 'Nhà cung cấp',
    'master.customerTitle': 'Khách hàng',
    'master.createSupplier': 'Tạo nhà cung cấp',
    'master.createCustomer': 'Tạo khách hàng',
    'master.itemsInventoryTitle': 'Mặt hàng và tồn kho',
    'master.itemsInventoryDescription': 'Kiểm tra tồn kho và tạo mã vạch nội bộ.',
    'master.barcode': 'Mã vạch',
    'master.refreshInventory': 'Làm mới tồn kho',
    'master.generateBarcode': 'Tạo mã vạch',
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
    'counts.discrepancyApprovalsTitle': 'Phê duyệt chênh lệch',
    'counts.discrepancyApprovalsDescription': 'Chỉ dành cho Tài chính/Quản trị.',
    'counts.count': 'Phiếu kiểm',
    'counts.delta': 'Chênh lệch',
    'counts.approveSelectedTicket': 'Duyệt phiếu đã chọn',
    'counts.recentCycleCountsTitle': 'Phiếu kiểm gần đây',
    'counts.recentCycleCountsDescription': 'Vận hành gửi phiếu, tài chính/quản trị xử lý chênh lệch.',
    'manufacturing.bomTitle': 'Định mức nguyên vật liệu',
    'manufacturing.bomDescription': 'Tạo và kích hoạt định mức có phiên bản cho thành phẩm.',
    'manufacturing.parentFinishedGood': 'Thành phẩm cha',
    'manufacturing.component': 'Linh kiện',
    'manufacturing.createBom': 'Tạo định mức',
    'manufacturing.addLine': 'Thêm dòng',
    'manufacturing.activate': 'Kích hoạt',
    'manufacturing.productionTitle': 'Sản xuất và xuất trừ nguyên liệu',
    'manufacturing.productionDescription': 'Ghi nhận thành phẩm, sau đó trừ nguyên vật liệu theo nhu cầu đệ quy.',
    'manufacturing.finishedGood': 'Thành phẩm',
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
    'action.refreshWorkspace': 'làm mới dữ liệu',
    'action.supplierCreation': 'tạo nhà cung cấp',
    'action.customerCreation': 'tạo khách hàng',
    'action.itemCreation': 'tạo mặt hàng',
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
    'error.createPickFirst': 'Hãy tạo phiếu lấy hàng trước.'
  }
};

const NAV = ['overview', 'master', 'inbound', 'fulfillment', 'counts', 'manufacturing'];
const ROLE_LABEL_KEYS = {
  ADMIN: 'role.admin',
  FINANCE: 'role.finance',
  OPERATIONS: 'role.operations'
};
const STATUS_LABEL_KEYS = {
  DRAFT: 'status.draft',
  OPEN: 'status.open',
  APPROVED: 'status.approved',
  POSTED: 'status.posted',
  ALLOCATED: 'status.allocated',
  PICKING: 'status.picking',
  COMPLETED: 'status.completed',
  PENDING: 'status.pending',
  BACKFLUSHED: 'status.backflushed',
  'DISCREPANCY RECORDED': 'status.discrepancyRecorded',
  REJECTED: 'status.rejected'
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

function getStatusLabel(t, value) {
  const key = STATUS_LABEL_KEYS[String(value ?? '').trim().toUpperCase()];
  return key ? t(key) : String(value ?? '');
}

function loadStoredSession() {
  try {
    const raw = window.localStorage.getItem('ims-front-session');
    return raw ? JSON.parse(raw) : DEFAULT_SESSION;
  } catch {
    return DEFAULT_SESSION;
  }
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

function formatDate(value, locale = 'en-US', fallback = 'Not set') {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale, { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value));
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

export default function App() {
  const [language, setLanguage] = useState(loadStoredLanguage);
  const t = useMemo(() => createTranslator(language), [language]);
  const [session, setSession] = useState(loadStoredSession);
  const [section, setSection] = useState('overview');
  const [manufacturingTab, setManufacturingTab] = useState('production');
  const [bomWorkspaceMode, setBomWorkspaceMode] = useState('browse');
  const [forms, setForms] = useState(DEFAULT_FORMS);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(() => createTranslator(loadStoredLanguage())('message.ready'));
  const [selected, setSelected] = useState({});
  const [inventoryDetail, setInventoryDetail] = useState(null);
  const [bomDetail, setBomDetail] = useState(null);
  const [bomExplosionPreview, setBomExplosionPreview] = useState([]);
  const [backflushPreview, setBackflushPreview] = useState([]);
  const [picksByOrder, setPicksByOrder] = useState({});
  const [itemSearch, setItemSearch] = useState('');
  const [bomLibrarySearch, setBomLibrarySearch] = useState('');
  const deferredItemSearch = useDeferredValue(itemSearch);
  const deferredBomLibrarySearch = useDeferredValue(bomLibrarySearch);
  const [data, setData] = useState({
    me: null,
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
  });
  const api = useMemo(() => createApiClient(session), [session]);
  const financeVisible = ['ADMIN', 'FINANCE'].includes(session.role);
  const dateLocale = language === 'vi' ? 'vi-VN' : 'en-US';
  const formatAppDate = (value) => formatDate(value, dateLocale, t('common.notSet'));
  const actionLabel = (actionKey) => t(`action.${actionKey}`);

  useEffect(() => {
    window.localStorage.setItem('ims-front-session', JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    window.localStorage.setItem('ims-front-language', language);
  }, [language]);

  useEffect(() => {
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

        const [me, users, suppliers, customers, items, locations, inventory, purchaseOrders, receipts, salesOrders, cycleCounts, discrepancyTickets, boms, productionOrders, scrapRequests] = await Promise.all([
          safe('/auth/me', { data: null }),
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
        if (!cancelled) setMessage(error.message);
      } finally {
        if (!cancelled) setBusy('');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api, session.role, session.userId, t]);

  function updateForm(group, key, value) {
    setForms((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  }

  async function run(actionKey, callback) {
    setBusy(actionKey);
    try {
      const result = await callback();
      setMessage(t('message.actionCompleted', { action: actionLabel(actionKey) }));
      setSession((current) => ({ ...current }));
      return result;
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      setBusy('');
    }
  }

  const personas = useMemo(() => {
    return SEEDED_PERSONAS.map((persona) => ({
      label: t(`persona.${persona.key}.label`),
      userId: persona.userId,
      name: t(`persona.${persona.key}.name`),
      roles: persona.roles
    }));
  }, [t]);

  const defaultPersona = personas[0] ?? {
    label: t('persona.admin.label'),
    userId: DEFAULT_SESSION.userId,
    name: t('persona.admin.name'),
    roles: [DEFAULT_SESSION.role]
  };
  const currentPersona = personas.find((persona) => persona.userId === session.userId) ?? defaultPersona;
  const filteredItems = useMemo(() => {
    const query = deferredItemSearch.trim().toLowerCase();
    if (!query) return data.items;
    return data.items.filter((item) => item.internalSku.toLowerCase().includes(query) || item.name.toLowerCase().includes(query));
  }, [data.items, deferredItemSearch]);
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

    if (section === 'inbound') {
      return {
        title: t('nav.inbound'),
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

  async function refreshInventory(itemId) {
    if (!itemId) return;
    const response = await api.request(`/items/${itemId}/inventory`);
    setInventoryDetail(response.data);
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
    const payload = {
      internalSku: forms.item.internalSku,
      name: forms.item.name,
      itemType: forms.item.itemType,
      uom: forms.item.uom,
      minStockLevel: Number(forms.item.minStockLevel || 0),
      reorderQuantity: Number(forms.item.reorderQuantity || 0),
      leadTimeDays: Number(forms.item.leadTimeDays || 0)
    };
    if (financeVisible) payload.unitCost = Number(forms.item.unitCost || 0);

    const response = await run('itemCreation', () =>
      api.request('/items', { method: 'POST', body: payload })
    );
    setSelected((current) => ({ ...current, itemId: response.data.itemId }));
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
  }

  async function approvePurchaseOrder() {
    await run('purchaseOrderApproval', () => api.request(`/purchase-orders/${selected.purchaseOrderId}/approve`, { method: 'POST' }));
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
  }

  async function allocateSalesOrder() {
    await run('salesOrderAllocation', () => api.request(`/sales-orders/${selected.salesOrderId}/allocate`, { method: 'POST' }));
  }

  async function createPick() {
    const response = await run('pickCreation', () => api.request(`/fulfillment/sales-orders/${selected.salesOrderId}/picks`, { method: 'POST' }));
    setPicksByOrder((current) => ({ ...current, [selected.salesOrderId]: response.data.pick }));
  }

  async function confirmPick() {
    const pick = picksByOrder[selected.salesOrderId];
    if (!pick) throw new Error(t('error.createPickFirst'));
    await run('pickConfirmation', () => api.request(`/fulfillment/sales-orders/${selected.salesOrderId}/picks/${pick.pickId}/confirm`, { method: 'POST' }));
  }

  async function createCycleCount() {
    const response = await run('cycleCountCreation', () =>
      api.request('/cycle-counts', {
        method: 'POST',
        body: {
          locationId: forms.cycleCount.locationId,
          notes: forms.cycleCount.notes || null
        }
      })
    );
    setSelected((current) => ({ ...current, cycleCountId: response.data.cycleCountId }));
  }

  async function addCycleCountLine() {
    await run('cycleCountLineAdd', () =>
      api.request(`/cycle-counts/${selected.cycleCountId}/lines`, {
        method: 'POST',
        body: {
          itemId: forms.cycleCountLine.itemId,
          lotId: forms.cycleCountLine.lotId || null,
          countedQty: Number(forms.cycleCountLine.countedQty)
        }
      })
    );
  }

  async function submitCycleCount() {
    await run('cycleCountSubmit', () => api.request(`/cycle-counts/${selected.cycleCountId}/submit`, { method: 'POST' }));
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
                  {data.items.filter((item) => item.itemType === 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__eyebrow">{t('brand.eyebrow')}</span>
          <h1>{t('brand.title')}</h1>
          <p>{t('brand.description')}</p>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <button key={item} type="button" className={section === item ? 'nav__button nav__button--active' : 'nav__button'} onClick={() => setSection(item)}>
              {t(`nav.${item}`)}
            </button>
          ))}
        </nav>

        <div className="session-card">
          <label className="field">
            <span>{t('sidebar.persona')}</span>
            <select
              value={session.userId}
              onChange={(event) => {
                const next = personas.find((persona) => persona.userId === event.target.value) ?? defaultPersona;
                setSession({ userId: next.userId, role: next.roles[0] ?? DEFAULT_SESSION.role });
              }}
            >
              {personas.map((persona) => (
                <option key={persona.userId} value={persona.userId}>
                  {persona.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t('sidebar.requestRole')}</span>
            <select value={session.role} onChange={(event) => setSession((current) => ({ ...current, role: event.target.value }))}>
              {(currentPersona.roles.length ? currentPersona.roles : [session.role]).map((roleCode) => (
                <option key={roleCode} value={roleCode}>
                  {getRoleLabel(t, roleCode)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t('sidebar.language')}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="en">{t('language.en')}</option>
              <option value="vi">{t('language.vi')}</option>
            </select>
          </label>

          <div className="session-card__meta">
            <span>{currentPersona.name}</span>
            <small>{session.userId}</small>
          </div>

          <div className="session-card__chips">
            {(data.me?.roles ?? []).map((role) => (
              <span key={role.roleId ?? role.roleCode} className="chip">
                {getRoleLabel(t, role.roleCode)}
              </span>
            ))}
          </div>

          <button type="button" className="button button--ghost button--block" onClick={() => setSession((current) => ({ ...current }))}>
            {t('sidebar.refresh')}
          </button>
        </div>
      </aside>

      <main className="content">
        <header className={section === 'manufacturing' ? 'hero hero--compact' : 'hero'}>
          <div className={section === 'manufacturing' ? 'hero__body hero__body--compact' : 'hero__body'}>
            <span className="hero__eyebrow">{t('hero.eyebrow')}</span>
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
            <div className="grid grid--2">
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
                  <label className="field"><span>{t('master.unitCost')}</span><input value={financeVisible ? forms.item.unitCost : t('common.restricted')} disabled={!financeVisible} onChange={(event) => updateForm('item', 'unitCost', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createItem}>{t('master.createItem')}</button>
                </div>
              </div>

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
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{t('master.itemsInventoryTitle')}</h2>
                  <p>{t('master.itemsInventoryDescription')}</p>
                </div>
                <input className="search" placeholder={t('common.searchSkuName')} value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} />
              </div>
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
                  { key: 'unitCost', label: t('master.unitCost'), render: (row) => (row.unitCost === undefined ? t('common.restricted') : `$${formatNumber(row.unitCost)}`) }
                ]}
              />
              {inventoryDetail ? (
                <div className="detail-card">
                  <div className="button-row">
                    <button type="button" className="button button--secondary" onClick={() => refreshInventory(selected.itemId)}>{t('master.refreshInventory')}</button>
                    <button type="button" className="button button--ghost" onClick={() => run('barcodeGeneration', () => api.request(`/items/${selected.itemId}/internal-barcode`, { method: 'POST' }))}>{t('master.generateBarcode')}</button>
                  </div>
                  <div className="inventory-summary">
                    <div className="metric"><span>{t('common.onHand')}</span><strong>{formatNumber(inventoryDetail.totals.quantityOnHand)}</strong></div>
                    <div className="metric"><span>{t('common.reserved')}</span><strong>{formatNumber(inventoryDetail.totals.quantityReserved)}</strong></div>
                    <div className="metric metric--accent"><span>{t('common.available')}</span><strong>{formatNumber(inventoryDetail.totals.quantityAvailable)}</strong></div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {section === 'inbound' ? (
          <div className="stack">
            <div className="grid grid--2">
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
                    <h2>{t('inbound.receivingTitle')}</h2>
                    <p>{t('inbound.receivingDescription')}</p>
                  </div>
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
              </div>
            </div>

            <div className="grid grid--2">
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
                            {data.items.filter((item) => item.itemType === 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
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
