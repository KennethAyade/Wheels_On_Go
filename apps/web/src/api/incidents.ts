import client from './client';
import type { SosIncident, PaginatedResponse } from '../types';

export async function listIncidents(params: {
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<SosIncident>> {
  const { data } = await client.get('/admin/incidents', { params });
  return data;
}

export async function updateIncident(
  id: string,
  payload: { status: string; resolutionNotes?: string },
): Promise<SosIncident> {
  const { data } = await client.patch(`/admin/incidents/${id}`, payload);
  return data;
}
