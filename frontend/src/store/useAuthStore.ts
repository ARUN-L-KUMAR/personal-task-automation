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
    RegistrationResponse,
} from '../services/auth.service';

interface AuthState {
    user: UserProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    unverifiedEmail: string | null;

    login: (payload: LoginPayload) => Promise<void>;
    register: (payload: RegisterPayload) => Promise<RegistrationResponse>;
    googleLogin: (code: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    setUser: (user: UserProfile | null) => void;
    setUnverifiedEmail: (email: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: !!getToken(),
    isLoading: false,
    error: null,
    unverifiedEmail: null,

    login: async (payload) => {
        set({ isLoading: true, error: null, unverifiedEmail: null });
        try {
            const data = await loginUser(payload);
            set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
            const detail = err.details?.detail || err.response?.data?.detail;
            let errorMessage = 'Login failed';
            
            if (typeof err.message === 'string') {
                errorMessage = err.message;
            } else if (err.message?.message) {
                errorMessage = err.message.message;
            }
            
            if (detail && typeof detail === 'object') {
                errorMessage = detail.message || errorMessage;
                if (detail.error === 'unverified_email') {
                    set({ unverifiedEmail: payload.email });
                }
            } else if (typeof detail === 'string') {
                errorMessage = detail;
            }

            set({ isLoading: false, error: errorMessage });
            throw err;
        }
    },

    register: async (payload) => {
        set({ isLoading: true, error: null, unverifiedEmail: null });
        try {
            const data = await registerUser(payload);
            if (data.status === 'verification_required') {
                set({ unverifiedEmail: data.email, isLoading: false });
            } else {
                set({ isLoading: false });
            }
            return data;
        } catch (err: any) {
            const detail = err.details?.detail || err.response?.data?.detail;
            let errorMessage = 'Registration failed';
            
            if (typeof err.message === 'string') {
                errorMessage = err.message;
            } else if (err.message?.message) {
                errorMessage = err.message.message;
            }
            
            if (typeof detail === 'string') errorMessage = detail;
            else if (detail?.message) errorMessage = detail.message;

            set({ isLoading: false, error: errorMessage });
            throw err;
        }
    },

    googleLogin: async (code) => {
        set({ isLoading: true, error: null });
        try {
            const data = await googleLoginUser(code);
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

    setUser: (user) => set((state) => ({
        user,
        isAuthenticated: user ? true : state.isAuthenticated,
    })),
    
    setUnverifiedEmail: (email) => set({ unverifiedEmail: email }),
}));
