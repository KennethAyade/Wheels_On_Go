import client from './client';
import type { AdminRatingsResponse } from '../types';

export async function getRatings(params: {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminRatingsResponse> {
  const { data } = await client.get('/admin/ratings', { params });
  return data;
}
