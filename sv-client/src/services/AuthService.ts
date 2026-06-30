import { userApi } from '../config/api';
import { Endpoints } from '../config/network';

// ── Types ────────────────────────────────────────────────────────

export interface RegisterStorePayload {
  ownerName: string;
  email: string;
  password: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateCashierPayload {
  storeId: string;
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: { id: string; name: string; email: string; role: string };
  store: { id: string; name: string };
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  storeId: string;
  isActive: boolean;
}

// ── Service ──────────────────────────────────────────────────────

const AuthService = {
  registerStore: async (data: RegisterStorePayload): Promise<AuthResponse> => {
    const res = await userApi.post<AuthResponse>(Endpoints.REGISTER_STORE, data);
    return res.data;
  },

  login: async (data: LoginPayload): Promise<AuthResponse> => {
    const res = await userApi.post<AuthResponse>(Endpoints.LOGIN, data);
    return res.data;
  },

  createCashier: async (data: CreateCashierPayload) => {
    const res = await userApi.post(Endpoints.CASHIERS, data);
    return res.data;
  },

  getUsers: async (): Promise<{ success: boolean; users: UserInfo[] }> => {
    const res = await userApi.get(Endpoints.USERS);
    return res.data;
  },

  getCurrentUser: async (): Promise<{ success: boolean; user: UserInfo }> => {
    const res = await userApi.get(Endpoints.CURRENT_USER);
    return res.data;
  },
};

export default AuthService;
