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
    avatar_url?: string | null;
    created_at: string;
    updated_at: string;
}

export interface AboutProfile {
    name: string;
    email: string;
    phone: string | null;
    google_account_email: string | null;
    google_connected: boolean;
}

export interface VerificationSendResponse {
    status: 'sent';
    expires_in_seconds: number;
    delivery: 'email' | 'debug';
    verification_code?: string;
}

export interface AuthResponse {
    user: UserProfile;
    access_token: string;
    token_type: string;
}

export interface GoogleAuthStatus {
    authenticated: boolean;
    message: string;
    service_unavailable?: boolean;
    credentials_unavailable?: boolean;
}

export interface GoogleServicesStatus extends GoogleAuthStatus {
    service_status: Record<string, boolean>;
    connected_services: string[];
}

export interface GoogleConnectUrlResponse {
    auth_url: string;
}

export interface VerifyRegistrationPayload {
    email: string;
    verification_code: string;
}

export interface ResetPasswordPayload {
    email: string;
    verification_code: string;
    new_password: string;
}

export interface RegistrationResponse {
    status: string;
    email: string;
    expires_in_seconds?: number;
    delivery?: string;
    verification_code?: string;
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

export const registerUser = async (payload: RegisterPayload): Promise<RegistrationResponse> => {
    const response = await api.post('/api/db-auth/register', payload);
    // Returns verification_required status
    return response.data;
};

export const verifyRegistrationEmail = async (payload: VerifyRegistrationPayload): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/verify-registration-email', payload);
    const data: AuthResponse = response.data;
    setToken(data.access_token);
    return data;
};

export const resendVerification = async (email: string): Promise<VerificationSendResponse> => {
    const response = await api.post('/api/db-auth/resend-verification', { email });
    return response.data;
};

export const forgotPassword = async (email: string): Promise<VerificationSendResponse> => {
    const response = await api.post('/api/db-auth/forgot-password', { email });
    return response.data;
};

export const resetPassword = async (payload: ResetPasswordPayload): Promise<{ status: string; message: string }> => {
    const response = await api.post('/api/db-auth/reset-password', payload);
    return response.data;
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

export const checkGoogleServicesStatus = async (): Promise<GoogleAuthStatus> => {
    const response = await api.get('/api/auth/status');
    return response.data;
};

export const checkGoogleDetailedServicesStatus = async (): Promise<GoogleServicesStatus> => {
    const response = await api.get('/api/auth/services-status');
    return response.data;
};

export const getGoogleConnectUrl = async (): Promise<string> => {
    const response = await api.get<GoogleConnectUrlResponse>('/api/auth/google-connect-url');
    const authUrl = response.data?.auth_url;
    if (!authUrl) {
        throw new Error('Failed to start Google connection');
    }
    return authUrl;
};

export const updateManualAvatar = async (avatarDataUrl: string): Promise<UserProfile> => {
    const response = await api.put('/api/db-auth/avatar/manual', { avatar_data_url: avatarDataUrl });
    return response.data as UserProfile;
};

export const updateAvatarFromGoogle = async (): Promise<UserProfile> => {
    const response = await api.put('/api/db-auth/avatar/google');
    return response.data as UserProfile;
};

export const clearAvatar = async (): Promise<UserProfile> => {
    const response = await api.delete('/api/db-auth/avatar');
    return response.data as UserProfile;
};

export const getAboutProfile = async (): Promise<AboutProfile> => {
    const response = await api.get('/api/db-auth/about');
    return response.data as AboutProfile;
};

export const updateAboutProfile = async (payload: { name?: string; phone?: string }): Promise<UserProfile> => {
    const response = await api.put('/api/db-auth/about/profile', payload);
    return response.data as UserProfile;
};

export const sendEmailVerificationCode = async (newEmail: string): Promise<VerificationSendResponse> => {
    const response = await api.post('/api/db-auth/about/email/send-code', { new_email: newEmail });
    return response.data as VerificationSendResponse;
};

export const verifyAndUpdateEmail = async (newEmail: string, verificationCode: string): Promise<UserProfile> => {
    const response = await api.put('/api/db-auth/about/email/verify-and-save', {
        new_email: newEmail,
        verification_code: verificationCode,
    });
    return response.data as UserProfile;
};

export const sendPasswordVerificationCode = async (currentPassword: string): Promise<VerificationSendResponse> => {
    const response = await api.post('/api/db-auth/about/password/send-code', {
        current_password: currentPassword,
    });
    return response.data as VerificationSendResponse;
};

export const verifyAndUpdatePassword = async (
    currentPassword: string,
    newPassword: string,
    verificationCode: string,
): Promise<{ status: string; message: string }> => {
    const response = await api.put('/api/db-auth/about/password/verify-and-save', {
        current_password: currentPassword,
        new_password: newPassword,
        verification_code: verificationCode,
    });
    return response.data as { status: string; message: string };
};
