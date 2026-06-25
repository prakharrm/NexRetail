import { Router } from 'express';
import { createProduct } from '../commands/createProduct.js';
import { bulkOnboardProducts } from '../commands/bulkOnboardProducts.js';
import { addInventoryBatch } from '../commands/addInventoryBatch.js';
import { updateProduct } from '../commands/updateProduct.js';
import { deleteProduct } from '../commands/deleteProduct.js';
import { getCatalog } from '../queries/getCatalog.js';
import { getProductByBarcode } from '../queries/getProductByBarcode.js';
import { getProductVariants } from '../queries/getProductVariants.js';
import { getExpiringBatches } from '../queries/getExpiringBatches.js';
import { getLowStock } from '../queries/getLowStock.js';

const router = Router();

// === Commands (Write) ===
router.post('/products', createProduct);
router.post('/products/bulk', bulkOnboardProducts);
router.post('/inventory-batch', addInventoryBatch);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// === Queries (Read) ===
router.get('/products', getCatalog);
router.get('/products/barcode/:barcode', getProductByBarcode);
router.get('/products/:id/variants', getProductVariants);
router.get('/expiring', getExpiringBatches);
router.get('/low-stock', getLowStock);

export default router;
