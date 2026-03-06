import client from './client';
import type { Booking, BookingDetail, PaginatedResponse } from '../types';

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

export async function getBooking(id: string): Promise<BookingDetail> {
  const { data } = await client.get(`/admin/bookings/${id}`);
  return data;
}

export async function cancelBooking(id: string, reason?: string): Promise<Booking> {
  const { data } = await client.patch(`/admin/bookings/${id}/status`, {
    status: 'CANCELLED_BY_SYSTEM',
    reason,
  });
  return data;
}
