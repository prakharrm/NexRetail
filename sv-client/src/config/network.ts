/**
 * Network configuration for multi-service backend.
 * Transaction Service runs on :3001, User Service on :3002.
 */

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2'; // Android emulator → host

export const NetworkConfig = {
  TRANSACTION_URL: `${BASE}:3001`,
  USER_URL: `${BASE}:3002`,
  VISION_URL: `${BASE}:3003`,
  TIMEOUT: 10_000,
} as const;

export const Endpoints = {
  // Auth (User Service)
  REGISTER_STORE: '/api/auth/register-store',
  LOGIN: '/api/auth/login',
  CASHIERS: '/api/auth/cashiers',
  USERS: '/api/auth/users',
  CURRENT_USER: '/api/auth/users/me',

  // Catalog (Transaction Service)
  PRODUCTS: '/api/catalog/products',
  PRODUCTS_BULK: '/api/catalog/products/bulk',
  INVENTORY_BATCH: '/api/catalog/inventory-batch',
  EXPIRING: '/api/catalog/expiring',
  LOW_STOCK: '/api/catalog/low-stock',

  // Transactions (Transaction Service)
  CHECKOUT: '/api/transactions/checkout',
  REFUND: '/api/transactions/refund',
  INVENTORY_ADJUST: '/api/transactions/inventory/adjust',
  ORDER_HISTORY: '/api/transactions/history',
  INVENTORY_LOGS: '/api/transactions/inventory/logs',

  // Telemetry (Transaction Service)
  TELEMETRY_ABANDONED: '/api/telemetry/abandoned-cart',
  TELEMETRY_SEARCH_FAIL: '/api/telemetry/search-failure',

  // Vision (Vision Service)
  VISION_SEARCH_IMAGE: '/api/products/search-image',
  VISION_HEALTH: '/api/health',
} as const;
