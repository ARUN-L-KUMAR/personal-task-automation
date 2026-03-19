import { create } from 'zustand';

import { authService } from '@/services/auth.service';
import { notificationsService } from '@/services/notifications.service';
import { tokenStorage } from '@/storage/tokenStorage';
import { LoginPayload, RegisterPayload, UserProfile } from '@/types/auth';

type AuthState = {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(payload);
      try {
        await notificationsService.registerDeviceToken();
      } catch {
        // Non-blocking: auth should not fail if notification registration fails.
      }
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Login failed' });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.register(payload);
      try {
        await notificationsService.registerDeviceToken();
      } catch {
        // Non-blocking: auth should not fail if notification registration fails.
      }
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Registration failed' });
      throw err;
    }
  },

  googleLogin: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.googleLoginMobile();
      try {
        await notificationsService.registerDeviceToken();
      } catch {
        // Non-blocking: auth should not fail if notification registration fails.
      }
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Google login failed' });
      throw err;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    const token = await tokenStorage.getToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await authService.me();
      try {
        await notificationsService.registerDeviceToken();
      } catch {
        // Non-blocking: session restore should not fail if notification registration fails.
      }
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      await tokenStorage.removeToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
