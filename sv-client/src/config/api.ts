import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { NetworkConfig } from './network';

const TOKEN_KEY = 'nexretail_jwt';

/**
 * Axios instance for the User Service (auth, cashiers).
 */
export const userApi = axios.create({
  baseURL: NetworkConfig.USER_URL,
  timeout: NetworkConfig.TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Axios instance for the Transaction Service (catalog, POS, telemetry).
 */
export const txApi = axios.create({
  baseURL: NetworkConfig.TRANSACTION_URL,
  timeout: NetworkConfig.TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Axios instance for the Vision Service (ML image search).
 */
export const visionApi = axios.create({
  baseURL: NetworkConfig.VISION_URL,
  timeout: 30_000, // ML inference can take longer
});

// ── JWT Interceptor ──────────────────────────────────────────────
// Automatically attach stored token to every outgoing request.
const attachToken = async (config: any) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

userApi.interceptors.request.use(attachToken);
txApi.interceptors.request.use(attachToken);
visionApi.interceptors.request.use(attachToken);

// ── Token helpers ────────────────────────────────────────────────
export const saveToken = (token: string) =>
  SecureStore.setItemAsync(TOKEN_KEY, token);

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);
