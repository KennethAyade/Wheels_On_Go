import client from './client';
import type { Booking, PaginatedResponse } from '../types';

export async function listBookings(params: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  fareMin?: number;
  fareMax?: number;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Booking>> {
  const { data } = await client.get('/admin/bookings', { params });
  return data;
}
