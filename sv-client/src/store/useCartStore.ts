import { create } from 'zustand';
import TransactionService from '../services/TransactionService';
import TelemetryService from '../services/TelemetryService';
import type { CheckoutItem, CheckoutPayload, Order } from '@sv/shared';

interface CartItem extends CheckoutItem {
  /** Local-only ID for cart management (productId may repeat for different price overrides) */
  cartKey: string;
}

interface CartState {
  // State
  items: CartItem[];
  orderDiscount: number;
  discountReason: string;
  paymentMethod: string;
  isProcessing: boolean;
  lastOrder: Order | null;
  error: string | null;

  // Cart mutations
  addItem: (item: Omit<CartItem, 'cartKey'>) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  setDiscount: (amount: number, reason?: string) => void;
  setPaymentMethod: (method: string) => void;
  clearCart: (opts?: { telemetry?: { storeId: string; cashierId?: string } }) => void;

  // Computed helpers (call as functions)
  getSubtotal: () => number;
  getItemCount: () => number;
  getTotalUnits: () => number;

  // Actions
  checkout: (storeId: string, cashierId: string) => Promise<boolean>;

  // Order history
  orderHistory: Order[];
  historyTotal: number;
  fetchHistory: (params?: { page?: number; limit?: number; storeId?: string }) => Promise<void>;
  fetchOrderDetail: (orderId: string) => Promise<Order | null>;
}

let cartKeyCounter = 0;

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  orderDiscount: 0,
  discountReason: '',
  paymentMethod: 'CASH',
  isProcessing: false,
  lastOrder: null,
  error: null,
  orderHistory: [],
  historyTotal: 0,

  addItem: (item) => {
    const cartKey = `ck_${++cartKeyCounter}_${Date.now()}`;
    const existing = get().items.find(
      (i) => i.productId === item.productId && i.price === item.price,
    );

    if (existing) {
      // Merge quantities for same product+price
      set((s) => ({
        items: s.items.map((i) =>
          i.cartKey === existing.cartKey
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        ),
      }));
    } else {
      set((s) => ({ items: [...s.items, { ...item, cartKey }] }));
    }
  },

  removeItem: (cartKey) => {
    set((s) => ({ items: s.items.filter((i) => i.cartKey !== cartKey) }));
  },

  updateQuantity: (cartKey, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartKey);
      return;
    }
    set((s) => ({
      items: s.items.map((i) => (i.cartKey === cartKey ? { ...i, quantity } : i)),
    }));
  },

  setDiscount: (amount, reason = '') => {
    set({ orderDiscount: amount, discountReason: reason });
  },

  setPaymentMethod: (method) => {
    set({ paymentMethod: method });
  },

  clearCart: (opts) => {
    const { items } = get();
    // Fire telemetry if cart had items (abandoned cart tracking)
    if (items.length > 0 && opts?.telemetry) {
      const subtotal = get().getSubtotal();
      TelemetryService.logAbandonedCart({
        storeId: opts.telemetry.storeId,
        cashierId: opts.telemetry.cashierId,
        itemCount: items.length,
        cartValue: subtotal,
      });
    }
    set({
      items: [],
      orderDiscount: 0,
      discountReason: '',
      paymentMethod: 'CASH',
      error: null,
    });
  },

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  getItemCount: () => get().items.length,
  getTotalUnits: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  checkout: async (storeId, cashierId) => {
    const { items, orderDiscount, discountReason, paymentMethod } = get();
    if (items.length === 0) {
      set({ error: 'Cart is empty' });
      return false;
    }

    set({ isProcessing: true, error: null });
    const startTime = Date.now();

    try {
      const payload: CheckoutPayload = {
        storeId,
        cashierId,
        items: items.map(({ cartKey, ...rest }) => rest), // strip local cartKey
        paymentMethod,
        discountReason: discountReason || undefined,
        orderDiscount: orderDiscount || undefined,
        checkoutDurationSeconds: Math.round((Date.now() - startTime) / 1000),
      };

      const res = await TransactionService.checkout(payload);
      set({
        lastOrder: res.order,
        items: [],
        orderDiscount: 0,
        discountReason: '',
        isProcessing: false,
      });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error ?? err.message ?? 'Checkout failed',
        isProcessing: false,
      });
      return false;
    }
  },

  fetchHistory: async (params) => {
    try {
      const res = await TransactionService.getHistory(params);
      // Backend returns `{ success: true, data: Order[] }`
      set({ orderHistory: res.data ?? [] });
    } catch {
      // silent
    }
  },

  fetchOrderDetail: async (orderId) => {
    try {
      const res = await TransactionService.getOrderDetail(orderId);
      return res.order;
    } catch {
      return null;
    }
  },
}));
