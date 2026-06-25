import { Router } from 'express';
import { logAbandonedCart, logSearchFailure } from '../commands/logTelemetry.js';

const router = Router();

// === Commands (Write — OLAP telemetry events) ===
router.post('/abandoned-cart', logAbandonedCart);
router.post('/search-failure', logSearchFailure);

export default router;
