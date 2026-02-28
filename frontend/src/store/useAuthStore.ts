import { create } from 'zustand';
import {
    loginUser,
    registerUser,
    logoutUser,
    getMe,
    getToken,
    googleLoginUser,
    LoginPayload,
    RegisterPayload,
    UserProfile,
} from '../services/auth.service';

interface AuthState {
    user: UserProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (payload: LoginPayload) => Promise<void>;
    register: (payload: RegisterPayload) => Promise<void>;
    googleLogin: (accessToken: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: !!getToken(),
    isLoading: false,
    error: null,

    login: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const data = await loginUser(payload);
            set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
            set({ isLoading: false, error: err.message || 'Login failed' });
            throw err;
        }
    },

    register: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const data = await registerUser(payload);
            set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
            set({ isLoading: false, error: err.message || 'Registration failed' });
            throw err;
        }
    },

    googleLogin: async (accessToken) => {
        set({ isLoading: true, error: null });
        try {
            const data = await googleLoginUser(accessToken);
            set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
            set({ isLoading: false, error: err.message || 'Google sign-in failed' });
            throw err;
        }
    },

    logout: () => {
        logoutUser();
        set({ user: null, isAuthenticated: false, error: null });
    },

    checkAuth: async () => {
        const token = getToken();
        if (!token) {
            set({ isAuthenticated: false, user: null, isLoading: false });
            return;
        }
        // Only show loading spinner on first check — prevents unmount/remount loop
        const { user: existingUser } = useAuthStore.getState();
        if (!existingUser) {
            set({ isLoading: true });
        }
        try {
            const user = await getMe();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },

    clearError: () => set({ error: null }),
}));
