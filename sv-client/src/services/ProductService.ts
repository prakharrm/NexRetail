import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { NetworkConfig, Endpoints } from '../config/network';

export interface ProductImageInput {
  uri: string;
  type: string; // 'product', 'barcode', etc.
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
    const res = await fetch(`${NetworkConfig.API_URL}${Endpoints.PRODUCTS}`);
    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }
    return res.json();
  }

  static async createProduct(data: CreateProductData) {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', data.price);
    formData.append('sku', data.sku);
    formData.append('stock', data.stock);
    if (data.barcode) {
      formData.append('barcode', data.barcode);
    }

    if (data.images && data.images.length > 0) {
      const types: string[] = [];
      data.images.forEach((img, index) => {
        // Use the expo File constructor if available, or just a custom object for RN FormData
        const imageFile = new File(img.uri);
        formData.append('images', imageFile as any);
        types.push(img.type || 'product');
      });
      formData.append('imageTypes', JSON.stringify(types));
    }

    const res = await fetch(`${NetworkConfig.API_URL}${Endpoints.PRODUCTS}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errMsg = 'Failed to add product';
      try {
        const errData = await res.json();
        errMsg = errData.error || errMsg;
      } catch (_) { }
      throw new Error(errMsg);
    }

    return res.json();
  }

  static async deleteProduct(id: string) {
    const res = await fetch(
      `${NetworkConfig.API_URL}${Endpoints.PRODUCTS}/${id}`,
      { method: 'DELETE' }
    );

    if (!res.ok) {
      throw new Error('Failed to delete product');
    }
    return res.json();
  }

  static async searchProductByImage(imageUri: string, limit: number = 3) {
    const formData = new FormData();

    const imageFile = new File(imageUri);
    formData.append('image', imageFile);
    formData.append('limit', String(limit));

    const res = await fetch(
      `${NetworkConfig.API_URL}${Endpoints.PRODUCT_SEARCH_IMAGE}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!res.ok) {
      let errMsg = 'Failed to search product by image';
      try {
        const errData = await res.json();
        errMsg = errData.error || errMsg;
      } catch (_) { }
      console.error('[searchProductByImage] Server error:', res.status, errMsg);
      throw new Error(errMsg);
    }

    return res.json();
  }
}

export default ProductService;