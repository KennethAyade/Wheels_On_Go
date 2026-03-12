import client from './client';
import type { Transaction, PaginatedResponse } from '../types';

export async function listTransactions(params: {
  type?: string;
  status?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Transaction>> {
  const { data } = await client.get('/admin/transactions', { params });
  return data;
}
