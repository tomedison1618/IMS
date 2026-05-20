import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import supplierRoutes from './suppliers.routes.js';
import customerRoutes from './customers.routes.js';
import itemRoutes from './items.routes.js';
import locationRoutes from './locations.routes.js';
import inventoryRoutes from './inventory.routes.js';
import bomRoutes from './boms.routes.js';
import purchaseOrderRoutes from './purchaseOrders.routes.js';
import receiptRoutes from './receiving.routes.js';
import manufacturingRoutes from './manufacturing.routes.js';
import salesOrderRoutes from './salesOrders.routes.js';
import fulfillmentRoutes from './fulfillment.routes.js';
import cycleCountRoutes from './cycleCounts.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', userRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);
router.use('/items', itemRoutes);
router.use('/locations', locationRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/boms', bomRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/receipts', receiptRoutes);
router.use('/manufacturing', manufacturingRoutes);
router.use('/sales-orders', salesOrderRoutes);
router.use('/fulfillment', fulfillmentRoutes);
router.use('/cycle-counts', cycleCountRoutes);

export default router;
