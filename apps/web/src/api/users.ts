import client from './client';
import type { CustomerUser, PaginatedResponse } from '../types';

export async function listUsers(params: {
  search?: string;
  suspended?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<CustomerUser>> {
  const { data } = await client.get('/admin/users', { params });
  return data;
}

export async function suspendUser(id: string, reason: string): Promise<CustomerUser> {
  const { data } = await client.patch(`/admin/users/${id}/suspend`, { reason });
  return data;
}

export async function reactivateUser(id: string): Promise<CustomerUser> {
  const { data } = await client.patch(`/admin/users/${id}/reactivate`);
  return data;
}
