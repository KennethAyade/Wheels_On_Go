import client from './client';
import type { LoginResponse } from '../types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/admin/login', { email, password });
  return data;
}

export async function getMe() {
  const { data } = await client.get('/auth/me');
  return data;
}

export async function refreshToken(token: string) {
  const { data } = await client.post('/auth/refresh', { refreshToken: token });
  return data;
}
