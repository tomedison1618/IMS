import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createApiClient } from './api.js';

const SEEDED_PERSONAS = [
  { key: 'admin', userId: '10000000-0000-0000-0000-000000000001', roles: ['ADMIN'] },
  { key: 'cfo', userId: '10000000-0000-0000-0000-000000000002', roles: ['CFO'] },
  { key: 'procurement', userId: '10000000-0000-0000-0000-000000000003', roles: ['PROCUREMENT_MANAGER'] },
  { key: 'warehouse', userId: '10000000-0000-0000-0000-000000000004', roles: ['WAREHOUSE'] },
  { key: 'production', userId: '10000000-0000-0000-0000-000000000005', roles: ['PRODUCTION_MANAGER'] }
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
  productionOrder: { finishedGoodItemId: '', bomId: '', quantityPlanned: '5', externalReference: '' },
  completion: { productionOrderId: '', quantityCompleted: '5', locationId: '', serialNumbers: '' },
  scrap: { productionOrderId: '', itemId: '', locationId: '', quantity: '1', reason: 'Broken component during assembly' }
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
    'persona.cfo.label': 'CFO',
    'persona.cfo.name': 'Finance',
    'persona.procurement.label': 'Procurement',
    'persona.procurement.name': 'Procurement',
    'persona.warehouse.label': 'Warehouse',
    'persona.warehouse.name': 'Warehouse',
    'persona.production.label': 'Production',
    'persona.production.name': 'Production',
    'common.notSet': 'Not set',
    'common.noRecords': 'No records yet.',
    'common.restricted': 'Restricted',
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
    'fulfillment.pickerContextDescription': 'Use the Warehouse persona to stay aligned with permissions.',
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
    'counts.recentCycleCountsDescription': 'Warehouse submits, finance/admin resolves mismatches.',
    'manufacturing.bomTitle': 'Bill of Materials',
    'manufacturing.bomDescription': 'Create and activate a versioned BoM for a finished good.',
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
    'manufacturing.scrapDescription': 'Production signs first, warehouse signs second.',
    'manufacturing.createScrapRequest': 'Create scrap request',
    'manufacturing.productionSign': 'Production sign',
    'manufacturing.warehouseSign': 'Warehouse sign',
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
    'sidebar.refresh': 'Làm mới workspace',
    'language.en': 'English',
    'language.vi': 'Tiếng Việt',
    'toast.status': 'Trạng thái',
    'message.ready': 'Sẵn sàng.',
    'message.workspaceRefreshed': 'Đã làm mới workspace cho {role}.',
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
    'persona.cfo.label': 'CFO',
    'persona.cfo.name': 'Tài chính',
    'persona.procurement.label': 'Mua hàng',
    'persona.procurement.name': 'Mua hàng',
    'persona.warehouse.label': 'Kho',
    'persona.warehouse.name': 'Kho',
    'persona.production.label': 'Sản xuất',
    'persona.production.name': 'Sản xuất',
    'common.notSet': 'Chưa đặt',
    'common.noRecords': 'Chưa có dữ liệu.',
    'common.restricted': 'Bị giới hạn',
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
    'common.searchSkuName': 'Tìm SKU hoặc tên',
    'common.selectSupplier': 'Chọn nhà cung cấp',
    'common.selectCustomer': 'Chọn khách hàng',
    'common.selectItem': 'Chọn mặt hàng',
    'common.selectLocation': 'Chọn vị trí',
    'common.selectFg': 'Chọn thành phẩm',
    'common.selectComponent': 'Chọn linh kiện',
    'itemType.RAW_MATERIAL': 'Nguyên vật liệu',
    'itemType.SUB_ASSEMBLY': 'Bán thành phẩm',
    'itemType.FINISHED_GOOD': 'Thành phẩm',
    'metric.openPos': 'PO đang mở',
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
    'master.internalSku': 'SKU nội bộ',
    'master.itemType': 'Loại mặt hàng',
    'master.uom': 'Đơn vị tính',
    'master.minStock': 'Tồn tối thiểu',
    'master.reorderQty': 'SL đặt lại',
    'master.leadTime': 'Lead time',
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
    'inbound.createPo': 'Tạo PO',
    'inbound.approveSelectedPo': 'Duyệt PO đã chọn',
    'inbound.addPoLine': 'Thêm dòng PO',
    'inbound.receivingTitle': 'Nhận hàng',
    'inbound.receivingDescription': 'Ghi nhận số lô và nhập tồn vào kho.',
    'inbound.createReceipt': 'Tạo phiếu nhập',
    'inbound.postSelectedReceipt': 'Hạch toán phiếu nhập đã chọn',
    'inbound.poLineUuid': 'UUID dòng PO',
    'inbound.receivedQty': 'SL nhận',
    'inbound.receivingBin': 'Ô nhận hàng',
    'inbound.putawayBin': 'Ô cất kho',
    'inbound.manualLot': 'Lô nhập tay',
    'inbound.addReceiptLine': 'Thêm dòng phiếu nhập',
    'inbound.recentPurchaseOrdersTitle': 'Đơn mua gần đây',
    'inbound.recentPurchaseOrdersDescription': 'Chọn một đơn để đặt ngữ cảnh nhận hàng.',
    'inbound.po': 'PO',
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
    'fulfillment.pickerContextTitle': 'Ngữ cảnh picker',
    'fulfillment.pickerContextDescription': 'Dùng persona Kho để khớp với quyền hiện tại.',
    'fulfillment.currentRequestRole': 'Vai trò yêu cầu hiện tại',
    'fulfillment.currentPick': 'Phiếu lấy hàng hiện tại',
    'fulfillment.createPickToTrack': 'Hãy tạo phiếu lấy hàng để theo dõi tại đây.',
    'fulfillment.salesOrdersTitle': 'Đơn bán hàng',
    'fulfillment.salesOrdersDescription': 'Chọn một đơn để phân bổ và lấy hàng.',
    'fulfillment.so': 'SO',
    'fulfillment.ship': 'Giao hàng',
    'counts.entryTitle': 'Nhập kiểm kê',
    'counts.entryDescription': 'Kiểm kê không tự động điều chỉnh. Chênh lệch sẽ thành phiếu phê duyệt.',
    'counts.createCount': 'Tạo phiếu kiểm',
    'counts.submitSelectedCount': 'Gửi phiếu kiểm đã chọn',
    'counts.countedQty': 'SL đếm',
    'counts.addCountLine': 'Thêm dòng kiểm',
    'counts.discrepancyApprovalsTitle': 'Phê duyệt chênh lệch',
    'counts.discrepancyApprovalsDescription': 'Chỉ dành cho Tài chính/Admin.',
    'counts.count': 'Phiếu kiểm',
    'counts.delta': 'Chênh lệch',
    'counts.approveSelectedTicket': 'Duyệt phiếu đã chọn',
    'counts.recentCycleCountsTitle': 'Phiếu kiểm gần đây',
    'counts.recentCycleCountsDescription': 'Kho gửi phiếu, tài chính/admin xử lý chênh lệch.',
    'manufacturing.bomTitle': 'Định mức nguyên vật liệu',
    'manufacturing.bomDescription': 'Tạo và kích hoạt BoM có phiên bản cho thành phẩm.',
    'manufacturing.parentFinishedGood': 'Thành phẩm cha',
    'manufacturing.component': 'Linh kiện',
    'manufacturing.createBom': 'Tạo BoM',
    'manufacturing.addLine': 'Thêm dòng',
    'manufacturing.activate': 'Kích hoạt',
    'manufacturing.productionTitle': 'Sản xuất và backflush',
    'manufacturing.productionDescription': 'Ghi nhận thành phẩm, sau đó trừ nguyên vật liệu theo nhu cầu đệ quy.',
    'manufacturing.finishedGood': 'Thành phẩm',
    'manufacturing.plannedQty': 'SL kế hoạch',
    'manufacturing.fgLocation': 'Vị trí thành phẩm',
    'manufacturing.completedQty': 'SL hoàn thành',
    'manufacturing.createOrder': 'Tạo lệnh',
    'manufacturing.recordCompletion': 'Ghi nhận hoàn thành',
    'manufacturing.previewBackflush': 'Xem trước backflush',
    'manufacturing.runBackflush': 'Chạy backflush',
    'manufacturing.backflushPreviewTitle': 'Xem trước backflush',
    'manufacturing.backflushPreviewDescription': 'Nhu cầu BoM đệ quy cho lệnh sản xuất đã chọn.',
    'manufacturing.runPreviewToLoad': 'Chạy xem trước backflush để tải nhu cầu.',
    'manufacturing.scrapTitle': 'Phế phẩm hai bước ký',
    'manufacturing.scrapDescription': 'Sản xuất ký trước, kho ký sau.',
    'manufacturing.createScrapRequest': 'Tạo yêu cầu phế phẩm',
    'manufacturing.productionSign': 'Sản xuất ký',
    'manufacturing.warehouseSign': 'Kho ký',
    'action.refreshWorkspace': 'làm mới workspace',
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
    'action.bomCreation': 'tạo BoM',
    'action.bomLineAdd': 'thêm dòng BoM',
    'action.bomActivation': 'kích hoạt BoM',
    'action.productionOrderCreation': 'tạo lệnh sản xuất',
    'action.productionCompletion': 'ghi nhận hoàn thành',
    'action.backflushPreview': 'xem trước backflush',
    'action.backflushExecution': 'chạy backflush',
    'action.scrapRequestCreation': 'tạo yêu cầu phế phẩm',
    'action.productionScrapSignoff': 'ký phế phẩm phía sản xuất',
    'action.warehouseScrapSignoff': 'ký phế phẩm phía kho',
    'action.barcodeGeneration': 'tạo mã vạch',
    'error.createPickFirst': 'Hãy tạo phiếu lấy hàng trước.'
  }
};

