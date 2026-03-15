import api from './api';

// --- Types ---

export interface LoginPayload {
    email: string;
    password: string;
}

export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    created_at: string;
    updated_at: string;
}

export interface AuthResponse {
    user: UserProfile;
    access_token: string;
    token_type: string;
}

// --- Token helpers ---

const TOKEN_KEY = 'g-one_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

// --- API calls ---

export const loginUser = async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/login', payload);
    const data: AuthResponse = response.data;
    setToken(data.access_token);
    return data;
};

export const registerUser = async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/register', payload);
    const data: AuthResponse = response.data;
    setToken(data.access_token);
    return data;
};

export const getMe = async (): Promise<UserProfile> => {
    const response = await api.get('/api/db-auth/me');
    return response.data;
};

export const logoutUser = () => {
    removeToken();
};

export const googleLoginUser = async (code: string): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/google-login', { code });
    const data: AuthResponse = response.data;
    setToken(data.access_token);
    return data;
};

export const checkGoogleServicesStatus = async (): Promise<{ authenticated: boolean; message: string }> => {
    const response = await api.get('/api/auth/status');
    return response.data;
};
