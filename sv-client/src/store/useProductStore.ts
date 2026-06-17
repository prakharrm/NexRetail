import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductService, { CreateProductData } from '../services/ProductService';

export interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  image_url: string | null;
  barcode: string | null;
  embedding?: number[] | null;
  created_at?: string;
}

interface ProductStore {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  
  fetchProducts: () => Promise<void>;
  addProduct: (data: CreateProductData) => Promise<boolean>;
  removeProduct: (id: string) => Promise<boolean>;
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [],
      isLoading: false,
      error: null,

      fetchProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await ProductService.getAllProducts();
          set({ products: data, isLoading: false });
        } catch (err: any) {
          console.error(err);
          set({ error: err.message, isLoading: false });
        }
      },

      addProduct: async (data: CreateProductData) => {
        set({ isLoading: true, error: null });
        try {
          const newProduct = await ProductService.createProduct(data);
          
          set((state) => ({
            products: [newProduct, ...state.products],
            isLoading: false
          }));
          return true;
        } catch (err: any) {
          console.error(err);
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      removeProduct: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await ProductService.deleteProduct(id);
          
          set((state) => ({
            products: state.products.filter((p) => String(p.id) !== String(id)),
            isLoading: false
          }));
          return true;
        } catch (err: any) {
          console.error(err);
          set({ error: err.message, isLoading: false });
          return false;
        }
      },
    }),
    {
      name: 'smartdukaan-products',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
