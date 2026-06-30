# Backend Implementation Walkthrough

## Bugs Fixed

### Prisma 7 Migration
- Removed `url = env("DATABASE_URL")` from `schema.prisma` datasource block
- Installed `@prisma/adapter-pg` driver adapter
- Updated `src/prisma.ts` in both services to use the new `PrismaPg` adapter pattern:
  ```ts
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  ```

### TypeScript `verbatimModuleSyntax`
- Changed all `import { Request, Response }` to `import type { Request, Response }` across every handler file

---

## Transaction Service — Complete Routes

### Commands (Write Path)
| File | Route | What it does |
|---|---|---|
| [createProduct.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/commands/createProduct.ts) | `POST /api/catalog/products` | Creates a single product with variant support |
| [bulkOnboardProducts.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/commands/bulkOnboardProducts.ts) | `POST /api/catalog/products/bulk` | Creates parent + all variants in one transaction |
| [addInventoryBatch.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/commands/addInventoryBatch.ts) | `POST /api/catalog/inventory-batch` | Logs a delivery batch + auto-increments totalQuantity + creates audit log |
| [updateProduct.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/commands/updateProduct.ts) | `PUT /api/catalog/products/:id` | Partial update of product fields |
| [deleteProduct.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/commands/deleteProduct.ts) | `DELETE /api/catalog/products/:id` | Soft-delete (preserves data for OLAP) |
| [processCheckout.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/commands/processCheckout.ts) | `POST /api/transactions/checkout` | Full ACID checkout with inventory deduction + audit logs |
| [processRefund.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/commands/processRefund.ts) | `POST /api/transactions/refund` | Refund with per-item quantity validation + inventory restoration |
| [adjustInventory.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/commands/adjustInventory.ts) | `POST /api/transactions/inventory/adjust` | Manual shrinkage (expired/damaged/theft) |
| [logTelemetry.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/commands/logTelemetry.ts) | `POST /api/telemetry/*` | Persists abandoned carts and search failures to DB |

### Queries (Read Path)
| File | Route | What it does |
|---|---|---|
| [getCatalog.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/queries/getCatalog.ts) | `GET /api/catalog/products` | Filterable by category & search |
| [getProductByBarcode.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/queries/getProductByBarcode.ts) | `GET /api/catalog/products/barcode/:barcode` | Fast lookup with FIFO batch ordering |
| [getProductVariants.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/queries/getProductVariants.ts) | `GET /api/catalog/products/:id/variants` | All variants of a parent product |
| [getExpiringBatches.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/queries/getExpiringBatches.ts) | `GET /api/catalog/expiring?days=7` | Batches expiring within N days |
| [getLowStock.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/queries/getLowStock.ts) | `GET /api/catalog/low-stock` | Products below minQuantity threshold |
| [getOrderHistory.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/queries/getOrderHistory.ts) | `GET /api/transactions/history` | Paginated order history |
| [getOrderDetail.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/queries/getOrderDetail.ts) | `GET /api/transactions/:id` | Single order with all line items |
| [getInventoryLogs.ts](file:///c:/projects/small-vendor/sv-backend/sv-transaction-service/src/queries/getInventoryLogs.ts) | `GET /api/transactions/inventory/logs` | Filterable audit trail |

---

## User Service — Complete Routes

| File | Route | What it does |
|---|---|---|
| [registerStore.ts](file:///c:/projects/small-vendor/sv-backend/sv-user-service/src/commands/registerStore.ts) | `POST /api/auth/register-store` | Creates Store + Owner in one transaction, returns JWT |
| [login.ts](file:///c:/projects/small-vendor/sv-backend/sv-user-service/src/commands/login.ts) | `POST /api/auth/login` | Validates credentials, returns JWT with storeId + role |
| [createCashier.ts](file:///c:/projects/small-vendor/sv-backend/sv-user-service/src/commands/createCashier.ts) | `POST /api/auth/cashiers` | Owner creates cashier accounts |
| [getUsers.ts](file:///c:/projects/small-vendor/sv-backend/sv-user-service/src/queries/getUsers.ts) | `GET /api/auth/users` | List all employees |
| [getCurrentUser.ts](file:///c:/projects/small-vendor/sv-backend/sv-user-service/src/queries/getCurrentUser.ts) | `GET /api/auth/users/me` | Current session info from JWT |

---

## New OLAP Data Fields Added

Based on research into how Square, Shopify, and Lightspeed track retail analytics:

| Field | Model | OLAP Analytics Enabled |
|---|---|---|
| `itemCount` | Order | Average basket size per hour/day/cashier |
| `totalUnits` | Order | Units sold velocity, throughput metrics |
| `discountReason` | Order | Which discount types drive the most revenue? |
| `originalPrice` | OrderItem | Exact discount depth tracking (how far below list price?) |
| `priceOverridden` | OrderItem | Catch unauthorized cashier price changes |
| `barcodeSnapshot` | OrderItem | SKU-level analytics even after product deletion |
| `discountPerItem` | OrderItem | Per-item discount effectiveness |
| `customerId` | Order | Customer lifetime value, repeat purchase rate |
| `AbandonedCart` | New Table | Lost revenue analysis, peak abandonment hours |
| `SearchFailure` | New Table | Catalog gap analysis ("customers ask for items we don't stock") |

---

## Next Steps
- Boot PostgreSQL via Docker: `docker-compose up -d postgres`
- Run `npx prisma db push` in sv-transaction-service to create tables
- Run `npx prisma db push` in sv-user-service (same DB, creates User/Store tables)
- Test routes with Postman or curl
