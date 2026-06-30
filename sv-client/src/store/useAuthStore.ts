import { create } from 'zustand';
import AuthService from '../services/AuthService';
import type { RegisterStorePayload, LoginPayload, UserInfo } from '../services/AuthService';
import { saveToken, clearToken, getToken } from '../config/api';

interface AuthState {
  // State
  token: string | null;
  user: { id: string; name: string; email: string; role: string } | null;
  store: { id: string; name: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  registerStore: (data: RegisterStorePayload) => Promise<boolean>;
  login: (data: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  store: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  registerStore: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await AuthService.registerStore(data);
      await saveToken(res.token);
      set({
        token: res.token,
        user: res.user,
        store: res.store,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Registration failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await AuthService.login(data);
      await saveToken(res.token);
      set({
        token: res.token,
        user: res.user,
        store: res.store,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Login failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await clearToken();
    set({
      token: null,
      user: null,
      store: null,
      isAuthenticated: false,
      error: null,
    });
  },

  /**
   * Call on app start to restore session from SecureStore.
   * If a token exists, fetch current user to verify it's still valid.
   */
  hydrate: async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await AuthService.getCurrentUser();
      set({
        token,
        user: {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
        },
        isAuthenticated: true,
      });
    } catch {
      // Token expired or invalid — clear it silently
      await clearToken();
    }
  },
}));
