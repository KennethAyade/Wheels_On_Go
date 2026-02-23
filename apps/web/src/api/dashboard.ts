import client from './client';
import type { DashboardStats } from '../types';

export async function getStats(): Promise<DashboardStats> {
  const { data } = await client.get<DashboardStats>('/admin/stats');
  return data;
}
