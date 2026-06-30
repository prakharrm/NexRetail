import { userApi } from '../config/api';
import { Endpoints } from '../config/network';

import type { RegisterStorePayload, LoginPayload, CreateCashierPayload, AuthResponse, User } from '@sv/shared';

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

  getUsers: async (): Promise<{ success: boolean; users: User[] }> => {
    const res = await userApi.get(Endpoints.USERS);
    return res.data;
  },

  getCurrentUser: async (): Promise<{ success: boolean; user: User }> => {
    const res = await userApi.get(Endpoints.CURRENT_USER);
    return res.data;
  },
};

export default AuthService;
