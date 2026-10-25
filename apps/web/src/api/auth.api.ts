import { apiClient, clearCsrfCache, setCsrfToken } from './client.js';
import { AuthUser } from '../types/event.types.js';

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  college_name?: string;
  date_of_birth?: string;
  skills?: string[];
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await apiClient<{ user: AuthUser }>('/api/v1/auth/me', { method: 'GET' });
    return res.user;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  clearCsrfCache();
  const res = await apiClient<{ user: AuthUser; csrfToken: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res?.csrfToken) {
    setCsrfToken(res.csrfToken);
  }
  return res.user;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  clearCsrfCache();
  const res = await apiClient<{ user: AuthUser; csrfToken: string }>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (res?.csrfToken) {
    setCsrfToken(res.csrfToken);
  }
  return res.user;
}

export async function logout(): Promise<void> {
  try {
    await apiClient('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    clearCsrfCache();
  }
}
