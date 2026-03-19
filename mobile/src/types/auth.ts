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
