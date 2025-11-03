import { requestJson } from './http';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
  tenantId: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    tenantId: string;
    status?: string;
  };
}

export interface RefreshResponse {
  accessToken: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  tenantId: string;
  status?: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function signup(data: SignupRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  return requestJson<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
}

export async function logout(refreshToken: string): Promise<void> {
  return requestJson<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
}

export async function logoutAll(): Promise<void> {
  return requestJson<void>('/auth/logout-all', {
    method: 'POST'
  });
}

export async function getMe(): Promise<User> {
  return requestJson<User>('/auth/me');
}

