import { create } from 'zustand';
import CatalogService from '../services/CatalogService';
import type { Product, CreateProductPayload, BulkOnboardPayload, AddInventoryPayload } from '../services/CatalogService';

interface CatalogState {
  // State
  products: Product[];
  lowStockProducts: Product[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProducts: (params?: { search?: string; category?: string }) => Promise<void>;
  addProduct: (data: CreateProductPayload) => Promise<boolean>;
  bulkOnboard: (data: BulkOnboardPayload) => Promise<boolean>;
  updateProduct: (id: string, data: Partial<CreateProductPayload>) => Promise<boolean>;
  removeProduct: (id: string) => Promise<boolean>;
  addInventory: (data: AddInventoryPayload) => Promise<boolean>;
  fetchLowStock: () => Promise<void>;
  lookupBarcode: (barcode: string) => Promise<Product | null>;
}

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  products: [],
  lowStockProducts: [],
  isLoading: false,
  error: null,

  fetchProducts: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await CatalogService.getCatalog(params);
      set({ products: res.products, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error ?? err.message, isLoading: false });
    }
  },

  addProduct: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await CatalogService.createProduct(data);
      set((s) => ({ products: [res.product, ...s.products], isLoading: false }));
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error ?? err.message, isLoading: false });
      return false;
    }
  },

  bulkOnboard: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await CatalogService.bulkOnboard(data);
      // Refresh catalog after bulk insert
      const res = await CatalogService.getCatalog();
      set({ products: res.products, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error ?? err.message, isLoading: false });
      return false;
    }
  },

  updateProduct: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await CatalogService.updateProduct(id, data);
      set((s) => ({
        products: s.products.map((p) => (p.id === id ? res.product : p)),
        isLoading: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error ?? err.message, isLoading: false });
      return false;
    }
  },

  removeProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await CatalogService.deleteProduct(id);
      set((s) => ({
        products: s.products.filter((p) => p.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error ?? err.message, isLoading: false });
      return false;
    }
  },

  addInventory: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await CatalogService.addInventoryBatch(data);
      // Optimistic: update local quantity
      set((s) => ({
        products: s.products.map((p) =>
          p.id === data.productId
            ? { ...p, totalQuantity: p.totalQuantity + data.quantity }
            : p
        ),
        isLoading: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error ?? err.message, isLoading: false });
      return false;
    }
  },

  fetchLowStock: async () => {
    try {
      const res = await CatalogService.getLowStock();
      set({ lowStockProducts: res.products ?? [] });
    } catch {
      // silent — non-critical alert
    }
  },

  lookupBarcode: async (barcode) => {
    try {
      const res = await CatalogService.getByBarcode(barcode);
      return res.product ?? null;
    } catch {
      return null;
    }
  },
}));
