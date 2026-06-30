import { txApi } from '../config/api';
import { Endpoints } from '../config/network';

// ── Types ────────────────────────────────────────────────────────

export interface CheckoutItem {
  productId: string;
  name: string;
  category?: string;
  barcode?: string;
  originalPrice: number;
  price: number;
  priceOverridden?: boolean;
  wholesalePrice?: number;
  discountPerItem?: number;
  quantity: number;
  scanMethod?: 'BARCODE_SCAN' | 'IMAGE_SEARCH' | 'MANUAL';
  aiConfidenceScore?: number;
}

export interface CheckoutPayload {
  storeId: string;
  cashierId: string;
  customerId?: string;
  items: CheckoutItem[];
  paymentMethod: string;
  discountReason?: string;
  orderDiscount?: number;
  isOfflineTransaction?: boolean;
  checkoutDurationSeconds?: number;
}

export interface RefundPayload {
  orderId: string;
  storeId: string;
  cashierId: string;
  items: { productId: string; quantity: number }[];
  reason?: string;
}

export interface AdjustInventoryPayload {
  storeId: string;
  productId: string;
  changeAmount: number;
  reason: 'EXPIRED' | 'DAMAGED' | 'THEFT' | 'CORRECTION' | 'OTHER';
  notes?: string;
}

export interface Order {
  id: string;
  storeId: string;
  cashierId: string;
  type: string;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  itemCount: number;
  totalUnits: number;
  paymentMethod: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  price: number;
  quantity: number;
  total: number;
}

// ── Service ──────────────────────────────────────────────────────

const TransactionService = {
  checkout: async (data: CheckoutPayload) => {
    const res = await txApi.post<{ success: boolean; order: Order }>(
      Endpoints.CHECKOUT,
      data,
    );
    return res.data;
  },

  refund: async (data: RefundPayload) => {
    const res = await txApi.post(Endpoints.REFUND, data);
    return res.data;
  },

  adjustInventory: async (data: AdjustInventoryPayload) => {
    const res = await txApi.post(Endpoints.INVENTORY_ADJUST, data);
    return res.data;
  },

  getHistory: async (params?: { page?: number; limit?: number; storeId?: string }) => {
    const res = await txApi.get<{ success: boolean; orders: Order[]; total: number }>(
      Endpoints.ORDER_HISTORY,
      { params },
    );
    return res.data;
  },

  getOrderDetail: async (orderId: string) => {
    const res = await txApi.get<{ success: boolean; order: Order }>(
      `/api/transactions/${orderId}`,
    );
    return res.data;
  },

  getInventoryLogs: async (params?: { productId?: string; reason?: string }) => {
    const res = await txApi.get(Endpoints.INVENTORY_LOGS, { params });
    return res.data;
  },
};

export default TransactionService;
