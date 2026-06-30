import { txApi } from '../config/api';
import { Endpoints } from '../config/network';

// ── Types ────────────────────────────────────────────────────────

import type { Product } from '@sv/shared';
export interface CreateProductPayload {
  storeId: string;
  category?: string;
  name: string;
  barcode?: string;
  imageUrl?: string;
  parentProductId?: string;
  variantName?: string;
  price: number;
  minPrice?: number;
  totalQuantity?: number;
  minQuantity?: number;
}

export interface BulkOnboardPayload {
  storeId: string;
  parentName: string;
  category?: string;
  variants: {
    variantName: string;
    barcode?: string;
    imageUrl?: string;
    price: number;
    minPrice?: number;
    totalQuantity?: number;
    minQuantity?: number;
  }[];
}

export interface AddInventoryPayload {
  storeId: string;
  productId: string;
  quantity: number;
  costPrice?: number;
  supplier?: string;
  expiresAt?: string;
  notes?: string;
}

// ── Service ──────────────────────────────────────────────────────

const CatalogService = {
  getCatalog: async (params?: { search?: string; category?: string }) => {
    const res = await txApi.get<{ success: boolean; products: Product[] }>(
      Endpoints.PRODUCTS,
      { params },
    );
    return res.data;
  },

  getByBarcode: async (barcode: string) => {
    const res = await txApi.get<{ success: boolean; product: Product }>(
      `${Endpoints.PRODUCTS}/barcode/${barcode}`,
    );
    return res.data;
  },

  getVariants: async (productId: string) => {
    const res = await txApi.get<{ success: boolean; variants: Product[] }>(
      `${Endpoints.PRODUCTS}/${productId}/variants`,
    );
    return res.data;
  },

  createProduct: async (data: CreateProductPayload) => {
    const res = await txApi.post<{ success: boolean; product: Product }>(
      Endpoints.PRODUCTS,
      data,
    );
    return res.data;
  },

  bulkOnboard: async (data: BulkOnboardPayload) => {
    const res = await txApi.post(Endpoints.PRODUCTS_BULK, data);
    return res.data;
  },

  updateProduct: async (id: string, data: Partial<CreateProductPayload>) => {
    const res = await txApi.put<{ success: boolean; product: Product }>(
      `${Endpoints.PRODUCTS}/${id}`,
      data,
    );
    return res.data;
  },

  deleteProduct: async (id: string) => {
    const res = await txApi.delete(`${Endpoints.PRODUCTS}/${id}`);
    return res.data;
  },

  addInventoryBatch: async (data: AddInventoryPayload) => {
    const res = await txApi.post(Endpoints.INVENTORY_BATCH, data);
    return res.data;
  },

  getExpiring: async (days: number = 7) => {
    const res = await txApi.get(Endpoints.EXPIRING, { params: { days } });
    return res.data;
  },

  getLowStock: async () => {
    const res = await txApi.get(Endpoints.LOW_STOCK);
    return res.data;
  },
};

export default CatalogService;
