import { env } from '@/lib/env';
import type { LoginRequest, RegisterRequest } from '@/types/generated';

// Request bodies are generated from the Go DTOs (api/dto/*.go) — the single
// source of truth. Run `yarn gen:types` after changing them; any drift shows up
// as a type error wherever these are used.
export type LoginPayload = LoginRequest;
export type RegisterPayload = RegisterRequest;

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
