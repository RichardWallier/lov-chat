import { env } from '@/lib/env';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

// POST /auth/login → returns raw JWT string
export async function login(_payload: LoginPayload): Promise<string> {
  // Wired against `${env.apiHttpUrl}/auth/login` once the login UI lands.
  void env;
  throw new Error('Not implemented');
}

// POST /auth/register → returns { token: string }
export async function register(_payload: RegisterPayload): Promise<string> {
  throw new Error('Not implemented');
}

const TOKEN_KEY = 'token';

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