const NAV = ['overview', 'master', 'inbound', 'fulfillment', 'counts', 'manufacturing'];

function createTranslator(language) {
  return (key, values = {}) => {
    const template = TEXT[language]?.[key] ?? TEXT.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
  };
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

function Badge({ value }) {
  const safe = String(value ?? 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <span className={`badge badge--${safe}`}>{value}</span>;
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
  const [forms, setForms] = useState(DEFAULT_FORMS);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(() => createTranslator(loadStoredLanguage())('message.ready'));
  const [selected, setSelected] = useState({});
  const [inventoryDetail, setInventoryDetail] = useState(null);
  const [backflushPreview, setBackflushPreview] = useState([]);
  const [picksByOrder, setPicksByOrder] = useState({});
  const [itemSearch, setItemSearch] = useState('');
  const deferredItemSearch = useDeferredValue(itemSearch);
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
  const financeVisible = ['ADMIN', 'CFO', 'PROCUREMENT_MANAGER'].includes(session.role);
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
        setMessage(t('message.workspaceRefreshed', { role: session.role }));
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
    const seeded = SEEDED_PERSONAS.map((persona) => ({
      label: t(`persona.${persona.key}.label`),
      userId: persona.userId,
      name: t(`persona.${persona.key}.name`),
      roles: persona.roles
    }));
    const loaded = data.users.map((user) => ({
      label: `${user.firstName} ${user.lastName}`,
      userId: user.userId,
      name: `${user.firstName} ${user.lastName}`,
      roles: user.roles.map((role) => role.roleCode)
    }));
    const byId = new Map();
    [...seeded, ...loaded].forEach((persona) => {
      if (!byId.has(persona.userId)) byId.set(persona.userId, persona);
    });
    return [...byId.values()];
  }, [data.users, t]);

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
    setSelected((current) => ({ ...current, bomId: response.data.bomId }));
  }

  async function addBomLine() {
    await run('bomLineAdd', () =>
      api.request(`/boms/${selected.bomId}/lines`, {
        method: 'POST',
        body: {
          componentItemId: forms.bomLine.componentItemId,
          quantity: Number(forms.bomLine.quantity),
          scrapAllowancePct: Number(forms.bomLine.scrapAllowancePct || 0)
        }
      })
    );
  }

  async function activateBom() {
    await run('bomActivation', () => api.request(`/boms/${selected.bomId}/activate`, { method: 'POST' }));
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
                  {roleCode}
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
                {role.roleCode}
              </span>
            ))}
          </div>

          <button type="button" className="button button--ghost button--block" onClick={() => setSession((current) => ({ ...current }))}>
            {t('sidebar.refresh')}
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="hero">
          <div>
            <span className="hero__eyebrow">{t('hero.eyebrow')}</span>
            <h2>{t('hero.title')}</h2>
            <p>{t('hero.description')}</p>
          </div>

          <div className="toast">
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
                  { key: 'internalSku', label: 'SKU' },
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
                  { key: 'internalSku', label: 'SKU' },
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
                    { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
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
                    { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
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
                  <p className="inline-note">{t('fulfillment.currentRequestRole')}: <strong>{session.role}</strong></p>
                  {selected.salesOrderId && picksByOrder[selected.salesOrderId] ? (
                    <div className="pick-summary">
                      <div><span>{t('fulfillment.currentPick')}</span><strong>{picksByOrder[selected.salesOrderId].pickId}</strong></div>
                      <Badge value={picksByOrder[selected.salesOrderId].status} />
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
                  { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
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
                    { key: 'internalSku', label: 'SKU' },
                    { key: 'discrepancyQty', label: t('counts.delta'), render: (row) => formatNumber(row.discrepancyQty) },
                    { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> }
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
                  { key: 'status', label: t('common.status'), render: (row) => <Badge value={row.status} /> },
                  { key: 'createdAt', label: t('common.created'), render: (row) => formatAppDate(row.createdAt) }
                ]}
              />
            </div>
          </div>
        ) : null}
        {section === 'manufacturing' ? (
          <div className="stack">
            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('manufacturing.bomTitle')}</h2>
                    <p>{t('manufacturing.bomDescription')}</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>{t('manufacturing.parentFinishedGood')}</span>
                    <select value={forms.bom.parentItemId} onChange={(event) => updateForm('bom', 'parentItemId', event.target.value)}>
                      <option value="">{t('common.selectFg')}</option>
                      {data.items.filter((item) => item.itemType === 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>{t('common.version')}</span><input value={forms.bom.versionName} onChange={(event) => updateForm('bom', 'versionName', event.target.value)} /></label>
                  <label className="field">
                    <span>{t('manufacturing.component')}</span>
                    <select value={forms.bomLine.componentItemId} onChange={(event) => updateForm('bomLine', 'componentItemId', event.target.value)}>
                      <option value="">{t('common.selectComponent')}</option>
                      {data.items.filter((item) => item.itemType !== 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>{t('common.quantity')}</span><input value={forms.bomLine.quantity} onChange={(event) => updateForm('bomLine', 'quantity', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createBom}>{t('manufacturing.createBom')}</button>
                  <button type="button" className="button button--secondary" onClick={addBomLine}>{t('manufacturing.addLine')}</button>
                  <button type="button" className="button button--ghost" onClick={activateBom}>{t('manufacturing.activate')}</button>
                </div>
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>{t('manufacturing.productionTitle')}</h2>
                    <p>{t('manufacturing.productionDescription')}</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>{t('manufacturing.finishedGood')}</span>
                    <select value={forms.productionOrder.finishedGoodItemId} onChange={(event) => updateForm('productionOrder', 'finishedGoodItemId', event.target.value)}>
                      <option value="">{t('common.selectFg')}</option>
                      {data.items.filter((item) => item.itemType === 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
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
            </div>

            <div className="grid grid--2">
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
                    { key: 'internalSku', label: 'SKU' },
                    { key: 'name', label: t('common.name') },
                    { key: 'uom', label: t('master.uom') },
                    { key: 'totalRequiredQty', label: t('common.required'), render: (row) => formatNumber(row.totalRequiredQty) }
                  ]}
                />
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
                  <label className="field"><span>{t('common.reason')}</span><input value={forms.scrap.reason} onChange={(event) => updateForm('scrap', 'reason', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createScrapRequest}>{t('manufacturing.createScrapRequest')}</button>
                  <button type="button" className="button button--secondary" onClick={signProductionScrap}>{t('manufacturing.productionSign')}</button>
                  <button type="button" className="button button--ghost" onClick={signWarehouseScrap}>{t('manufacturing.warehouseSign')}</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
