import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { env } from '@/config/env';
import api from '@/services/api';
import { tokenStorage } from '@/storage/tokenStorage';
import { AuthResponse, LoginPayload, RegisterPayload, UserProfile } from '@/types/auth';

WebBrowser.maybeCompleteAuthSession();

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await api.post('/api/db-auth/login', payload);
    const data: AuthResponse = response.data;
    await tokenStorage.setToken(data.access_token);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await api.post('/api/db-auth/register', payload);
    const data: AuthResponse = response.data;
    await tokenStorage.setToken(data.access_token);
    return data;
  },

  async me(): Promise<UserProfile> {
    const response = await api.get('/api/db-auth/me');
    return response.data;
  },

  async googleLoginMobile(): Promise<AuthResponse> {
    const redirectUri = Linking.createURL('auth');
    const startUrl = `${env.apiBaseUrl}/api/auth/google-mobile?redirect_uri=${encodeURIComponent(redirectUri)}`;
    const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

    if (result.type !== 'success' || !result.url) {
      throw new Error('Google sign-in was cancelled.');
    }

    const parsed = Linking.parse(result.url);
    const token = (parsed.queryParams?.token as string | undefined) || '';
    const error = (parsed.queryParams?.error as string | undefined) || '';

    if (error) {
      throw new Error(error.replaceAll('_', ' '));
    }
    if (!token) {
      throw new Error('Google sign-in did not return a token.');
    }

    await tokenStorage.setToken(token);
    const user = await authService.me();
    return {
      user,
      access_token: token,
      token_type: 'bearer',
    };
  },

  async logout(): Promise<void> {
    await tokenStorage.removeToken();
  },
};
