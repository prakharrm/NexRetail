export const NetworkConfig = {
  // Use EXPO_PUBLIC_API_URL if provided, else fallback to localhost
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  TIMEOUT: 10000,
};

export const Endpoints = {
  PRODUCTS: '/api/products',
  PRODUCT_SEARCH: '/api/products/search',
  PRODUCT_SEARCH_IMAGE: '/api/products/search-image',
};
