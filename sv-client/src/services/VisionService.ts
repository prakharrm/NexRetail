import { visionApi } from '../config/api';
import { Endpoints } from '../config/network';

// ── Types ────────────────────────────────────────────────────────

export interface VisualMatch {
  id: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  barcode: string | null;
  image_url: string | null;
  similarity: number;
}

// ── Service ──────────────────────────────────────────────────────

const VisionService = {
  /**
   * Upload an image to the vision service for ML-powered product search.
   * Returns ranked matches with similarity scores.
   */
  searchByImage: async (
    imageUri: string,
    limit: number = 5,
    threshold: number = 0.3,
  ): Promise<VisualMatch[]> => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: 'scan.jpg',
      type: 'image/jpeg',
    } as any);
    formData.append('limit', String(limit));
    formData.append('threshold', String(threshold));

    const res = await visionApi.post<VisualMatch[]>(
      Endpoints.VISION_SEARCH_IMAGE,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  /**
   * Onboard a product to the vision service (creates the ML embeddings).
   */
  onboardProduct: async (
    data: { name: string; price: number; sku: string; stock: number; barcode?: string },
    imageUris: string[],
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', String(data.price));
    formData.append('sku', data.sku);
    formData.append('stock', String(data.stock));
    if (data.barcode) formData.append('barcode', data.barcode);

    imageUris.forEach((uri, idx) => {
      formData.append('images', {
        uri,
        name: `photo_${idx}.jpg`,
        type: 'image/jpeg',
      } as any);
    });

    const res = await visionApi.post(Endpoints.VISION_PRODUCT_CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Check if the ML model is loaded and ready for inference.
   */
  checkHealth: async (): Promise<{ status: string; model: string }> => {
    const res = await visionApi.get(Endpoints.VISION_HEALTH);
    return res.data;
  },
};

export default VisionService;
