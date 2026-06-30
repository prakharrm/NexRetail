import { txApi } from '../config/api';
import { Endpoints } from '../config/network';

import type { CheckoutItem, CheckoutPayload, RefundPayload, AdjustInventoryPayload, Order, OrderItem } from '@sv/shared';

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
