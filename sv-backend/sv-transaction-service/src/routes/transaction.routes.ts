import { Router } from 'express';
import { processCheckout } from '../commands/processCheckout.js';
import { processRefund } from '../commands/processRefund.js';
import { adjustInventory } from '../commands/adjustInventory.js';
import { getOrderHistory } from '../queries/getOrderHistory.js';
import { getOrderDetail } from '../queries/getOrderDetail.js';
import { getInventoryLogs } from '../queries/getInventoryLogs.js';

const router = Router();

// === Commands (Write) ===
router.post('/checkout', processCheckout);
router.post('/refund', processRefund);
router.post('/inventory/adjust', adjustInventory);

// === Queries (Read) ===
router.get('/history', getOrderHistory);
router.get('/inventory/logs', getInventoryLogs);
router.get('/:id', getOrderDetail);

export default router;
