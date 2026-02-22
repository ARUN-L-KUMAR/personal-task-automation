import { create } from 'zustand';
import api from '../services/api';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    isLoading: false,
    error: null,

    checkAuth: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/api/auth/status');
            set({ isAuthenticated: response.data.authenticated, isLoading: false });
        } catch (error: any) {
            set({
                isAuthenticated: false,
                isLoading: false,
                error: error.message || 'Failed to check auth status'
            });
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            await api.post('/api/auth/logout');
            set({ isAuthenticated: false, isLoading: false });
        } catch (error: any) {
            set({ isLoading: false, error: error.message || 'Failed to logout' });
        }
    }
}));
