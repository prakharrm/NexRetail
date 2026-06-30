/**
 * @deprecated Use CatalogService.ts instead. This file is kept for backwards
 * compatibility with existing UI screens during migration.
 */
import { txApi } from '../config/api';
import { Endpoints } from '../config/network';

export interface ProductImageInput {
  uri: string;
  type: string;
}

export interface CreateProductData {
  name: string;
  price: string;
  sku: string;
  stock: string;
  barcode?: string;
  images?: ProductImageInput[];
}

class ProductService {
  static async getAllProducts() {
    const res = await txApi.get(Endpoints.PRODUCTS);
    return res.data?.products ?? res.data;
  }

  static async createProduct(data: CreateProductData) {
    const res = await txApi.post(Endpoints.PRODUCTS, {
      name: data.name,
      price: parseFloat(data.price),
      totalQuantity: parseInt(data.stock, 10),
      barcode: data.barcode,
    });
    return res.data?.product ?? res.data;
  }

  static async deleteProduct(id: string) {
    const res = await txApi.delete(`${Endpoints.PRODUCTS}/${id}`);
    return res.data;
  }

  static async searchProductByImage(imageUri: string, limit: number = 3) {
    const formData = new FormData();
    formData.append('image', { uri: imageUri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    formData.append('limit', String(limit));

    const res = await txApi.post('/api/catalog/products/search-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }
}

export default ProductService;